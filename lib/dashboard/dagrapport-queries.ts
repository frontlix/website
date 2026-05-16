import { getDashboardSupabase } from './supabase-server'
import {
  countLeads,
  countOffertesVerstuurd,
  countAkkoordIn,
} from './stats-queries'
import type { StatsPeriod } from './period'

/**
 * "Dagrapport" — server-side data ophalen voor de slide-out drawer die
 * vanaf de overzicht-pagina geopend wordt via `?dagrapport=1`.
 *
 * Bundelt vandaag + gisteren (voor delta-vergelijking) + per-bron split +
 * omzet-sum. Alle queries draaien parallel via één Promise.all.
 */

export interface DagrapportData {
  /** ISO-datum van de dag waar dit rapport over gaat (vandaag). */
  datum: string
  vandaag: DagrapportDayStats
  gisteren: DagrapportDayStats
  /** Leads per bron — alleen vandaag, gesorteerd op aantal desc. */
  bronnen: BronStat[]
}

export interface DagrapportDayStats {
  leads: number
  offertesVerstuurd: number
  akkoorden: number
  /** Som van totaal_prijs van leads die op deze dag akkoord gaven. */
  omzet: number
}

export interface BronStat {
  bron: string
  count: number
}

function dayWindow(date: Date): StatsPeriod {
  // Begin van dag in UTC (gebruikt door de queries die op aangemaakt /
  // offerte_verstuurd_op / akkoord_op filteren — die staan in UTC).
  const y = date.getUTCFullYear()
  const m = date.getUTCMonth()
  const d = date.getUTCDate()
  const from = new Date(Date.UTC(y, m, d)).toISOString()
  const to = new Date(Date.UTC(y, m, d + 1)).toISOString()
  return { from, to }
}

/**
 * Som van totaal_prijs voor leads die in periode akkoord gaven.
 * Geen aparte query in stats-queries.ts — daar wordt alleen gemiddelde
 * berekend. Voor dagrapport hebben we de absolute som nodig.
 */
async function sumOmzetAkkoord(period: StatsPeriod): Promise<number> {
  const supabase = await getDashboardSupabase()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from('leads')
    .select('totaal_prijs')
    .not('akkoord_op', 'is', null)
    .not('totaal_prijs', 'is', null)
  if (period.from) query = query.gte('akkoord_op', period.from)
  if (period.to) query = query.lt('akkoord_op', period.to)

  const { data, error } = await query
  if (error) {
    console.error('[sumOmzetAkkoord] failed:', error)
    return 0
  }
  const rows = (data as { totaal_prijs: number | null }[] | null) ?? []
  return rows.reduce((sum, r) => sum + (r.totaal_prijs ?? 0), 0)
}

/**
 * Aantal leads per bron in periode. Sorteert op count desc, geeft alle
 * niet-null bronnen terug. Null-bron wordt geaggregeerd onder "onbekend".
 */
async function leadsPerBron(period: StatsPeriod): Promise<BronStat[]> {
  const supabase = await getDashboardSupabase()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase.from('leads').select('bron')
  if (period.from) query = query.gte('aangemaakt', period.from)
  if (period.to) query = query.lt('aangemaakt', period.to)

  const { data, error } = await query
  if (error) {
    console.error('[leadsPerBron] failed:', error)
    return []
  }
  const rows = (data as { bron: string | null }[] | null) ?? []
  const counts = new Map<string, number>()
  for (const row of rows) {
    const key = row.bron ?? 'onbekend'
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([bron, count]) => ({ bron, count }))
    .sort((a, b) => b.count - a.count)
}

export async function getDagrapport(now: Date = new Date()): Promise<DagrapportData> {
  const vandaagPeriod = dayWindow(now)
  const gisteren = new Date(now)
  gisteren.setUTCDate(gisteren.getUTCDate() - 1)
  const gisterenPeriod = dayWindow(gisteren)

  const [
    leadsVandaag,
    offertesVandaag,
    akkoordVandaag,
    omzetVandaag,
    bronnen,
    leadsGisteren,
    offertesGisteren,
    akkoordGisteren,
    omzetGisteren,
  ] = await Promise.all([
    countLeads(vandaagPeriod),
    countOffertesVerstuurd(vandaagPeriod),
    countAkkoordIn(vandaagPeriod),
    sumOmzetAkkoord(vandaagPeriod),
    leadsPerBron(vandaagPeriod),
    countLeads(gisterenPeriod),
    countOffertesVerstuurd(gisterenPeriod),
    countAkkoordIn(gisterenPeriod),
    sumOmzetAkkoord(gisterenPeriod),
  ])

  return {
    datum: now.toISOString(),
    vandaag: {
      leads: leadsVandaag,
      offertesVerstuurd: offertesVandaag,
      akkoorden: akkoordVandaag,
      omzet: omzetVandaag,
    },
    gisteren: {
      leads: leadsGisteren,
      offertesVerstuurd: offertesGisteren,
      akkoorden: akkoordGisteren,
      omzet: omzetGisteren,
    },
    bronnen,
  }
}
