import type { Appointment } from './agenda-queries'

/**
 * Helpers voor het renderen van afspraak-blokken in de agenda-view.
 * Duurschatting, kleur-mapping, tijd-formatting.
 */

/**
 * Einde van de werkdag (Europe/Amsterdam, 24-uurs). Een klus beslaat bij
 * Schoon Straatje een volledige werkdag, dus elke afspraak loopt van zijn
 * starttijd tot dit uur. De DB kent geen aparte eindtijd per afspraak.
 */
export const WORKDAY_END_HOUR = 17

/** Minimale blok-duur (min) als een afspraak laat op de dag zou starten. */
const MIN_DURATION = 30

/**
 * Duur (in minuten) van een starttijd tot het einde van de werkdag (17:00).
 */
export function durationUntilWorkdayEndMin(hour: number, minute: number): number {
  return Math.max(MIN_DURATION, WORKDAY_END_HOUR * 60 - (hour * 60 + minute))
}

/**
 * Duur (in minuten) van een afspraak: van de starttijd tot het einde van de
 * werkdag, want een klus beslaat een hele werkdag. Valt terug op een uur als
 * de afspraak (nog) geen tijd heeft.
 */
export function estimateDurationMinutes(a: Appointment): number {
  if (!a.afspraak_geboekt_op) return 60
  const { hour, minute } = amsterdamHourMinutes(a.afspraak_geboekt_op)
  return durationUntilWorkdayEndMin(hour, minute)
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
 * "62m²" / "156m²", m²-label voor de upcoming-card. Null als geen m².
 */
export function formatM2(m2: number | null | undefined): string | null {
  if (!m2 || m2 <= 0) return null
  return `${Math.round(m2)}m²`
}
