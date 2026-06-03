export interface MonthRef {
  year: number
  month: number
}

export interface GridCell {
  dateKey: string
  dayOfMonth: number
  isCurrentMonth: boolean
  isToday: boolean
  isPast: boolean
}

export interface MonthGrid {
  cells: GridCell[]
  monthLabel: string
  prevMonth: MonthRef
  nextMonth: MonthRef
  monthStart: string
  monthEnd: string
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

const MONTH_PARAM = /^(\d{4})-(\d{2})$/

/**
 * Parsest `?month=YYYY-MM`. Default = de maand van het nu-tijdstip.
 */
export function parseMonthParam(
  source: ParamSource,
  now: Date = new Date()
): MonthRef {
  const raw = getParam(source, 'month')
  if (raw) {
    const m = raw.match(MONTH_PARAM)
    if (m) {
      const year = Number(m[1])
      const month = Number(m[2])
      if (month >= 1 && month <= 12) {
        return { year, month }
      }
    }
  }
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 }
}

const NL_MONTH_NAMES = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
]

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

function dateKey(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

/**
 * Build de 7×N grid voor een gegeven maand. Maandag-eerst, 35 of 42 cellen.
 */
export function getMonthGrid(
  year: number,
  month: number,
  now: Date = new Date()
): MonthGrid {
  const monthStart = new Date(Date.UTC(year, month - 1, 1))
  const monthEnd = new Date(Date.UTC(year, month, 0))

  // Shift to Monday-first: Sunday (0) → 6 leading days, Mon (1) → 0, etc.
  const startDay = monthStart.getUTCDay()
  const diffToMonday = startDay === 0 ? 6 : startDay - 1
  const gridStart = new Date(Date.UTC(
    year, month - 1, 1 - diffToMonday
  ))

  // Extend to next Sunday after monthEnd
  const endDay = monthEnd.getUTCDay()
  const diffToSunday = endDay === 0 ? 0 : 7 - endDay
  const gridEnd = new Date(Date.UTC(
    year, month - 1, monthEnd.getUTCDate() + diffToSunday
  ))

  const todayKey = dateKey(now)
  const cells: GridCell[] = []
  const cur = new Date(gridStart)
  while (cur.getTime() <= gridEnd.getTime()) {
    const key = dateKey(cur)
    cells.push({
      dateKey: key,
      dayOfMonth: cur.getUTCDate(),
      isCurrentMonth: cur.getUTCMonth() === month - 1 && cur.getUTCFullYear() === year,
      isToday: key === todayKey,
      isPast: key < todayKey,
    })
    cur.setUTCDate(cur.getUTCDate() + 1)
  }

  const prevMonth: MonthRef = month === 1
    ? { year: year - 1, month: 12 }
    : { year, month: month - 1 }
  const nextMonth: MonthRef = month === 12
    ? { year: year + 1, month: 1 }
    : { year, month: month + 1 }

  const monthLabel = `${NL_MONTH_NAMES[month - 1]} ${year}`

  return {
    cells,
    monthLabel,
    prevMonth,
    nextMonth,
    monthStart: dateKey(monthStart),
    monthEnd: dateKey(monthEnd),
  }
}

/**
 * Converteert UTC ISO-timestamp naar Europe/Amsterdam dag-key (YYYY-MM-DD).
 * Gebruikt Intl.DateTimeFormat, hanteert DST automatisch.
 */
export function toAmsterdamDayKey(iso: string): string {
  const date = new Date(iso)
  const formatter = new Intl.DateTimeFormat('nl-NL', {
    timeZone: 'Europe/Amsterdam',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = formatter.formatToParts(date)
  const year = parts.find((p) => p.type === 'year')?.value ?? '0000'
  const month = parts.find((p) => p.type === 'month')?.value ?? '01'
  const day = parts.find((p) => p.type === 'day')?.value ?? '01'
  return `${year}-${month}-${day}`
}

export interface AppointmentLike {
  lead_id: string
  afspraak_geboekt_op: string
  naam: string | null
}

/**
 * Groepeert appointments op Europe/Amsterdam-dag voor O(1) lookup.
 * Sorteert per dag op tijd ASC.
 */
export function buildAppointmentsByDay<T extends AppointmentLike>(
  appointments: T[]
): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const a of appointments) {
    const key = toAmsterdamDayKey(a.afspraak_geboekt_op)
    const list = map.get(key) ?? []
    list.push(a)
    map.set(key, list)
  }
  // Sort each day's list by ISO timestamp ascending
  for (const list of map.values()) {
    list.sort((a, b) => a.afspraak_geboekt_op.localeCompare(b.afspraak_geboekt_op))
  }
  return map
}
