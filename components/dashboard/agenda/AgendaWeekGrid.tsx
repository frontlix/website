import Link from 'next/link'
import { buildWeekDays, toAmsterdamDayKey } from '@/lib/dashboard/agenda-week'
import {
  estimateDurationMinutes,
  appointmentTone,
  formatHHmm,
  amsterdamHourMinutes,
} from '@/lib/dashboard/agenda-event'
import type { Appointment } from '@/lib/dashboard/agenda-queries'
import styles from './AgendaWeekGrid.module.css'

const HOURS = Array.from({ length: 11 }, (_, i) => i + 7) // 07:00 → 17:00
const GRID_START_HOUR = 7
const GRID_END_HOUR = 18 // exclusive, voor clamp van eind-tijd

/**
 * Week-grid (8 kolommen: tijd-label + 7 dagen). Body-rijen werken op
 * halfuur-precisie: 22 rijen × 22px voor 11 uren. Events spannen meerdere
 * rijen via `grid-row` start/end op basis van duur. Half-uur-offsets
 * vallen exact op cell-grenzen.
 */
export function AgendaWeekGrid({
  mondayKey,
  appointments,
}: {
  mondayKey: string
  appointments: Appointment[]
}) {
  const days = buildWeekDays(mondayKey)
  const dayIndex = new Map(days.map((d, i) => [d.key, i]))

  return (
    <div className={`${styles.card} dash-card`}>
      <div className={styles.grid}>
        {/* Header: lege hoek + 7 day-headers */}
        <div className={`${styles.cell} ${styles.head} ${styles.cornerHead}`} />
        {days.map((d) => (
          <div
            key={d.key}
            className={`${styles.cell} ${styles.head} ${d.isToday ? styles.today : ''}`}
            style={{ gridColumn: `${dayIndex.get(d.key)! + 2}`, gridRow: 1 }}
          >
            <div className={styles.weekday}>{d.weekday}</div>
            <div className={styles.dayNum}>{d.date.getDate()}</div>
          </div>
        ))}

        {/* Tijd-labels (links): elk uur span 2 halfuur-rijen */}
        {HOURS.map((h, i) => (
          <div
            key={`tl-${h}`}
            className={`${styles.cell} ${styles.timeLabel}`}
            style={{ gridColumn: 1, gridRow: `${i * 2 + 2} / span 2` }}
          >
            {h}:00
          </div>
        ))}

        {/* Dag-tracks (7 × 11): per dag per uur 1 cel span 2 halfuur-rijen */}
        {days.map((d, dayIdx) =>
          HOURS.map((h, i) => (
            <div
              key={`${d.key}#${h}`}
              className={`${styles.cell} ${d.isToday ? styles.todayCol : ''}`}
              style={{
                gridColumn: dayIdx + 2,
                gridRow: `${i * 2 + 2} / span 2`,
              }}
            />
          )),
        )}

        {/* Events: absolute via grid-area met halfuur-precisie */}
        {appointments.map((a) => {
          if (!a.afspraak_geboekt_op) return null
          const dayKey = toAmsterdamDayKey(a.afspraak_geboekt_op)
          const col = dayIndex.get(dayKey)
          if (col === undefined) return null

          const { hour, minute } = amsterdamHourMinutes(a.afspraak_geboekt_op)
          if (hour < GRID_START_HOUR || hour >= GRID_END_HOUR) return null

          const durationMin = estimateDurationMinutes(a)
          const startTotalMin = hour * 60 + minute
          const endTotalMin = Math.min(
            startTotalMin + durationMin,
            GRID_END_HOUR * 60,
          )

          // Half-hour rows: row 2 = hour 7 first half, row 3 = hour 7 second half, ...
          const startHalfHour =
            (startTotalMin - GRID_START_HOUR * 60) / 30
          const endHalfHour = (endTotalMin - GRID_START_HOUR * 60) / 30
          const rowStart = Math.floor(startHalfHour) + 2
          const rowEnd = Math.max(rowStart + 1, Math.ceil(endHalfHour) + 2)

          const tone = appointmentTone(a)
          const startLabel = formatHHmm(a.afspraak_geboekt_op)
          const endLabel = formatHHmm(
            new Date(
              new Date(a.afspraak_geboekt_op).getTime() + durationMin * 60_000,
            ).toISOString(),
          )

          return (
            <Link
              key={a.lead_id}
              href={`/leads/${a.lead_id}`}
              className={`${styles.event} ${styles[`event_${tone}`]}`}
              style={{
                gridColumn: col + 2,
                gridRow: `${rowStart} / ${rowEnd}`,
              }}
              title={`${a.naam} · ${startLabel}-${endLabel}`}
            >
              <div className={styles.eventName}>{a.naam}</div>
              <div className={styles.eventTime}>
                {startLabel}–{endLabel}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
