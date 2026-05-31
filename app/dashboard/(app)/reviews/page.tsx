import { FileText, Send } from 'lucide-react'
import { KpiCard } from '@/components/dashboard/ui/KpiCard'
import { NPSDistributionBar } from '@/components/dashboard/reviews/NPSDistributionBar'
import {
  ReviewCard,
  type ReviewItem,
} from '@/components/dashboard/reviews/ReviewCard'
import {
  PendingReviewRow,
  type PendingReview,
} from '@/components/dashboard/reviews/PendingReviewRow'
import {
  ReviewsFilterTabs,
  type ReviewsFilter,
} from '@/components/dashboard/reviews/ReviewsFilterTabs'
import { MobileReviews } from '@/components/dashboard/mobile/reviews/MobileReviews'
import { requireApprovedUser } from '@/lib/dashboard/require-approved-user'
import { getDashboardSupabase } from '@/lib/dashboard/supabase-server'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

/**
 * Reviews & klanttevredenheid.
 *
 * V1: demo-data — er is nog geen NPS-tabel in de DB. De pagina toont de
 * volledige UX (KPI's, NPS-balk, review-cards, pending-rij) zodat de
 * klant ziet hoe het wordt. Zodra de bot na elke klus een review-vraag
 * stuurt + de antwoorden landen in een `reviews`-tabel, vervangen we
 * deze static data door echte queries.
 */
export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const sp = await searchParams
  const filter = (
    ['all', 'pending', 'detractor'].includes(sp.filter ?? '') ? sp.filter : 'all'
  ) as ReviewsFilter

  // Echte bedrijfsnaam ophalen (zelfde patroon als de dashboard-layout).
  // requireApprovedUser + getDashboardSupabase zijn cache()-wrapped, dus dit
  // hergebruikt het werk van de layout en doet geen dubbele query.
  // tenant_settings.bedrijfsnaam → fallback profile.bedrijfsnaam → 'je bedrijf'.
  const { profile } = await requireApprovedUser()
  const supabase = await getDashboardSupabase()
  const settingsRes = await supabase
    .from('tenant_settings')
    .select('bedrijfsnaam')
    .limit(1)
    .maybeSingle()
  // Cast: zonder generated DB types geeft de inference hier `never`.
  const tenantSettings = settingsRes.data as { bedrijfsnaam: string | null } | null
  const bedrijfsnaam =
    tenantSettings?.bedrijfsnaam ?? profile.bedrijfsnaam ?? 'je bedrijf'

  // ── DEMO-DATA ───────────────────────────────────────────────────
  // Wordt vervangen door echte reviews-queries zodra de tabel bestaat.
  // Tot dan: realistic-looking placeholder zodat de UI volledig zichtbaar is.
  const reviews: ReviewItem[] = [
    {
      id: 'r1',
      leadId: 'demo-1',
      naam: 'Anna Smit',
      plaats: 'Den Haag',
      datum: '2 dagen geleden',
      score: 10,
      nps: 'promoter',
      text: 'Geweldig werk. Op tijd, schoon werk, perfecte communicatie via WhatsApp tijdens en na de klus. Aanrader!',
      published: true,
    },
    {
      id: 'r2',
      leadId: 'demo-2',
      naam: 'Sandra Janssen',
      plaats: 'Pijnacker',
      datum: '1 week geleden',
      score: 9,
      nps: 'promoter',
      text: 'Heel netjes gewerkt en eerlijk advies gekregen over de beschermlaag. Resultaat is super.',
      published: true,
    },
    {
      id: 'r3',
      leadId: 'demo-3',
      naam: 'Erik van der Velde',
      plaats: 'Rotterdam',
      datum: '2 weken geleden',
      score: 8,
      nps: 'passive',
      text: 'Goed werk geleverd. Aankomsttijd was iets later dan afgesproken maar verder prima.',
      published: true,
    },
    {
      id: 'r4',
      leadId: 'demo-4',
      naam: 'Familie Kuiper',
      plaats: 'Delft',
      datum: '3 weken geleden',
      score: 10,
      nps: 'promoter',
      text: 'Vakwerk! De terras ziet er weer als nieuw uit, dankzij de antraciet voegen prachtige uitstraling.',
      published: true,
    },
    {
      id: 'r5',
      leadId: 'demo-5',
      naam: 'Bert Koning',
      plaats: 'Utrecht',
      datum: '1 maand geleden',
      score: 6,
      nps: 'detractor',
      text: 'Werk goed gedaan maar prijs viel iets hoger uit dan in de offerte was aangegeven.',
      published: false,
    },
  ]

  const pending: PendingReview[] = [
    {
      id: 'p1',
      leadId: 'demo-p1',
      naam: 'Thomas Wilms',
      plaats: 'Delft',
      klusDatum: 'vrijdag 8 mei',
      daysSince: 2,
      sent: false,
    },
    {
      id: 'p2',
      leadId: 'demo-p2',
      naam: 'Petra de Boer',
      plaats: 'Gouda',
      klusDatum: 'dinsdag 28 april',
      daysSince: 8,
      sent: true,
    },
  ]

  const promoters = reviews.filter((r) => r.nps === 'promoter').length
  const passives = reviews.filter((r) => r.nps === 'passive').length
  const detractors = reviews.filter((r) => r.nps === 'detractor').length
  const total = promoters + passives + detractors
  const nps = total > 0
    ? Math.round(((promoters - detractors) / total) * 100)
    : 0
  const avgScore =
    total > 0
      ? Number(
          (reviews.reduce((sum, r) => sum + r.score, 0) / total).toFixed(1),
        )
      : 0

  const counts: Record<ReviewsFilter, number> = {
    all:       reviews.length,
    pending:   pending.length,
    detractor: detractors,
  }

  const displayedReviews =
    filter === 'detractor' ? reviews.filter((r) => r.nps === 'detractor') : reviews

  return (
    <>
      <div className={styles.desktopTree}>
      <div className="dash-section-head">
        <div>
          <div className="dash-section-title">Reviews & klanttevredenheid</div>
          <div className="dash-section-sub">
            NPS-score: <strong style={{ color: 'var(--success)' }}>+{nps}</strong> ·{' '}
            {reviews.length} reviews · 68% response rate
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="dash-btn dash-btn-secondary"
            disabled
            title="Exporteer rapport — binnenkort beschikbaar"
            aria-label="Exporteer rapport — binnenkort beschikbaar"
          >
            <FileText size={13} />
            Exporteer rapport
          </button>
          <button
            type="button"
            className="dash-btn dash-btn-primary"
            disabled
            title="Stuur reviewverzoek — binnenkort beschikbaar"
            aria-label="Stuur reviewverzoek — binnenkort beschikbaar"
          >
            <Send size={13} />
            Stuur reviewverzoek
          </button>
        </div>
      </div>

      {/* Demo-banner: maak helder dat data placeholder is */}
      <div className={styles.demoBanner}>
        Voorbeelddata — zodra Surface na elke klus een review-vraag verstuurt
        verschijnen hier echte reviews. Tracking-tabel volgt in een opvolg-batch.
      </div>

      {/* KPIs */}
      <div className="dash-kpi-grid" style={{ marginBottom: 20 }}>
        <KpiCard
          label="NPS-score"
          value={nps}
          prefix="+"
          trend={[42, 48, 52, 58, 60, 63, 67]}
        />
        <KpiCard
          label="Gemiddelde score"
          value={avgScore}
          suffix="/10"
          trend={[8.2, 8.4, 8.5, 8.7, 8.8, 9.0, 9.1]}
        />
        <KpiCard
          label="Response rate"
          value={68}
          suffix="%"
          trend={[55, 58, 60, 62, 64, 66, 68]}
        />
        <KpiCard
          label="Reviews dit jaar"
          value={reviews.length + 42}
          trend={[20, 25, 30, 35, 40, 44, 47]}
        />
      </div>

      <NPSDistributionBar
        promoters={promoters}
        passives={passives}
        detractors={detractors}
      />

      <ReviewsFilterTabs counts={counts} />

      {filter === 'pending' ? (
        <div className={styles.pendingList}>
          {pending.map((p) => (
            <PendingReviewRow key={p.id} item={p} />
          ))}
        </div>
      ) : (
        <div className={styles.reviewsGrid}>
          {displayedReviews.map((r) => (
            <ReviewCard key={r.id} review={r} />
          ))}
        </div>
      )}
      </div>

      <div className={styles.mobileTree}>
        <MobileReviews bedrijfsnaam={bedrijfsnaam} />
      </div>
    </>
  )
}
