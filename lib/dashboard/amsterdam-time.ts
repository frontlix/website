// Periode-grenzen in Europe/Amsterdam-tijd, uitgedrukt als UTC ISO-instant.
//
// De DB slaat timestamps in UTC op, maar een NL-ondernemer denkt in NL-tijd:
// "deze maand" begint op de 1e om 00:00 Amsterdam, niet 00:00 UTC. Deze helpers
// geven het UTC-moment dat overeenkomt met het Amsterdam-lokale begin van
// dag/week/maand/kwartaal/jaar, DST-correct (CEST = +2u zomer, CET = +1u winter).
//
// Zelfde offset-techniek als lib/dashboard/appointment-instant.ts (wandklok als
// UTC interpreteren, offset bepalen, corrigeren, één verfijning voor DST).

const AMS_TZ = 'Europe/Amsterdam'

const PARTS_FMT = new Intl.DateTimeFormat('en-US', {
  timeZone: AMS_TZ,
  hour12: false,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  weekday: 'short',
})

const WEEKDAY: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }

interface AmsParts {
  year: number
  month: number // 1-12
  day: number
  weekday: number // 1=maandag .. 7=zondag
}

/** Amsterdam-wandklok-onderdelen van een UTC-moment. */
export function amsterdamParts(d: Date): AmsParts {
  const map: Record<string, string> = {}
  for (const p of PARTS_FMT.formatToParts(d)) map[p.type] = p.value
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    weekday: WEEKDAY[map.weekday] ?? 1,
  }
}

/** Offset (ms) van Amsterdam t.o.v. UTC op het gegeven UTC-moment. */
function amsterdamOffsetMs(utcMs: number): number {
  const map: Record<string, string> = {}
  for (const p of PARTS_FMT.formatToParts(new Date(utcMs))) map[p.type] = p.value
  const hour = map.hour === '24' ? '00' : map.hour
  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(hour),
    Number(map.minute),
    Number(map.second),
  )
  return asUtc - utcMs
}

/**
 * UTC ISO-string van Amsterdam-lokaal {year, month, day} 00:00:00, DST-correct.
 * day/month mogen buiten bereik (bv. day=-3 of day=33); Date.UTC normaliseert.
 */
function amsterdamMidnightIso(year: number, month: number, day: number): string {
  const wallAsUtc = Date.UTC(year, month - 1, day, 0, 0, 0)
  const guess = amsterdamOffsetMs(wallAsUtc)
  let utcMs = wallAsUtc - guess
  const refined = amsterdamOffsetMs(utcMs)
  if (refined !== guess) utcMs = wallAsUtc - refined
  return new Date(utcMs).toISOString()
}

/** Begin van de Amsterdam-dag waarin `now` valt, als UTC ISO. */
export function amsterdamStartOfDayIso(now: Date): string {
  const p = amsterdamParts(now)
  return amsterdamMidnightIso(p.year, p.month, p.day)
}

/** Begin van de Amsterdam-week (maandag 00:00) waarin `now` valt, als UTC ISO. */
export function amsterdamStartOfWeekIso(now: Date): string {
  const p = amsterdamParts(now)
  return amsterdamMidnightIso(p.year, p.month, p.day - (p.weekday - 1))
}

/** Begin van de Amsterdam-maand waarin `now` valt, als UTC ISO. */
export function amsterdamStartOfMonthIso(now: Date): string {
  const p = amsterdamParts(now)
  return amsterdamMidnightIso(p.year, p.month, 1)
}

/** Begin van het Amsterdam-kwartaal waarin `now` valt, als UTC ISO. */
export function amsterdamStartOfQuarterIso(now: Date): string {
  const p = amsterdamParts(now)
  const qStartMonth = Math.floor((p.month - 1) / 3) * 3 + 1
  return amsterdamMidnightIso(p.year, qStartMonth, 1)
}

/** Begin van het Amsterdam-jaar waarin `now` valt, als UTC ISO. */
export function amsterdamStartOfYearIso(now: Date): string {
  const p = amsterdamParts(now)
  return amsterdamMidnightIso(p.year, 1, 1)
}

/** Begin van de Amsterdam-maand vóór de maand waarin `now` valt, als UTC ISO. */
export function amsterdamStartOfPrevMonthIso(now: Date): string {
  const p = amsterdamParts(now)
  // month-1 met 0 -> december vorig jaar; amsterdamMidnightIso normaliseert via Date.UTC.
  return amsterdamMidnightIso(p.year, p.month - 1, 1)
}

/** Amsterdam-dagsleutel (YYYY-MM-DD) van een UTC-moment, voor dag-buckets. */
export function amsterdamDayKey(d: Date): string {
  const p = amsterdamParts(d)
  const mm = String(p.month).padStart(2, '0')
  const dd = String(p.day).padStart(2, '0')
  return `${p.year}-${mm}-${dd}`
}

/** Amsterdam-maandsleutel (YYYY-MM) van een UTC-moment, voor maand-buckets. */
export function amsterdamMonthKey(d: Date): string {
  const p = amsterdamParts(d)
  return `${p.year}-${String(p.month).padStart(2, '0')}`
}
