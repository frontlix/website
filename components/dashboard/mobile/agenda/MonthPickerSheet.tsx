'use client'

// MonthPickerSheet — bottom-sheet maand/jaar-kiezer voor de mobiele
// maandweergave. Opent als je op de maandnaam-kop in AgendaMonth tikt.
// Bevat een jaar-rij (‹ jaar ›), een 12-maand-grid en "Deze maand". De
// jaar-pijlen veranderen ALLEEN het paneel-jaar; tik een maand → navigeer
// naar ?view=maand&month=<paneeljaar>-<MM> (zelfde nav als de prev/next-
// maand-Links) en sluit de sheet. Hergebruikt het sheet-patroon van
// AgendaNewSheet (overlay/backdrop/handle) + useModalSheet (scroll-lock +
// Escape).

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useModalSheet } from '@/hooks/useModalSheet'
import styles from './MonthPickerSheet.module.css'

const MAAND_KORT = [
  'jan', 'feb', 'mrt', 'apr', 'mei', 'jun',
  'jul', 'aug', 'sep', 'okt', 'nov', 'dec',
]

interface MonthPickerSheetProps {
  open: boolean
  onClose: () => void
  /** Jaar van de getoonde maand (start-jaar van het paneel). */
  currentYear: number
  /** Maand (1-12) van de getoonde maand, voor de "huidige"-markering. */
  currentMonth: number
}

export function MonthPickerSheet({
  open,
  onClose,
  currentYear,
  currentMonth,
}: MonthPickerSheetProps) {
  // Hook altijd vóór de vroege return aanroepen (stabiele hook-volgorde).
  const dialogRef = useModalSheet<HTMLDivElement>(open, onClose)
  const [panelYear, setPanelYear] = useState(currentYear)

  if (!open) return null

  return (
    <div className={styles.overlay}>
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-label="Kies maand en jaar"
        tabIndex={-1}
      >
        <div className={styles.handle} aria-hidden="true" />

        {/* Jaar-rij */}
        <div className={styles.yearRow}>
          <button
            type="button"
            className={styles.yearBtn}
            onClick={() => setPanelYear((y) => y - 1)}
            aria-label="Vorig jaar"
          >
            <ChevronLeft size={20} aria-hidden="true" />
          </button>
          <span className={styles.year}>{panelYear}</span>
          <button
            type="button"
            className={styles.yearBtn}
            onClick={() => setPanelYear((y) => y + 1)}
            aria-label="Volgend jaar"
          >
            <ChevronRight size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Maand-grid */}
        <div className={styles.grid}>
          {MAAND_KORT.map((naam, i) => {
            const maand = i + 1
            const isCurrent = panelYear === currentYear && maand === currentMonth
            const mm = String(maand).padStart(2, '0')
            return (
              <Link
                key={naam}
                href={`/agenda?view=maand&month=${panelYear}-${mm}`}
                className={styles.monthBtn}
                data-current={isCurrent || undefined}
                aria-current={isCurrent ? 'true' : undefined}
                onClick={onClose}
              >
                {naam}
              </Link>
            )
          })}
        </div>

        {/* Deze maand */}
        <div className={styles.foot}>
          <Link href="/agenda?view=maand" className={styles.todayLink} onClick={onClose}>
            Deze maand
          </Link>
        </div>

        <div className={styles.bottomSpacer} />
      </div>
    </div>
  )
}
