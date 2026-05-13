/**
 * Helpers voor de week-view van /agenda. Werkt in Europe/Amsterdam-tijd
 * door alle calculaties te doen op een locale-onafhankelijke 'YYYY-MM-DD'
 * string-key voor dagen, plus aparte tijdstrings.
 */

import { toAmsterdamDayKey } from './calendar'

export type WeekRef = {
  /** Maandag van de week, lokale tijd, YYYY-MM-DD */
  mondayKey: string
  /** ISO weeknummer */
  weekNumber: number
  /** Voor in de title-bar */
  rangeLabel: string
  /** ISO-strings voor de DB-query (UTC met buffer) */
  queryStart: string
  queryEnd: string
}

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

function dateToKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function getMondayOf(date: Date): Date {
  const result = new Date(date)
  const day = result.getDay()
  const diffToMonday = day === 0 ? 6 : day - 1
  result.setDate(result.getDate() - diffToMonday)
  result.setHours(0, 0, 0, 0)
  return result
}

function getISOWeekNumber(date: Date): number {
  // ISO 8601 week: Thursday of the week defines the year.
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const week1 = new Date(d.getFullYear(), 0, 4)
  return (
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7,
    )
  )
}

/**
 * Pakt de week-ref voor URL-search-param `?week=YYYY-MM-DD` (maandag).
 * Default: huidige week.
 */
export function parseWeekParam(
  sp: { [k: string]: string | string[] | undefined } | URLSearchParams,
): WeekRef {
  const raw =
    sp instanceof URLSearchParams
      ? sp.get('week')
      : Array.isArray(sp.week)
        ? sp.week[0]
        : sp.week
  let base: Date
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    base = parseKey(raw)
  } else {
    base = new Date()
  }
  const monday = getMondayOf(base)
  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)

  // Range-label NL: "11 t/m 17 mei 2026" (zelfde maand) of
  // "30 apr t/m 5 mei 2026" (over de maand heen).
  const sameMonth = monday.getMonth() === sunday.getMonth()
  const fmt = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short' })
  const rangeLabel = sameMonth
    ? `${monday.getDate()} t/m ${sunday.getDate()} ${fmt
        .format(monday)
        .split(' ')
        .pop()} ${monday.getFullYear()}`
    : `${fmt.format(monday)} t/m ${fmt.format(sunday)} ${sunday.getFullYear()}`

  // Query-range UTC met 1 dag buffer aan beide kanten (TZ-safe — zie
  // agenda-queries.ts voor dezelfde aanpak).
  const queryStart = new Date(monday)
  queryStart.setDate(queryStart.getDate() - 1)
  const queryEnd = new Date(sunday)
  queryEnd.setDate(queryEnd.getDate() + 2)

  return {
    mondayKey: dateToKey(monday),
    weekNumber: getISOWeekNumber(monday),
    rangeLabel,
    queryStart: queryStart.toISOString(),
    queryEnd: queryEnd.toISOString(),
  }
}

/** Verschuift de monday-key met +/- 7 dagen voor prev/next-week navigatie. */
export function shiftWeekKey(mondayKey: string, deltaWeeks: number): string {
  const d = parseKey(mondayKey)
  d.setDate(d.getDate() + deltaWeeks * 7)
  return dateToKey(d)
}

/**
 * Genereert 7 dag-objecten voor de week, beginnend bij maandag, met
 * day-keys die matchen op `toAmsterdamDayKey` van een afspraak-timestamp.
 */
export function buildWeekDays(
  mondayKey: string,
): Array<{ key: string; date: Date; weekday: string; isToday: boolean }> {
  const monday = parseKey(mondayKey)
  const todayKey = dateToKey(new Date())
  return Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(monday)
    d.setDate(d.getDate() + i)
    return {
      key: dateToKey(d),
      date: d,
      weekday: d.toLocaleDateString('nl-NL', { weekday: 'short' }).toUpperCase(),
      isToday: dateToKey(d) === todayKey,
    }
  })
}

/** Re-export voor convenience; matches wat agenda-queries gebruikt. */
export { toAmsterdamDayKey }
