/**
 * Browser scheduling pagina voor branche-demo klanten.
 *
 * Wordt aangeroepen vanuit een van de 2 knoppen in de klant-email:
 *  - ?type=plaatsing     → de uitvoering inplannen (akkoord met offerte)
 *  - ?type=kennismaking  → eerst kennismakingsgesprek
 *
 * GET  /api/demo-schedule?token=...&type=...  → render HTML met alle vrije slots gegroepeerd per dag
 * POST /api/demo-schedule (slot, type, token) → boekt het gekozen slot in Google Calendar
 *
 * Hergebruikt dezelfde getFreeSlots/createEvent helpers als de WhatsApp
 * scheduling agent — single source of truth voor beschikbaarheid.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { getFreeSlots, createEvent, TIMEZONE, type FreeSlot } from '@/lib/google-calendar'
import { addDays } from 'date-fns'
import { nl } from 'date-fns/locale'
import { format as formatTz } from 'date-fns-tz'
import { getBranche, type BrancheId } from '@/lib/branches'

/** Eerste letter capitalizen — voor "woensdag 8 april" → "Woensdag 8 april" */
function capitalize(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1)
}

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

type AfspraakType = 'plaatsing' | 'kennismaking'

/**
 * Aantal dagen vooruit per type. Voor de plaatsing wil je een ruimere
 * doorlooptijd, voor de kennismaking wil je dat het snel kan.
 */
const RANGE_DAYS: Record<AfspraakType, number> = {
  kennismaking: 14,
  plaatsing: 90,
}

/** Max aantal slots per query — schaalt mee met de range */
const SLOTS_PER_DAY_ESTIMATE = 16
function maxSlotsForRange(days: number): number {
  return days * SLOTS_PER_DAY_ESTIMATE
}

function parseAfspraakType(s: string | null | undefined): AfspraakType | null {
  if (s === 'plaatsing') return 'plaatsing'
  if (s === 'kennismaking') return 'kennismaking'
  return null
}

/**
 * Voor plaatsing-afspraken willen we maar één slot per dag tonen ("hele dag"),
 * niet de hele 09:00 / 09:30 / 10:00 grid. We pakken het eerste vrije slot van
 * elke dag — dat wordt de start van de werkdag in het Google Calendar event.
 *
 * Voor kennismaking blijven we de hele lijst tonen.
 */
function reduceToDaySlots(slots: FreeSlot[]): FreeSlot[] {
  const seenDays = new Set<string>()
  const result: FreeSlot[] = []
  for (const s of slots) {
    const dayKey = formatTz(s.startUtc, 'yyyy-MM-dd', { timeZone: TIMEZONE })
    if (seenDays.has(dayKey)) continue
    seenDays.add(dayKey)
    result.push(s)
  }
  return result
}

function afspraakTypeLabel(type: AfspraakType, lead: BrancheLeadRow): string {
  const branche = lead.demo_type ? getBranche(lead.demo_type) : null
  if (type === 'plaatsing') {
    return branche?.actieKort || 'Afspraak inplannen'
  }
  return 'Kennismakingsgesprek'
}

function afspraakTypeSubtitle(type: AfspraakType, lead: BrancheLeadRow): string {
  const branche = lead.demo_type ? getBranche(lead.demo_type) : null
  if (type === 'plaatsing') {
    // Branche-specifieke tekst voor wat er ingepland wordt — geen "30 minuten",
    // want een plaatsing duurt langer dan een gespreksslot.
    switch (branche?.id) {
      case 'zonnepanelen':
        return 'Kies de dag waarop wij de zonnepanelen komen installeren'
      case 'dakdekker':
        return 'Kies de dag waarop we beginnen met het dakwerk'
      case 'schoonmaak':
        return 'Kies de dag van de eerste schoonmaak'
      default:
        return 'Kies een dag die jou uitkomt'
    }
  }
  return 'Gratis kennismaking om de offerte door te spreken — 30 minuten'
}

// ─── GET ────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  const type = parseAfspraakType(req.nextUrl.searchParams.get('type'))
  if (!token) return errorResponse('Ongeldige link', 'Deze link werkt niet meer. Vraag een nieuwe demo aan via het formulier op onze website.', 400)
  if (!type) return errorResponse('Ongeldige link', 'Het afspraak-type in de URL is niet geldig. Open de link uit je e-mail opnieuw of vraag een nieuwe offerte aan.', 400)

  const lead = await fetchLeadByToken(token)
  if (!lead) return errorResponse('Link werkt niet meer', 'Deze planningslink is verlopen of niet meer geldig. Vraag een nieuwe demo aan via het formulier op frontlix.com — dan sturen we je een nieuwe offerte met een werkende link.', 404)

  // Al een afspraak ingepland?
  if (lead.status === 'appointment_booked') {
    const at = (lead.collected_data as Record<string, unknown> | null)?._appointment_at
    const dt = typeof at === 'string' ? new Date(at) : null
    return htmlResponse(alreadyBookedPage(lead.naam || 'klant', dt))
  }

  // Haal alle vrije slots op (zelfde regels als WhatsApp scheduling agent).
  // De range hangt af van het type: 14 dagen voor kennismaking, 90 voor plaatsing.
  const rangeDays = RANGE_DAYS[type]
  const now = new Date()
  const rangeEnd = addDays(now, rangeDays)
  let slots: FreeSlot[] = []
  try {
    slots = await getFreeSlots(now, rangeEnd, maxSlotsForRange(rangeDays))
  } catch (err) {
    console.error('[demo-schedule] getFreeSlots failed:', err)
    return errorResponse('Agenda onbereikbaar', 'We konden onze agenda even niet bereiken. Probeer het over een paar minuten opnieuw.', 500)
  }

  // Voor plaatsing: één slot per dag (hele werkdag), voor kennismaking: alle 30-min slots
  if (type === 'plaatsing') {
    slots = reduceToDaySlots(slots)
  }

  if (slots.length === 0) {
    return htmlResponse(noSlotsPage(lead.naam || 'klant', rangeDays))
  }

  return htmlResponse(renderSlotsPage(lead, slots, type, rangeDays))
}

// ─── POST ───────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const token = (formData.get('token') as string) || ''
  const slotIso = (formData.get('slot') as string) || ''
  const type = parseAfspraakType((formData.get('type') as string) || '')

  if (!token || !slotIso) return errorResponse('Ongeldige request', 'Deze actie kon niet worden verwerkt. Open de planningslink in je e-mail opnieuw en kies een tijd.', 400)
  if (!type) return errorResponse('Ongeldige request', 'Het afspraak-type ontbreekt. Open de link uit je e-mail opnieuw.', 400)

  const lead = await fetchLeadByToken(token)
  if (!lead) return errorResponse('Link werkt niet meer', 'Deze planningslink is verlopen. Vraag een nieuwe demo aan via het formulier op frontlix.com.', 404)
  if (lead.status === 'appointment_booked') {
    return errorResponse('Al ingepland', 'Er staat al een afspraak voor deze offerte. Wil je verzetten? Reageer op de bevestigingsmail of stuur ons een bericht via WhatsApp.', 200)
  }

  // Reconstrueer slot — moet nog vrij zijn op het moment van klikken.
  // Duur hangt af van type: kennismaking = 30 min, plaatsing = branche-specifiek (8u zonnepanelen, 2u schoonmaak, ...).
  const branchePeek = lead.demo_type ? getBranche(lead.demo_type) : null
  const durationMin = type === 'plaatsing' && branchePeek ? branchePeek.plaatsingDuurMin : 30
  const startUtc = new Date(slotIso)
  const endUtc = new Date(startUtc.getTime() + durationMin * 60 * 1000)

  // Verifieer dat slot nog vrij is door opnieuw vrije slots op te halen.
  // Server-side check: ook fake-busy slots weigeren zodat een tweaked form-post niet
  // alsnog een "bezet" slot kan boeken. Bij plaatsing reduceren we naar één slot per dag,
  // anders zou de validation falen voor een geldig "hele dag" slot.
  const rangeDays = RANGE_DAYS[type]
  const now = new Date()
  const rangeEnd = addDays(now, rangeDays)
  let freshSlots = await getFreeSlots(now, rangeEnd, maxSlotsForRange(rangeDays))
  if (type === 'plaatsing') {
    freshSlots = reduceToDaySlots(freshSlots)
  }
  const freshForceFree = buildForceFreeSet(freshSlots)
  const freshIsBusy = isFakeBusy(slotIso) && !freshForceFree.has(slotIso)
  const stillFree = freshSlots.some((s) => s.iso === slotIso) && !freshIsBusy
  if (!stillFree) {
    return htmlResponse(slotTakenPage(lead, freshSlots, type))
  }

  // Maak event aan met type-specifieke titel
  const branche = branchePeek
  const typeText = type === 'plaatsing'
    ? `${branche?.actieKort || 'Uitvoering'}`
    : 'Kennismakingsgesprek'
  const summary = `Frontlix demo: ${typeText} — ${lead.naam || 'klant'}${branche ? ` (${branche.label})` : ''}`
  const description = `Demo afspraak ingepland via offerte e-mail.\n\nType: ${typeText}\nDuur: ${durationMin} minuten\nKlant: ${lead.naam}\nEmail: ${lead.email}\nTelefoon: +${lead.telefoon}\nBranche: ${branche?.label || lead.demo_type || 'onbekend'}`

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

  // Update lead status + bewaar type
  const collected = { ...(lead.collected_data || {}) } as Record<string, unknown>
  collected._appointment_at = slotIso
  collected._google_event_id = eventId
  collected._appointment_type = type
  await getSupabase()
    .from('leads')
    .update({
      status: 'appointment_booked',
      collected_data: collected,
      updated_at: new Date().toISOString(),
    })
    .eq('id', lead.id)

  return htmlResponse(bookedSuccessPage(lead.naam || 'klant', startUtc, type, lead))
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

/** Group slots per kalenderdag in NL tijdzone — keys blijven in volgorde */
function groupSlotsPerDag(slots: FreeSlot[]): Map<string, { label: string; slots: FreeSlot[] }> {
  const groups = new Map<string, { label: string; slots: FreeSlot[] }>()
  for (const s of slots) {
    const dayKey = formatTz(s.startUtc, 'yyyy-MM-dd', { timeZone: TIMEZONE })
    const dayLabel = capitalize(formatTz(s.startUtc, 'EEEE d MMMM', { timeZone: TIMEZONE, locale: nl }))
    if (!groups.has(dayKey)) {
      groups.set(dayKey, { label: dayLabel, slots: [] })
    }
    groups.get(dayKey)!.slots.push(s)
  }
  return groups
}

interface CalendarCell {
  /** dayKey 'yyyy-MM-dd' of leeg ('') voor lege cel vóór 1 van de maand */
  dayKey: string
  /** dag in maand (1-31), -1 voor lege cel */
  dayNum: number
  /** Heeft deze dag vrije slots? */
  hasSlots: boolean
  /** Is dit vandaag? */
  isToday: boolean
  /** Is dit in het verleden of buiten range? */
  isDisabled: boolean
}

interface CalendarMonth {
  monthLabel: string
  /** Plat array van 7-dagen-rijen, beginnend op maandag */
  cells: CalendarCell[]
}

/**
 * Bouwt een maand-grid voor de actieve maand. Plat 6×7 grid (42 cellen)
 * beginnend op maandag — lege cellen vóór de 1e en na de laatste dag van de maand.
 *
 * Gebruikt de NL tijdzone consistent zodat de cellen overeenkomen met de slot-dagen.
 */
function buildCalendarMonth(
  year: number,
  monthIdx: number, // 0-11
  dayKeysWithSlots: Set<string>
): CalendarMonth {
  const monthNames = [
    'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
    'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December',
  ]
  const monthLabel = `${monthNames[monthIdx]} ${year}`

  // Vandaag in NL — voor isToday vergelijking
  const todayKey = formatTz(new Date(), 'yyyy-MM-dd', { timeZone: TIMEZONE })

  // Eerste dag van de maand → dag-van-de-week (Mon=0, Sun=6 voor onze grid)
  const firstOfMonth = new Date(year, monthIdx, 1)
  const jsDow = firstOfMonth.getDay() // 0=zo, 1=ma ... 6=za
  const offsetMon = (jsDow + 6) % 7 // 0=ma, ... 6=zo

  // Aantal dagen in de maand
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate()

  const cells: CalendarCell[] = []

  // Lege cellen vóór de 1e
  for (let i = 0; i < offsetMon; i++) {
    cells.push({ dayKey: '', dayNum: -1, hasSlots: false, isToday: false, isDisabled: true })
  }

  // De echte dagen
  for (let day = 1; day <= daysInMonth; day++) {
    const dayKey = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const hasSlots = dayKeysWithSlots.has(dayKey)
    const isToday = dayKey === todayKey
    cells.push({
      dayKey,
      dayNum: day,
      hasSlots,
      isToday,
      isDisabled: !hasSlots,
    })
  }

  // Vul aan tot een veelvoud van 7 (laatste rij compleet maken)
  while (cells.length % 7 !== 0) {
    cells.push({ dayKey: '', dayNum: -1, hasSlots: false, isToday: false, isDisabled: true })
  }

  return { monthLabel, cells }
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
    /* Kalender wrapper */
    .cal-wrap {
      margin-bottom: 28px;
      padding: 20px;
      background: #FAFBFC;
      border-radius: 12px;
      border: 1px solid #F0F2F5;
    }
    .cal-navbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 16px;
    }
    .cal-monthlabel {
      flex: 1;
      text-align: center;
      font-size: 16px;
      font-weight: 700;
      color: #1A1A1A;
      letter-spacing: -0.2px;
    }
    .cal-navbtn {
      width: 36px;
      height: 36px;
      border: 1.5px solid #DBE4FF;
      background: white;
      border-radius: 8px;
      color: #1A56FF;
      font-size: 22px;
      line-height: 1;
      font-weight: 700;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.12s;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }
    .cal-navbtn:hover:not(:disabled) {
      border-color: #1A56FF;
      background: #1A56FF;
      color: white;
    }
    .cal-navbtn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }
    .cal-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 6px;
    }
    .cal-dayhead {
      text-align: center;
      font-size: 11px;
      font-weight: 700;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 6px 0;
    }
    .cal-cell {
      aspect-ratio: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 600;
      border: 1.5px solid transparent;
      border-radius: 8px;
      background: transparent;
      font-family: inherit;
      cursor: default;
      padding: 0;
      color: #C5C9D1;
    }
    .cal-empty { visibility: hidden; }
    .cal-disabled {
      color: #C5C9D1;
      background: transparent;
      cursor: not-allowed;
    }
    .cal-clickable {
      color: #1A1A1A;
      background: white;
      border-color: #DBE4FF;
      cursor: pointer;
      transition: all 0.12s;
    }
    .cal-clickable:hover {
      border-color: #1A56FF;
      background: #F5F8FF;
      transform: translateY(-1px);
    }
    .cal-today {
      position: relative;
    }
    .cal-today::after {
      content: '';
      position: absolute;
      bottom: 4px;
      left: 50%;
      transform: translateX(-50%);
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: #1A56FF;
    }
    .cal-selected {
      background: #1A56FF !important;
      border-color: #1A56FF !important;
      color: white !important;
      box-shadow: 0 4px 12px rgba(26, 86, 255, 0.25);
    }
    .cal-selected.cal-today::after { background: white; }

    /* Tijden lijst onder de kalender */
    .tijden-wrap { min-height: 60px; }
    .day-hint {
      text-align: center;
      color: #888;
      font-size: 14px;
      padding: 24px 0;
    }
    .day-tijden { margin-bottom: 16px; }
    .day-label {
      font-size: 13px;
      font-weight: 700;
      color: #1A1A1A;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
    }
    .time-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(82px, 1fr));
      gap: 8px;
    }
    .slot-form { margin: 0; }
    .time-btn {
      width: 100%;
      background: white;
      color: #1A56FF;
      border: 1.5px solid #DBE4FF;
      border-radius: 8px;
      padding: 10px 8px;
      cursor: pointer;
      font-family: inherit;
      font-size: 14px;
      font-weight: 700;
      transition: all 0.12s;
    }
    .time-btn:hover:not(:disabled) {
      border-color: #1A56FF;
      background: #1A56FF;
      color: white;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(26, 86, 255, 0.18);
    }
    .time-btn.time-busy {
      background: #F5F7FA;
      color: #B0B6C0;
      border-color: #E5E7EB;
      cursor: not-allowed;
      text-decoration: line-through;
      text-decoration-color: #C5C9D1;
      text-decoration-thickness: 1.5px;
    }
    /* "Hele werkdag" knop voor plaatsing-flow */
    .day-btn {
      width: 100%;
      background: linear-gradient(135deg, #1A56FF, #00CFFF);
      color: white;
      border: none;
      border-radius: 12px;
      padding: 20px 24px;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.15s;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }
    .day-btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(26, 86, 255, 0.28);
    }
    .day-btn-label {
      font-size: 16px;
      font-weight: 700;
    }
    .day-btn-sub {
      font-size: 13px;
      opacity: 0.9;
      font-weight: 500;
    }
    .day-btn.day-busy {
      background: #F5F7FA;
      color: #B0B6C0;
      cursor: not-allowed;
    }
    .day-btn.day-busy:hover { transform: none; box-shadow: none; }
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

/**
 * "Fake busy" simulator: zorgt dat ~30% van de slots in de UI als bezet wordt
 * getoond, ook al staan ze in werkelijkheid vrij in de Google agenda. Puur
 * visueel — voor de demo zodat de agenda er gevuld uitziet zonder dat we
 * echt events in de privé-agenda van de eigenaar zetten.
 *
 * Deterministisch op basis van slot ISO string zodat het stabiel is bij refresh.
 */
function isFakeBusy(iso: string): boolean {
  // Simpele deterministische hash → 0-99
  let h = 0
  for (let i = 0; i < iso.length; i++) {
    h = (h * 31 + iso.charCodeAt(i)) >>> 0
  }
  return (h % 100) < 30
}

/**
 * Per dag mag maximaal 40% van de slots fake-busy zijn — anders kan een
 * onfortuinlijke hash-distributie een hele dag onklikbaar maken. We bouwen
 * één keer een Set met de slot-iso's die we ondanks de hash forceren naar "vrij".
 *
 * Deterministisch: we sorteren slots binnen een dag op iso en houden de eerste
 * `cap` busy-slots vast — de rest wordt force-free.
 */
function buildForceFreeSet(slots: FreeSlot[]): Set<string> {
  const perDay = new Map<string, FreeSlot[]>()
  for (const s of slots) {
    const dayKey = formatTz(s.startUtc, 'yyyy-MM-dd', { timeZone: TIMEZONE })
    if (!perDay.has(dayKey)) perDay.set(dayKey, [])
    perDay.get(dayKey)!.push(s)
  }
  const forceFree = new Set<string>()
  for (const daySlots of perDay.values()) {
    const sorted = [...daySlots].sort((a, b) => a.iso.localeCompare(b.iso))
    const maxBusy = Math.max(0, Math.floor(sorted.length * 0.4))
    let busyCount = 0
    for (const s of sorted) {
      if (isFakeBusy(s.iso)) {
        if (busyCount < maxBusy) {
          busyCount++
        } else {
          forceFree.add(s.iso) // ondanks hash → wel klikbaar
        }
      }
    }
  }
  return forceFree
}

function renderSlotsPage(lead: BrancheLeadRow, slots: FreeSlot[], type: AfspraakType, rangeDays: number): string {
  const safeToken = escapeHtml(lead.approval_token || '')
  const groups = groupSlotsPerDag(slots)
  const forceFree = buildForceFreeSet(slots)
  const isBusy = (iso: string) => isFakeBusy(iso) && !forceFree.has(iso)
  const headerTitle = afspraakTypeLabel(type, lead)
  const headerSubtitle = afspraakTypeSubtitle(type, lead)

  // Bouw een set van dayKeys die echte vrije slots hebben (zonder fake-busy filter
  // — dagen waar ALLE slots fake-busy zijn moeten ook nog "wel klikbaar" zijn want
  // het zijn echte vrije slots, dus we tonen ze alleen visueel anders)
  const dayKeysWithSlots = new Set<string>()
  for (const dayKey of groups.keys()) {
    dayKeysWithSlots.add(dayKey)
  }

  // Bepaal welke maanden in de range vallen — start huidige maand, eind maand-van-rangeEnd.
  // Bij een 14-dagen range zijn dat meestal 1 of 2 maanden, bij 90 dagen 3-4.
  const todayInTz = new Date()
  const startYear = parseInt(formatTz(todayInTz, 'yyyy', { timeZone: TIMEZONE }), 10)
  const startMonth = parseInt(formatTz(todayInTz, 'MM', { timeZone: TIMEZONE }), 10) - 1
  const rangeEndDate = addDays(todayInTz, rangeDays)
  const endYear = parseInt(formatTz(rangeEndDate, 'yyyy', { timeZone: TIMEZONE }), 10)
  const endMonth = parseInt(formatTz(rangeEndDate, 'MM', { timeZone: TIMEZONE }), 10) - 1

  // Bouw alle maand-grids tussen start en eind (inclusief)
  const months: CalendarMonth[] = []
  let cy = startYear
  let cm = startMonth
  while (cy < endYear || (cy === endYear && cm <= endMonth)) {
    months.push(buildCalendarMonth(cy, cm, dayKeysWithSlots))
    cm++
    if (cm > 11) {
      cm = 0
      cy++
    }
  }

  // Render alle maanden — JS toggled welke zichtbaar is
  const dayHeaders = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']
    .map((d) => `<div class="cal-dayhead">${d}</div>`)
    .join('')

  const monthsHtml = months
    .map((calendar, monthIdx) => {
      const cellsHtml = calendar.cells
        .map((cell) => {
          if (cell.dayNum === -1) {
            return `<div class="cal-cell cal-empty"></div>`
          }
          const classes = ['cal-cell']
          if (cell.isToday) classes.push('cal-today')
          if (cell.hasSlots) classes.push('cal-clickable')
          else classes.push('cal-disabled')
          const onclick = cell.hasSlots ? `data-day="${cell.dayKey}"` : ''
          return `<button type="button" class="${classes.join(' ')}" ${onclick}>${cell.dayNum}</button>`
        })
        .join('')
      return `
        <div class="cal-month" data-month-idx="${monthIdx}" ${monthIdx === 0 ? '' : 'hidden'}>
          <div class="cal-grid">
            ${dayHeaders}
            ${cellsHtml}
          </div>
        </div>`
    })
    .join('')

  const monthLabelsJson = JSON.stringify(months.map((m) => m.monthLabel))

  // Tijden lijst per dag — verborgen tot een dag wordt geselecteerd.
  // We renderen ze allemaal in de DOM, JS toggled welke zichtbaar is.
  // Voor plaatsing tonen we per dag één brede "Hele werkdag" knop i.p.v. een time grid.
  const branchePlaatsing = lead.demo_type ? getBranche(lead.demo_type) : null
  const plaatsingDuurMin = branchePlaatsing?.plaatsingDuurMin ?? 480
  const plaatsingDuurUur = Math.round(plaatsingDuurMin / 60)
  const tijdenHtml = Array.from(groups.entries())
    .map(([dayKey, { label, slots: daySlots }]) => {
      let slotsHtml: string
      if (type === 'plaatsing') {
        // Per dag is er nu nog maar één slot — render als brede "Hele werkdag" knop
        const slot = daySlots[0]
        const startTime = formatTz(slot.startUtc, 'HH:mm', { timeZone: TIMEZONE })
        // Eind-tijd berekenen op basis van de branche-duur
        const endDt = new Date(slot.startUtc.getTime() + plaatsingDuurMin * 60 * 1000)
        const endTime = formatTz(endDt, 'HH:mm', { timeZone: TIMEZONE })
        if (isBusy(slot.iso)) {
          slotsHtml = `
            <button type="button" class="day-btn day-busy" disabled aria-label="Bezet">
              <span class="day-btn-label">Niet beschikbaar</span>
              <span class="day-btn-sub">Andere dag kiezen</span>
            </button>`
        } else {
          slotsHtml = `
            <form class="slot-form" method="POST" action="/api/demo-schedule">
              <input type="hidden" name="token" value="${safeToken}" />
              <input type="hidden" name="type" value="${escapeHtml(type)}" />
              <input type="hidden" name="slot" value="${escapeHtml(slot.iso)}" />
              <button type="submit" class="day-btn">
                <span class="day-btn-label">Hele werkdag boeken</span>
                <span class="day-btn-sub">${escapeHtml(startTime)} – ${escapeHtml(endTime)} (${plaatsingDuurUur} uur)</span>
              </button>
            </form>`
        }
      } else {
        // Kennismaking: alle 30-min slots als grid
        slotsHtml = daySlots
          .map((s) => {
            const time = formatTz(s.startUtc, 'HH:mm', { timeZone: TIMEZONE })
            if (isBusy(s.iso)) {
              return `<button type="button" class="time-btn time-busy" disabled aria-label="Bezet">${escapeHtml(time)}</button>`
            }
            return `
              <form class="slot-form" method="POST" action="/api/demo-schedule">
                <input type="hidden" name="token" value="${safeToken}" />
                <input type="hidden" name="type" value="${escapeHtml(type)}" />
                <input type="hidden" name="slot" value="${escapeHtml(s.iso)}" />
                <button type="submit" class="time-btn">${escapeHtml(time)}</button>
              </form>`
          })
          .join('')
        slotsHtml = `<div class="time-grid">${slotsHtml}</div>`
      }
      return `
        <div class="day-tijden" data-day="${escapeHtml(dayKey)}" hidden>
          <h3 class="day-label">${escapeHtml(label)}</h3>
          ${slotsHtml}
        </div>`
    })
    .join('')

  // Inline JS — vanilla, geen framework. Zelf-uitvoerend.
  const inlineJs = `
    (function() {
      var monthLabels = ${monthLabelsJson};
      var months = document.querySelectorAll('.cal-month');
      var label = document.getElementById('cal-monthlabel');
      var prevBtn = document.getElementById('cal-prev');
      var nextBtn = document.getElementById('cal-next');
      var calCells = document.querySelectorAll('.cal-clickable');
      var dayPanels = document.querySelectorAll('.day-tijden');
      var hint = document.getElementById('day-hint');
      var current = 0;

      function updateNav() {
        if (label) label.textContent = monthLabels[current];
        if (prevBtn) prevBtn.disabled = current === 0;
        if (nextBtn) nextBtn.disabled = current === months.length - 1;
      }

      function showMonth(idx) {
        if (idx < 0 || idx >= months.length) return;
        current = idx;
        months.forEach(function(m, i) { m.hidden = i !== idx; });
        updateNav();
      }

      function showDay(dayKey) {
        // Highlight de geselecteerde cel
        calCells.forEach(function(c) {
          if (c.getAttribute('data-day') === dayKey) c.classList.add('cal-selected');
          else c.classList.remove('cal-selected');
        });
        // Toon de juiste tijden-panel
        var found = false;
        dayPanels.forEach(function(p) {
          if (p.getAttribute('data-day') === dayKey) {
            p.hidden = false;
            found = true;
          } else {
            p.hidden = true;
          }
        });
        if (hint) hint.style.display = found ? 'none' : 'block';
        // Scroll soepel naar de tijden op mobiel
        if (window.innerWidth < 720 && found) {
          var target = document.querySelector('.day-tijden[data-day="' + dayKey + '"]');
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }

      calCells.forEach(function(c) {
        c.addEventListener('click', function() {
          showDay(c.getAttribute('data-day'));
        });
      });

      if (prevBtn) prevBtn.addEventListener('click', function() { showMonth(current - 1); });
      if (nextBtn) nextBtn.addEventListener('click', function() { showMonth(current + 1); });

      // Init: open op de eerste maand + selecteer de eerstvolgende vrije dag
      updateNav();
      if (calCells.length > 0) {
        showDay(calCells[0].getAttribute('data-day'));
      }
    })();
  `

  return pageShell(
    headerTitle,
    `
    <div class="header">
      <h1>${escapeHtml(headerTitle)}</h1>
      <p>${escapeHtml(headerSubtitle)}</p>
    </div>
    <div class="card">
      <p style="color: #555; margin-bottom: 20px;">Hoi <strong>${escapeHtml((lead.naam || 'daar').split(' ')[0])}</strong>, kies hieronder een dag in de kalender en daarna een tijdslot dat je past.</p>

      <div class="cal-wrap">
        <div class="cal-navbar">
          <button type="button" id="cal-prev" class="cal-navbtn" aria-label="Vorige maand">&#8249;</button>
          <div id="cal-monthlabel" class="cal-monthlabel">${escapeHtml(months[0]?.monthLabel || '')}</div>
          <button type="button" id="cal-next" class="cal-navbtn" aria-label="Volgende maand">&#8250;</button>
        </div>
        ${monthsHtml}
      </div>

      <div class="tijden-wrap">
        <div id="day-hint" class="day-hint">Klik op een dag in de kalender om de vrije tijden te zien.</div>
        ${tijdenHtml}
      </div>

      <div class="info">
        <strong>Wat gebeurt er na je keuze?</strong><br>
        Het moment wordt direct gereserveerd in onze agenda en je krijgt een Google Calendar uitnodiging in je inbox. Je kunt 'm zo aan je eigen agenda toevoegen.
      </div>
    </div>
    <script>${inlineJs}</script>
  `
  )
}

function bookedSuccessPage(naam: string, when: Date, type: AfspraakType, lead: BrancheLeadRow): string {
  const branche = lead.demo_type ? getBranche(lead.demo_type) : null

  // Datum-formattering: kennismaking met klok-tijd, plaatsing alleen de dag
  const datumLabel = type === 'plaatsing'
    ? capitalize(formatTz(when, 'EEEE d MMMM', { timeZone: TIMEZONE, locale: nl }))
    : capitalize(formatTz(when, "EEEE d MMMM 'om' HH:mm", { timeZone: TIMEZONE, locale: nl }))

  const titel = type === 'plaatsing'
    ? (branche?.actieKort || 'Afspraak') + ' bevestigd'
    : 'Kennismaking bevestigd'

  const subtitle = type === 'plaatsing'
    ? `We zien je voor ${branche?.actieLang || 'de afspraak'}`
    : 'We spreken elkaar graag'

  // Branche-specifieke "we komen langs"-zin voor plaatsing,
  // korte standaardzin voor kennismaking.
  let langsTekst: string
  if (type === 'plaatsing') {
    switch (branche?.id) {
      case 'zonnepanelen':
        langsTekst = 'We komen op deze dag de zonnepanelen plaatsen.'
        break
      case 'dakdekker':
        langsTekst = 'We komen op deze dag het dakwerk uitvoeren.'
        break
      case 'schoonmaak':
        langsTekst = 'We komen op deze dag de eerste schoonmaak doen.'
        break
      default:
        langsTekst = 'We komen op deze dag bij je langs.'
    }
  } else {
    langsTekst = 'We bellen je dan voor het kennismakingsgesprek.'
  }

  // De inleidende zin verschilt: kennismaking heeft een tijdstip, plaatsing een dag
  const introZin = type === 'plaatsing'
    ? 'Je afspraak staat in de agenda voor:'
    : 'Je afspraak staat in de agenda voor:'

  return pageShell(
    titel,
    `
    <div class="header">
      <h1>${escapeHtml(titel)}</h1>
      <p>${escapeHtml(subtitle)}</p>
    </div>
    <div class="card">
      <div class="success-icon">
        <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <div class="success-text">
        <span class="badge">Bevestigd</span>
        <h2>Top, ${escapeHtml(naam.split(' ')[0])}!</h2>
        <p>${escapeHtml(introZin)}</p>
        <p style="font-size: 17px; font-weight: 700; color: #1A1A1A; margin: 12px 0 16px;">${escapeHtml(datumLabel)}</p>
        <p>${escapeHtml(langsTekst)} Je krijgt zo een Google Calendar uitnodiging in je mail.</p>
      </div>
    </div>
  `
  )
}

function alreadyBookedPage(naam: string, when: Date | null): string {
  const dt = when ? capitalize(formatTz(when, "EEEE d MMMM 'om' HH:mm", { timeZone: TIMEZONE, locale: nl })) : null
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

function noSlotsPage(naam: string, rangeDays: number): string {
  // Tekst aanpassen aan de range — 14 dagen → "twee weken", 90 dagen → "drie maanden"
  const periode = rangeDays >= 60
    ? `komende ${Math.round(rangeDays / 30)} maanden`
    : `komende ${Math.round(rangeDays / 7)} weken`
  return pageShell(
    'Geen slots beschikbaar',
    `
    <div class="header">
      <h1>Geen vrije momenten</h1>
      <p>Er staan ${escapeHtml(periode)} helaas geen slots open</p>
    </div>
    <div class="card">
      <p style="color: #555;">Hoi ${escapeHtml(naam.split(' ')[0])}, het lijkt erop dat onze agenda ${escapeHtml(periode)} volzit. Een collega neemt persoonlijk contact met je op om een moment in te plannen — je hoeft zelf niets te doen.</p>
    </div>
  `
  )
}

function slotTakenPage(lead: BrancheLeadRow, slots: FreeSlot[], type: AfspraakType): string {
  return pageShell(
    'Slot net gepakt',
    `
    <div class="header">
      <h1>Net iemand voor je</h1>
      <p>Dat moment is net gepakt — kies een ander</p>
    </div>
    <div class="card">
      <p style="color: #555; margin-bottom: 16px;">Iemand anders boekte dat moment net voor je. Geen zorgen — kies hieronder gewoon een nieuw moment, het werkt wel weer:</p>
      ${slots.length > 0 ? renderSlotsInline(lead, slots, type) : '<p style="color: #555;">Er zijn op dit moment geen andere slots vrij. Probeer het later opnieuw.</p>'}
    </div>
  `
  )
}

function renderSlotsInline(lead: BrancheLeadRow, slots: FreeSlot[], type: AfspraakType): string {
  const safeToken = escapeHtml(lead.approval_token || '')
  const groups = groupSlotsPerDag(slots)
  const daysHtml = Array.from(groups.entries())
    .map(([key, { label, slots: daySlots }]) => {
      const slotsHtml = daySlots
        .map((s) => {
          const time = formatTz(s.startUtc, 'HH:mm', { timeZone: TIMEZONE })
          return `
            <form class="slot-form" method="POST" action="/api/demo-schedule">
              <input type="hidden" name="token" value="${safeToken}" />
              <input type="hidden" name="type" value="${escapeHtml(type)}" />
              <input type="hidden" name="slot" value="${escapeHtml(s.iso)}" />
              <button type="submit" class="time-btn">${escapeHtml(time)}</button>
            </form>`
        })
        .join('')
      return `
        <div class="day-block" data-day="${escapeHtml(key)}">
          <h3 class="day-label">${escapeHtml(label)}</h3>
          <div class="time-grid">${slotsHtml}</div>
        </div>`
    })
    .join('')
  return daysHtml
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
