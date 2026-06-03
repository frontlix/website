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

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

function toDateString(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

/**
 * Berekent het tijdvenster voor een PeriodKey gegeven een nu-tijdstip.
 */
export function periodToRange(key: PeriodKey, now: Date = new Date()): StatsPeriod {
  const to = now.toISOString()

  if (key === 'all-time') {
    return { from: null, to }
  }

  if (key === 'deze-week') {
    const day = now.getUTCDay()
    const diffToMonday = day === 0 ? 6 : day - 1
    const monday = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - diffToMonday
    ))
    return { from: toDateString(monday), to }
  }

  if (key === 'deze-maand') {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    return { from: toDateString(start), to }
  }

  if (key === 'dit-kwartaal') {
    const month = now.getUTCMonth()
    const quarterStartMonth = Math.floor(month / 3) * 3
    const start = new Date(Date.UTC(now.getUTCFullYear(), quarterStartMonth, 1))
    return { from: toDateString(start), to }
  }

  // dit-jaar
  const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1))
  return { from: toDateString(start), to }
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
  // Begin van vorige kalendermaand
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
  // T/m dezelfde dag-van-maand als nu (in vorige maand)
  const end = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth() - 1,
    now.getUTCDate(),
    now.getUTCHours(),
    now.getUTCMinutes(),
  ))
  return { from: start.toISOString(), to: end.toISOString() }
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
