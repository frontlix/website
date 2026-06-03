'use client'

import { usePathname } from 'next/navigation'
import { HeaderActions } from './HeaderActions'
import type { NotifItem } from '@/components/dashboard/NotificationPanel'
import styles from './MobileShellHeader.module.css'

/**
 * MobileShellHeader, dunne sticky header (56px) voor alle
 * non-/dashboard mobile-routes (leads, inbox, agenda, reviews, etc.).
 *
 * De /dashboard-route krijgt later z'n eigen MobileOverzichtHeader met
 * extra elementen (greeting, KPI-strip); deze hier blijft minimal:
 * page-titel links + gedeelde HeaderActions rechts.
 */

const PAGE_TITLES: Record<string, string> = {
  '/leads': 'Leads',
  '/inbox': 'Inbox',
  '/agenda': 'Agenda',
  '/reviews': 'Reviews',
  '/statistieken': 'Statistieken',
  '/veldwerk': 'Veldwerk',
  '/instellingen': 'Instellingen',
}

// Match op exacte gelijkheid OF prefix met trailing slash, zodat
// sub-routes (bv. /leads/123) onder de parent-titel vallen.
function titleFor(pathname: string): string {
  for (const [path, title] of Object.entries(PAGE_TITLES)) {
    if (pathname === path || pathname.startsWith(`${path}/`)) return title
  }
  return 'Dashboard'
}

type Props = {
  notifications?: NotifItem[]
  unreadCount?: number
  onOpenSearch: () => void
}

export function MobileShellHeader({
  notifications,
  unreadCount,
  onOpenSearch,
}: Props) {
  const pathname = usePathname()

  return (
    <header className={styles.header}>
      <h1 className={styles.title}>{titleFor(pathname)}</h1>
      <HeaderActions
        notifications={notifications}
        unreadCount={unreadCount}
        onOpenSearch={onOpenSearch}
      />
    </header>
  )
}
