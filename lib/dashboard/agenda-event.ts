import type { Appointment } from './agenda-queries'

/**
 * Helpers voor het renderen van afspraak-blokken in de agenda-view.
 * Duurschatting, kleur-mapping, tijd-formatting.
 */

const MIN_DURATION = 60
const MAX_DURATION = 8 * 60
const M2_PER_HOUR = 40 // grove schatting: ~40m² straatwerk per uur

/**
 * Schat de duur (in minuten) van een afspraak. Gebruikt m² wanneer
 * beschikbaar (klus-afspraken); anders 60 minuten default (intake /
 * offerte-review / inkoop).
 *
 * Rondt af op halve uren, clampt 60-480 min.
 */
export function estimateDurationMinutes(a: Appointment): number {
  const m2 = a.m2 ?? null
  if (!m2 || m2 <= 0) return MIN_DURATION
  const rawHours = m2 / M2_PER_HOUR
  const halfHours = Math.max(2, Math.min(16, Math.round(rawHours * 2)))
  return Math.max(MIN_DURATION, Math.min(MAX_DURATION, halfHours * 30))
}

export type Tone = 'blue' | 'green' | 'amber' | 'red'

/**
 * Kleur van het event-blok. Status bepaalt: afgehandeld=groen,
 * no_show=rood, anders blauw (default klus).
 */
export function appointmentTone(a: Appointment): Tone {
  if (a.dashboard_status === 'afgehandeld') return 'green'
  if (a.dashboard_status === 'no_show') return 'red'
  return 'blue'
}

/**
 * Formatteer een ISO-timestamp als "HH:mm" in Europe/Amsterdam.
 */
export function formatHHmm(iso: string): string {
  return new Date(iso).toLocaleTimeString('nl-NL', {
    timeZone: 'Europe/Amsterdam',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/**
 * Pak uur+minuut in Europe/Amsterdam-tijdzone uit een ISO-timestamp.
 * Gebruikt Intl met formatToParts om DST/UTC correct te hanteren.
 */
export function amsterdamHourMinutes(iso: string): {
  hour: number
  minute: number
} {
  const fmt = new Intl.DateTimeFormat('nl-NL', {
    timeZone: 'Europe/Amsterdam',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = fmt.formatToParts(new Date(iso))
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0')
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0')
  return { hour, minute }
}

/**
 * "62m²" / "156m²" — m²-label voor de upcoming-card. Null als geen m².
 */
export function formatM2(m2: number | null | undefined): string | null {
  if (!m2 || m2 <= 0) return null
  return `${Math.round(m2)}m²`
}
