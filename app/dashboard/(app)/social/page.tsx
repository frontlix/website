// ECHTE DOELPAD IN DE APP-REPO: app/dashboard/(app)/social/page.tsx
// (de route-group `(app)` kan niet in deze stagingmap als mapnaam staan
//  zonder shell-escaping-gedoe, dus hier staat 'ie zonder de groep. Bij het
//  overzetten naar `Desktop/Frontlix website` plaats je dit bestand in
//  app/dashboard/(app)/social/page.tsx zodat de bestaande dashboard-layout
//  met sidebar plus topbar eromheen valt.)
//
// Social-media goedkeuringspagina. Patroon 1-op-1 gekopieerd van de
// reviews-pagina (app/dashboard/(app)/reviews/page.tsx): async RSC,
// force-dynamic, desktopTree plus mobileTree gesplitst door CSS, niet door
// een viewport-ternary. requireApprovedUser + getDashboardSupabase zijn
// cache()-wrapped en delen dus het werk met de layout.

import { Share2, RefreshCw } from 'lucide-react'
import { requireApprovedUser } from '@/lib/dashboard/require-approved-user'
import { getDashboardSupabase } from '@/lib/dashboard/supabase-server'
import {
  getSocialPosts,
  countSocialByStatus,
  type SocialPostMetVarianten,
} from '@/lib/dashboard/social-queries'
import type { SocialFilter } from '@/lib/dashboard/social-types'
import { SocialFilterTabs } from '@/components/dashboard/social/SocialFilterTabs'
import { WeekKalender } from '@/components/dashboard/social/WeekKalender'
import { PostKaart } from '@/components/dashboard/social/PostKaart'
import { MobileSocial } from '@/components/dashboard/mobile/social/MobileSocial'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

const FILTERS: ReadonlyArray<SocialFilter> = [
  'all',
  'ter_goedkeuring',
  'goedgekeurd',
  'gepubliceerd',
]

export default async function SocialPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; week?: string }>
}) {
  const sp = await searchParams
  const filter = (
    FILTERS.includes((sp.filter ?? 'all') as SocialFilter) ? sp.filter : 'all'
  ) as SocialFilter

  // Auth-gate. Net als op de reviews-pagina is dit cache()-wrapped, dus de
  // layout heeft het werk al gedaan en dit is geen dubbele roundtrip.
  await requireApprovedUser()
  const supabase = await getDashboardSupabase()

  // Posts plus tellingen parallel ophalen. countSocialByStatus levert de
  // counts voor de filter-tabs server-side (RLS filtert op tenant_id =
  // auth.uid(), dus geen extra where-clause nodig).
  const [posts, counts] = await Promise.all([
    getSocialPosts(supabase, filter),
    countSocialByStatus(supabase),
  ])

  // Posts van de huidige (of gevraagde) week voor de WeekKalender bovenin.
  // De kalender toont alleen de week-strip; de grid eronder toont de
  // gefilterde lijst.
  const weekPosts = posts

  const subkop =
    counts.ter_goedkeuring > 0
      ? `${counts.ter_goedkeuring} ${
          counts.ter_goedkeuring === 1 ? 'post wacht' : 'posts wachten'
        } op je akkoord`
      : 'Alles is bijgewerkt, niets wacht op akkoord'

  return (
    <>
      {/* ── Desktop tree (verborgen op kleiner dan 641px) ──────────────── */}
      <div className={styles.desktopTree}>
        <div className="dash-section-head">
          <div>
            <div className="dash-section-title">Social media</div>
            <div className="dash-section-sub">{subkop}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="dash-btn dash-btn-secondary"
              disabled
              title="Genereer een nieuwe weekplanning, binnenkort beschikbaar"
              aria-label="Genereer een nieuwe weekplanning, binnenkort beschikbaar"
            >
              <RefreshCw size={13} />
              Nieuwe weekplanning
            </button>
          </div>
        </div>

        {/* Week-strip met de geplande posts van de week */}
        <WeekKalender posts={weekPosts} weekParam={sp.week} />

        <SocialFilterTabs counts={counts} />

        {posts.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <Share2 size={26} aria-hidden="true" />
            </div>
            <div className={styles.emptyTitle}>Geen posts in deze weergave</div>
            <div className={styles.emptySub}>
              {filter === 'all'
                ? 'Zodra de weekplanning draait verschijnen hier de concepten ter goedkeuring.'
                : 'Wissel van filter om de andere posts te zien.'}
            </div>
          </div>
        ) : (
          <div className={styles.postsGrid}>
            {posts.map((p: SocialPostMetVarianten) => (
              <PostKaart key={p.id} post={p} />
            ))}
          </div>
        )}
      </div>

      {/* ── Mobile tree (alleen zichtbaar op kleiner dan 641px) ─────────── */}
      <div className={styles.mobileTree}>
        <MobileSocial posts={posts} counts={counts} />
      </div>
    </>
  )
}
