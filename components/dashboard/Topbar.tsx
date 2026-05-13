'use client'

import { usePathname } from 'next/navigation'
import { Search, Bell } from 'lucide-react'
import styles from './Topbar.module.css'

type RouteMeta = { title: string; sub: string }

const ROUTE_TITLES: Record<string, RouteMeta> = {
  '/leads':         { title: 'Leads',        sub: 'Alle aanvragen — in de bot, in review, of klaar voor offerte' },
  '/agenda':        { title: 'Agenda',       sub: 'Afspraken & plaatsbezoeken' },
  '/statistieken':  { title: 'Analyses',     sub: 'Diepere stats over conversie en omzet' },
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

export function Topbar() {
  const pathname = usePathname()
  const { title, sub } = getMeta(pathname)

  return (
    <header className={styles.topbar}>
      <div className={styles.titleBlock}>
        <div className={styles.title}>{title}</div>
        {sub && <div className={styles.sub}>{sub}</div>}
      </div>

      <div className={styles.search}>
        <Search size={14} className={styles.searchIcon} />
        <input
          type="text"
          placeholder="Zoek leads, adressen, telefoon…"
          className={styles.searchInput}
        />
        <span className={styles.kbd}>⌘K</span>
      </div>

      <div className={styles.actions}>
        <button className={styles.iconBtn} aria-label="Notificaties" type="button">
          <Bell size={18} />
          <span className={styles.dot} />
        </button>
      </div>
    </header>
  )
}
