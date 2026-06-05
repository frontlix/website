import { periodToRange, type PeriodKey } from './period'

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

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}
function ymd(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}
function ym(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`
}

export function omzetBuckets(
  rows: OmzetRow[],
  periodKey: PeriodKey,
  now: Date = new Date(),
): OmzetBucket[] {
  const gran = bucketGranulariteit(periodKey)
  const range = periodToRange(periodKey, now)

  // Startdatum: periode-begin, of (all-time) een redelijk trailing venster.
  let start: Date
  if (range.from) {
    start = new Date(`${range.from}T00:00:00.000Z`)
  } else if (gran === 'dag') {
    start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29))
  } else {
    start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1))
  }

  // Genereer geordende, lege buckets van start t/m nu.
  const buckets: OmzetBucket[] = []
  const index = new Map<string, number>()
  if (gran === 'dag') {
    const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()))
    const last = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    while (cursor <= last) {
      const key = ymd(cursor)
      index.set(key, buckets.length)
      buckets.push({ bucket: key, omzet: 0 })
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    }
  } else {
    const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1))
    const last = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    while (cursor <= last) {
      const key = ym(cursor)
      index.set(key, buckets.length)
      buckets.push({ bucket: key, omzet: 0 })
      cursor.setUTCMonth(cursor.getUTCMonth() + 1)
    }
  }

  // Tel rijen op in hun bucket (binnen het venster start..nu).
  const startMs = start.getTime()
  const endMs = now.getTime()
  for (const r of rows) {
    const t = new Date(r.wonDate)
    const ms = t.getTime()
    if (Number.isNaN(ms) || ms < startMs || ms > endMs) continue
    const key = gran === 'dag' ? ymd(t) : ym(t)
    const i = index.get(key)
    if (i != null) buckets[i].omzet += r.prijs
  }

  return buckets
}
