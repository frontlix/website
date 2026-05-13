'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Columns3, Table, LayoutGrid } from 'lucide-react'
import styles from './LeadsViewSwitcher.module.css'

export type LeadsView = 'pipeline' | 'tabel' | 'kaarten'

const OPTS: ReadonlyArray<{ k: LeadsView; l: string; Icon: typeof Table }> = [
  { k: 'pipeline', l: 'Pipeline', Icon: Columns3 },
  { k: 'tabel',    l: 'Tabel',    Icon: Table },
  { k: 'kaarten',  l: 'Kaarten',  Icon: LayoutGrid },
]

/**
 * Segmented-control voor de drie leads-views. Render alleen op `/leads`,
 * URL-driven via `?view=`. Default (pipeline) staat in de URL niet.
 */
export function LeadsViewSwitcher() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Toon alleen op de leads-list, niet op /leads/[id].
  if (pathname !== '/leads') return null

  const active = (searchParams.get('view') ?? 'pipeline') as LeadsView

  const hrefFor = (k: LeadsView) => {
    const params = new URLSearchParams(searchParams.toString())
    if (k === 'pipeline') params.delete('view')
    else params.set('view', k)
    const qs = params.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }

  return (
    <div className={styles.bar} role="tablist">
      {OPTS.map(({ k, l, Icon }) => (
        <Link
          key={k}
          href={hrefFor(k)}
          className={`${styles.btn} ${active === k ? styles.active : ''}`}
          role="tab"
          aria-selected={active === k}
          scroll={false}
        >
          <Icon size={14} />
          <span>{l}</span>
        </Link>
      ))}
    </div>
  )
}
