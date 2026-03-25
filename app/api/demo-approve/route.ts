import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { sendWhatsAppText } from '@/lib/whatsapp'
import { calculateDemoPrice } from '@/lib/openai'

/**
 * GET — Verwerkt de goedkeuring wanneer de prospect op de knop in de e-mail klikt.
 * Stuurt de offerte via WhatsApp en toont een bevestigingspagina.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')

  if (!token) {
    return new NextResponse(errorPage('Ongeldige link', 'Er ontbreekt een token in de URL.'), {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  // Zoek lead op via approval_token
  const { data: lead, error } = await getSupabase()
    .from('demo_leads')
    .select('*')
    .eq('approval_token', token)
    .limit(1)
    .single()

  if (error || !lead) {
    return new NextResponse(errorPage('Offerte niet gevonden', 'Deze goedkeuringslink is ongeldig of verlopen.'), {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  // Check status
  if (lead.status === 'quote_sent') {
    return new NextResponse(errorPage('Al goedgekeurd', 'Deze offerte is al eerder goedgekeurd en verzonden.'), {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  if (lead.status !== 'pending_approval') {
    return new NextResponse(errorPage('Onverwachte status', `De offerte heeft status "${lead.status}" en kan niet worden goedgekeurd.`), {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  // Bereken prijs
  const m2 = parseFloat(lead.m2) || 30
  const pricing = calculateDemoPrice(m2, lead.steentype || 'klinkers', lead.planten || 'nee')

  // Stuur offerte via WhatsApp
  const quoteMessage = `Goed nieuws, ${lead.naam}!

Je offerte is goedgekeurd en staat klaar:

Type pand: ${lead.type_pand}
Oppervlakte: ${lead.m2} m\u00B2
Steentype: ${lead.steentype}
Planten: ${lead.planten}

Totaalprijs: \u20AC${pricing.total.toFixed(2)}

---
Dit was een demo van het Frontlix automatiseringssysteem.
Van formulier tot offerte \u2014 volledig automatisch.

Wil je dit voor jouw bedrijf?
\u2192 Plan een gratis gesprek: https://frontlix.com/contact`

  try {
    await sendWhatsAppText(lead.telefoon, quoteMessage)
  } catch (waErr) {
    console.error('WhatsApp quote failed:', waErr)
  }

  // Sla bericht op in conversations
  await getSupabase().from('demo_conversations').insert({
    lead_id: lead.id,
    role: 'assistant',
    content: quoteMessage,
  })

  // Update status
  await getSupabase()
    .from('demo_leads')
    .update({ status: 'quote_sent' })
    .eq('id', lead.id)

  // Toon bevestigingspagina
  return new NextResponse(successPage(lead.naam), {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

function successPage(naam: string): string {
  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Offerte goedgekeurd - Frontlix</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #F0F2F5;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: #FFFFFF;
      border-radius: 16px;
      padding: 48px 40px;
      max-width: 520px;
      width: 100%;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
      text-align: center;
    }
    .icon {
      width: 56px; height: 56px;
      border-radius: 50%;
      background: #16a34a;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
    }
    .icon svg { width: 28px; height: 28px; stroke: white; stroke-width: 2.5; fill: none; }
    h1 {
      font-size: 22px;
      font-weight: 700;
      color: #1A1A1A;
      margin-bottom: 12px;
    }
    p { font-size: 15px; color: #555555; line-height: 1.6; margin-bottom: 8px; }
    .divider { height: 1px; background: #E5E7EB; margin: 24px 0; }
    .badge {
      display: inline-block;
      background: linear-gradient(135deg, #1A56FF, #00CFFF);
      color: white;
      font-size: 12px;
      font-weight: 600;
      padding: 6px 14px;
      border-radius: 20px;
      margin-bottom: 24px;
    }
    .cta {
      display: inline-block;
      background: linear-gradient(135deg, #1A56FF, #00CFFF);
      color: white;
      text-decoration: none;
      font-size: 15px;
      font-weight: 600;
      padding: 14px 28px;
      border-radius: 10px;
      margin-top: 8px;
    }
    .cta:hover { opacity: 0.9; }
    .footer { font-size: 12px; color: #999999; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Frontlix Demo</div>
    <div class="icon">
      <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
    </div>
    <h1>Offerte succesvol goedgekeurd</h1>
    <p>De offerte is automatisch verzonden naar ${naam} via WhatsApp.</p>
    <p>Check je WhatsApp om het resultaat te zien!</p>
    <div class="divider"></div>
    <p style="font-size: 14px; color: #1A1A1A; font-weight: 600;">Dit is wat Frontlix voor jouw bedrijf kan doen.</p>
    <p style="font-size: 14px;">Van leadformulier tot offerte — volledig automatisch, via WhatsApp.</p>
    <a href="https://frontlix.com/contact" class="cta">Plan een gratis gesprek</a>
    <p class="footer">Frontlix Automatisering</p>
  </div>
</body>
</html>`
}

function errorPage(title: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Frontlix</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #F0F2F5;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: #FFFFFF;
      border-radius: 16px;
      padding: 48px 40px;
      max-width: 520px;
      width: 100%;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
      text-align: center;
    }
    h1 { font-size: 22px; font-weight: 700; color: #1A1A1A; margin-bottom: 12px; }
    p { font-size: 15px; color: #555555; line-height: 1.6; }
    a { color: #1A56FF; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${message}</p>
    <p style="margin-top: 24px;"><a href="https://frontlix.com">Terug naar Frontlix</a></p>
  </div>
</body>
</html>`
}
