'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { HeaderActions } from '../HeaderActions'
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
 * MobileOverzichtHeader — rijke header bovenaan /dashboard op mobile.
 *
 * Layout:
 *  - title-row: grote begroeting links, HeaderActions rechts
 *  - subline:   groene status-dot + leads-count vandaag/morgen
 *
 * SearchOverlay is een tijdelijke fallback die in Phase 4 wordt
 * vervangen door de definitieve MobileSearchSheet.
 */
export function MobileOverzichtHeader({
  greeting,
  voornaam,
  leadsToday,
  leadsTomorrow,
  notifications,
  unreadCount,
}: Props) {
  const router = useRouter()
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

      {searchOpen && (
        <SearchOverlay
          onSubmit={(q) => {
            setSearchOpen(false)
            if (q.trim()) router.push(`/leads?q=${encodeURIComponent(q.trim())}`)
          }}
          onClose={() => setSearchOpen(false)}
        />
      )}
    </header>
  )
}

// TIJDELIJK — wordt in Phase 4 vervangen door de definitieve MobileSearchSheet.
function SearchOverlay({
  onSubmit,
  onClose,
}: {
  onSubmit: (q: string) => void
  onClose: () => void
}) {
  return (
    <div
      className={styles.searchRoot}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className={styles.searchBar} onClick={(e) => e.stopPropagation()}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const q = (new FormData(e.currentTarget).get('q') as string) ?? ''
            onSubmit(q)
          }}
        >
          <input
            name="q"
            autoFocus
            placeholder="Zoek leads, adressen, telefoon…"
            className={styles.searchInput}
          />
        </form>
      </div>
    </div>
  )
}
