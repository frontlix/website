import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { sendNotification, sendConfirmation } from '@/lib/mail'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { naam, email, telefoon } = body

    // Valideer verplichte velden
    if (!naam || !email || !telefoon) {
      return NextResponse.json(
        { success: false, message: 'Alle velden zijn verplicht.' },
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
      .from('demo_submissions')
      .insert({ naam, email, telefoon })

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
        `[Website Formulier] Nieuwe demo aanvraag van ${naam}`,
        `
          <h2>Nieuwe demo aanvraag</h2>
          <p><strong>Naam:</strong> ${naam}</p>
          <p><strong>E-mail:</strong> ${email}</p>
          <p><strong>Telefoon:</strong> ${telefoon}</p>
        `
      )
    } catch (emailError) {
      console.error('Email error:', emailError)
    }

    // Bevestigingsmail naar klant
    try {
      await sendConfirmation(email, naam)
    } catch (confirmError) {
      console.error('Confirmation email error:', confirmError)
    }

    // WhatsApp bevestiging sturen
    try {
      await sendWhatsAppMessage(telefoon, naam)
    } catch (waError) {
      console.error('WhatsApp error:', waError)
    }

    return NextResponse.json(
      { success: true, message: 'Demo aanvraag succesvol verstuurd.' },
      { status: 200 }
    )
  } catch {
    return NextResponse.json(
      { success: false, message: 'Er is een fout opgetreden.' },
      { status: 500 }
    )
  }
}
