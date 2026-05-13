import Link from 'next/link'
import { buildWeekDays, toAmsterdamDayKey } from '@/lib/dashboard/agenda-week'
import type { Appointment } from '@/lib/dashboard/agenda-queries'
import styles from './AgendaWeekGrid.module.css'

const HOURS = Array.from({ length: 11 }, (_, i) => i + 7) // 07:00 → 17:00

/**
 * Week-grid (8 kolommen: tijd-label + 7 dagen) × N rijen (1 header + 11 uur).
 * Events worden geplaatst in de cel die matcht op start-uur van de afspraak
 * in Europe/Amsterdam-tijdzone.
 */
export function AgendaWeekGrid({
  mondayKey,
  appointments,
}: {
  mondayKey: string
  appointments: Appointment[]
}) {
  const days = buildWeekDays(mondayKey)

  // Bouw map: dayKey → Map<hour, Appointment[]>
  type SlotKey = string
  const eventsByDayHour = new Map<SlotKey, Appointment[]>()
  for (const a of appointments) {
    if (!a.afspraak_geboekt_op) continue
    const dayKey = toAmsterdamDayKey(a.afspraak_geboekt_op)
    // Pak het uur in Europe/Amsterdam
    const hour = new Date(a.afspraak_geboekt_op).toLocaleString('nl-NL', {
      timeZone: 'Europe/Amsterdam',
      hour: '2-digit',
      hour12: false,
    })
    const hourNum = parseInt(hour, 10)
    if (hourNum < 7 || hourNum > 17) continue // buiten week-grid bereik
    const key: SlotKey = `${dayKey}#${hourNum}`
    if (!eventsByDayHour.has(key)) eventsByDayHour.set(key, [])
    eventsByDayHour.get(key)!.push(a)
  }

  return (
    <div className={`${styles.card} dash-card`}>
      <div className={styles.grid}>
        {/* Top-left lege cel + 7 day-headers */}
        <div className={`${styles.cell} ${styles.head}`} />
        {days.map((d) => (
          <div
            key={d.key}
            className={`${styles.cell} ${styles.head} ${d.isToday ? styles.today : ''}`}
          >
            <div className={styles.weekday}>{d.weekday}</div>
            <div
              className={styles.dayNum}
              style={d.isToday ? { color: 'var(--primary)' } : undefined}
            >
              {d.date.getDate()}
            </div>
          </div>
        ))}

        {/* 11 hour-rijen */}
        {HOURS.map((h) => (
          <HourRow
            key={h}
            hour={h}
            days={days}
            eventsByDayHour={eventsByDayHour}
          />
        ))}
      </div>
    </div>
  )
}

function HourRow({
  hour,
  days,
  eventsByDayHour,
}: {
  hour: number
  days: ReturnType<typeof buildWeekDays>
  eventsByDayHour: Map<string, Appointment[]>
}) {
  return (
    <>
      <div className={`${styles.cell} ${styles.timeLabel}`}>{hour}:00</div>
      {days.map((d) => {
        const events = eventsByDayHour.get(`${d.key}#${hour}`) ?? []
        return (
          <div
            key={d.key}
            className={`${styles.cell} ${d.isToday ? styles.todayCol : ''}`}
          >
            {events.map((e) => (
              <EventBlock key={e.lead_id} appt={e} />
            ))}
          </div>
        )
      })}
    </>
  )
}

function EventBlock({ appt }: { appt: Appointment }) {
  const start = appt.afspraak_geboekt_op
    ? new Date(appt.afspraak_geboekt_op).toLocaleTimeString('nl-NL', {
        timeZone: 'Europe/Amsterdam',
        hour: '2-digit',
        minute: '2-digit',
      })
    : ''

  // Tone-keuze op basis van status; afgehandeld = groen, anders blauw.
  const tone =
    appt.dashboard_status === 'afgehandeld'
      ? styles.eventGreen
      : appt.dashboard_status === 'no_show'
        ? styles.eventAmber
        : styles.eventBlue

  return (
    <Link href={`/leads/${appt.lead_id}`} className={`${styles.event} ${tone}`}>
      <div className={styles.eventName}>{appt.naam}</div>
      <div className={styles.eventTime}>{start}</div>
    </Link>
  )
}
