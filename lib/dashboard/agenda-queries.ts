import { getDashboardSupabase } from './supabase-server'
import { toAmsterdamDayKey } from './calendar'
import { appointmentInstantIso } from './appointment-instant'
import type { Lead } from './database.types'

export type Appointment = Pick<
  Lead,
  | 'lead_id'
  | 'naam'
  | 'telefoon'
  | 'afspraak_datum'
  | 'afspraak_starttijd'
  | 'afspraak_geboekt_op'
  | 'dashboard_status'
  | 'status'
  | 'plaats'
  | 'postcode'
  | 'straat'
  | 'huisnummer'
  | 'm2'
  | 'afstand_km'
  | 'hoofdcategorie'
  | 'lat'
  | 'lng'
>

const SELECT_COLUMNS = [
  'lead_id',
  'naam',
  'telefoon',
  'afspraak_datum',
  'afspraak_starttijd',
  'afspraak_geboekt_op',
  'dashboard_status',
  'status',
  'plaats',
  'postcode',
  'straat',
  'huisnummer',
  'm2',
  'afstand_km',
  'hoofdcategorie',
  'lat',
  'lng',
].join(', ')

/**
 * Mapt ruwe leads-rijen naar Appointments waarbij `afspraak_geboekt_op` de
 * UTC-instant van de AFSPRAAK ZELF bevat (afgeleid uit afspraak_datum +
 * afspraak_starttijd, precies wat ook naar Google Agenda gaat) in plaats van
 * het tijdstip waarop geboekt werd.
 *
 * De rest van de agenda-weergave (week/maand/route/mobiel/veldwerk/overzicht)
 * leest `afspraak_geboekt_op` als het afspraakmoment en blijft zo onveranderd
 * werken. Rijen zonder geldige afspraakdatum vallen weg: dat zijn geen
 * geboekte afspraken (bv. een offerte-lead) en horen niet op de agenda.
 */
function toAppointmentsOnDate(rows: Appointment[]): Appointment[] {
  const out: Appointment[] = []
  for (const r of rows) {
    const instant = appointmentInstantIso(r.afspraak_datum, r.afspraak_starttijd)
    if (!instant) continue
    out.push({ ...r, afspraak_geboekt_op: instant })
  }
  out.sort((a, b) =>
    (a.afspraak_geboekt_op ?? '').localeCompare(b.afspraak_geboekt_op ?? ''),
  )
  return out
}

/**
 * Haalt alle afspraken op waarvan de `afspraak_datum` in de gevraagde maand
 * valt. `afspraak_datum` is een kale lokale datum (YYYY-MM-DD), dus geen
 * tijdzone-correctie nodig.
 */
export async function getAppointmentsForMonth(
  year: number,
  month: number
): Promise<Appointment[]> {
  const supabase = await getDashboardSupabase()

  const mm = month.toString().padStart(2, '0')
  const monthStart = `${year}-${mm}-01`
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const monthEnd = `${year}-${mm}-${lastDay.toString().padStart(2, '0')}`

  const { data, error } = await supabase
    .from('leads')
    .select(SELECT_COLUMNS)
    .not('afspraak_datum', 'is', null)
    .gte('afspraak_datum', monthStart)
    .lte('afspraak_datum', monthEnd)

  if (error) {
    console.error('[getAppointmentsForMonth] failed:', error)
    return []
  }

  return toAppointmentsOnDate((data as unknown as Appointment[] | null) ?? [])
}

/**
 * Variant voor de week-view (en veldwerk): pakt afspraken waarvan de
 * `afspraak_datum` in de gevraagde range valt. De caller geeft een UTC-range
 * (met buffer); we leiden daar de Amsterdam-dagkeys uit af om op de kale
 * `afspraak_datum` te kunnen filteren. De weergave-laag filtert daarna toch
 * exact op de zichtbare dagen.
 */
export async function getAppointmentsForRange(
  queryStart: string,
  queryEnd: string,
): Promise<Appointment[]> {
  const supabase = await getDashboardSupabase()
  const startKey = toAmsterdamDayKey(queryStart)
  const endKey = toAmsterdamDayKey(queryEnd)

  const { data, error } = await supabase
    .from('leads')
    .select(SELECT_COLUMNS)
    .not('afspraak_datum', 'is', null)
    .gte('afspraak_datum', startKey)
    .lte('afspraak_datum', endKey)

  if (error) {
    console.error('[getAppointmentsForRange] failed:', error)
    return []
  }
  return toAppointmentsOnDate((data as unknown as Appointment[] | null) ?? [])
}
