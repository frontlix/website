'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { ManualOfferteModal } from './ManualOfferteModal'

/**
 * Mounted in the dashboard layout. Renders the modal when the URL contains
 * `?nieuwe-offerte=1`. The "Nieuwe offerte" buttons throughout the dashboard
 * push that param onto the URL — no global event-bus needed.
 */
export function ManualOfferteController() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const open = searchParams.get('nieuwe-offerte') === '1'

  if (!open) return null

  const close = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('nieuwe-offerte')
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  return <ManualOfferteModal onClose={close} />
}
