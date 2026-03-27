import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { sendNotification, sendConfirmation } from '@/lib/mail'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { voornaam, achternaam, telefoon, email, bedrijfsnaam, website, extra } = body

    // Valideer verplichte velden
    if (!voornaam || !achternaam || !telefoon || !email) {
      return NextResponse.json(
        { success: false, message: 'Alle verplichte velden moeten ingevuld zijn.' },
        { status: 400 }
      )
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Ongeldig e-mailadres.' },
        { status: 400 }
      )
    }

    // Opslaan in Supabase
    const supabase = getSupabase()
    const { error: dbError } = await supabase
      .from('project_submissions')
      .insert({ voornaam, achternaam, telefoon, email, bedrijfsnaam: bedrijfsnaam || null, website: website || null, extra: extra || null })

    if (dbError) {
      console.error('Supabase insert error:', dbError)
      return NextResponse.json(
        { success: false, message: 'Er is een fout opgetreden bij het opslaan.' },
        { status: 500 }
      )
    }

    // E-mail notificatie
    try {
      await sendNotification(
        `[Website Formulier] Nieuwe projectaanvraag van ${voornaam} ${achternaam}`,
        `
          <h2>Nieuwe projectaanvraag</h2>
          <p><strong>Naam:</strong> ${voornaam} ${achternaam}</p>
          <p><strong>Telefoon:</strong> ${telefoon}</p>
          <p><strong>E-mail:</strong> ${email}</p>
          ${bedrijfsnaam ? `<p><strong>Bedrijf:</strong> ${bedrijfsnaam}</p>` : ''}
          ${website ? `<p><strong>Website:</strong> ${website}</p>` : ''}
          ${extra ? `<p><strong>Extra info:</strong></p><p>${extra.replace(/\n/g, '<br>')}</p>` : ''}
        `
      )
    } catch (emailError) {
      console.error('Email error:', emailError)
    }

    // Bevestigingsmail naar klant
    try {
      await sendConfirmation(email, `${voornaam} ${achternaam}`)
    } catch (confirmError) {
      console.error('Confirmation email error:', confirmError)
    }

    // WhatsApp bevestiging sturen
    try {
      await sendWhatsAppMessage(telefoon, `${voornaam} ${achternaam}`)
    } catch (waError) {
      console.error('WhatsApp error:', waError)
    }

    return NextResponse.json(
      { success: true, message: 'Aanvraag succesvol verstuurd.' },
      { status: 200 }
    )
  } catch {
    return NextResponse.json(
      { success: false, message: 'Er is een fout opgetreden.' },
      { status: 500 }
    )
  }
}
