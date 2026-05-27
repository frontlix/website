'use client'
import { useEffect } from 'react'

/**
 * Lockt body-scroll wanneer een sheet of modal openstaat.
 * Identiek patroon als ManualOfferteModal — gecentraliseerd zodat
 * MeerSheet, MobileNotificationsSheet en MobileSearchSheet 't allemaal
 * hergebruiken zonder duplicate cleanup-logica.
 */
export function useBodyScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [active])
}
