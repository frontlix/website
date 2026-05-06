import { getDashboardSupabase } from './supabase-server'
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
 * Haalt alle leads op met een `afspraak_geboekt_op`-tijdstip in de gevraagde
 * maand. Gebruikt UTC ISO-grenzen — eventuele tijdzone-correctie voor display
 * gebeurt in de UI via toAmsterdamDayKey.
 */
export async function getAppointmentsForMonth(
  year: number,
  month: number
): Promise<Appointment[]> {
  const supabase = await getDashboardSupabase()

  const monthStart = new Date(Date.UTC(year, month - 1, 1)).toISOString()
  const monthEnd = new Date(Date.UTC(year, month, 1)).toISOString()

  const { data, error } = await supabase
    .from('leads')
    .select(SELECT_COLUMNS)
    .not('afspraak_geboekt_op', 'is', null)
    .gte('afspraak_geboekt_op', monthStart)
    .lt('afspraak_geboekt_op', monthEnd)
    .order('afspraak_geboekt_op', { ascending: true })

  if (error) {
    console.error('[getAppointmentsForMonth] failed:', error)
    return []
  }
  return (data as unknown as Appointment[] | null) ?? []
}
