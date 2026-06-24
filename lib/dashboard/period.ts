import {
  amsterdamStartOfWeekIso,
  amsterdamStartOfMonthIso,
  amsterdamStartOfQuarterIso,
  amsterdamStartOfYearIso,
  amsterdamStartOfPrevMonthIso,
} from './amsterdam-time'

export type PeriodKey =
  | 'deze-week'
  | 'deze-maand'
  | 'dit-kwartaal'
  | 'dit-jaar'
  | 'all-time'

const VALID: ReadonlySet<PeriodKey> = new Set([
  'deze-week',
  'deze-maand',
  'dit-kwartaal',
  'dit-jaar',
  'all-time',
])

export interface StatsPeriod {
  from: string | null
  to: string
}

type ParamSource =
  | { [k: string]: string | string[] | undefined }
  | URLSearchParams

function getParam(source: ParamSource, key: string): string | undefined {
  if (source instanceof URLSearchParams) {
    return source.get(key) ?? undefined
  }
  const v = source[key]
  if (Array.isArray(v)) return v[0]
  return v
}

/**
 * Parsest URL-search-param `period` naar een PeriodKey.
 * Default: deze-maand (meest gebruikt door ondernemers).
 */
export function parsePeriod(source: ParamSource): PeriodKey {
  const raw = getParam(source, 'period')
  if (raw && VALID.has(raw as PeriodKey)) {
    return raw as PeriodKey
  }
  return 'deze-maand'
}

/**
 * Berekent het tijdvenster voor een PeriodKey gegeven een nu-tijdstip.
 *
 * Periode-grenzen liggen in Europe/Amsterdam-tijd (DST-correct), zodat "deze
 * maand" op de 1e om 00:00 NL begint, niet 00:00 UTC. Anders valt een lead van
 * 00:00-02:00 NL op de 1e in de verkeerde maand. Zie amsterdam-time.ts.
 */
export function periodToRange(key: PeriodKey, now: Date = new Date()): StatsPeriod {
  const to = now.toISOString()
  if (key === 'all-time') return { from: null, to }
  if (key === 'deze-week') return { from: amsterdamStartOfWeekIso(now), to }
  if (key === 'deze-maand') return { from: amsterdamStartOfMonthIso(now), to }
  if (key === 'dit-kwartaal') return { from: amsterdamStartOfQuarterIso(now), to }
  // dit-jaar
  return { from: amsterdamStartOfYearIso(now), to }
}

const LABELS: Record<PeriodKey, string> = {
  'deze-week': 'Deze week',
  'deze-maand': 'Deze maand',
  'dit-kwartaal': 'Dit kwartaal',
  'dit-jaar': 'Dit jaar',
  'all-time': 'All-time',
}

export function periodLabel(key: PeriodKey): string {
  return LABELS[key]
}

/**
 * Aantal dagen (incl. vandaag) in een periode-range. Gebruikt om de
 * "leads per dag"-grafiek mee te laten bewegen met de periode-filter.
 * all-time heeft geen begindatum → gecapt op 365 dagelijkse buckets.
 */
export function rangeToDays(range: StatsPeriod, now: Date = new Date()): number {
  if (!range.from) return 365
  const fromMs = Date.parse(range.from)
  const days = Math.floor((now.getTime() - fromMs) / 86_400_000) + 1
  return Math.max(1, days)
}

/**
 * Vensters voor "vorige periode", gebruikt voor diff-berekeningen
 * (current vs previous). Beide hebben dezelfde lengte zodat de
 * vergelijking eerlijk is.
 *
 * - prevWeekRange(now): [now-14d, now-7d]
 * - prevMonthSamePeriodRange(now): hele vorige kalendermaand t/m dezelfde
 *   dag-van-maand (zodat halverwege deze maand we ook halverwege vorige
 *   maand vergelijken)
 */
export function prevWeekRange(now: Date = new Date()): StatsPeriod {
  const day = 24 * 3600_000
  const from = new Date(now.getTime() - 14 * day)
  const to = new Date(now.getTime() - 7 * day)
  return { from: from.toISOString(), to: to.toISOString() }
}

export function thisWeekRolling(now: Date = new Date()): StatsPeriod {
  const day = 24 * 3600_000
  const from = new Date(now.getTime() - 7 * day)
  return { from: from.toISOString(), to: now.toISOString() }
}

export function prevMonthSamePeriodRange(now: Date = new Date()): StatsPeriod {
  // Vorige kalendermaand, even ver erin als nu in de huidige maand (dezelfde
  // verstreken duur), in Amsterdam-tijd. Zo vergelijken we appels met appels.
  const thisMonthStart = Date.parse(amsterdamStartOfMonthIso(now))
  const elapsed = now.getTime() - thisMonthStart
  const prevStart = Date.parse(amsterdamStartOfPrevMonthIso(now))
  return {
    from: new Date(prevStart).toISOString(),
    to: new Date(prevStart + elapsed).toISOString(),
  }
}

export function prev30DaysRange(now: Date = new Date()): StatsPeriod {
  const day = 24 * 3600_000
  const from = new Date(now.getTime() - 60 * day)
  const to = new Date(now.getTime() - 30 * day)
  return { from: from.toISOString(), to: to.toISOString() }
}

export function last30DaysRange(now: Date = new Date()): StatsPeriod {
  const day = 24 * 3600_000
  const from = new Date(now.getTime() - 30 * day)
  return { from: from.toISOString(), to: now.toISOString() }
}
