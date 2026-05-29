'use client'

import { eventTone } from './agenda-mobile-helpers'
import { AG_WEEK_DAYS, AG_TODAY_DATE, eventsOnDate } from './agenda-mock'
import styles from './AgendaDayJumpStrip.module.css'

interface AgendaDayJumpStripProps {
  /** Tik op een dag → scroll-jump naar de bijbehorende day-group (functionele pass). */
  onJump?: (date: string) => void
}

/**
 * AgendaDayJumpStrip — mini horizontale week (7 kolommen).
 *
 * Port van ABMain `DayJumpStrip`.
 * Per dag: wday (9/700 uppercase) + day (15/800 tabular) + tot 3 event-dots.
 * data-today (accent-tint + accent-tekst) / data-past (gedimd).
 * Dot-kleur via --tone (eventTone(kind)) + color-mix in CSS.
 */
export function AgendaDayJumpStrip({ onJump }: AgendaDayJumpStripProps) {
  const today = new Date(AG_TODAY_DATE + 'T00:00:00')

  return (
    <div className={styles.strip}>
      {AG_WEEK_DAYS.map((d) => {
        const isToday = d.date === AG_TODAY_DATE
        const isPast = new Date(d.date + 'T00:00:00') < today
        const evs = eventsOnDate(d.date)

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
