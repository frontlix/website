'use client'

import { useEffect, useState } from 'react'

/**
 * Returnt `true` als de viewport <= 640px (mobile-breakpoint dat het dashboard
 * elders ook gebruikt), `false` daarboven, `undefined` tijdens SSR + eerste
 * client-render (voor er een matchMedia-result is).
 *
 * Bewust een tristate — caller kan kiezen om de mobile-tree pas te mounten
 * NA detectie. Dat vermijdt dubbele mount + state-duplicatie tussen
 * desktop/mobile componenten tijdens hydration.
 */
export function useIsMobile(maxWidthPx = 640): boolean | undefined {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mql = window.matchMedia(`(max-width: ${maxWidthPx}px)`)
    setIsMobile(mql.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [maxWidthPx])

  return isMobile
}
