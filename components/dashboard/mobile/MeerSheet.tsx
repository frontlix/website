'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { BarChart3, Star, Truck } from 'lucide-react'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { ThemeToggle } from '@/components/dashboard/ui/ThemeToggle'
import styles from './MeerSheet.module.css'

/**
 * MeerSheet, slide-up bottom-sheet die opent vanuit de "Meer"-tab in
 * de BottomNav. Bevat secundaire navigatie (Reviews, Analyses, Veldwerk),
 * thema-toggle, profile-strip met instellingen-shortcut en een
 * "Uitloggen"-link onderaan.
 *
 * Animatie: backdrop fade + sheet translateY(110% → 0) over --dur-sheet
 * met --ease-ios. Bij `open=false` returnen we null zodat de sheet niet
 * in de boom blijft hangen.
 *
 * Sluiten kan op drie manieren: "Sluit"-knop, tik buiten het vak, of de
 * sheet naar beneden slepen (swipe-to-dismiss, zie de touch-handlers).
 */

// Sleep-afstand (px) waarboven we bij loslaten de sheet sluiten.
const CLOSE_THRESHOLD = 90

type Props = {
  open: boolean
  onClose: () => void
  bedrijfsnaam: string
  userInitials: string
  userName: string
  /** Default 'Owner', toont onder de naam in profile-strip. */
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

  // ── Swipe-to-dismiss ──────────────────────────────────────────────
  const bodyRef = useRef<HTMLDivElement>(null)
  const startYRef = useRef(0)
  const draggingRef = useRef(false)
  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  // Na de open-animatie schakelen we naar transform-via-inline: de CSS-
  // animatie staat op fill:forwards en zou onze sleep-transform anders
  // blijven overschrijven (animaties winnen van inline styles).
  const [entered, setEntered] = useState(false)

  // Reset de sleep-state telkens als de sheet (opnieuw) opent, zodat een
  // vorige sleep niet "blijft hangen" bij de volgende keer openen (de
  // component-instance blijft gemount; alleen de render returnt null).
  useEffect(() => {
    if (open) {
      setDragY(0)
      setIsDragging(false)
      setEntered(false)
    }
  }, [open])

  if (!open) return null

  const onTouchStart = (e: React.TouchEvent) => {
    // Alleen slepen wanneer de inhoud bovenaan staat, anders is de
    // neerwaartse beweging gewoon scrollen binnen de sheet.
    if ((bodyRef.current?.scrollTop ?? 0) > 0) return
    // Zodra je begint te slepen is de open-animatie sowieso voorbij; forceer
    // de overstap naar inline-transform (zekerder dan enkel op animationEnd
    // vertrouwen, dat niet altijd vuurt) zodat de sheet de vinger écht volgt.
    setEntered(true)
    startYRef.current = e.touches[0].clientY
    draggingRef.current = true
    setIsDragging(true)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (!draggingRef.current) return
    const delta = e.touches[0].clientY - startYRef.current
    // Alleen naar beneden volgen; opwaartse beweging negeren.
    setDragY(delta > 0 ? delta : 0)
  }

  const onTouchEnd = () => {
    if (!draggingRef.current) return
    draggingRef.current = false
    setIsDragging(false)
    if (dragY > CLOSE_THRESHOLD) {
      setDragY(0)
      onClose()
    } else {
      // Niet ver genoeg → terugveren naar de rustpositie (CSS-transition).
      setDragY(0)
    }
  }

  return (
    <div className={styles.root} role="dialog" aria-modal="true" aria-label="Meer opties">
      <div
        className={styles.backdrop}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`${styles.sheet} ${entered ? styles.sheetEntered : ''}`}
        style={{
          transform: `translateY(${dragY}px)`,
          // Tijdens het slepen géén transition (volgt de vinger direct);
          // bij loslaten valt 'ie terug op de CSS-transition (terugveren).
          transition: isDragging ? 'none' : undefined,
        }}
        onAnimationEnd={(e) => {
          // Alleen de open-animatie van de sheet zelf telt (niet die van
          // eventuele kinderen die mee-bubbelen).
          if (e.target === e.currentTarget) setEntered(true)
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <span className={styles.handle} aria-hidden="true" />

        <div className={styles.header}>
          <span className={styles.kicker}>MEER</span>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            Sluit
          </button>
        </div>

        <div className={styles.body} ref={bodyRef}>
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
