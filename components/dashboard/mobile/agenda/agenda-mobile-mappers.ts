// Mapt echte afspraken (Appointment uit de leads-tabel) naar de mobiele
// AgendaEvent-vorm. Vervangt de AG_EVENTS-mock op de lees-kant van /agenda.

import type { Appointment } from '@/lib/dashboard/agenda-queries'
import { durationUntilWorkdayEndMin } from '@/lib/dashboard/agenda-event'
import type { AgendaEvent, AgendaWeekDay } from './agenda-mock'

/** 'HH:MM' (Europe/Amsterdam) uit een ISO/UTC-timestamp. */
export function amsterdamTime(iso: string): string {
  return new Intl.DateTimeFormat('nl-NL', {
    timeZone: 'Europe/Amsterdam',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso))
}

/** 'YYYY-MM-DD' (Europe/Amsterdam) uit een ISO/UTC-timestamp. */
export function amsterdamDayKey(iso: string): string {
  const parts = new Intl.DateTimeFormat('nl-NL', {
    timeZone: 'Europe/Amsterdam',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(iso))
  const y = parts.find((p) => p.type === 'year')?.value ?? '0000'
  const m = parts.find((p) => p.type === 'month')?.value ?? '01'
  const d = parts.find((p) => p.type === 'day')?.value ?? '01'
  return `${y}-${m}-${d}`
}

/** 'HH:MM' + minuten → 'HH:MM' (zelfde dag; geclamped op 23:59). */
export function addMinutes(hhmm: string, min: number): string {
  const [h, m] = hhmm.split(':').map(Number)
  const total = Math.min(23 * 60 + 59, h * 60 + m + min)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

/** Adres uit straat/huisnummer/plaats (alleen aanwezige delen). */
export function appointmentAdres(a: {
  straat?: string | null
  huisnummer?: string | null
  plaats?: string | null
}): string {
  const parts: string[] = []
  if (a.straat && a.huisnummer) parts.push(`${a.straat} ${a.huisnummer}`)
  else if (a.straat) parts.push(a.straat)
  if (a.plaats) parts.push(a.plaats)
  return parts.length > 0 ? parts.join(' · ') : '—'
}

/**
 * Mapt echte afspraken naar mobiele AgendaEvent's, gesorteerd op datum+tijd.
 *
 * Keuzes (geen rijkere data in de DB):
 *  - start = Amsterdam-tijd van `afspraak_geboekt_op`; end = einde werkdag
 *    (17:00), want een klus beslaat een hele werkdag.
 *  - kind = 'klus' (DB kent geen plaatsbezoek/bel/eigen-onderscheid).
 *  - current = de afspraak loopt NU (absolute tijd binnen [start, start+duur]).
 */
export function mapAppointmentsToAgendaEvents(
  appts: Appointment[],
  now: Date,
): AgendaEvent[] {
  const nowMs = now.getTime()
  return appts
    .filter((a): a is Appointment & { afspraak_geboekt_op: string } => !!a.afspraak_geboekt_op)
    .map((a) => {
      const start = amsterdamTime(a.afspraak_geboekt_op)
      const [sh, sm] = start.split(':').map(Number)
      const durationMin = durationUntilWorkdayEndMin(sh, sm)
      const end = addMinutes(start, durationMin)
      const startMs = new Date(a.afspraak_geboekt_op).getTime()
      const m2 = typeof a.m2 === 'number' ? a.m2 : undefined
      return {
        id: a.lead_id,
        kind: 'klus' as const,
        naam: a.naam ?? 'Onbekend',
        adres: appointmentAdres(a),
        start,
        end,
        date: amsterdamDayKey(a.afspraak_geboekt_op),
        m2,
        dienst: a.hoofdcategorie ?? undefined,
        lead: a.lead_id,
        telefoon: a.telefoon ?? undefined,
        afstandKm: a.afstand_km ?? null,
        done: a.dashboard_status === 'afgehandeld',
        current: startMs <= nowMs && nowMs < startMs + durationMin * 60_000,
      }
    })
    .sort((x, y) => `${x.date} ${x.start}`.localeCompare(`${y.date} ${y.start}`))
}

// ── Week-dagen (ma–zo) voor de day-jump-strip ────────────────────────────────
const WDAY_SHORT = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za']

/** 7 mobiele week-dagen vanaf een maandag-key ('YYYY-MM-DD'). */
export function buildMobileWeekDays(mondayKey: string): AgendaWeekDay[] {
  const [y, m, d] = mondayKey.split('-').map(Number)
  const monday = new Date(y, m - 1, d)
  return Array.from({ length: 7 }).map((_, i) => {
    const dt = new Date(monday)
    dt.setDate(dt.getDate() + i)
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
    return { date: key, wday: WDAY_SHORT[dt.getDay()], day: dt.getDate() }
  })
}
