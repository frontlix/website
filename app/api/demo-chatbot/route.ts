import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { sendWhatsAppText, normalizePhone } from '@/lib/whatsapp'
import { sendNotification } from '@/lib/mail'

/**
 * POST — Start de demo-chatbot flow.
 * Ontvangt alleen een telefoonnummer uit het Hero-formulier.
 * Naam en email worden later via de WhatsApp chatbot verzameld.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { telefoon } = body as { telefoon?: string }

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
    })

    if (insertError) {
      console.error('Supabase insert error:', insertError)
      return NextResponse.json(
        { error: 'Er ging iets mis bij het opslaan.' },
        { status: 500 }
      )
    }

    // Haal de net aangemaakte lead op (voor lead_id)
    const { data: lead } = await getSupabase()
      .from('demo_leads')
      .select('id')
      .eq('telefoon', phone)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // Stuur eerste WhatsApp bericht via vrije tekst
    const firstMessage = `Hey! Welkom bij de Frontlix demo. Ik ga je laten zien hoe ons AI-systeem werkt door samen een offerte op te stellen.\n\nOm te beginnen, wat is je naam?`

    try {
      await sendWhatsAppText(phone, firstMessage)
    } catch (waErr) {
      console.error('WhatsApp message failed:', waErr)
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
        `Demo aangevraagd: ${telefoon}`,
        `<p>Nieuw demo-verzoek ontvangen.</p>
         <p>Telefoon: ${telefoon}</p>`
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
