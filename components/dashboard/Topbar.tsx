'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Search, Menu, Plus } from 'lucide-react'
import { ThemeToggle } from './ui/ThemeToggle'
import { LeadsViewSwitcher } from './leads/LeadsViewSwitcher'
import { NotificationPanel, type NotifItem } from './NotificationPanel'
import styles from './Topbar.module.css'

// Lightweight event-bus voor mobile-nav toggle. Sidebar luistert hierop.
function toggleMobileNav() {
  window.dispatchEvent(new CustomEvent('frontlix-toggle-mobile-nav'))
}

type RouteMeta = { title: string; sub: string }

const ROUTE_TITLES: Record<string, RouteMeta> = {
  '/':              { title: 'Overzicht',    sub: 'Wat speelt er nu' },
  '/inbox':         { title: 'Inbox',        sub: 'Actieve WhatsApp-gesprekken' },
  '/leads':         { title: 'Leads',        sub: 'Alle aanvragen — in de bot, in review, of klaar voor offerte' },
  '/agenda':        { title: 'Agenda',       sub: 'Afspraken & plaatsbezoeken' },
  '/reviews':       { title: 'Reviews',      sub: 'NPS-scores en klantfeedback' },
  '/statistieken':  { title: 'Analyses',     sub: 'Diepere stats over conversie en omzet' },
  '/veldwerk':      { title: 'Veldwerk',     sub: "Vandaag's klussen — mobile-first" },
  '/instellingen':  { title: 'Instellingen', sub: 'Bedrijf, prijzen, bot' },
}

function getMeta(pathname: string): RouteMeta {
  // Match exact eerst, dan prefix (zodat /leads/[id] hetzelfde label krijgt).
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname]
  const prefix = Object.keys(ROUTE_TITLES).find((key) =>
    pathname.startsWith(`${key}/`),
  )
  return prefix
    ? ROUTE_TITLES[prefix]
    : { title: 'Dashboard', sub: '' }
}

export function Topbar({
  notifications = [],
  unreadCount = 0,
}: {
  notifications?: NotifItem[]
  unreadCount?: number
}) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { title, sub } = getMeta(pathname)
  const searchRef = useRef<HTMLInputElement>(null)

  // ⌘K / Ctrl+K focus de search-input.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const onSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const q = (new FormData(e.currentTarget).get('q') as string ?? '').trim()
    // Stuur naar /leads met ?q=... (zoekt op naam/telefoon in de leads-list).
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    router.push(`/leads${params.toString() ? `?${params.toString()}` : ''}`)
  }

  // "Nieuwe offerte" voegt ?nieuwe-offerte=1 toe aan de huidige URL —
  // de ManualOfferteController in de dashboard-layout pikt 'm op en
  // toont de wizard. Op die manier werkt de knop op elke route.
  const offerteHref = (() => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('nieuwe-offerte', '1')
    return `${pathname}?${params.toString()}`
  })()

  return (
    <header className={styles.topbar}>
      <button
        className={styles.hamburger}
        onClick={toggleMobileNav}
        aria-label="Open menu"
        type="button"
      >
        <Menu size={18} />
      </button>
      <div className={styles.titleBlock}>
        <div className={styles.title}>{title}</div>
        {sub && <div className={styles.sub}>{sub}</div>}
      </div>

      <form className={styles.search} onSubmit={onSearchSubmit} role="search">
        <Search size={14} className={styles.searchIcon} />
        <input
          ref={searchRef}
          name="q"
          type="text"
          placeholder="Zoek leads, adressen, telefoon…"
          className={styles.searchInput}
          defaultValue={searchParams.get('q') ?? ''}
        />
        <span className={styles.kbd}>⌘K</span>
      </form>

      <div className={styles.actions}>
        <LeadsViewSwitcher />
        <Link href={offerteHref} className={`${styles.newQuoteBtn} ${styles.hideOnSmall}`} scroll={false}>
          <Plus size={14} />
          <span>Nieuwe offerte</span>
        </Link>
        <ThemeToggle />
        <NotificationPanel items={notifications} unreadCount={unreadCount} />
      </div>
    </header>
  )
}
