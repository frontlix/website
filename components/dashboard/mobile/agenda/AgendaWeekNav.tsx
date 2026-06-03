'use client'

// AgendaWeekNav, week-navigatie voor de mobiele agenda.
// ‹ (vorige week) · weeklabel · › (volgende week) + "Vandaag"-knop.
// Navigatie via ?week=YYYY-MM-DD (zelfde infra als desktop). "Vandaag" is
// inactief zolang de getoonde week de huidige week is.

import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
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
}

export function AgendaWeekNav({
  weekLabel,
  prevWeekKey,
  nextWeekKey,
  isCurrentWeek,
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
    </nav>
  )
}
