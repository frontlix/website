import { NextRequest, NextResponse } from 'next/server'
// normalizePhone is now handled by the Python service
import { sendNotification } from '@/lib/mail'

const LEAD_AUTOMATION_URL = process.env.LEAD_AUTOMATION_URL || 'http://localhost:8000'

/**
 * POST — Start de demo-chatbot flow.
 * Branche-flow wordt doorgestuurd naar de Python lead-automation service.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { telefoon } = body as { telefoon?: string }

    if (!telefoon) {
      return NextResponse.json(
        { error: 'Telefoonnummer is verplicht.' },
        { status: 400 }
      )
    }

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

    // Forward to Python lead-automation service
    const res = await fetch(`${LEAD_AUTOMATION_URL}/demo/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telefoon }),
    })

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Unknown error' }))
      return NextResponse.json(
        { error: error.detail || 'Er ging iets mis.' },
        { status: res.status }
      )
    }

    // Notificatie naar Frontlix
    try {
      await sendNotification(
        `Demo aangevraagd: ${telefoon}`,
        `<p>Nieuw demo-verzoek ontvangen via hero formulier.</p>
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
