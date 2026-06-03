'use client'

import { eventTone } from './agenda-mobile-helpers'
import type { AgendaEvent, AgendaWeekDay } from './agenda-mock'
import styles from './AgendaDayJumpStrip.module.css'

interface AgendaDayJumpStripProps {
  /** 7 week-dagen (ma–zo). */
  days: AgendaWeekDay[]
  /** Alle week-events, voor de dot-indicatoren per dag. */
  events: AgendaEvent[]
  /** Vandaag ('YYYY-MM-DD', Amsterdam). */
  todayDate: string
  /** Tik op een dag → scroll-jump naar de bijbehorende day-group (functionele pass). */
  onJump?: (date: string) => void
}

/**
 * AgendaDayJumpStrip, mini horizontale week (7 kolommen).
 *
 * Per dag: wday + day + tot 3 event-dots (kleur via eventTone(kind)).
 * data-today (accent) / data-past (gedimd). Data komt nu van de echte
 * afspraken (props) i.p.v. de AG_EVENTS-mock.
 */
export function AgendaDayJumpStrip({ days, events, todayDate, onJump }: AgendaDayJumpStripProps) {
  const today = new Date(`${todayDate}T00:00:00`)

  // Events per dag, voor de dots.
  const byDate = new Map<string, AgendaEvent[]>()
  for (const ev of events) {
    const arr = byDate.get(ev.date) ?? []
    arr.push(ev)
    byDate.set(ev.date, arr)
  }

  return (
    <div className={styles.strip}>
      {days.map((d) => {
        const isToday = d.date === todayDate
        const isPast = new Date(`${d.date}T00:00:00`) < today
        const evs = (byDate.get(d.date) ?? [])
          .slice()
          .sort((a, b) => a.start.localeCompare(b.start))

        return (
          <button
            key={d.date}
            type="button"
            className={styles.cell}
            data-today={isToday ? 'true' : undefined}
            data-past={isPast ? 'true' : undefined}
            onClick={() => onJump?.(d.date)}
          >
            <span className={styles.wday}>{d.wday}</span>
            <span className={styles.day}>{d.day}</span>
            <span className={styles.dots}>
              {evs.length === 0 ? (
                <span className={styles.dotEmpty} aria-hidden="true" />
              ) : (
                evs.slice(0, 3).map((e) => (
                  <span
                    key={e.id}
                    className={styles.dot}
                    style={{ '--tone': eventTone(e.kind) } as React.CSSProperties}
                    aria-hidden="true"
                  />
                ))
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}
