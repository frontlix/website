import { getDashboardSupabase } from './supabase-server'
import type { StatsPeriod } from './period'

/**
 * Aantal leads in de periode (alle, ongeacht dashboard_archived).
 */
export async function countLeads(period: StatsPeriod): Promise<number> {
  const supabase = await getDashboardSupabase()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
  if (period.from) {
    query = query.gte('aangemaakt', period.from)
  }
  const { count, error } = await query
  if (error) {
    console.error('[countLeads] failed:', error)
    return 0
  }
  return count ?? 0
}

/**
 * Aantal "geconverteerde" leads in de periode — leads met akkoord_op of
 * afspraak_geboekt_op gevuld.
 */
export async function countConverted(period: StatsPeriod): Promise<number> {
  const supabase = await getDashboardSupabase()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .or('akkoord_op.not.is.null,afspraak_geboekt_op.not.is.null')
  if (period.from) {
    query = query.gte('aangemaakt', period.from)
  }
  const { count, error } = await query
  if (error) {
    console.error('[countConverted] failed:', error)
    return 0
  }
  return count ?? 0
}

/**
 * Gemiddelde offerte-waarde over leads in de periode (negeert null).
 */
export async function avgOfferteWaarde(period: StatsPeriod): Promise<number | null> {
  const supabase = await getDashboardSupabase()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase.from('leads').select('totaal_prijs')
  if (period.from) {
    query = query.gte('aangemaakt', period.from)
  }
  const { data, error } = await query
  if (error) {
    console.error('[avgOfferteWaarde] failed:', error)
    return null
  }
  type Row = { totaal_prijs: number | null }
  const prijzen = ((data as Row[] | null) ?? [])
    .map((r) => r.totaal_prijs)
    .filter((p): p is number => p !== null)
  if (prijzen.length === 0) return null
  const sum = prijzen.reduce((a, b) => a + b, 0)
  return sum / prijzen.length
}

/**
 * Gemiddelde reactietijd in milliseconds: tijd tussen leads.aangemaakt en
 * de eerste 'uitgaand' bericht-timestamp voor die lead.
 */
export async function avgReactietijdMs(period: StatsPeriod): Promise<number | null> {
  const supabase = await getDashboardSupabase()

  // 1) Haal leads in periode
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let leadsQuery: any = supabase.from('leads').select('lead_id, aangemaakt')
  if (period.from) {
    leadsQuery = leadsQuery.gte('aangemaakt', period.from)
  }
  const { data: leadsData, error: leadsErr } = await leadsQuery
  if (leadsErr) {
    console.error('[avgReactietijdMs] leads failed:', leadsErr)
    return null
  }
  type LeadRow = { lead_id: string; aangemaakt: string }
  const leads = (leadsData as LeadRow[] | null) ?? []
  if (leads.length === 0) return null

  const leadIds = leads.map((l) => l.lead_id)

  // 2) Haal uitgaande berichten voor die leads
  const { data: berichtenData, error: berichtenErr } = await supabase
    .from('berichten')
    .select('lead_id, timestamp')
    .eq('richting', 'uitgaand')
    .in('lead_id', leadIds)
  if (berichtenErr) {
    console.error('[avgReactietijdMs] berichten failed:', berichtenErr)
    return null
  }

  type BerichtRow = { lead_id: string; timestamp: string }
  const berichten = (berichtenData as BerichtRow[] | null) ?? []

  // Bepaal per lead de vroegste uitgaande timestamp
  const firstOut = new Map<string, number>()
  for (const b of berichten) {
    const t = Date.parse(b.timestamp)
    const prev = firstOut.get(b.lead_id)
    if (prev === undefined || t < prev) {
      firstOut.set(b.lead_id, t)
    }
  }

  // Bereken reactietijden voor leads die een uitgaand bericht hebben
  const diffs: number[] = []
  for (const lead of leads) {
    const first = firstOut.get(lead.lead_id)
    if (first === undefined) continue
    diffs.push(first - Date.parse(lead.aangemaakt))
  }
  if (diffs.length === 0) return null
  return diffs.reduce((a, b) => a + b, 0) / diffs.length
}
