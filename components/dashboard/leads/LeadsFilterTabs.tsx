'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

type FilterKey = 'all' | 'in_gesprek' | 'review' | 'offerte_uit' | 'ingepland' | 'afgerond' | 'archief'

const TABS: ReadonlyArray<{ key: FilterKey; label: string }> = [
  { key: 'all',         label: 'Alles' },
  { key: 'in_gesprek',  label: 'In gesprek' },
  { key: 'review',      label: 'Owner-review' },
  { key: 'offerte_uit', label: 'Offerte uit' },
  { key: 'ingepland',   label: 'Ingepland' },
  { key: 'afgerond',    label: 'Afgerond' },
  { key: 'archief',     label: 'Archief' },
]

export function LeadsFilterTabs({ counts }: { counts: Record<FilterKey, number> }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const active = (searchParams.get('filter') ?? 'all') as FilterKey

  const hrefFor = (key: FilterKey) => {
    const params = new URLSearchParams(searchParams.toString())
    if (key === 'all') params.delete('filter')
    else params.set('filter', key)
    const qs = params.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }

  return (
    <div className="dash-tab-bar" role="tablist">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={hrefFor(tab.key)}
          className={`dash-tab ${active === tab.key ? 'active' : ''}`}
          role="tab"
          aria-selected={active === tab.key}
          scroll={false}
        >
          <span>{tab.label}</span>
          <span className="dash-tab-count">{counts[tab.key]}</span>
        </Link>
      ))}
    </div>
  )
}
