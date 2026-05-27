'use client'

import { ReactNode, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { MobileShellHeader } from './MobileShellHeader'
import { BottomNav } from './BottomNav'
import { MeerSheet } from './MeerSheet'
import type { NotifItem } from '@/components/dashboard/NotificationPanel'
import styles from './MobileShell.module.css'

/**
 * MobileShell — mobile chrome wrapper.
 *
 * Verantwoordelijkheden:
 *  - Decide welke header-variant rendert: op /dashboard rendert de page
 *    zelf een rijke MobileOverzichtHeader (Phase 2); op alle andere routes
 *    mounten we hier de dunne default MobileShellHeader.
 *  - Wraps page-content in .main met onderpadding voor de BottomNav.
 *  - Mounts BottomNav (fixed bottom) + MeerSheet (slide-up).
 *  - TIJDELIJKE inline search-overlay — wordt in Phase 4 vervangen door
 *    de uitgebreide MobileSearchSheet.
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

export function MobileShell({
  children,
  bedrijfsnaam,
  userInitials,
  userName,
  notifications,
  unreadCount,
  counts,
}: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [meerOpen, setMeerOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  // Op /dashboard rendert de page zelf een rijke MobileOverzichtHeader
  // (komt in Phase 2). Op andere routes mount MobileShell de dunne
  // default header.
  const isOverzicht = pathname === '/dashboard' || pathname === '/'

  return (
    <div className={styles.shell}>
      {!isOverzicht && (
        <MobileShellHeader
          notifications={notifications}
          unreadCount={unreadCount}
          onOpenSearch={() => setSearchOpen(true)}
        />
      )}

      <main className={styles.main}>{children}</main>

      <BottomNav counts={counts} onOpenMeer={() => setMeerOpen(true)} />

      <MeerSheet
        open={meerOpen}
        onClose={() => setMeerOpen(false)}
        bedrijfsnaam={bedrijfsnaam}
        userInitials={userInitials}
        userName={userName}
      />

      {searchOpen && (
        <SearchOverlay
          onSubmit={(q) => {
            setSearchOpen(false)
            if (q.trim()) router.push(`/leads?q=${encodeURIComponent(q.trim())}`)
          }}
          onClose={() => setSearchOpen(false)}
        />
      )}
    </div>
  )
}

// TIJDELIJKE inline search-overlay — wordt in Phase 4 vervangen door de
// bestaande/uitgebreide MobileSearchSheet. Voor nu: full-screen top-input
// die submit naar /leads?q=.
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
