'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Inbox,
  Calendar,
  BarChart3,
  Settings,
} from 'lucide-react'
import { UserMenu } from './UserMenu'
import styles from './Sidebar.module.css'

type NavItem = {
  href: string
  label: string
  Icon: typeof Home
  badge?: { value: string; tone?: 'live' | 'muted' }
}

const WORKSPACE_ITEMS: NavItem[] = [
  { href: '/leads', label: 'Leads', Icon: Inbox },
  { href: '/agenda', label: 'Agenda', Icon: Calendar },
  { href: '/statistieken', label: 'Analyses', Icon: BarChart3 },
]

const BEHEER_ITEMS: NavItem[] = [
  { href: '/instellingen', label: 'Instellingen', Icon: Settings },
]

export function Sidebar({
  bedrijfsnaam,
  email,
}: {
  bedrijfsnaam: string
  email: string
}) {
  const pathname = usePathname()

  return (
    <aside className={styles.sidebar}>
      <div className={styles.head}>
        <Image
          src="/logo_frontlix_trans.png"
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
        {WORKSPACE_ITEMS.map((item) => (
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
  )
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const { Icon } = item
  // Active als pathname exact matcht of begint met item.href (zodat
  // /leads/[id] óók de Leads-link highlight).
  const isActive =
    pathname === item.href || pathname.startsWith(`${item.href}/`)

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
