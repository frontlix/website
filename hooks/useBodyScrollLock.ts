'use client'
import { useEffect } from 'react'

/**
 * Reference-counted body-scroll-lock.
 *
 * Meerdere overlays (modal, drawer, bottom-sheets) kunnen tegelijk open
 * staan. Met één gedeelde teller lockt de eerste overlay de body-scroll en
 * ontgrendelt PAS de laatste 'm weer. Zonder deze telling zette elke overlay
 * los `document.body.style.overflow`, waardoor het sluiten van één overlay de
 * scroll vrijgaf terwijl een ander nog open was → "scroll maar niets beweegt"
 * / achtergrond scrollt achter een open overlay (gestapelde overlays).
 *
 * Eén bron van waarheid: gebruikt door MobileSheet, ManualOfferteModal,
 * DagrapportDrawer, MeerSheet, MobileNotificationsSheet en useModalSheet.
 * Restoret naar lege string (niet de gecapteerde prev-waarde) zodat een
 * onverwachte stack nooit een permanente lock achterlaat.
 */
let lockCount = 0

export function acquireBodyScrollLock(): void {
  if (typeof document === 'undefined') return
  if (lockCount === 0) {
    document.body.style.overflow = 'hidden'
  }
  lockCount += 1
}

export function releaseBodyScrollLock(): void {
  if (typeof document === 'undefined') return
  // Veiligheidsklep: een release zonder bijbehorende acquire mag de teller
  // niet negatief maken (zou de volgende echte unlock breken).
  if (lockCount === 0) return
  lockCount -= 1
  if (lockCount === 0) {
    document.body.style.overflow = ''
  }
}

export function useBodyScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return
    acquireBodyScrollLock()
    return () => releaseBodyScrollLock()
  }, [active])
}
