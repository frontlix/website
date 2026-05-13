'use client'

import Link from 'next/link'
import { useSearchParams, usePathname } from 'next/navigation'
import { FileText, Receipt, Image, StickyNote, Clock } from 'lucide-react'
import type { ReactNode } from 'react'
import styles from './LeadTabs.module.css'

type TabKey = 'info' | 'offerte' | 'fotos' | 'notities' | 'activiteit'

const TABS: ReadonlyArray<{ key: TabKey; label: string; Icon: typeof FileText }> = [
  { key: 'info',       label: 'Info',       Icon: FileText },
  { key: 'offerte',    label: 'Offerte',    Icon: Receipt },
  { key: 'fotos',      label: "Foto's",     Icon: Image },
  { key: 'activiteit', label: 'Tijdlijn',   Icon: Clock },
  { key: 'notities',   label: 'Notities',   Icon: StickyNote },
]

/**
 * 5-tab navigatie voor lead-detail. Active tab in URL (?tab=...). Default
 * tab is 'info' (overzichtelijke landing-tab voor een nieuwe lead).
 * Optionele `counts` toont een count-badge naast de tab-label (bv. "Foto's 4").
 */
export function LeadTabs({
  info,
  offerte,
  fotos,
  notities,
  activiteit,
  counts,
}: {
  info: ReactNode
  offerte: ReactNode
  fotos: ReactNode
  notities: ReactNode
  activiteit: ReactNode
  counts?: Partial<Record<TabKey, number>>
}) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const raw = searchParams.get('tab')
  const active: TabKey = (
    raw && TABS.some((t) => t.key === raw) ? raw : 'info'
  ) as TabKey

  const buildHref = (tab: TabKey) => {
    const params = new URLSearchParams(searchParams.toString())
    if (tab === 'info') params.delete('tab')
    else params.set('tab', tab)
    const qs = params.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }

  const panels: Record<TabKey, ReactNode> = {
    info,
    offerte,
    fotos,
    notities,
    activiteit,
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.tabBar} role="tablist">
        {TABS.map(({ key, label, Icon }) => {
          const count = counts?.[key]
          return (
            <Link
              key={key}
              href={buildHref(key)}
              className={`${styles.tab} ${active === key ? styles.active : ''}`}
              role="tab"
              aria-selected={active === key}
              scroll={false}
            >
              <Icon size={14} />
              <span>{label}</span>
              {typeof count === 'number' && count > 0 && (
                <span className={styles.tabCount}>{count}</span>
              )}
            </Link>
          )
        })}
      </div>
      <div className={styles.panel} role="tabpanel">
        {panels[active]}
      </div>
    </div>
  )
}
