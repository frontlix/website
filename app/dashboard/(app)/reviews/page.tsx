import { MobileReviewsSoon } from '@/components/dashboard/mobile/reviews/MobileReviewsSoon'
import { requireApprovedUser } from '@/lib/dashboard/require-approved-user'
import { getDashboardSupabase } from '@/lib/dashboard/supabase-server'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

/**
 * Reviews & klanttevredenheid (mobiel).
 *
 * Er bestaat nog GEEN reviews-tabel/backend, dus we tonen geen (nep)
 * voorbeelddata meer maar een nette "binnenkort"-placeholder — gelijk aan de
 * desktop /dashboard/v2/reviews pagina. De demo-component MobileReviews blijft
 * als skelet bestaan; zodra de bot na elke klus een review-vraag stuurt en de
 * antwoorden in een `reviews`-tabel landen komt die (met echte data) terug.
 *
 * We raken nog wel de tenant-scope aan via requireApprovedUser() (auth-gate) +
 * een tenant_settings-query (RLS), net als de andere pagina's, zodat de
 * overstap naar echte rijen straks alleen de query + UI toevoegt.
 */
export default async function ReviewsPage() {
  await requireApprovedUser()
  const supabase = await getDashboardSupabase()
  const settingsRes = await supabase
    .from('tenant_settings')
    .select('bedrijfsnaam')
    .limit(1)
    .maybeSingle()
  // Cast: zonder generated DB types geeft de inference hier `never`.
  void (settingsRes.data as { bedrijfsnaam: string | null } | null)

  return (
    <div className={styles.mobileTree}>
      <MobileReviewsSoon />
    </div>
  )
}
