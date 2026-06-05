import type { PeriodKey } from '@/lib/dashboard/period'

/** Ruwe data die de server-page aanlevert (Task 8). */
export type AnalyseServerData = {
  periodKey: PeriodKey
  omzet: number
  omzetDoelMaand: number | null
  /** Trend-buckets die het periode-filter volgen: 'YYYY-MM-DD' (dag, voor
   *  week/maand) of 'YYYY-MM' (maand, voor kwartaal/jaar). */
  trend: Array<{ bucket: string; omzet: number }>
  leadsTotaal: number
  offertesVerstuurd: number
  converted: number
  avgOfferte: number | null
  avgReactieMs: number | null
  diensten: Array<{ categorie: string; omzet: number }>
}

export type AnalyseKpi = {
  label: string
  value: string
  /** Indicatieve sparkline-reeks (v1: afgeleid van de omzet-trend). */
  spark: number[]
  tone: 'blue' | 'green' | 'teal' | 'amber' | 'violet'
}

export type AnalyseBar = { label: string; value: string; pct: number; tone: string }

export type MobileAnalyseView = {
  hero: { omzetLabel: string; goalPct: number; periodLabel: string }
  trendSeries: number[]
  monthLabels: string[]
  kpis: AnalyseKpi[]
  funnel: AnalyseBar[]
  diensten: AnalyseBar[]
}

/** Bar/tint-kleuren afgeleid van het prototype (MA_C), nu als tokens/hex. */
const TONE: Record<string, string> = {
  blue: 'var(--color-primary)',
  teal: '#0891B2',
  green: 'var(--color-success)',
  amber: 'var(--color-warning)',
  violet: '#7C3AED',
}
export const toneColor = (t: string): string => TONE[t] ?? TONE.blue

export function eur(n: number): string {
  return `€ ${Math.round(n).toLocaleString('nl-NL')}`
}

export function pctOf(part: number, whole: number): number {
  if (whole <= 0) return 0
  return Math.round((part / whole) * 100)
}

function reactieLabel(ms: number | null): string {
  if (ms === null) return '—'
  const totalSec = Math.round(ms / 1000)
  if (totalSec < 60) return `${totalSec}s`
  const min = Math.round(totalSec / 60)
  if (min < 60) return `${min}m`
  return `${Math.floor(min / 60)}u ${min % 60}m`
}

/** Maandelijks doel → periode-doel (maand ×1, kwartaal ×3, jaar ×12).
 * 'deze-week'/'all-time' vallen terug op ×1 (PeriodToggle toont ze niet). */
function goalForPeriod(doelMaand: number | null, periodKey: PeriodKey): number {
  if (doelMaand == null || doelMaand <= 0) return 0
  if (periodKey === 'dit-kwartaal') return doelMaand * 3
  if (periodKey === 'dit-jaar') return doelMaand * 12
  return doelMaand
}

/** 'YYYY-MM' of 'YYYY-MM-DD' → smal maand-label (nl-NL), bv. '2025-06' → 'J'. */
function monthNarrow(bucket: string): string {
  const ym = bucket.slice(0, 7)
  return new Date(`${ym}-01T00:00:00`).toLocaleString('nl-NL', { month: 'narrow' })
}

/** Dag-van-maand zonder voorloopnul uit 'YYYY-MM-DD'. */
function dayOfMonth(bucket: string): string {
  return String(parseInt(bucket.slice(8, 10), 10))
}

/**
 * X-as labels voor de trendgrafiek. Maandelijkse buckets (kwartaal/jaar)
 * krijgen één smal maand-label per punt. Dagelijkse buckets (week/maand)
 * krijgen ~5 dag-markeringen op dezelfde proportionele posities als de
 * area-chart-punten, zodat ze ongeveer uitlijnen i.p.v. propvol te staan.
 */
function buildTrendLabels(
  trend: Array<{ bucket: string; omzet: number }>,
  periodKey: PeriodKey,
): string[] {
  const daily = periodKey === 'deze-week' || periodKey === 'deze-maand'
  if (!daily) return trend.map((t) => monthNarrow(t.bucket))
  const n = trend.length
  if (n <= 1) return trend.map((t) => dayOfMonth(t.bucket))
  const k = Math.min(5, n)
  const labels: string[] = []
  for (let i = 0; i < k; i++) {
    const idx = Math.round((i * (n - 1)) / (k - 1))
    labels.push(dayOfMonth(trend[idx].bucket))
  }
  return labels
}

const PERIOD_LABEL: Record<PeriodKey, string> = {
  'deze-week': 'deze week',
  'deze-maand': 'deze maand',
  'dit-kwartaal': 'dit kwartaal',
  'dit-jaar': 'dit jaar',
  'all-time': 'totaal',
}

export function mapAnalyse(d: AnalyseServerData): MobileAnalyseView {
  const trendSeries = d.trend.map((t) => t.omzet)
  const goal = goalForPeriod(d.omzetDoelMaand, d.periodKey)

  const conversie = pctOf(d.converted, d.leadsTotaal)

  const kpis: AnalyseKpi[] = [
    { label: 'Conversie', value: d.leadsTotaal > 0 ? `${conversie}%` : '—', spark: trendSeries, tone: 'green' },
    { label: 'Offertes verstuurd', value: String(d.offertesVerstuurd), spark: trendSeries, tone: 'blue' },
    { label: '⌀ Offerte', value: d.avgOfferte !== null ? eur(d.avgOfferte) : '—', spark: trendSeries, tone: 'teal' },
    { label: '⌀ Reactietijd', value: reactieLabel(d.avgReactieMs), spark: trendSeries, tone: 'amber' },
  ]

  const funnel: AnalyseBar[] = [
    { label: 'Leads', value: String(d.leadsTotaal), pct: 100, tone: 'blue' },
    { label: 'Offertes', value: String(d.offertesVerstuurd), pct: pctOf(d.offertesVerstuurd, d.leadsTotaal), tone: 'teal' },
    { label: 'Akkoord', value: String(d.converted), pct: pctOf(d.converted, d.leadsTotaal), tone: 'green' },
  ]

  const maxDienst = Math.max(1, ...d.diensten.map((x) => x.omzet))
  const dienstTones = ['blue', 'teal', 'green', 'amber', 'violet']
  const diensten: AnalyseBar[] = d.diensten.map((x, i) => ({
    label: x.categorie,
    value: eur(x.omzet),
    pct: pctOf(x.omzet, maxDienst),
    tone: dienstTones[i % dienstTones.length],
  }))

  return {
    hero: { omzetLabel: eur(d.omzet), goalPct: pctOf(d.omzet, goal), periodLabel: PERIOD_LABEL[d.periodKey] },
    trendSeries,
    monthLabels: buildTrendLabels(d.trend, d.periodKey),
    kpis,
    funnel,
    diensten,
  }
}
