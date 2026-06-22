import { MobileReviews } from '@/components/dashboard/mobile/reviews/MobileReviews'
import { requireApprovedUser } from '@/lib/dashboard/require-approved-user'
import { getDashboardSupabase } from '@/lib/dashboard/supabase-server'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

/**
 * Reviews & klanttevredenheid.
 *
 * Rendert de mobiele review-weergave (MobileReviews). Haalt alleen de
 * bedrijfsnaam op (zelfde patroon als de dashboard-layout). De demo-data
 * (KPI's, NPS-balk, review-cards) volgt zodra de bot na elke klus een
 * review-vraag stuurt en de antwoorden in een `reviews`-tabel landen.
 */
export default async function ReviewsPage() {
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

  return (
    <div className={styles.mobileTree}>
      <MobileReviews bedrijfsnaam={bedrijfsnaam} />
    </div>
  )
}
