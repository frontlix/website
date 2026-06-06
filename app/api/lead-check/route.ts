import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { berekenLeadCheck, euro, parseLeadCheckInput, verbeterpunten } from '@/lib/leadCheck'
import { sendLeadCheckAnalysis, sendNotification } from '@/lib/mail'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_BODY_BYTES = 4096

export async function POST(request: Request) {
  try {
    const raw = await request.text()
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json({ success: false, message: 'Payload te groot.' }, { status: 400 })
    }
    const body = JSON.parse(raw) as { email?: unknown; invoer?: unknown }

    const email = typeof body.email === 'string' ? body.email.trim() : ''
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ success: false, message: 'Ongeldig e-mailadres.' }, { status: 400 })
    }

    /* Server herberekent: client-uitslag wordt niet vertrouwd */
    const invoer = parseLeadCheckInput(body.invoer)
    if (!invoer) {
      return NextResponse.json({ success: false, message: 'Ongeldige antwoorden.' }, { status: 400 })
    }

    const resultaat = berekenLeadCheck(invoer)
    const punten = verbeterpunten(invoer)

    /* Lead blijvend opslaan (backup naast de mails). Bewust niet-blokkerend:
       als de insert faalt gaan de mails gewoon door. */
    try {
      const { error: dbError } = await getSupabase()
        .from('lead_check_submissions')
        .insert({ email, score: resultaat.score, invoer })
      if (dbError) console.error('lead-check Supabase insert error:', dbError)
    } catch (dbErr) {
      console.error('lead-check Supabase error:', dbErr)
    }

    /* 1. Notificatie naar de eigenaar, zodat hij binnen een minuut kan opvolgen */
    await sendNotification(
      `Lead-check ingevuld: score ${resultaat.score} (${email})`,
      `
      <h2>Nieuwe lead via de lead-lek-check</h2>
      <p><strong>E-mail:</strong> ${email}</p>
      <p><strong>Lek-score:</strong> ${resultaat.score} van 100</p>
      <ul>
        <li>Aanvragen per week: ${invoer.aanvragenPerWeek}</li>
        <li>Reactiesnelheid: ${invoer.speed}</li>
        <li>Buiten kantooruren: ${invoer.afterhours}</li>
        <li>Conversie: ${invoer.conversiePct}%</li>
        <li>Orderwaarde: ${euro(invoer.orderwaarde)}</li>
        <li>Klanten shoppen: ${invoer.shoppen}</li>
      </ul>
      <p>Geschatte misgelopen omzet: ${euro(resultaat.omzetMaand.laag)} tot ${euro(resultaat.omzetMaand.hoog)} per maand.</p>
      <p><strong>Reageer binnen 60 seconden, practice what you preach.</strong></p>
      `
    )

    /* 2. Analyse-mail naar de invuller (de beloofde volledige analyse) */
    await sendLeadCheckAnalysis(email, {
      score: resultaat.score,
      gemisteKlantenMaand: Math.max(1, Math.round(resultaat.gemisteKlantenMaand)),
      omzetMaandLaag: euro(resultaat.omzetMaand.laag),
      omzetMaandHoog: euro(resultaat.omzetMaand.hoog),
      omzetJaarLaag: euro(resultaat.omzetJaar.laag),
      omzetJaarHoog: euro(resultaat.omzetJaar.hoog),
      punten:
        punten.length > 0
          ? punten
          : ['Je opvolging zit al strak. Houd dit vast door je reactiesnelheid te blijven meten.'],
    })

    return NextResponse.json({ success: true, message: 'Analyse verstuurd.' })
  } catch (err) {
    console.error('lead-check route error:', err)
    return NextResponse.json(
      { success: false, message: 'Er ging iets mis. Probeer het later opnieuw.' },
      { status: 500 }
    )
  }
}
