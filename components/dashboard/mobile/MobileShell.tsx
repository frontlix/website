'use client'

import { ReactNode, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { MobileShellHeader } from './MobileShellHeader'
import { BottomNav } from './BottomNav'
import { MeerSheet } from './MeerSheet'
import { MobileSearchSheet } from '@/components/dashboard/ui/MobileSearchSheet'
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
 *  - Mounts MobileSearchSheet in controlled-mode (open/onClose) — geen
 *    eigen trigger, want de zoek-knop zit in HeaderActions.
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
  const searchParams = useSearchParams()
  const [meerOpen, setMeerOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  // Op /dashboard rendert de page zelf een rijke MobileOverzichtHeader
  // (komt in Phase 2). Op andere routes mount MobileShell de dunne
  // default header.
  const isOverzicht = pathname === '/dashboard' || pathname === '/'

  // Routes die hun EIGEN volwaardige header renderen (grote titel + acties):
  // daar zou de dunne shell-header de titel dubbel tonen. Sluit ze uit.
  // (Sub-routes als /leads/:id en /inbox?lead= zijn al full-bleed → geen header.)
  const OWN_HEADER_ROUTES = ['/leads', '/inbox', '/agenda']
  const hasOwnHeader = isOverzicht || OWN_HEADER_ROUTES.includes(pathname)

  // Fullscreen chat-detail (/inbox?lead=ID): MobileChatDetail levert z'n
  // eigen WA-header + is full-bleed, dus de shell-header én bottom-nav
  // worden verborgen zodat de chat het hele scherm vult.
  const isChatDetail = pathname === '/inbox' && !!searchParams.get('lead')

  // Lead-dossier (/leads/<id>, niet de lijst /leads): full-bleed zoals chat-detail.
  const isLeadDossier = /^\/leads\/[^/]+$/.test(pathname)
  const isFullBleed = isChatDetail || isLeadDossier

  return (
    <div className={styles.shell}>
      {!hasOwnHeader && !isFullBleed && (
        <MobileShellHeader
          notifications={notifications}
          unreadCount={unreadCount}
          onOpenSearch={() => setSearchOpen(true)}
        />
      )}

      <main
        className={styles.main}
        data-fullbleed={isFullBleed || undefined}
        data-scroll-root
      >
        {children}
      </main>

      {!isFullBleed && (
        <BottomNav counts={counts} onOpenMeer={() => setMeerOpen(true)} />
      )}

      <MeerSheet
        open={meerOpen}
        onClose={() => setMeerOpen(false)}
        bedrijfsnaam={bedrijfsnaam}
        userInitials={userInitials}
        userName={userName}
      />

      <MobileSearchSheet open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}
