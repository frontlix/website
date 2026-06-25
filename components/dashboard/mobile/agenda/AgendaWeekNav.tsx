'use client'

// AgendaWeekNav, week-navigatie voor de mobiele agenda.
// ‹ (vorige week) · weeklabel · › (volgende week) + "Vandaag"-knop.
// Navigatie via ?week=YYYY-MM-DD (zelfde infra als desktop). "Vandaag" is
// inactief zolang de getoonde week de huidige week is.

import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { WeekMaandSwitch } from './WeekMaandSwitch'
import styles from './AgendaWeekNav.module.css'

interface AgendaWeekNavProps {
  /** Subtitle, bv. "Week 22 · 25 t/m 31 mei 2026". */
  weekLabel: string
  /** Maandag-key (YYYY-MM-DD) van de vorige week. */
  prevWeekKey: string
  /** Maandag-key (YYYY-MM-DD) van de volgende week. */
  nextWeekKey: string
  /** True → "Vandaag" inactief (we staan al op de huidige week). */
  isCurrentWeek: boolean
  /** Actieve weergave; toont de Week|Maand-switch rechts als meegegeven. */
  view?: 'week' | 'maand'
  /** Wissel van weergave (instant client-side). */
  onViewChange?: (v: 'week' | 'maand') => void
}

export function AgendaWeekNav({
  weekLabel,
  prevWeekKey,
  nextWeekKey,
  isCurrentWeek,
  view,
  onViewChange,
}: AgendaWeekNavProps) {
  return (
    <nav className={styles.nav} aria-label="Week-navigatie">
      <Link
        href={`/agenda?week=${prevWeekKey}`}
        className={styles.arrow}
        aria-label="Vorige week"
      >
        <ChevronLeft size={20} aria-hidden="true" />
      </Link>

      <span className={styles.label}>{weekLabel}</span>

      <Link
        href={`/agenda?week=${nextWeekKey}`}
        className={styles.arrow}
        aria-label="Volgende week"
      >
        <ChevronRight size={20} aria-hidden="true" />
      </Link>

      {isCurrentWeek ? (
        <span className={styles.today} data-disabled="true" aria-disabled="true">
          Vandaag
        </span>
      ) : (
        <Link href="/agenda" className={styles.today}>
          Vandaag
        </Link>
      )}

      {view && onViewChange && (
        <span className={styles.switchSlot}>
          <WeekMaandSwitch view={view} onChange={onViewChange} />
        </span>
      )}
    </nav>
  )
}
