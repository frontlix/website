'use client'

// Kopie van ReviewsFilterTabs (components/dashboard/reviews/ReviewsFilterTabs.tsx).
// Gebruikt de globale dash-tab-bar / dash-tab classes uit styles/dashboard.css,
// dus geen eigen CSS-module nodig. URL-gestuurd via ?filter=, scroll={false}
// zodat de pagina niet naar boven springt bij een tab-wissel.

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import type { SocialFilter } from '@/lib/dashboard/social-types'

const TABS: ReadonlyArray<{ key: SocialFilter; label: string }> = [
  { key: 'all',             label: 'Alle posts' },
  { key: 'ter_goedkeuring', label: 'Wacht op akkoord' },
  { key: 'goedgekeurd',     label: 'Goedgekeurd' },
  { key: 'gepubliceerd',    label: 'Gepubliceerd' },
]

export function SocialFilterTabs({
  counts,
}: {
  counts: Record<SocialFilter, number>
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const active = (searchParams.get('filter') ?? 'all') as SocialFilter

  const hrefFor = (key: SocialFilter) => {
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
