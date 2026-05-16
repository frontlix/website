import { getDashboardSupabase } from './supabase-server'
import {
  countLeads,
  countOffertesVerstuurd,
  countAkkoordIn,
  avgReactietijdMs,
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
  /** 7-daags sparkline per KPI — oudste eerst, vandaag laatste. */
  sparklines: {
    leads: number[]
    offertes: number[]
    akkoorden: number[]
    omzet: number[]
  }
  /** 24 buckets (0-23u) met aantal events per uur — vandaag, lokale tijd. */
  uurStrip: number[]
  /** Surface-bot activiteit — bot-activity sectie boven KPI's. */
  surface: SurfaceActivity
}

export interface SurfaceActivity {
  /** Berichten verstuurd door de bot vandaag. */
  uitgaand: number
  /** Berichten ontvangen van klanten vandaag. */
  inkomend: number
  /** Gem. reactietijd in seconden (vandaag, alleen leads van vandaag). */
  reactietijdS: number | null
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

/**
 * Bucketize ISO-timestamps in een 7-daags window naar één integer per dag
 * (oudste eerst, vandaag laatste). Werkt op leads.aangemaakt /
 * offerte_verstuurd_op / akkoord_op timestamps.
 */
function bucketDays(timestamps: string[], now: Date): number[] {
  const buckets = new Array(7).fill(0)
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).getTime()
  for (const ts of timestamps) {
    const t = Date.parse(ts)
    if (Number.isNaN(t)) continue
    const d = new Date(t)
    const dayStart = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
    const offset = Math.floor((today - dayStart) / (24 * 3600_000))
    // offset 0 = vandaag (laatste), offset 6 = 6 dagen terug (eerste)
    if (offset >= 0 && offset < 7) {
      buckets[6 - offset] += 1
    }
  }
  return buckets
}

/** Som-bucketize: zelfde als bucketDays maar somt waarden ipv telt rijen. */
function bucketDaysSum(
  rows: { timestamp: string; value: number }[],
  now: Date,
): number[] {
  const buckets = new Array(7).fill(0)
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).getTime()
  for (const r of rows) {
    const t = Date.parse(r.timestamp)
    if (Number.isNaN(t)) continue
    const d = new Date(t)
    const dayStart = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
    const offset = Math.floor((today - dayStart) / (24 * 3600_000))
    if (offset >= 0 && offset < 7) {
      buckets[6 - offset] += r.value
    }
  }
  return buckets
}

/**
 * Sparkline-data voor de 4 KPI's — 7 dagen, één rondrit naar de db per
 * metric. Returnt arrays van lengte 7 (oudste → vandaag).
 */
async function getSparklines(
  now: Date,
): Promise<DagrapportData['sparklines']> {
  const supabase = await getDashboardSupabase()
  const sevenDaysAgo = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6),
  ).toISOString()

  const [leadsRes, offertesRes, akkoordenRes] = await Promise.all([
    supabase
      .from('leads')
      .select('aangemaakt')
      .gte('aangemaakt', sevenDaysAgo),
    supabase
      .from('leads')
      .select('offerte_verstuurd_op')
      .not('offerte_verstuurd_op', 'is', null)
      .gte('offerte_verstuurd_op', sevenDaysAgo),
    supabase
      .from('leads')
      .select('akkoord_op, totaal_prijs')
      .not('akkoord_op', 'is', null)
      .gte('akkoord_op', sevenDaysAgo),
  ])

  const leadsTimestamps =
    ((leadsRes.data as { aangemaakt: string | null }[] | null) ?? [])
      .map((r) => r.aangemaakt)
      .filter((t): t is string => !!t)
  const offertesTimestamps =
    ((offertesRes.data as { offerte_verstuurd_op: string | null }[] | null) ?? [])
      .map((r) => r.offerte_verstuurd_op)
      .filter((t): t is string => !!t)
  const akkoordenRows =
    (akkoordenRes.data as { akkoord_op: string | null; totaal_prijs: number | null }[] | null) ?? []

  return {
    leads: bucketDays(leadsTimestamps, now),
    offertes: bucketDays(offertesTimestamps, now),
    akkoorden: bucketDays(
      akkoordenRows.map((r) => r.akkoord_op).filter((t): t is string => !!t),
      now,
    ),
    omzet: bucketDaysSum(
      akkoordenRows
        .filter((r) => r.akkoord_op && r.totaal_prijs !== null)
        .map((r) => ({ timestamp: r.akkoord_op!, value: r.totaal_prijs! })),
      now,
    ),
  }
}

/**
 * Uur-strip: 24 buckets met het aantal events vandaag, per uur in
 * Europe/Amsterdam-tijd. Combineert lead-binnenkomsten, offerte-verzending,
 * akkoorden en in/uitgaande berichten — alles wat "er gebeurde vandaag" is.
 */
async function getUurStrip(period: StatsPeriod): Promise<number[]> {
  const supabase = await getDashboardSupabase()
  if (!period.from || !period.to) return new Array(24).fill(0)

  const [leadsRes, offertesRes, akkoordRes, berichtenRes] = await Promise.all([
    supabase
      .from('leads')
      .select('aangemaakt')
      .gte('aangemaakt', period.from)
      .lt('aangemaakt', period.to),
    supabase
      .from('leads')
      .select('offerte_verstuurd_op')
      .not('offerte_verstuurd_op', 'is', null)
      .gte('offerte_verstuurd_op', period.from)
      .lt('offerte_verstuurd_op', period.to),
    supabase
      .from('leads')
      .select('akkoord_op')
      .not('akkoord_op', 'is', null)
      .gte('akkoord_op', period.from)
      .lt('akkoord_op', period.to),
    supabase
      .from('berichten')
      .select('timestamp')
      .not('timestamp', 'is', null)
      .gte('timestamp', period.from)
      .lt('timestamp', period.to),
  ])

  const buckets = new Array(24).fill(0)
  const addTs = (iso: string | null | undefined) => {
    if (!iso) return
    const t = Date.parse(iso)
    if (Number.isNaN(t)) return
    // Uur in Europe/Amsterdam-tijdzone via toLocaleString trick (geen extra
    // dep nodig). `Intl` zou eleganter zijn maar duur in een loop.
    const hour = new Date(
      new Date(t).toLocaleString('en-US', { timeZone: 'Europe/Amsterdam' }),
    ).getHours()
    if (hour >= 0 && hour < 24) buckets[hour] += 1
  }

  for (const row of (leadsRes.data as { aangemaakt: string | null }[] | null) ?? []) {
    addTs(row.aangemaakt)
  }
  for (const row of (offertesRes.data as { offerte_verstuurd_op: string | null }[] | null) ?? []) {
    addTs(row.offerte_verstuurd_op)
  }
  for (const row of (akkoordRes.data as { akkoord_op: string | null }[] | null) ?? []) {
    addTs(row.akkoord_op)
  }
  for (const row of (berichtenRes.data as { timestamp: string | null }[] | null) ?? []) {
    addTs(row.timestamp)
  }

  return buckets
}

/**
 * Surface-bot activiteit — counts van uit/inkomende berichten + gem.
 * reactietijd voor leads van vandaag. Geeft de drawer een bot-narratief
 * naast de pure KPI's.
 */
async function getSurfaceActivity(
  period: StatsPeriod,
): Promise<SurfaceActivity> {
  const supabase = await getDashboardSupabase()
  if (!period.from || !period.to) {
    return { uitgaand: 0, inkomend: 0, reactietijdS: null }
  }

  const [uitRes, inRes, reactietijd] = await Promise.all([
    supabase
      .from('berichten')
      .select('*', { count: 'exact', head: true })
      .eq('richting', 'uitgaand')
      .gte('timestamp', period.from)
      .lt('timestamp', period.to),
    supabase
      .from('berichten')
      .select('*', { count: 'exact', head: true })
      .eq('richting', 'inkomend')
      .gte('timestamp', period.from)
      .lt('timestamp', period.to),
    avgReactietijdMs(period),
  ])

  return {
    uitgaand: uitRes.count ?? 0,
    inkomend: inRes.count ?? 0,
    reactietijdS: reactietijd !== null ? Math.round(reactietijd / 1000) : null,
  }
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
    sparklines,
    uurStrip,
    surface,
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
    getSparklines(now),
    getUurStrip(vandaagPeriod),
    getSurfaceActivity(vandaagPeriod),
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
    sparklines,
    uurStrip,
    surface,
  }
}
