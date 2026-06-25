'use client'

import { Archive, RotateCcw, Ban, CheckCircle2, XCircle } from 'lucide-react'
import styles from './DossBeheer.module.css'

interface DossBeheerProps {
  archived: boolean
  pending: boolean
  onToggleArchief: () => void
  onGeenEcht: () => void
  /** Toon de "Klus afronden"-knoppen (afspraak voorbij + lead nog open)? */
  toonKlus?: boolean
  /** Loopt er een klus-status-actie? Dan beide knoppen disabled. */
  klusPending?: boolean
  /** "Klus afgerond": de afspraak ging door (dashboard_status='afgehandeld'). */
  onKlusAfgerond?: () => void
  /** "Klus niet doorgegaan": markeer de klus als geblokkeerd. */
  onKlusNietDoorgegaan?: () => void
}

/**
 * Mobiele lead-beheeracties (onderaan de Info-tab), parity met de desktop-kop:
 * de "Klus afronden"-knoppen (als de afspraak voorbij is en de lead nog open
 * staat) + archiveren/herstellen + "Geen echte lead". Bewust onderaan en rustig
 * gestyled, want het zijn minder-frequente acties die de lead uit de lijst /
 * statistieken halen. Archiveren is omkeerbaar via Herstel.
 */
export function DossBeheer({
  archived,
  pending,
  onToggleArchief,
  onGeenEcht,
  toonKlus = false,
  klusPending = false,
  onKlusAfgerond,
  onKlusNietDoorgegaan,
}: DossBeheerProps) {
  return (
    <section className={styles.root}>
      {toonKlus && (
        <div className={styles.klusBlock}>
          <div className={styles.label}>Na de afspraak</div>
          <div className={styles.actions}>
            <button
              type="button"
              className={`${styles.btn} ${styles.klusOk}`}
              onClick={onKlusAfgerond}
              disabled={klusPending}
            >
              <CheckCircle2 size={16} strokeWidth={2.2} aria-hidden="true" />
              Klus afgerond
            </button>
            <button
              type="button"
              className={`${styles.btn} ${styles.danger}`}
              onClick={onKlusNietDoorgegaan}
              disabled={klusPending}
            >
              <XCircle size={16} strokeWidth={2.2} aria-hidden="true" />
              Klus niet doorgegaan
            </button>
          </div>
          <p className={styles.hint}>
            De afspraak is voorbij. Ging de klus door? Rond hem af of markeer dat hij niet doorging.
          </p>
        </div>
      )}
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
