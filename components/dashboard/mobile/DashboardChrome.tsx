'use client'

import { ReactNode } from 'react'
import { MobileShell } from './MobileShell'
import type { NotifItem } from '@/components/dashboard/NotificationPanel'
import styles from './DashboardChrome.module.css'

/**
 * DashboardChrome — client wrapper die desktop- en mobile-chrome
 * naast elkaar in de DOM zet. CSS media-query toggelt zichtbaarheid
 * (zelfde patroon als LeadOfferte.module.css `.desktopTree`/`.mobileTree`).
 *
 * `display: contents` zorgt dat de wrapper transparant is voor layout —
 * children gedragen zich als directe kinderen van de parent. Geen
 * layout-shift, geen hydration-flash.
 *
 * Beide takken renderen óf de echte React-tree (sidebar/topbar voor
 * desktop, BottomNav/MeerSheet voor mobile) — alleen één wordt
 * uiteindelijk zichtbaar via de @media-query.
 */

type Props = {
  children: ReactNode
  desktop: ReactNode
  bedrijfsnaam: string
  userInitials: string
  userName: string
  notifications?: NotifItem[]
  unreadCount?: number
  counts?: { leads?: number; inbox?: number; meer?: boolean }
}

export function DashboardChrome({
  children,
  desktop,
  bedrijfsnaam,
  userInitials,
  userName,
  notifications,
  unreadCount,
  counts,
}: Props) {
  return (
    <>
      <div className={styles.desktopOnly}>{desktop}</div>
      <div className={styles.mobileOnly}>
        <MobileShell
          bedrijfsnaam={bedrijfsnaam}
          userInitials={userInitials}
          userName={userName}
          notifications={notifications}
          unreadCount={unreadCount}
          counts={counts}
        >
          {children}
        </MobileShell>
      </div>
    </>
  )
}
