'use client'

// AgendaWeekNav, schone periode-regel voor de mobiele agenda (weekweergave).
// Alleen het weeklabel (links, mag ellipsen) + het kleine Week|Maand-pilletje
// (rechts). De week vorige/volgende-navigatie + "Vandaag" staan bij de dag-strip
// (zie AgendaWeek), niet meer op deze regel.

import { WeekMaandSwitch } from './WeekMaandSwitch'
import styles from './AgendaWeekNav.module.css'

interface AgendaWeekNavProps {
  /** Subtitle, bv. "Week 22 · 25 t/m 31 mei 2026". */
  weekLabel: string
  /** Actieve weergave; toont de Week|Maand-switch rechts als meegegeven. */
  view?: 'week' | 'maand'
  /** Wissel van weergave (instant client-side). */
  onViewChange?: (v: 'week' | 'maand') => void
}

export function AgendaWeekNav({ weekLabel, view, onViewChange }: AgendaWeekNavProps) {
  return (
    <div className={styles.nav} aria-label="Periode">
      <span className={styles.label}>{weekLabel}</span>

      {view && onViewChange && (
        <span className={styles.switchSlot}>
          <WeekMaandSwitch view={view} onChange={onViewChange} />
        </span>
      )}
    </div>
  )
}
