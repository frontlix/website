import { getDashboardSupabase } from './supabase-server'
import type { StatsPeriod, PeriodKey } from './period'
import { omzetBuckets, type OmzetRow } from './omzet-buckets'
import { buildOmzetRows } from './omzet-source'

/**
 * Aantal leads in de periode (alle, ongeacht dashboard_archived).
 *
 * Filtert op `aangemaakt` met inclusieve from + exclusieve to (zodat
 * een rolling-7d-window géén overlap heeft met de "vorige week"-window).
 */
export async function countLeads(period: StatsPeriod): Promise<number> {
  const supabase = await getDashboardSupabase()
  let query = supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('uitgesloten_van_stats', false)
  if (period.from) {
    query = query.gte('aangemaakt', period.from)
  }
  if (period.to) {
    query = query.lt('aangemaakt', period.to)
  }
  const { count, error } = await query
  if (error) {
    console.error('[countLeads] failed:', error)
    return 0
  }
  return count ?? 0
}

/**
 * Aantal leads dat in de periode een offerte verstuurd kreeg
 * (offerte_verstuurd_op valt binnen het venster).
 */
export async function countOffertesVerstuurd(period: StatsPeriod): Promise<number> {
  const supabase = await getDashboardSupabase()
  let query = supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('uitgesloten_van_stats', false)
    .not('offerte_verstuurd_op', 'is', null)
  if (period.from) {
    query = query.gte('offerte_verstuurd_op', period.from)
  }
  if (period.to) {
    query = query.lt('offerte_verstuurd_op', period.to)
  }
  const { count, error } = await query
  if (error) {
    console.error('[countOffertesVerstuurd] failed:', error)
    return 0
  }
  return count ?? 0
}

/**
 * Aantal "openstaande offertes" = leads met offerte_verstuurd_op gevuld
 * maar nog geen akkoord_op, en niet gearchiveerd. Periodieke snapshot
 * (geen tijdvenster), geeft de huidige stand van zaken.
 */
export async function countOpenOffertes(): Promise<number> {
  const supabase = await getDashboardSupabase()
  const { count, error } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('uitgesloten_van_stats', false)
    .not('offerte_verstuurd_op', 'is', null)
    .is('akkoord_op', null)
    .eq('dashboard_archived', false)

  if (error) {
    console.error('[countOpenOffertes] failed:', error)
    return 0
  }
  return count ?? 0
}

/**
 * Aantal leads dat in de periode akkoord gaf (akkoord_op binnen venster).
 * Verschil met countConverted: dit teller-paar gebruikt akkoord_op-timestamp
 * i.p.v. aangemaakt, handig voor "vandaag/week" snapshots.
 */
export async function countAkkoordIn(period: StatsPeriod): Promise<number> {
  const supabase = await getDashboardSupabase()
  let query = supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('uitgesloten_van_stats', false)
    .not('akkoord_op', 'is', null)
  if (period.from) {
    query = query.gte('akkoord_op', period.from)
  }
  if (period.to) {
    query = query.lt('akkoord_op', period.to)
  }
  const { count, error } = await query
  if (error) {
    console.error('[countAkkoordIn] failed:', error)
    return 0
  }
  return count ?? 0
}

/**
 * Aantal "geconverteerde" leads in de periode, leads met akkoord_op of
 * afspraak_geboekt_op gevuld.
 */
export async function countConverted(period: StatsPeriod): Promise<number> {
  const supabase = await getDashboardSupabase()
  let query = supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('uitgesloten_van_stats', false)
    .or('akkoord_op.not.is.null,afspraak_geboekt_op.not.is.null')
  if (period.from) {
    query = query.gte('aangemaakt', period.from)
  }
  if (period.to) {
    query = query.lt('aangemaakt', period.to)
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
  let query = supabase.from('leads').select('totaal_prijs').eq('uitgesloten_van_stats', false)
  if (period.from) {
    query = query.gte('aangemaakt', period.from)
  }
  if (period.to) {
    query = query.lt('aangemaakt', period.to)
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
  let leadsQuery = supabase.from('leads').select('lead_id, aangemaakt').eq('uitgesloten_van_stats', false)
  if (period.from) {
    leadsQuery = leadsQuery.gte('aangemaakt', period.from)
  }
  if (period.to) {
    leadsQuery = leadsQuery.lt('aangemaakt', period.to)
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

/**
 * Verdeling per dashboard_status. NULL als label.
 * Gesorteerd DESC op count.
 */
export async function statusVerdeling(
  period: StatsPeriod
): Promise<Array<{ status: string | null; count: number }>> {
  const supabase = await getDashboardSupabase()
  let query = supabase.from('leads').select('dashboard_status').eq('uitgesloten_van_stats', false)
  if (period.from) {
    query = query.gte('aangemaakt', period.from)
  }
  const { data, error } = await query
  if (error) {
    console.error('[statusVerdeling] failed:', error)
    return []
  }
  type Row = { dashboard_status: string | null }
  const counts = new Map<string | null, number>()
  for (const row of (data as Row[] | null) ?? []) {
    counts.set(row.dashboard_status, (counts.get(row.dashboard_status) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count)
}

/**
 * Verdeling per hoofdcategorie. NULL wordt "Onbekend".
 */
export async function categorieVerdeling(
  period: StatsPeriod
): Promise<Array<{ categorie: string; count: number }>> {
  const supabase = await getDashboardSupabase()
  let query = supabase.from('leads').select('hoofdcategorie').eq('uitgesloten_van_stats', false)
  if (period.from) {
    query = query.gte('aangemaakt', period.from)
  }
  const { data, error } = await query
  if (error) {
    console.error('[categorieVerdeling] failed:', error)
    return []
  }
  type Row = { hoofdcategorie: string | null }
  const counts = new Map<string, number>()
  for (const row of (data as Row[] | null) ?? []) {
    const key = row.hoofdcategorie ?? 'Onbekend'
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([categorie, count]) => ({ categorie, count }))
    .sort((a, b) => b.count - a.count)
}

/**
 * Leads per dag voor de laatste N dagen, ASC op datum.
 * Lege dagen krijgen count 0. Default 28d voor de overzicht-chart.
 */
export async function leadsPerDag(
  now: Date = new Date(),
  days: number = 28
): Promise<Array<{ date: string; count: number }>> {
  const supabase = await getDashboardSupabase()
  const span = Math.max(1, Math.floor(days))
  const start = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - (span - 1)
  ))
  const startISO = start.toISOString().slice(0, 10)

  const query = supabase
    .from('leads')
    .select('aangemaakt')
    .eq('uitgesloten_van_stats', false)
    .gte('aangemaakt', startISO)

  const { data, error } = await query
  if (error) {
    console.error('[leadsPerDag] failed:', error)
    return []
  }

  type Row = { aangemaakt: string }
  const counts = new Map<string, number>()
  for (const row of (data as Row[] | null) ?? []) {
    const day = row.aangemaakt.slice(0, 10)
    counts.set(day, (counts.get(day) ?? 0) + 1)
  }

  const out: Array<{ date: string; count: number }> = []
  for (let i = 0; i < span; i++) {
    const d = new Date(Date.UTC(
      start.getUTCFullYear(),
      start.getUTCMonth(),
      start.getUTCDate() + i
    ))
    const key = d.toISOString().slice(0, 10)
    out.push({ date: key, count: counts.get(key) ?? 0 })
  }
  return out
}

/**
 * Top-N tags qua frequentie, gefilterd op leads in de periode.
 */
export async function topTags(
  period: StatsPeriod,
  limit: number = 10
): Promise<Array<{ naam: string; count: number }>> {
  const supabase = await getDashboardSupabase()
  let query = supabase
    .from('lead_tags')
    .select('tags!inner(naam), leads!inner(aangemaakt)')
    .eq('leads.uitgesloten_van_stats', false)
  if (period.from) {
    query = query.gte('leads.aangemaakt', period.from)
  }
  const { data, error } = await query
  if (error) {
    console.error('[topTags] failed:', error)
    return []
  }
  type Row = { tags: { naam: string }; leads: { aangemaakt: string } }
  const counts = new Map<string, number>()
  for (const row of (data as Row[] | null) ?? []) {
    const naam = row.tags?.naam
    if (!naam) continue
    counts.set(naam, (counts.get(naam) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([naam, count]) => ({ naam, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

/**
 * Een lead telt mee voor de omzet zodra hij "gewonnen" is: akkoord gegaan
 * (akkoord_op) OF een afspraak geboekt (afspraak_geboekt_op). De omzet-datum
 * is akkoord_op, anders afspraak_geboekt_op.
 *
 * Het bedrag komt uit de VERZONDEN offerte-snapshot (offertes.totaal_incl,
 * onveranderlijk per versie, hoogste versie), met terugval op leads.totaal_prijs
 * als er geen verzonden offerte is. Zie lib/dashboard/omzet-source.ts. Zo
 * verandert historische omzet niet meer als iemand een oude offerte aanpast.
 */
export async function fetchGewonnenOmzetRows(): Promise<
  Array<{ wonDate: string; prijs: number; categorie: string }>
> {
  const supabase = await getDashboardSupabase()
  const [leadsRes, offRes] = await Promise.all([
    supabase
      .from('leads')
      .select('lead_id, akkoord_op, afspraak_geboekt_op, totaal_prijs, hoofdcategorie')
      .eq('uitgesloten_van_stats', false)
      .or('akkoord_op.not.is.null,afspraak_geboekt_op.not.is.null'),
    supabase
      .from('offertes')
      .select('lead_id, versie, totaal_incl')
      .eq('is_concept', false),
  ])
  if (leadsRes.error) {
    console.error('[omzet] leads failed:', leadsRes.error)
    return []
  }
  if (offRes.error) {
    console.error('[omzet] offertes failed:', offRes.error)
    return []
  }
  type LeadRow = {
    lead_id: string
    akkoord_op: string | null
    afspraak_geboekt_op: string | null
    totaal_prijs: number | null
    hoofdcategorie: string | null
  }
  type OffRow = { lead_id: string; versie: number; totaal_incl: number }
  return buildOmzetRows(
    (leadsRes.data as LeadRow[] | null) ?? [],
    (offRes.data as OffRow[] | null) ?? [],
  )
}

/** True als een ISO-datum binnen [from, to) valt (from optioneel = all-time). */
function inRange(iso: string, period: StatsPeriod): boolean {
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) return false
  if (period.from && ms < Date.parse(period.from)) return false
  if (period.to && ms >= Date.parse(period.to)) return false
  return true
}

/**
 * Totale omzet in de periode = som van totaal_prijs over gewonnen leads
 * met won-datum binnen het venster. Negeert null-prijzen.
 */
export async function omzetTotaal(period: StatsPeriod): Promise<number> {
  const rows = await fetchGewonnenOmzetRows()
  return rows
    .filter((r) => inRange(r.wonDate, period))
    .reduce((sum, r) => sum + r.prijs, 0)
}

/**
 * Aantal gewonnen leads met WIN-datum in de periode. Telt dezelfde set leads
 * als omzetTotaal (op wonDate), zodat gem. kluswaarde = omzet / dit aantal
 * intern consistent is (i.t.t. countConverted dat op aangemaakt filtert).
 */
export async function countGewonnenInPeriode(period: StatsPeriod): Promise<number> {
  const rows = await fetchGewonnenOmzetRows()
  return rows.filter((r) => inRange(r.wonDate, period)).length
}

/**
 * Omzet per hoofdcategorie in de periode (gewonnen leads).
 * NULL-categorie wordt "Onbekend". DESC op omzet.
 */
export async function omzetPerCategorie(
  period: StatsPeriod,
): Promise<Array<{ categorie: string; omzet: number }>> {
  const rows = await fetchGewonnenOmzetRows()
  const sums = new Map<string, number>()
  for (const r of rows) {
    if (!inRange(r.wonDate, period)) continue
    sums.set(r.categorie, (sums.get(r.categorie) ?? 0) + r.prijs)
  }
  return [...sums.entries()]
    .map(([categorie, omzet]) => ({ categorie, omzet }))
    .sort((a, b) => b.omzet - a.omzet)
}

/**
 * Omzet-trendreeks die het periode-filter volgt: dagelijkse buckets voor
 * week/maand, maandelijkse voor kwartaal/jaar (zie omzetBuckets). Som van
 * gewonnen-omzet per bucket, van periode-start t/m nu. Vervangt de oude
 * vaste-12-maanden-reeks die niet meebewoog met het filter.
 */
export async function omzetTrendVoorPeriode(
  periodKey: PeriodKey,
  now: Date = new Date(),
): Promise<Array<{ bucket: string; omzet: number }>> {
  const rows = await fetchGewonnenOmzetRows()
  const omzetRows: OmzetRow[] = rows.map((r) => ({ wonDate: r.wonDate, prijs: r.prijs }))
  return omzetBuckets(omzetRows, periodKey, now)
}

/**
 * Maandelijks omzet-doel uit tenant_settings (of null als niet ingesteld).
 * Reader-tegenhanger van saveOmzetDoelMaand in omzet-doel-actions.ts.
 */
export async function getOmzetDoelMaand(): Promise<number | null> {
  const supabase = await getDashboardSupabase()
  const { data, error } = await supabase
    .from('tenant_settings')
    .select('omzet_doel_maand')
    .limit(1)
    .maybeSingle()
  if (error) {
    console.error('[getOmzetDoelMaand] failed:', error)
    return null
  }
  const row = data as { omzet_doel_maand: number | null } | null
  return row?.omzet_doel_maand ?? null
}
