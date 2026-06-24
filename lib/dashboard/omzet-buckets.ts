import { periodToRange, type PeriodKey } from './period'
import { amsterdamDayKey, amsterdamMonthKey, amsterdamStartOfMonthIso } from './amsterdam-time'

/**
 * Pure bucket-logica voor de omzet-trendgrafiek. Geen DB/React, los testbaar.
 *
 * Een lead telt mee als "gewonnen" zodra hij akkoord is OF een afspraak heeft
 * geboekt; de omzet-datum (`wonDate`) is akkoord_op, anders afspraak_geboekt_op.
 * Deze module krijgt de al-platgeslagen rijen ({ wonDate, prijs }) binnen en
 * verdeelt ze over tijds-buckets die het periode-filter volgen:
 *   - week / maand → dagelijkse buckets (periode-start t/m nu)
 *   - kwartaal / jaar / all-time → maandelijkse buckets
 * Zo beslaan het hero-bedrag (omzetTotaal over dezelfde range) en de grafiek
 * exact hetzelfde venster.
 */

export type OmzetRow = { wonDate: string; prijs: number }
export type OmzetBucket = { bucket: string; omzet: number }

/** Daggranulariteit voor korte periodes, anders maand. */
export function bucketGranulariteit(periodKey: PeriodKey): 'dag' | 'maand' {
  return periodKey === 'deze-week' || periodKey === 'deze-maand' ? 'dag' : 'maand'
}

/** Volgende kalenderdag-sleutel (YYYY-MM-DD), DST-veilig (pure kalender). */
function nextDayKey(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  const nx = new Date(Date.UTC(y, m - 1, d + 1))
  return `${nx.getUTCFullYear()}-${String(nx.getUTCMonth() + 1).padStart(2, '0')}-${String(nx.getUTCDate()).padStart(2, '0')}`
}
/** Volgende kalendermaand-sleutel (YYYY-MM). */
function nextMonthKey(key: string): string {
  const [y, m] = key.split('-').map(Number)
  const nx = new Date(Date.UTC(y, m, 1))
  return `${nx.getUTCFullYear()}-${String(nx.getUTCMonth() + 1).padStart(2, '0')}`
}

export function omzetBuckets(
  rows: OmzetRow[],
  periodKey: PeriodKey,
  now: Date = new Date(),
): OmzetBucket[] {
  const gran = bucketGranulariteit(periodKey)
  const range = periodToRange(periodKey, now)

  // Startmoment: periode-begin (range.from = UTC-instant van de NL-grens), of
  // (all-time) een redelijk trailing venster.
  let startMs: number
  if (range.from) {
    startMs = Date.parse(range.from)
  } else if (gran === 'dag') {
    startMs = now.getTime() - 29 * 86_400_000
  } else {
    startMs = Date.parse(amsterdamStartOfMonthIso(new Date(now.getTime() - 330 * 86_400_000)))
  }
  const endMs = now.getTime()

  // Geordende, lege NL-dag/maand-buckets van start t/m nu (calendar-correct,
  // DST-veilig). De guard voorkomt een eventuele oneindige lus.
  const buckets: OmzetBucket[] = []
  const index = new Map<string, number>()
  if (gran === 'dag') {
    let cur = amsterdamDayKey(new Date(startMs))
    const last = amsterdamDayKey(new Date(endMs))
    for (let guard = 0; guard < 800; guard++) {
      index.set(cur, buckets.length)
      buckets.push({ bucket: cur, omzet: 0 })
      if (cur === last) break
      cur = nextDayKey(cur)
    }
  } else {
    let cur = amsterdamMonthKey(new Date(startMs))
    const last = amsterdamMonthKey(new Date(endMs))
    for (let guard = 0; guard < 120; guard++) {
      index.set(cur, buckets.length)
      buckets.push({ bucket: cur, omzet: 0 })
      if (cur === last) break
      cur = nextMonthKey(cur)
    }
  }

  // Tel rijen op in hun NL-bucket (binnen het venster start..nu).
  for (const r of rows) {
    const ms = Date.parse(r.wonDate)
    if (Number.isNaN(ms) || ms < startMs || ms > endMs) continue
    const key = gran === 'dag' ? amsterdamDayKey(new Date(r.wonDate)) : amsterdamMonthKey(new Date(r.wonDate))
    const i = index.get(key)
    if (i != null) buckets[i].omzet += r.prijs
  }

  return buckets
}
