'use client'

import { Archive, RotateCcw, Ban } from 'lucide-react'
import styles from './DossBeheer.module.css'

interface DossBeheerProps {
  archived: boolean
  pending: boolean
  onToggleArchief: () => void
  onGeenEcht: () => void
}

/**
 * Mobiele lead-beheeracties (onderaan de Info-tab), parity met de desktop-kop:
 * archiveren/herstellen + "Geen echte lead". Bewust onderaan en rustig
 * gestyled, want het zijn minder-frequente acties die de lead uit de lijst /
 * statistieken halen. Beide zijn omkeerbaar via Herstel.
 */
export function DossBeheer({ archived, pending, onToggleArchief, onGeenEcht }: DossBeheerProps) {
  return (
    <section className={styles.root}>
      <div className={styles.label}>Beheer</div>
      <div className={styles.actions}>
        <button type="button" className={styles.btn} onClick={onToggleArchief} disabled={pending}>
          {archived ? (
            <>
              <RotateCcw size={16} strokeWidth={2.2} aria-hidden="true" />
              Herstel uit archief
            </>
          ) : (
            <>
              <Archive size={16} strokeWidth={2.2} aria-hidden="true" />
              Archiveren
            </>
          )}
        </button>
        {!archived && (
          <button
            type="button"
            className={`${styles.btn} ${styles.danger}`}
            onClick={onGeenEcht}
            disabled={pending}
          >
            <Ban size={16} strokeWidth={2.2} aria-hidden="true" />
            Geen echte lead
          </button>
        )}
      </div>
      <p className={styles.hint}>
        {archived
          ? 'Deze lead staat in het archief. Herstellen zet de lead terug in de lijst en laat hem weer meetellen in de statistieken.'
          : 'Met "Geen echte lead" (spam of test) verdwijnt de lead uit alle statistieken en gaat hij naar het archief. Omkeerbaar via Herstel.'}
      </p>
    </section>
  )
}
