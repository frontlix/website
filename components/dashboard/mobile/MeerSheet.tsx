'use client'

import Link from 'next/link'
import { BarChart3, Star, Truck } from 'lucide-react'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { ThemeToggle } from '@/components/dashboard/ui/ThemeToggle'
import styles from './MeerSheet.module.css'

/**
 * MeerSheet — slide-up bottom-sheet die opent vanuit de "Meer"-tab in
 * de BottomNav. Bevat secundaire navigatie (Reviews, Analyses, Veldwerk),
 * thema-toggle, profile-strip met instellingen-shortcut en een
 * "Uitloggen"-link onderaan.
 *
 * Animatie: backdrop fade + sheet translateY(110% → 0) over --dur-sheet
 * met --ease-ios. Bij `open=false` returnen we null zodat de sheet niet
 * in de boom blijft hangen.
 */

type Props = {
  open: boolean
  onClose: () => void
  bedrijfsnaam: string
  userInitials: string
  userName: string
  /** Default 'Owner' — toont onder de naam in profile-strip. */
  userRole?: string
  /** Wordt als sub-tekst getoond op de Reviews-rij wanneer > 0. */
  reviewsCount?: number
}

export function MeerSheet({
  open,
  onClose,
  bedrijfsnaam,
  userInitials,
  userName,
  userRole = 'Owner',
  reviewsCount = 0,
}: Props) {
  // Lock body-scroll zolang de sheet zichtbaar is. Hook is no-op bij `false`.
  useBodyScrollLock(open)

  if (!open) return null

  return (
    <div className={styles.root} role="dialog" aria-modal="true" aria-label="Meer opties">
      <div
        className={styles.backdrop}
        onClick={onClose}
        aria-hidden="true"
      />
      <div className={styles.sheet}>
        <span className={styles.handle} aria-hidden="true" />

        <div className={styles.header}>
          <span className={styles.kicker}>MEER</span>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            Sluit
          </button>
        </div>

        <div className={styles.body}>
          <ul className={styles.rowList}>
            <li>
              <Link href="/reviews" className={styles.row} onClick={onClose}>
                <span className={`${styles.rowIcon} ${styles.rowIconAmber}`}>
                  <Star size={20} aria-hidden="true" />
                </span>
                <span className={styles.rowText}>
                  <span className={styles.rowTitle}>Reviews</span>
                  <span className={styles.rowSub}>
                    {reviewsCount > 0
                      ? `${reviewsCount} nieuwe deze week`
                      : 'Klantbeoordelingen & feedback'}
                  </span>
                </span>
              </Link>
            </li>

            <li>
              <Link href="/statistieken" className={styles.row} onClick={onClose}>
                <span className={`${styles.rowIcon} ${styles.rowIconViolet}`}>
                  <BarChart3 size={20} aria-hidden="true" />
                </span>
                <span className={styles.rowText}>
                  <span className={styles.rowTitle}>Analyses</span>
                  <span className={styles.rowSub}>Conversie, omzet, bot-prestaties</span>
                </span>
              </Link>
            </li>

            <li>
              <Link href="/veldwerk" className={styles.row} onClick={onClose}>
                <span className={`${styles.rowIcon} ${styles.rowIconBlue}`}>
                  <Truck size={20} aria-hidden="true" />
                </span>
                <span className={styles.rowText}>
                  <span className={styles.rowTitle}>Veldwerk</span>
                  <span className={styles.rowSub}>Voor onderweg</span>
                </span>
                <span className={styles.rowTag}>PWA</span>
              </Link>
            </li>
          </ul>

          <div className={styles.themeRow}>
            <span className={styles.themeLabel}>Thema</span>
            <ThemeToggle />
          </div>

          <div className={styles.profileStrip}>
            <span className={styles.avatar} aria-hidden="true">
              {userInitials}
            </span>
            <span className={styles.profileText}>
              <span className={styles.profileName}>{userName}</span>
              <span className={styles.profileMeta}>
                {userRole} · {bedrijfsnaam}
              </span>
            </span>
            <Link
              href="/instellingen"
              className={styles.settingsBtn}
              onClick={onClose}
            >
              Instellingen
            </Link>
          </div>

          {/* BEWUST een gewone <a>, GEEN next/link: een <Link> prefetcht de
              href zodra 'ie in beeld komt, en omdat /logout een GET is die
              signOut() uitvoert, logde het openen van dit menu je meteen uit
              (→ je kwam nooit bij Instellingen). Een plain anchor prefetcht
              niet; uitloggen gebeurt alleen bij een echte klik. Zelfde patroon
              als de desktop UserMenu. */}
          <a href="/logout" className={styles.logout}>
            Uitloggen
          </a>
        </div>
      </div>
    </div>
  )
}
