/** Timeline-bucket voor een bericht-timestamp en speaker-mapping. */

export type InboxBucket = 'live' | 'today' | 'yest' | 'older'
export type BubbleSpeaker = 'klant' | 'surface'

const TZ = 'Europe/Amsterdam'

/** Formatteer een Date naar 'DD/MM/YYYY' in de Amsterdam-tijdzone. */
const dayKey = (d: Date) =>
  new Intl.DateTimeFormat('nl-NL', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)

/**
 * Bepaal in welke sectie een bericht-timestamp thuishoort.
 *  - 'live', minder dan 30 minuten geleden
 *  - 'today', zelfde kalenderdag, ouder dan 30 minuten
 *  - 'yest', gisteren
 *  - 'older', alles daarvoor
 */
export function bucketFor(iso: string, now: Date = new Date()): InboxBucket {
  const t = new Date(iso)
  const mins = (now.getTime() - t.getTime()) / 60000
  if (mins < 30) return 'live'

  const today = dayKey(now)
  const yest = dayKey(new Date(now.getTime() - 86400_000))
  const k = dayKey(t)

  if (k === today) return 'today'
  if (k === yest) return 'yest'
  return 'older'
}

/**
 * Vertaal berichtrichting naar bubble-spreker.
 * Owner vs Surface zijn niet te onderscheiden uit de DB, alle uitgaande
 * berichten renderen als Surface (blauw, rechts).
 */
export function speakerFor(richting: string): BubbleSpeaker {
  return richting === 'inkomend' ? 'klant' : 'surface'
}
