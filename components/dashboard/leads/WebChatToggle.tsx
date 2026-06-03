'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Globe } from 'lucide-react'
import styles from './WebChatToggle.module.css'

/**
 * Toggle naast `LeadsFilterTabs`. Filtert de leads-lijst op
 * `kanaal=web` (alleen leads zonder WhatsApp). Onafhankelijk van de
 * status-tabs, beide filters kunnen tegelijk actief zijn.
 *
 * Toont een count-bubble met het aantal web-leads zodat de eigenaar
 * direct ziet hoeveel niet-WhatsApp leads er zijn.
 */
export function WebChatToggle({ count }: { count: number }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const active = searchParams.get('kanaal') === 'web'

  const href = (() => {
    const params = new URLSearchParams(searchParams.toString())
    if (active) params.delete('kanaal')
    else params.set('kanaal', 'web')
    const qs = params.toString()
    return qs ? `${pathname}?${qs}` : pathname
  })()

  return (
    <Link
      href={href}
      className={`${styles.toggle} ${active ? styles.active : ''}`}
      scroll={false}
      aria-pressed={active}
    >
      <Globe size={13} />
      <span>Geen WhatsApp</span>
      <span className={styles.count}>{count}</span>
    </Link>
  )
}
