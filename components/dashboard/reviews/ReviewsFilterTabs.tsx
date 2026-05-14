'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

export type ReviewsFilter = 'all' | 'pending' | 'detractor'

const TABS: ReadonlyArray<{ key: ReviewsFilter; label: string }> = [
  { key: 'all',       label: 'Alle reviews' },
  { key: 'pending',   label: 'In afwachting' },
  { key: 'detractor', label: 'Aandacht nodig' },
]

export function ReviewsFilterTabs({
  counts,
}: {
  counts: Record<ReviewsFilter, number>
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const active = (searchParams.get('filter') ?? 'all') as ReviewsFilter

  const hrefFor = (key: ReviewsFilter) => {
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
