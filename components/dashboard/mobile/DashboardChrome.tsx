'use client'

import { ReactNode } from 'react'
import { MobileShell } from './MobileShell'
import type { NotifItem } from '@/components/dashboard/NotificationPanel'
import styles from './DashboardChrome.module.css'

/**
 * DashboardChrome, client wrapper rond de mobiele shell
 * (BottomNav/MeerSheet via MobileShell).
 */

type Props = {
  children: ReactNode
  bedrijfsnaam: string
  userInitials: string
  userName: string
  notifications?: NotifItem[]
  unreadCount?: number
  counts?: { leads?: number; inbox?: number; meer?: boolean }
}

export function DashboardChrome({
  children,
  bedrijfsnaam,
  userInitials,
  userName,
  notifications,
  unreadCount,
  counts,
}: Props) {
  return (
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
  )
}
