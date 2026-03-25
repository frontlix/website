import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { Resend } from 'resend'

// Lazy initialisatie zodat build niet faalt zonder API key
let _resend: Resend | null = null
function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY)
  }
  return _resend
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { naam, email, bericht } = body

    // Valideer verplichte velden
    if (!naam || !email || !bericht) {
      return NextResponse.json(
        { success: false, message: 'Alle velden zijn verplicht.' },
        { status: 400 }
      )
    }

    // Basis e-mail format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Ongeldig e-mailadres.' },
        { status: 400 }
      )
    }

    // Opslaan in Supabase
    const supabase = getSupabase()
    const { error: dbError } = await supabase
      .from('contact_submissions')
      .insert({ naam, email, bericht })

    if (dbError) {
      console.error('Supabase insert error:', dbError)
      return NextResponse.json(
        { success: false, message: 'Er is een fout opgetreden bij het opslaan.' },
        { status: 500 }
      )
    }

    // E-mail notificatie versturen (als dit faalt, is de submission al opgeslagen)
    try {
      await getResend().emails.send({
        from: 'Frontlix Website <noreply@frontlix.nl>',
        to: 'info@frontlix.nl',
        subject: `Nieuw contactformulier van ${naam}`,
        html: `
          <h2>Nieuw bericht via het contactformulier</h2>
          <p><strong>Naam:</strong> ${naam}</p>
          <p><strong>E-mail:</strong> ${email}</p>
          <p><strong>Bericht:</strong></p>
          <p>${bericht.replace(/\n/g, '<br>')}</p>
        `,
      })
    } catch (emailError) {
      // Log maar laat de request niet falen — data is al opgeslagen in Supabase
      console.error('Resend email error:', emailError)
    }

    return NextResponse.json(
      { success: true, message: 'Bericht succesvol verstuurd.' },
      { status: 200 }
    )
  } catch {
    return NextResponse.json(
      { success: false, message: 'Er is een fout opgetreden.' },
      { status: 500 }
    )
  }
}
