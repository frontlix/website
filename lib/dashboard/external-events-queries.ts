import { getDashboardSupabase } from './supabase-server'
import { appointmentInstantIso } from './appointment-instant'

/**
 * Een handmatig in Google Agenda aangemaakte afspraak (zonder lead), gesynct
 * naar `external_calendar_events`. De dashboard-agenda toont deze READ-ONLY:
 * tonen + openen mag, maar GEEN afronden/verzetten/annuleren (er is geen lead
 * om een actie op af te vuren).
 */
export type ExternalEvent = {
  google_event_id: string
  summary: string | null
  start_at: string
  end_at: string | null
  all_day: boolean
}

type ExternalEventRow = ExternalEvent & { last_synced_at?: string }

const SELECT_COLUMNS = 'google_event_id, summary, start_at, end_at, all_day'

/**
 * Start (UTC ISO) van de Amsterdam-dag `dayKey` (YYYY-MM-DD). Hergebruikt de
 * DST-correcte datum+tijd-helper, zodat de grenzen identiek zijn aan de manier
 * waarop de leads-agenda de afspraakmomenten berekent.
 */
function amsterdamDayStartIso(dayKey: string): string {
  // appointmentInstantIso geeft alleen null bij een ongeldige datum; de callers
  // leveren altijd een geldige YYYY-MM-DD-key, dus de fallback wordt niet geraakt.
  return appointmentInstantIso(dayKey, '00:00') ?? `${dayKey}T00:00:00.000Z`
}

/** YYYY-MM-DD + n dagen (UTC-kalender, puur op de kale datum-string). */
function addDays(dayKey: string, days: number): string {
  const [y, m, d] = dayKey.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  const yy = dt.getUTCFullYear()
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(dt.getUTCDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

/** Map een ruwe rij naar het schone ExternalEvent (zonder last_synced_at). */
function toExternalEvent(r: ExternalEventRow): ExternalEvent {
  return {
    google_event_id: r.google_event_id,
    summary: r.summary ?? null,
    start_at: r.start_at,
    end_at: r.end_at ?? null,
    all_day: !!r.all_day,
  }
}

/**
 * Haalt de externe (lead-loze) Google-afspraken op waarvan `start_at` binnen de
 * gevraagde Amsterdam-dag-range valt. De caller geeft de eerste en laatste
 * zichtbare Amsterdam-dagkey (YYYY-MM-DD, inclusief); we vertalen die naar
 * timestamptz-grenzen: `gte` op het begin van de eerste dag (Amsterdam, in UTC)
 * en `lt` op het begin van de dag NA de laatste dag, zodat de bovengrens
 * exclusief is en de hele laatste dag meedoet.
 */
export async function getExternalEventsForRange(
  startKey: string,
  endKey: string,
): Promise<ExternalEvent[]> {
  const supabase = await getDashboardSupabase()
  const lowerIso = amsterdamDayStartIso(startKey)
  const upperIso = amsterdamDayStartIso(addDays(endKey, 1))

  const { data, error } = await supabase
    .from('external_calendar_events')
    .select(SELECT_COLUMNS)
    .gte('start_at', lowerIso)
    .lt('start_at', upperIso)

  if (error) {
    console.error('[getExternalEventsForRange] failed:', error)
    return []
  }
  return ((data as unknown as ExternalEventRow[] | null) ?? []).map(toExternalEvent)
}

/**
 * Variant voor de maandweergave: alle externe afspraken waarvan `start_at` in de
 * gevraagde maand valt (Amsterdam-grenzen). `month` is 1-gebaseerd (1 = januari).
 */
export async function getExternalEventsForMonth(
  year: number,
  month: number,
): Promise<ExternalEvent[]> {
  const mm = month.toString().padStart(2, '0')
  const firstDay = `${year}-${mm}-01`
  const lastDayNr = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const lastDay = `${year}-${mm}-${lastDayNr.toString().padStart(2, '0')}`
  return getExternalEventsForRange(firstDay, lastDay)
}
