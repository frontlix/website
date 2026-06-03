'use client'

import Link from 'next/link'
import { useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { Search, Plus, Bell } from 'lucide-react'
import type { NotifItem } from '@/components/dashboard/NotificationPanel'
import { MobileNotificationsSheet } from './MobileNotificationsSheet'
import styles from './HeaderActions.module.css'

type Props = {
  notifications?: NotifItem[]
  unreadCount?: number
  onOpenSearch: () => void
}

/**
 * HeaderActions, gedeelde rechter-acties voor mobile-headers.
 *
 * Bevat 3 acties:
 *  1. 🔍  zoeken          → opens parent-handler (onOpenSearch)
 *  2. ➕  nieuwe offerte  → Link met ?nieuwe-offerte=1 (zelfde URL-pattern
 *                           als Topbar, wordt opgevangen door
 *                           ManualOfferteController in dashboard-layout)
 *  3. 🔔  notificaties    → opent MobileNotificationsSheet
 *
 * Wordt zowel door MobileShellHeader (default) als de toekomstige
 * MobileOverzichtHeader (op /dashboard) gebruikt.
 */
export function HeaderActions({
  notifications = [],
  unreadCount = 0,
  onOpenSearch,
}: Props) {
  const [notifOpen, setNotifOpen] = useState(false)
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Behoud bestaande searchParams en voeg nieuwe-offerte=1 toe, dit is
  // hetzelfde patroon als Topbar.tsx, zodat de Modal-controller 'm
  // automatisch opvangt op iedere route.
  const offerteHref = (() => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('nieuwe-offerte', '1')
    return `${pathname}?${params.toString()}`
  })()

  return (
    <>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.iconBtn}
          onClick={onOpenSearch}
          aria-label="Zoeken"
        >
          <Search size={18} aria-hidden="true" />
        </button>

        <Link
          href={offerteHref}
          scroll={false}
          className={styles.plusBtn}
          aria-label="Nieuwe offerte"
        >
          <Plus size={20} aria-hidden="true" />
        </Link>

        <button
          type="button"
          className={styles.iconBtn}
          onClick={() => setNotifOpen(true)}
          aria-label={
            unreadCount > 0
              ? `Notificaties, ${unreadCount} ongelezen`
              : 'Notificaties'
          }
          aria-haspopup="dialog"
        >
          <Bell size={18} aria-hidden="true" />
          {unreadCount > 0 && <span className={styles.dot} aria-hidden="true" />}
        </button>
      </div>

      {notifOpen && (
        <MobileNotificationsSheet
          items={notifications}
          unreadCount={unreadCount}
          onClose={() => setNotifOpen(false)}
        />
      )}
    </>
  )
}
