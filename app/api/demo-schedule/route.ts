/**
 * Browser scheduling pagina voor branche-demo klanten.
 *
 * Wordt aangeroepen vanuit de "Afspraak inplannen" knop in de klant-email.
 *
 * GET  /api/demo-schedule?token=...  → render HTML met 6 vrije slots als cards
 * POST /api/demo-schedule             → boekt het gekozen slot in Google Calendar
 *                                       en toont een bevestigingspagina
 *
 * Hergebruikt dezelfde getFreeSlots/createEvent helpers als de WhatsApp
 * scheduling agent — single source of truth voor beschikbaarheid.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { getFreeSlots, createEvent, TIMEZONE, type FreeSlot } from '@/lib/google-calendar'
import { addDays } from 'date-fns'
import { format as formatTz } from 'date-fns-tz'
import { getBranche, type BrancheId } from '@/lib/branches'

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

const NUM_SLOTS_TO_SHOW = 6

// ─── GET ────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return errorResponse('Ongeldige link', 'Er ontbreekt een token in de URL.', 400)

  const lead = await fetchLeadByToken(token)
  if (!lead) return errorResponse('Niet gevonden', 'Deze link is ongeldig of verlopen.', 404)

  // Al een afspraak ingepland?
  if (lead.status === 'appointment_booked') {
    const at = (lead.collected_data as Record<string, unknown> | null)?._appointment_at
    const dt = typeof at === 'string' ? new Date(at) : null
    return htmlResponse(alreadyBookedPage(lead.naam || 'klant', dt))
  }

  // Haal vrije slots op (zelfde regels als WhatsApp scheduling agent)
  const now = new Date()
  const rangeEnd = addDays(now, 14)
  let slots: FreeSlot[] = []
  try {
    slots = await getFreeSlots(now, rangeEnd, NUM_SLOTS_TO_SHOW)
  } catch (err) {
    console.error('[demo-schedule] getFreeSlots failed:', err)
    return errorResponse('Agenda onbereikbaar', 'We konden onze agenda even niet bereiken. Probeer het over een paar minuten opnieuw.', 500)
  }

  if (slots.length === 0) {
    return htmlResponse(noSlotsPage(lead.naam || 'klant'))
  }

  return htmlResponse(renderSlotsPage(lead, slots))
}

// ─── POST ───────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const token = (formData.get('token') as string) || ''
  const slotIso = (formData.get('slot') as string) || ''

  if (!token || !slotIso) return errorResponse('Ongeldige request', 'Token of slot ontbreekt.', 400)

  const lead = await fetchLeadByToken(token)
  if (!lead) return errorResponse('Niet gevonden', 'Token onbekend of verlopen.', 404)
  if (lead.status === 'appointment_booked') {
    return errorResponse('Al ingepland', 'Er staat al een afspraak voor deze offerte.', 200)
  }

  // Reconstrueer slot — moet nog vrij zijn op het moment van klikken
  const startUtc = new Date(slotIso)
  const endUtc = new Date(startUtc.getTime() + 30 * 60 * 1000)

  // Verifieer dat slot nog vrij is door opnieuw vrije slots op te halen
  const now = new Date()
  const rangeEnd = addDays(now, 14)
  const freshSlots = await getFreeSlots(now, rangeEnd, 50)
  const stillFree = freshSlots.some((s) => s.iso === slotIso)
  if (!stillFree) {
    return htmlResponse(slotTakenPage(lead, freshSlots.slice(0, NUM_SLOTS_TO_SHOW)))
  }

  // Maak event aan
  const branche = lead.demo_type ? getBranche(lead.demo_type) : null
  const summary = `Frontlix demo gesprek met ${lead.naam || 'klant'}${branche ? ` (${branche.label})` : ''}`
  const description = `Demo afspraak ingepland via offerte e-mail.\n\nKlant: ${lead.naam}\nEmail: ${lead.email}\nTelefoon: +${lead.telefoon}\nBranche: ${branche?.label || lead.demo_type || 'onbekend'}`

  let eventId = ''
  try {
    const result = await createEvent({
      startUtc,
      endUtc,
      summary,
      description,
      attendeeEmail: lead.email || undefined,
    })
    eventId = result.eventId
  } catch (err) {
    console.error('[demo-schedule] createEvent failed:', err)
    return errorResponse('Inplannen mislukt', 'Er ging iets mis bij het aanmaken van de afspraak. Een collega neemt contact met je op.', 500)
  }

  // Update lead status
  const collected = { ...(lead.collected_data || {}) } as Record<string, unknown>
  collected._appointment_at = slotIso
  collected._google_event_id = eventId
  await getSupabase()
    .from('leads')
    .update({
      status: 'appointment_booked',
      collected_data: collected,
      updated_at: new Date().toISOString(),
    })
    .eq('id', lead.id)

  return htmlResponse(bookedSuccessPage(lead.naam || 'klant', startUtc))
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/** Splitst slot label "ma 14 apr 14:00" in datum + tijd voor visueel onderscheid */
function formatSlotLabel(s: FreeSlot): { weekday: string; date: string; time: string } {
  const weekday = formatTz(s.startUtc, 'EEEE', { timeZone: TIMEZONE })
  const date = formatTz(s.startUtc, "d MMMM", { timeZone: TIMEZONE })
  const time = formatTz(s.startUtc, 'HH:mm', { timeZone: TIMEZONE })
  return { weekday, date, time }
}

// ─── HTML rendering ─────────────────────────────────────────────────────

function pageShell(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} — Frontlix</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif;
      background: #F0F2F5;
      color: #1A1A1A;
      padding: 40px 20px;
      line-height: 1.5;
      min-height: 100vh;
    }
    .container { max-width: 720px; margin: 0 auto; }
    .header {
      background: linear-gradient(135deg, #1A56FF, #00CFFF);
      color: white;
      padding: 36px 40px;
      border-radius: 16px 16px 0 0;
      text-align: center;
    }
    .header h1 { font-size: 24px; font-weight: 700; letter-spacing: -0.3px; }
    .header p { font-size: 15px; opacity: 0.9; margin-top: 8px; }
    .card {
      background: white;
      padding: 36px 40px;
      border-radius: 0 0 16px 16px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.04);
    }
    .slots {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 12px;
      margin: 24px 0 8px;
    }
    .slot-form { margin: 0; }
    .slot-btn {
      width: 100%;
      background: white;
      border: 2px solid #E5E7EB;
      border-radius: 12px;
      padding: 18px 16px;
      cursor: pointer;
      font-family: inherit;
      text-align: left;
      transition: all 0.15s;
    }
    .slot-btn:hover {
      border-color: #1A56FF;
      background: #F5F8FF;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(26, 86, 255, 0.12);
    }
    .slot-weekday {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #1A56FF;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .slot-date {
      font-size: 16px;
      font-weight: 700;
      color: #1A1A1A;
      margin-bottom: 2px;
    }
    .slot-time {
      font-size: 14px;
      color: #555;
    }
    .info {
      margin-top: 24px;
      padding: 16px 20px;
      background: #F5F7FA;
      border-radius: 12px;
      font-size: 13px;
      color: #555;
      line-height: 1.6;
    }
    .info strong { color: #1A1A1A; }
    .success-icon {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: #16a34a;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
    }
    .success-icon svg { width: 32px; height: 32px; stroke: white; stroke-width: 3; fill: none; }
    .success-text { text-align: center; }
    .success-text h2 { font-size: 22px; font-weight: 700; margin-bottom: 12px; }
    .success-text p { font-size: 15px; color: #555; margin-bottom: 8px; }
    .badge {
      display: inline-block;
      background: linear-gradient(135deg, #1A56FF, #00CFFF);
      color: white;
      padding: 8px 18px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 700;
      margin: 8px 0 16px;
    }
  </style>
</head>
<body>
  <div class="container">
    ${body}
  </div>
</body>
</html>`
}

function renderSlotsPage(lead: BrancheLeadRow, slots: FreeSlot[]): string {
  const safeToken = escapeHtml(lead.approval_token || '')
  const slotsHtml = slots
    .map((s) => {
      const { weekday, date, time } = formatSlotLabel(s)
      return `
        <form class="slot-form" method="POST" action="/api/demo-schedule">
          <input type="hidden" name="token" value="${safeToken}" />
          <input type="hidden" name="slot" value="${escapeHtml(s.iso)}" />
          <button type="submit" class="slot-btn">
            <div class="slot-weekday">${escapeHtml(weekday)}</div>
            <div class="slot-date">${escapeHtml(date)}</div>
            <div class="slot-time">${escapeHtml(time)} — ${escapeHtml(formatTz(s.endUtc, 'HH:mm', { timeZone: TIMEZONE }))}</div>
          </button>
        </form>`
    })
    .join('')

  return pageShell(
    'Plan je afspraak',
    `
    <div class="header">
      <h1>Plan je gratis kennismaking</h1>
      <p>Kies een moment dat jou uitkomt — 30 minuten</p>
    </div>
    <div class="card">
      <p style="color: #555; margin-bottom: 8px;">Hoi <strong>${escapeHtml(lead.naam || 'daar')}</strong>, leuk dat je een gesprek wil inplannen! Klik op een van de momenten hieronder om de afspraak te bevestigen.</p>
      <div class="slots">${slotsHtml}</div>
      <div class="info">
        <strong>Wat gebeurt er na je keuze?</strong><br>
        Het moment wordt direct gereserveerd in onze agenda en je krijgt een Google Calendar uitnodiging in je inbox. Je kunt 'm zo aan je eigen agenda toevoegen.
      </div>
    </div>
  `
  )
}

function bookedSuccessPage(naam: string, when: Date): string {
  const dt = formatTz(when, "EEEE d MMMM 'om' HH:mm", { timeZone: TIMEZONE })
  return pageShell(
    'Afspraak ingepland',
    `
    <div class="header">
      <h1>Afspraak ingepland</h1>
      <p>We zien je dan!</p>
    </div>
    <div class="card">
      <div class="success-icon">
        <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <div class="success-text">
        <span class="badge">Bevestigd</span>
        <h2>Top, ${escapeHtml(naam.split(' ')[0])}!</h2>
        <p>Je afspraak staat in de agenda voor:</p>
        <p style="font-size: 17px; font-weight: 700; color: #1A1A1A; margin: 12px 0 20px;">${escapeHtml(dt)}</p>
        <p>Je krijgt zo een Google Calendar uitnodiging in je mail. Tot dan!</p>
      </div>
    </div>
  `
  )
}

function alreadyBookedPage(naam: string, when: Date | null): string {
  const dt = when ? formatTz(when, "EEEE d MMMM 'om' HH:mm", { timeZone: TIMEZONE }) : null
  return pageShell(
    'Al ingepland',
    `
    <div class="header">
      <h1>Er staat al een afspraak</h1>
      <p>Voor deze offerte is er al een gesprek gepland</p>
    </div>
    <div class="card">
      <p style="color: #555;">Hoi ${escapeHtml(naam.split(' ')[0])}, er staat al een afspraak voor deze offerte${dt ? ` op <strong>${escapeHtml(dt)}</strong>` : ''}.</p>
      <p style="color: #555; margin-top: 12px;">Wil je 'm verzetten? Reageer gewoon op je bevestigingsmail of stuur ons een appje.</p>
    </div>
  `
  )
}

function noSlotsPage(naam: string): string {
  return pageShell(
    'Geen slots beschikbaar',
    `
    <div class="header">
      <h1>Geen vrije momenten</h1>
      <p>Er staan komende 2 weken helaas geen slots open</p>
    </div>
    <div class="card">
      <p style="color: #555;">Hoi ${escapeHtml(naam.split(' ')[0])}, het lijkt erop dat onze agenda komende twee weken volzit. Een collega neemt persoonlijk contact met je op om een moment in te plannen.</p>
    </div>
  `
  )
}

function slotTakenPage(lead: BrancheLeadRow, slots: FreeSlot[]): string {
  return pageShell(
    'Slot net gepakt',
    `
    <div class="header">
      <h1>Net iemand voor je</h1>
      <p>Dat moment is net gepakt — kies een ander</p>
    </div>
    <div class="card">
      <p style="color: #555; margin-bottom: 16px;">Sorry, het moment dat je koos is net door iemand anders geboekt. Hieronder zie je de actuele vrije momenten:</p>
      ${slots.length > 0 ? renderSlotsInline(lead, slots) : '<p style="color: #555;">Er zijn op dit moment geen andere slots vrij. Probeer het later opnieuw.</p>'}
    </div>
  `
  )
}

function renderSlotsInline(lead: BrancheLeadRow, slots: FreeSlot[]): string {
  const safeToken = escapeHtml(lead.approval_token || '')
  const slotsHtml = slots
    .map((s) => {
      const { weekday, date, time } = formatSlotLabel(s)
      return `
        <form class="slot-form" method="POST" action="/api/demo-schedule">
          <input type="hidden" name="token" value="${safeToken}" />
          <input type="hidden" name="slot" value="${escapeHtml(s.iso)}" />
          <button type="submit" class="slot-btn">
            <div class="slot-weekday">${escapeHtml(weekday)}</div>
            <div class="slot-date">${escapeHtml(date)}</div>
            <div class="slot-time">${escapeHtml(time)}</div>
          </button>
        </form>`
    })
    .join('')
  return `<div class="slots">${slotsHtml}</div>`
}

function errorPage(title: string, message: string): string {
  return pageShell(
    title,
    `
    <div class="header">
      <h1>${escapeHtml(title)}</h1>
    </div>
    <div class="card">
      <p style="color: #555; text-align: center;">${escapeHtml(message)}</p>
      <p style="color: #888; font-size: 13px; text-align: center; margin-top: 24px;">
        <a href="https://frontlix.com" style="color: #1A56FF; text-decoration: none;">Terug naar Frontlix</a>
      </p>
    </div>
  `
  )
}
