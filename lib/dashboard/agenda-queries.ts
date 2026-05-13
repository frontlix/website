import { getDashboardSupabase } from './supabase-server'
import { toAmsterdamDayKey } from './calendar'
import type { Lead } from './database.types'

export type Appointment = Pick<
  Lead,
  | 'lead_id'
  | 'naam'
  | 'telefoon'
  | 'afspraak_geboekt_op'
  | 'dashboard_status'
  | 'status'
>

const SELECT_COLUMNS = [
  'lead_id',
  'naam',
  'telefoon',
  'afspraak_geboekt_op',
  'dashboard_status',
  'status',
].join(', ')

/**
 * Haalt alle leads op met een `afspraak_geboekt_op`-tijdstip dat in
 * Europe/Amsterdam-tijdzone in de gevraagde maand valt.
 *
 * De DB slaat tijdstempels in UTC op. Een afspraak om 30 april 22:30 UTC
 * is in NL al 1 mei 00:30 — die hoort bij mei. Daarom widenen we de
 * UTC-query met 1 dag aan beide kanten en filteren we daarna in JS op
 * Amsterdam-dagkey die in de gevraagde maand valt.
 */
export async function getAppointmentsForMonth(
  year: number,
  month: number
): Promise<Appointment[]> {
  const supabase = await getDashboardSupabase()

  // Wider UTC-query: 1 dag eerder + 1 dag later dan de maand zelf.
  // Dit dekt CEST (UTC+2) en CET (UTC+1) overal — late-avond UTC kan
  // nooit verder dan 2 uur in de volgende NL-dag terechtkomen.
  const queryStart = new Date(Date.UTC(year, month - 1, 0)).toISOString()  // dag 0 = laatste dag prev maand
  const queryEnd = new Date(Date.UTC(year, month, 2)).toISOString()        // 2e van volgende maand

  const { data, error } = await supabase
    .from('leads')
    .select(SELECT_COLUMNS)
    .not('afspraak_geboekt_op', 'is', null)
    .gte('afspraak_geboekt_op', queryStart)
    .lt('afspraak_geboekt_op', queryEnd)
    .order('afspraak_geboekt_op', { ascending: true })

  if (error) {
    console.error('[getAppointmentsForMonth] failed:', error)
    return []
  }

  const monthPrefix = `${year}-${month.toString().padStart(2, '0')}`
  const all = (data as unknown as Appointment[] | null) ?? []

  // Filter: alleen afspraken waarvan de NL-dagkey in de gevraagde maand valt
  return all.filter((a) => {
    if (!a.afspraak_geboekt_op) return false
    return toAmsterdamDayKey(a.afspraak_geboekt_op).startsWith(monthPrefix)
  })
}

/**
 * Variant voor de week-view: pakt afspraken in een UTC-range. Caller
 * (parseWeekParam) wident al met 1 dag aan beide kanten zodat de
 * Amsterdam-dagkey-conversie correct werkt.
 */
export async function getAppointmentsForRange(
  queryStart: string,
  queryEnd: string,
): Promise<Appointment[]> {
  const supabase = await getDashboardSupabase()
  const { data, error } = await supabase
    .from('leads')
    .select(SELECT_COLUMNS)
    .not('afspraak_geboekt_op', 'is', null)
    .gte('afspraak_geboekt_op', queryStart)
    .lt('afspraak_geboekt_op', queryEnd)
    .order('afspraak_geboekt_op', { ascending: true })

  if (error) {
    console.error('[getAppointmentsForRange] failed:', error)
    return []
  }
  return (data as unknown as Appointment[] | null) ?? []
}
