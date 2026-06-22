'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ClipboardList, Inbox, Calendar, Menu } from 'lucide-react'
import styles from './BottomNav.module.css'

/**
 * BottomNav, sticky 5-tab bottom-navigatie voor de mobiele dashboard-shell.
 *
 * Active-state wordt afgeleid uit `usePathname()` via een statische map.
 * Sub-routes vallen automatisch onder hun parent-tab (bv. `/leads/123`
 * → tab `leads`). Routes die niet in de map staan worden als "home"
 * beschouwd zodat er altijd één tab oplicht.
 *
 * Optimistisch: bij een tik kleurt de tab direct via lokale pending-state.
 * `usePathname()` flipt namelijk pas zodra de server-gerenderde route
 * volledig binnen is — zonder pending-state blijft de tab dus seconden
 * "zwart" terwijl de navigatie loopt. Zodra de echte pathname commit,
 * wist de effect de pending-state en wint de route weer.
 */

type Counts = {
  /** Aantal nieuwe leads voor badge op Leads-tab. */
  leads?: number
  /** Aantal onbeantwoorde inbox-items voor badge op Inbox-tab. */
  inbox?: number
  /** Reserved voor toekomstige "Meer"-badge (bv. nieuwe reviews). */
  meer?: boolean
}

type Tab = 'home' | 'leads' | 'inbox' | 'cal' | 'meer'

// Pathname-prefix → tab mapping. Volgorde is niet relevant want we
// matchen op exacte gelijkheid OF prefix met trailing slash.
const PAGE_TO_TAB: Record<string, Tab> = {
  '/dashboard': 'home',
  '/leads': 'leads',
  '/inbox': 'inbox',
  '/agenda': 'cal',
  '/reviews': 'meer',
  '/statistieken': 'meer',
  '/instellingen': 'meer',
}

function activeTab(pathname: string): Tab {
  for (const [path, tab] of Object.entries(PAGE_TO_TAB)) {
    if (pathname === path || pathname.startsWith(`${path}/`)) return tab
  }
  return 'home'
}

type Props = {
  counts?: Counts
  onOpenMeer: () => void
}

export function BottomNav({ counts = {}, onOpenMeer }: Props) {
  const pathname = usePathname()
  const [pending, setPending] = useState<Tab | null>(null)
  const navRef = useRef<HTMLElement>(null)

  // Navigatie is gecommit — optimistische highlight niet meer nodig.
  useEffect(() => {
    setPending(null)
  }, [pathname])

  const active = pending ?? activeTab(pathname)

  // iOS Safari repaint-kick: de class-wissel klopt (headless bewezen, <60ms),
  // maar iOS schildert de fixed balk + currentColor-SVG's niet altijd opnieuw
  // tot een scroll. Een no-op transform-wissel op de composited layer dwingt
  // de compositor wél tot hertekenen. Op andere browsers onschadelijk.
  useEffect(() => {
    const el = navRef.current
    if (!el) return
    el.style.transform = 'translateZ(0.01px)'
    void el.offsetHeight // forceer style/layout-flush zodat de wissel landt
    const raf = requestAnimationFrame(() => {
      el.style.transform = '' // terug naar de CSS translateZ(0)
    })
    return () => cancelAnimationFrame(raf)
  }, [active])

  const leadsCount = counts.leads ?? 0
  const inboxCount = counts.inbox ?? 0

  return (
    <nav ref={navRef} className={styles.nav} aria-label="Hoofdnavigatie">
      <Link
        href="/dashboard"
        onClick={() => setPending('home')}
        className={`${styles.tab} ${active === 'home' ? styles.active : ''}`}
        aria-current={active === 'home' ? 'page' : undefined}
      >
        <Home size={22} aria-hidden="true" />
        <span className={styles.label}>Overzicht</span>
      </Link>

      <Link
        href="/leads"
        onClick={() => setPending('leads')}
        className={`${styles.tab} ${active === 'leads' ? styles.active : ''}`}
        aria-current={active === 'leads' ? 'page' : undefined}
      >
        <span className={styles.iconWrap}>
          <ClipboardList size={22} aria-hidden="true" />
          {leadsCount > 0 && (
            <span className={styles.badge} aria-label={`${leadsCount} nieuwe leads`}>
              {leadsCount > 99 ? '99+' : leadsCount}
            </span>
          )}
        </span>
        <span className={styles.label}>Leads</span>
      </Link>

      <Link
        href="/inbox"
        onClick={() => setPending('inbox')}
        className={`${styles.tab} ${active === 'inbox' ? styles.active : ''}`}
        aria-current={active === 'inbox' ? 'page' : undefined}
      >
        <span className={styles.iconWrap}>
          <Inbox size={22} aria-hidden="true" />
          {inboxCount > 0 && (
            <span className={styles.badge} aria-label={`${inboxCount} onbeantwoorde berichten`}>
              {inboxCount > 99 ? '99+' : inboxCount}
            </span>
          )}
        </span>
        <span className={styles.label}>Inbox</span>
      </Link>

      <Link
        href="/agenda"
        onClick={() => setPending('cal')}
        className={`${styles.tab} ${active === 'cal' ? styles.active : ''}`}
        aria-current={active === 'cal' ? 'page' : undefined}
      >
        <Calendar size={22} aria-hidden="true" />
        <span className={styles.label}>Agenda</span>
      </Link>

      <button
        type="button"
        onClick={onOpenMeer}
        className={`${styles.tab} ${active === 'meer' ? styles.active : ''}`}
        aria-haspopup="dialog"
      >
        <Menu size={22} aria-hidden="true" />
        <span className={styles.label}>Meer</span>
      </button>
    </nav>
  )
}
