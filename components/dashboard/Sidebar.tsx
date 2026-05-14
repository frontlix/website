'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Inbox,
  Calendar,
  BarChart3,
  Settings,
  Star,
  MessageCircle,
  Phone,
  X,
} from 'lucide-react'
import { UserMenu } from './UserMenu'
import styles from './Sidebar.module.css'

type NavItem = {
  href: string
  label: string
  Icon: typeof Home
  badge?: { value: string; tone?: 'live' | 'muted' }
}

type Counts = {
  inbox?: number
  leads?: number
  agenda?: number
  reviews?: number
}

function buildWorkspaceItems(counts: Counts): NavItem[] {
  return [
    { href: '/', label: 'Overzicht', Icon: Home },
    {
      href: '/inbox',
      label: 'Inbox',
      Icon: MessageCircle,
      badge: counts.inbox ? { value: String(counts.inbox), tone: 'live' } : undefined,
    },
    {
      href: '/leads',
      label: 'Leads',
      Icon: Inbox,
      badge: counts.leads ? { value: String(counts.leads) } : undefined,
    },
    {
      href: '/agenda',
      label: 'Agenda',
      Icon: Calendar,
      badge: counts.agenda
        ? { value: String(counts.agenda), tone: 'muted' }
        : undefined,
    },
    {
      href: '/reviews',
      label: 'Reviews',
      Icon: Star,
      badge: counts.reviews ? { value: String(counts.reviews), tone: 'live' } : undefined,
    },
    { href: '/statistieken', label: 'Analyses', Icon: BarChart3 },
    {
      href: '/veldwerk',
      label: 'Veldwerk',
      Icon: Phone,
      badge: { value: 'PWA', tone: 'muted' },
    },
  ]
}

const BEHEER_ITEMS: NavItem[] = [
  { href: '/instellingen', label: 'Instellingen', Icon: Settings },
]

export function Sidebar({
  bedrijfsnaam,
  email,
  counts = {},
}: {
  bedrijfsnaam: string
  email: string
  counts?: Counts
}) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const workspaceItems = buildWorkspaceItems(counts)

  // Luister naar de hamburger-toggle event van Topbar.
  useEffect(() => {
    const handler = () => setMobileOpen((v) => !v)
    window.addEventListener('frontlix-toggle-mobile-nav', handler)
    return () => window.removeEventListener('frontlix-toggle-mobile-nav', handler)
  }, [])

  // Sluit drawer wanneer de route verandert (klik op nav-item).
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  return (
    <>
      {/* Backdrop — alleen zichtbaar bij open mobile-drawer */}
      <div
        className={`${styles.backdrop} ${mobileOpen ? styles.backdropOpen : ''}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

    <aside className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ''}`}>
      <button
        type="button"
        onClick={() => setMobileOpen(false)}
        className={styles.closeBtn}
        aria-label="Sluit menu"
      >
        <X size={18} />
      </button>
      <div className={styles.head}>
        <Image
          src="/logo-trans.png"
          alt="Frontlix"
          width={32}
          height={32}
          className={styles.logo}
        />
        <div>
          <div className={styles.brand}>
            Frontl<span className={styles.brandAccent}>ix</span>
          </div>
          <div className={styles.tenant}>{bedrijfsnaam}</div>
        </div>
      </div>

      <nav className={styles.nav}>
        <div className={styles.section}>Werkruimte</div>
        {workspaceItems.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}

        <div className={styles.section}>Beheer</div>
        {BEHEER_ITEMS.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>

      <div className={styles.foot}>
        <UserMenu email={email} />
      </div>
    </aside>
    </>
  )
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const { Icon } = item
  // Active als pathname exact matcht. Voor niet-root items ook prefix-match
  // (zodat /leads/[id] de Leads-link highlight). De root '/' krijgt geen
  // prefix-match anders zou hij overal actief zijn.
  const isActive =
    pathname === item.href ||
    (item.href !== '/' && pathname.startsWith(`${item.href}/`))

  return (
    <Link
      href={item.href}
      className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
    >
      <Icon size={16} />
      <span className={styles.navLabel}>{item.label}</span>
      {item.badge && (
        <span
          className={`${styles.navBadge} ${
            item.badge.tone === 'muted' ? styles.navBadgeMuted : ''
          } ${item.badge.tone === 'live' ? styles.navBadgeLive : ''}`}
        >
          {item.badge.value}
        </span>
      )}
    </Link>
  )
}
