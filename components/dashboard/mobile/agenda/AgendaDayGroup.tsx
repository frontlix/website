'use client'

// AgendaDayGroup — dag-sectie met rijke header-tegel.
// Port van ABShared.jsx `ABDayGroup` + `AgCardList`-wrapper.
// 46×50 datum-pill (data-today/data-past) + label(15/700) + samenvatting(12 muted)
// + uren (rechts). Kinderen (AgendaEventRow's) zitten in een card-list shell.

import type { ReactNode } from 'react'
import styles from './AgendaDayGroup.module.css'

const WDAY_SHORT = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za']

interface AgendaDayGroupProps {
  /** ISO-datum 'YYYY-MM-DD' — voedt de datum-pill (weekdag + dagnummer). */
  date: string
  /** Lange dag-label, bijv. "Vandaag" / "Woensdag 13 mei". */
  label: string
  /** Samenvatting, bijv. "3 afspraken · van 09:00 tot 17:00". */
  summary: string
  /** Uren werk (afgerond), rechts uitgelijnd. Weglaten → geen uren-blok. */
  hours?: number
  /** Datum-pill state. */
  today?: boolean
  past?: boolean
  children?: ReactNode
  /** Optioneel DOM-id, gebruikt als scroll-doel vanuit de dag-strip. */
  id?: string
}

export function AgendaDayGroup({
  date,
  label,
  summary,
  hours,
  today,
  past,
  children,
  id,
}: AgendaDayGroupProps) {
  const d = new Date(`${date}T00:00:00`)
  const wdayShort = WDAY_SHORT[d.getDay()]
  const dayNum = d.getDate()
  const hasEvents = Boolean(children)
  const pillState = today ? 'today' : past ? 'past' : 'future'

  return (
    <div className={styles.group} id={id}>
      <header className={styles.header}>
        <div className={styles.datePill} data-state={pillState}>
          <span className={styles.pillWday}>{wdayShort}</span>
          <span className={styles.pillDay}>{dayNum}</span>
        </div>
        <div className={styles.headText}>
          <p className={styles.label}>{label}</p>
          <p className={styles.summary}>{summary}</p>
        </div>
        {hasEvents && hours != null && (
          <div className={styles.hours}>
            <span className={styles.hoursValue}>{hours}u</span>
            <span className={styles.hoursLabel}>werk</span>
          </div>
        )}
      </header>

      {hasEvents ? (
        <div className={styles.cardList}>{children}</div>
      ) : (
        <div className={styles.empty}>Vrije dag</div>
      )}
    </div>
  )
}
