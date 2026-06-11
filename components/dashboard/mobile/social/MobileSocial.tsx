'use client'

// Mobiele social-weergave. Alleen zichtbaar onder 641px (de page.module.css
// regelt de toggle). Eén verticale lijst van PostKaart-en met een
// segment-filter erboven. Geen aparte mobiele kaart-component: PostKaart is
// al fluid (de .dash-card en de media-aspect-ratio schalen mee), dus we
// hergebruiken 'm net zoals de leads-tree mapLeadToCard hergebruikt.

import { useMemo, useState } from 'react'
import { Share2 } from 'lucide-react'
import { PostKaart } from '@/components/dashboard/social/PostKaart'
import type { SocialPostMetVarianten } from '@/lib/dashboard/social-queries'
import type { SocialFilter, SocialStatus } from '@/lib/dashboard/social-types'
import styles from './MobileSocial.module.css'

const TABS: ReadonlyArray<{ key: SocialFilter; label: string }> = [
  { key: 'all',             label: 'Alle' },
  { key: 'ter_goedkeuring', label: 'Akkoord' },
  { key: 'goedgekeurd',     label: 'Klaar' },
  { key: 'gepubliceerd',    label: 'Live' },
]

// Welke statussen onder welke filter-tab vallen. 'all' = alles.
function matchFilter(status: SocialStatus, filter: SocialFilter): boolean {
  if (filter === 'all') return true
  return status === filter
}

export function MobileSocial({
  posts,
  counts,
}: {
  posts: SocialPostMetVarianten[]
  counts: Record<SocialFilter, number>
}) {
  // De RSC heeft al op de URL-filter gefilterd, maar op mobiel filteren we
  // client-side binnen de meegegeven set zodat schakelen instant voelt
  // zonder navigatie. We tonen daarom de volledige lijst en filteren lokaal.
  const [filter, setFilter] = useState<SocialFilter>('all')

  const zichtbaar = useMemo(
    () => posts.filter((p) => matchFilter(p.status as SocialStatus, filter)),
    [posts, filter],
  )

  return (
    <div className={styles.root}>
      <div className={styles.kop}>
        <div className={styles.titel}>Social media</div>
        <div className={styles.sub}>
          {counts.ter_goedkeuring > 0
            ? `${counts.ter_goedkeuring} ${
                counts.ter_goedkeuring === 1 ? 'post wacht' : 'posts wachten'
              } op je akkoord`
            : 'Niets wacht op akkoord'}
        </div>
      </div>

      {/* Segment-filter, client-side, geen navigatie */}
      <div className={styles.tabs} role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={filter === tab.key}
            className={`${styles.tab} ${filter === tab.key ? styles.tabActief : ''}`}
            onClick={() => setFilter(tab.key)}
          >
            <span>{tab.label}</span>
            <span className={styles.tabCount}>{counts[tab.key]}</span>
          </button>
        ))}
      </div>

      {zichtbaar.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>
            <Share2 size={24} aria-hidden="true" />
          </div>
          <div className={styles.emptyTitle}>Geen posts</div>
          <div className={styles.emptySub}>
            Zodra de weekplanning draait verschijnen hier de concepten.
          </div>
        </div>
      ) : (
        <div className={styles.lijst}>
          {zichtbaar.map((p) => (
            <PostKaart key={p.id} post={p} />
          ))}
        </div>
      )}
    </div>
  )
}
