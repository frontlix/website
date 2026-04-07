/**
 * Edit-pagina voor branche-offertes.
 *
 * Wordt aangeroepen vanuit de "Wijzigen" knop in de approval-mail.
 *
 * GET  /api/demo-edit?token=...           → render edit form HTML
 * POST /api/demo-edit (action=recalculate) → save nieuwe waarden + render form opnieuw met nieuwe prijs
 * POST /api/demo-edit (action=approve)     → save nieuwe waarden + redirect naar /api/demo-approve
 *
 * Form velden:
 *  - naam, email   → text input (top-level kolommen op leads)
 *  - branche velden → enum velden als <select>, andere als text input
 *  - m² / aantallen / vrije text → text input
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { getBranche, type BrancheConfig, type BrancheId } from '@/lib/branches'

interface BrancheLeadRow {
  id: string
  naam: string | null
  email: string | null
  telefoon: string
  demo_type: BrancheId | null
  status: string
  collected_data: Record<string, unknown> | null
  approval_token: string | null
}

// ─── GET: render edit form ──────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return errorResponse('Ongeldige link', 'Deze link werkt niet meer. Open de "Wijzigen"-knop in je e-mail opnieuw.', 400)

  const lead = await fetchLeadByToken(token)
  if (!lead) return errorResponse('Link werkt niet meer', 'Deze edit-link is verlopen. Vraag een nieuwe demo aan via het formulier op frontlix.com — dan sturen we je een nieuwe goedkeuringsmail met een werkende edit-link.', 404)
  if (!lead.demo_type) return errorResponse('Onvolledige lead', 'Deze offerte mist een branche-keuze. Mail naar info@frontlix.com — we lossen het voor je op.', 400)
  const branche = getBranche(lead.demo_type)
  if (!branche) return errorResponse('Onbekende branche', `De branche van deze offerte is niet bekend. Mail naar info@frontlix.com — we lossen het voor je op.`, 400)

  if (lead.status === 'quote_processing') {
    return errorResponse('Even geduld', 'De offerte wordt op dit moment al verwerkt. Wacht een minuutje en check daarna je e-mail — daar staat de bevestiging.', 200)
  }
  if (lead.status === 'quote_sent' || lead.status === 'scheduling' || lead.status === 'appointment_booked') {
    return errorResponse('Al verzonden', 'Deze offerte is al goedgekeurd en naar de klant verstuurd. Wijzigingen zijn nu niet meer mogelijk. Heb je nog een vraag? Mail naar info@frontlix.com.', 200)
  }

  return htmlResponse(renderEditForm(lead, branche, null))
}

// ─── POST: recalculate of approve ───────────────────────────────────────

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const token = (formData.get('token') as string) || ''
  const action = (formData.get('action') as string) || ''

  if (!token) return errorResponse('Ongeldige request', 'Deze actie kon niet worden verwerkt. Open de "Wijzigen"-knop in je e-mail opnieuw.', 400)

  const lead = await fetchLeadByToken(token)
  if (!lead) return errorResponse('Link werkt niet meer', 'Deze edit-link is verlopen. Vraag een nieuwe demo aan via het formulier op frontlix.com.', 404)
  if (!lead.demo_type) return errorResponse('Onvolledige lead', 'Deze offerte mist een branche-keuze. Mail naar info@frontlix.com.', 400)
  const branche = getBranche(lead.demo_type)
  if (!branche) return errorResponse('Onbekende branche', `De branche van deze offerte is niet bekend. Mail naar info@frontlix.com.`, 400)

  // Pak alle form values en update de lead state
  const newNaam = ((formData.get('naam') as string) || '').trim() || lead.naam
  const newEmail = ((formData.get('email') as string) || '').trim() || lead.email

  // M4: lengtes valideren — voorkom dat een 100KB POST de PDF rendering breekt
  if (newNaam && newNaam.length > 200) {
    return errorResponse('Naam te lang', 'De naam mag maximaal 200 tekens zijn. Pas hem aan en probeer het opnieuw.', 400)
  }
  if (newEmail && newEmail.length > 254) {
    return errorResponse('Email te lang', 'Het e-mailadres mag maximaal 254 tekens zijn. Pas het aan en probeer het opnieuw.', 400)
  }

  const newCollected: Record<string, unknown> = { ...(lead.collected_data || {}) }
  for (const field of branche.fields) {
    const v = formData.get(`field_${field.key}`)
    if (typeof v === 'string') {
      const trimmed = v.trim()
      if (trimmed.length > 500) {
        return errorResponse('Veld te lang', `Het veld "${field.label}" mag maximaal 500 tekens zijn. Pas het aan en probeer het opnieuw.`, 400)
      }
      if (trimmed) newCollected[field.key] = trimmed
    }
  }

  // C1: bereken de oude totaalprijs vóór de update zodat we 'm kunnen tonen als diff
  const oldPricingAnswers: Record<string, string> = {}
  for (const [k, v] of Object.entries((lead.collected_data || {}) as Record<string, unknown>)) {
    if (typeof v === 'string' || typeof v === 'number') oldPricingAnswers[k] = String(v)
  }
  const previousTotal = branche.pricing(oldPricingAnswers).totaalInclBtw

  // Save naar DB — single source of truth
  await getSupabase()
    .from('leads')
    .update({
      naam: newNaam,
      email: newEmail,
      collected_data: newCollected,
      updated_at: new Date().toISOString(),
    })
    .eq('id', lead.id)

  // Bij approve → redirect naar bestaande approve route (die genereert PDF + WhatsApp)
  if (action === 'approve') {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://frontlix.com'
    return NextResponse.redirect(`${siteUrl}/api/demo-approve?token=${token}`, { status: 303 })
  }

  // Bij recalculate (default) → render form opnieuw met de nieuwe prijs zichtbaar
  const updatedLead: BrancheLeadRow = {
    ...lead,
    naam: newNaam,
    email: newEmail,
    collected_data: newCollected,
  }
  return htmlResponse(renderEditForm(updatedLead, branche, 'recalculated', previousTotal))
}

// ─── Helpers ────────────────────────────────────────────────────────────

async function fetchLeadByToken(token: string): Promise<BrancheLeadRow | null> {
  const { data } = await getSupabase()
    .from('leads')
    .select('*')
    .eq('approval_token', token)
    .limit(1)
    .single()
  return data as BrancheLeadRow | null
}

function htmlResponse(html: string): NextResponse {
  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

function errorResponse(title: string, message: string, status: number): NextResponse {
  return new NextResponse(errorPage(title, message), {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

/** Format euro bedrag — Nederlandse stijl met komma als decimaal */
function euro(n: number): string {
  return `\u20AC ${n.toFixed(2).replace('.', ',')}`
}

/** Escape HTML special chars zodat user input geen XSS mogelijk maakt */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// ─── HTML rendering ─────────────────────────────────────────────────────

/**
 * Rendert het volledige edit form HTML.
 * @param flag            als 'recalculated' tonen we een groene "prijs bijgewerkt" badge
 * @param previousTotal   als gezet tonen we in de banner de vorige → nieuwe prijs diff
 */
function renderEditForm(
  lead: BrancheLeadRow,
  branche: BrancheConfig,
  flag: 'recalculated' | null,
  previousTotal: number | null = null
): string {
  const collected = (lead.collected_data || {}) as Record<string, unknown>

  // Bouw alle field inputs
  const fieldInputsHtml = branche.fields
    .map((field) => {
      const currentValue = (collected[field.key] as string | undefined) ?? ''
      const safeValue = escapeHtml(String(currentValue))
      const inputName = `field_${field.key}`
      const labelText = `${field.label.charAt(0).toUpperCase()}${field.label.slice(1)}${field.unit ? ` (${field.unit})` : ''}`

      // Enum velden → dropdown
      if (field.type === 'enum' && field.enumValues && field.enumValues.length > 0) {
        const options = field.enumValues
          .map((v) => {
            const selected = v.toLowerCase() === currentValue.toLowerCase() ? ' selected' : ''
            return `<option value="${escapeHtml(v)}"${selected}>${escapeHtml(v)}</option>`
          })
          .join('')
        return `
          <div class="field">
            <label for="${inputName}">${escapeHtml(labelText)}</label>
            <select id="${inputName}" name="${inputName}">
              <option value="">— kies —</option>
              ${options}
            </select>
          </div>`
      }

      // Number/text/email → text input
      const inputType = field.type === 'number' ? 'text' : 'text'
      return `
        <div class="field">
          <label for="${inputName}">${escapeHtml(labelText)}</label>
          <input type="${inputType}" id="${inputName}" name="${inputName}" value="${safeValue}" />
        </div>`
    })
    .join('')

  // Pricing breakdown — herbereken on the fly
  const pricingAnswers: Record<string, string> = {}
  for (const [k, v] of Object.entries(collected)) {
    if (typeof v === 'string' || typeof v === 'number') pricingAnswers[k] = String(v)
  }
  const pricing = branche.pricing(pricingAnswers)

  const priceRowsHtml = pricing.lines
    .map(
      (l) =>
        `<tr><td>${escapeHtml(l.omschrijving)}</td><td>${l.aantal} ${escapeHtml(l.eenheid)}</td><td style="text-align:right">${euro(l.prijsPerEenheid)}</td><td style="text-align:right">${euro(l.totaal)}</td></tr>`
    )
    .join('')

  // C1: toon oude → nieuwe prijs als die gewijzigd is
  let recalculatedBanner = ''
  if (flag === 'recalculated') {
    const diffText =
      previousTotal !== null && Math.abs(previousTotal - pricing.totaalInclBtw) > 0.005
        ? ` De prijs is bijgewerkt van <strong>${euro(previousTotal)}</strong> naar <strong>${euro(pricing.totaalInclBtw)}</strong>.`
        : ' De prijs is ongewijzigd gebleven.'
    recalculatedBanner = `<div class="banner">✓ Wijzigingen opgeslagen.${diffText}</div>`
  }

  // C1: subtiele hint bovenaan — legt uit hoe je terug komt
  const backHint = `
    <p style="margin: 0 0 20px; padding: 12px 16px; background: #F5F8FF; border-left: 3px solid #1A56FF; border-radius: 4px; font-size: 13px; color: #555;">
      💡 Je hebt deze pagina geopend via de e-mail. Sluit het tabblad om terug te gaan naar je inbox.
    </p>
  `

  const safeName = escapeHtml(lead.naam || '')
  const safeEmail = escapeHtml(lead.email || '')
  const safeToken = escapeHtml(lead.approval_token || '')

  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Offerte wijzigen — ${escapeHtml(branche.label)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif;
      background: #F0F2F5;
      color: #1A1A1A;
      padding: 40px 20px;
      line-height: 1.5;
    }
    .container {
      max-width: 720px;
      margin: 0 auto;
    }
    .header {
      background: linear-gradient(135deg, #1A56FF, #00CFFF);
      color: white;
      padding: 32px 40px;
      border-radius: 16px 16px 0 0;
      text-align: center;
    }
    .header h1 { font-size: 22px; font-weight: 700; }
    .header p { font-size: 14px; opacity: 0.9; margin-top: 6px; }
    .card {
      background: white;
      padding: 32px 40px;
      border-radius: 0 0 16px 16px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.04);
    }
    .banner {
      background: #DCFCE7;
      color: #166534;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 24px;
      border: 1px solid #BBF7D0;
    }
    h2 {
      font-size: 16px;
      font-weight: 700;
      color: #1A1A1A;
      margin: 24px 0 12px;
      padding-bottom: 8px;
      border-bottom: 2px solid #F0F2F5;
    }
    h2:first-of-type { margin-top: 0; }
    .field {
      margin-bottom: 14px;
    }
    .field label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: #555;
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .field input, .field select {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      font-size: 15px;
      font-family: inherit;
      color: #1A1A1A;
      background: #FAFBFC;
    }
    .field input:focus, .field select:focus {
      outline: none;
      border-color: #1A56FF;
      background: white;
    }
    table.pricing {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      font-size: 14px;
    }
    table.pricing thead th {
      text-align: left;
      padding: 8px 10px;
      background: #F5F7FA;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: #555;
      font-weight: 700;
    }
    table.pricing thead th:nth-child(2),
    table.pricing thead th:nth-child(3),
    table.pricing thead th:nth-child(4) {
      text-align: right;
    }
    table.pricing tbody td {
      padding: 10px;
      border-bottom: 1px solid #F0F2F5;
    }
    .totals {
      margin-top: 16px;
      padding: 16px 20px;
      background: #F5F7FA;
      border-radius: 12px;
    }
    .totals .row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      font-size: 14px;
      color: #555;
    }
    .totals .row.grand {
      margin-top: 8px;
      padding-top: 12px;
      border-top: 2px solid #E5E7EB;
      font-size: 18px;
      font-weight: 700;
      color: #1A56FF;
    }
    .actions {
      display: flex;
      gap: 12px;
      margin-top: 32px;
    }
    .actions button {
      flex: 1;
      padding: 16px 24px;
      font-size: 15px;
      font-weight: 700;
      border-radius: 10px;
      border: none;
      cursor: pointer;
      font-family: inherit;
    }
    .btn-recalc {
      background: #1A56FF;
      color: white;
      border: none;
    }
    .btn-recalc:hover { background: #1547d6; }
    .btn-approve {
      background: #16a34a;
      color: white;
      border: none;
    }
    .btn-approve:hover { background: #15803d; }
    .footer {
      text-align: center;
      margin-top: 24px;
      font-size: 12px;
      color: #888;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Offerte wijzigen</h1>
      <p>${escapeHtml(branche.label)} — ${escapeHtml(lead.naam || 'klant')}</p>
    </div>
    <div class="card">
      ${backHint}
      ${recalculatedBanner}

      <form method="POST" action="/api/demo-edit">
        <input type="hidden" name="token" value="${safeToken}" />

        <h2>Klantgegevens</h2>
        <div class="field">
          <label for="naam">Naam</label>
          <input type="text" id="naam" name="naam" value="${safeName}" />
        </div>
        <div class="field">
          <label for="email">E-mailadres</label>
          <input type="email" id="email" name="email" value="${safeEmail}" />
        </div>

        <h2>Aanvraag details</h2>
        ${fieldInputsHtml}

        <h2>Huidige prijsopbouw</h2>
        <table class="pricing">
          <thead>
            <tr><th>Omschrijving</th><th>Aantal</th><th>Per stuk</th><th>Totaal</th></tr>
          </thead>
          <tbody>
            ${priceRowsHtml}
          </tbody>
        </table>

        <div class="totals">
          <div class="row"><span>Subtotaal excl. BTW</span><span>${euro(pricing.subtotaalExclBtw)}</span></div>
          <div class="row"><span>BTW (21%)</span><span>${euro(pricing.btwBedrag)}</span></div>
          <div class="row grand"><span>Totaal incl. BTW</span><span>${euro(pricing.totaalInclBtw)}</span></div>
        </div>

        <div class="actions">
          <button type="submit" name="action" value="recalculate" class="btn-recalc">
            Opnieuw berekenen
          </button>
          <button type="submit" name="action" value="approve" class="btn-approve">
            Goedkeuren
          </button>
        </div>
      </form>

      <p class="footer">
        Wijzigingen worden direct opgeslagen. Bij goedkeuren wordt de PDF automatisch naar de klant verzonden.
      </p>
    </div>
  </div>
</body>
</html>`
}

function errorPage(title: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="nl"><head><meta charset="UTF-8"><title>${escapeHtml(title)} — Frontlix</title>
<style>body{font-family:-apple-system,sans-serif;background:#F0F2F5;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}.card{background:#fff;border-radius:16px;padding:48px 40px;max-width:520px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.08)}h1{font-size:22px;font-weight:700;color:#1A1A1A;margin-bottom:12px}p{font-size:15px;color:#555;line-height:1.6}a{color:#1A56FF;text-decoration:none}</style>
</head><body><div class="card"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p><p style="margin-top:24px"><a href="https://frontlix.com">Terug naar Frontlix</a></p></div></body></html>`
}
