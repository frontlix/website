import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { sendDemoStartTemplate, sendPersonalizedDemoTemplate, normalizePhone } from '@/lib/whatsapp'
import { sendNotification } from '@/lib/mail'

/**
 * POST — Start de demo-chatbot flow.
 * Ontvangt alleen een telefoonnummer uit het Hero-formulier.
 * Naam en email worden later via de WhatsApp chatbot verzameld.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { telefoon, personalized_demo_id } = body as {
      telefoon?: string
      personalized_demo_id?: string
    }

    // Validatie
    if (!telefoon) {
      return NextResponse.json(
        { error: 'Telefoonnummer is verplicht.' },
        { status: 400 }
      )
    }

    // Check of het een geldig Nederlands mobiel nummer is
    const stripped = telefoon.replace(/[\s\-()]/g, '')
    const isValidDutchMobile =
      /^06\d{8}$/.test(stripped) ||
      /^\+316\d{8}$/.test(stripped) ||
      /^00316\d{8}$/.test(stripped)

    if (!isValidDutchMobile) {
      return NextResponse.json(
        { error: 'Vul een geldig mobiel nummer in (bijv. 06 12345678).' },
        { status: 400 }
      )
    }

    const phone = normalizePhone(telefoon)

    // Check op duplicaat (zelfde nummer al actief bezig)
    const { data: existing } = await getSupabase()
      .from('demo_leads')
      .select('id, status')
      .eq('telefoon', phone)
      .in('status', ['collecting', 'pending_approval'])
      .limit(1)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Er loopt al een demo voor dit nummer. Check je WhatsApp!' },
        { status: 409 }
      )
    }

    // Insert nieuwe lead (naam en email worden later via chatbot verzameld)
    const { error: insertError } = await getSupabase().from('demo_leads').insert({
      telefoon: phone,
      status: 'collecting',
      ...(personalized_demo_id ? { personalized_demo_id } : {}),
    })

    if (insertError) {
      console.error('Supabase insert error:', insertError)
      return NextResponse.json(
        { error: 'Er ging iets mis bij het opslaan.' },
        { status: 500 }
      )
    }

    // Personalized demo counter ophogen
    if (personalized_demo_id) {
      getSupabase()
        .rpc('increment_demo_started', { demo_id: personalized_demo_id })
        .then(() => {})
    }

    // Haal de net aangemaakte lead op (voor lead_id)
    const { data: lead } = await getSupabase()
      .from('demo_leads')
      .select('id')
      .eq('telefoon', phone)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // Persoonlijke demo: haal gegevens op, pre-fill naam, stuur persoonlijke template
    // Normale demo: stuur standaard demo_start template
    let firstMessage: string

    if (personalized_demo_id) {
      const { data: pDemo } = await getSupabase()
        .from('personalized_demos')
        .select('naam, bedrijf')
        .eq('id', personalized_demo_id)
        .single()

      const pNaam = pDemo?.naam ?? 'daar'
      const pBedrijf = pDemo?.bedrijf ?? 'jouw bedrijf'

      // Pre-fill naam in de lead (die weten we al)
      if (lead) {
        await getSupabase()
          .from('demo_leads')
          .update({ naam: pNaam })
          .eq('id', lead.id)
      }

      firstMessage = `Hoi ${pNaam}! 👋\n\nLeuk dat je kijkt! We hebben speciaal voor ${pBedrijf} een demo klaargezet.\n\nIk ben Thomas en laat je stap voor stap zien hoe de automatische leadopvolging werkt van aanvraag tot offerte tot afspraak voor jouw bedrijf. Het duurt ongeveer 5 minuten.\n\nLaat me weten wanneer je er klaar voor bent, dan gaan we van start!`

      try {
        await sendPersonalizedDemoTemplate(phone, pNaam, pBedrijf)
      } catch (waErr) {
        console.error('WhatsApp personalized demo template failed:', waErr)
      }
    } else {
      firstMessage = `Hoi daar! 👋\n\nBedankt voor je interesse in Frontlix. Ik laat je zien hoe ons systeem leads automatisch opvolgt van aanvraag tot offerte tot afspraak.\n\nVoor deze demo hebben we drie voorbeeldbranches klaargezet. Kies er één om te ervaren hoe het werkt:`

      try {
        await sendDemoStartTemplate(phone, 'daar')
      } catch (waErr) {
        console.error('WhatsApp demo template failed:', waErr)
      }
    }

    // Sla eerste bericht op in conversations
    if (lead) {
      await getSupabase().from('demo_conversations').insert({
        lead_id: lead.id,
        role: 'assistant',
        content: firstMessage,
      })
    }

    // Notificatie naar Frontlix
    try {
      await sendNotification(
        `${personalized_demo_id ? 'Persoonlijke demo' : 'Demo'} aangevraagd: ${telefoon}`,
        `<p>Nieuw demo-verzoek ontvangen.</p>
         <p>Telefoon: ${telefoon}</p>
         ${personalized_demo_id ? '<p>Type: Persoonlijke demo</p>' : ''}`
      )
    } catch (mailErr) {
      console.error('Notification email failed:', mailErr)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Demo chatbot error:', err)
    return NextResponse.json(
      { error: 'Er ging iets mis. Probeer het opnieuw.' },
      { status: 500 }
    )
  }
}
