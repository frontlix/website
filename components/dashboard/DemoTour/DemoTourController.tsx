'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { DemoTour } from './DemoTour'

/**
 * Mounted in de dashboard-layout. Toont de rondleiding zodra de URL
 * `?rondleiding=1` bevat (zelfde patroon als ManualOfferteController).
 * Alleen op desktop; de mobiele variant volgt in fase 2.
 */
export function DemoTourController() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const desktop = useMediaQuery('(min-width: 900px)')
  const open = searchParams.get('rondleiding') === '1'

  if (!open || !desktop) return null

  const close = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('rondleiding')
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  // Fase 1 (preview): afronden = sluiten. Fase 2 koppelt completeDemoTourAction + wizard.
  return <DemoTour onClose={close} onFinish={close} />
}
