'use client'

import { useState } from 'react'
import { HeaderActions } from '../HeaderActions'
import { MobileSearchSheet } from '@/components/dashboard/ui/MobileSearchSheet'
import type { NotifItem } from '@/components/dashboard/NotificationPanel'
import styles from './MobileOverzichtHeader.module.css'

type Props = {
  greeting: string // bv. "Goedemiddag"
  voornaam?: string
  leadsToday: number
  leadsTomorrow: number
  notifications?: NotifItem[]
  unreadCount?: number
}

/**
 * MobileOverzichtHeader, rijke header bovenaan /dashboard op mobile.
 *
 * Layout:
 *  - title-row: grote begroeting links, HeaderActions rechts
 *  - subline:   groene status-dot + leads-count vandaag/morgen
 *
 * Zoeken gaat via `MobileSearchSheet` in controlled-mode, geen eigen
 * inline overlay meer; één canonical sheet voor alle mobile entry-points.
 */
export function MobileOverzichtHeader({
  greeting,
  voornaam,
  leadsToday,
  leadsTomorrow,
  notifications,
  unreadCount,
}: Props) {
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <header className={styles.header}>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>
          {greeting}
          {voornaam ? `, ${voornaam}` : ''}
        </h1>
        <HeaderActions
          notifications={notifications}
          unreadCount={unreadCount}
          onOpenSearch={() => setSearchOpen(true)}
        />
      </div>
      <div className={styles.subline}>
        <span className={styles.statusDot} aria-hidden="true" />
        {leadsToday} {leadsToday === 1 ? 'lead' : 'leads'} vandaag ·{' '}
        {leadsTomorrow} morgen
      </div>

      <MobileSearchSheet open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  )
}
