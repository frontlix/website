import { notFound } from 'next/navigation'
import { getLeadDetail } from '@/lib/dashboard/lead-queries'
import { requireApprovedUser } from '@/lib/dashboard/require-approved-user'
import { getManualOffertePricing } from '@/lib/dashboard/pricing-queries'
import { resolveSeedPricing } from '@/lib/dashboard/offerte-snapshot'
import { getAllTags, getTagsForLead } from '@/lib/dashboard/tag-queries'
import { MobileLeadDossier } from '@/components/dashboard/mobile/dossier/MobileLeadDossier'
import { mapLeadDetailToDossier } from '@/components/dashboard/mobile/dossier/dossier-mappers'
import { getWerkgebiedGrenzen } from '@/lib/dashboard/handover-reason'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ lead_id: string }>
}) {
  await requireApprovedUser()
  const { lead_id } = await params
  const [detail, pricing, allTags, leadTags, grenzen] = await Promise.all([
    getLeadDetail(lead_id),
    getManualOffertePricing(),
    getAllTags(),
    getTagsForLead(lead_id),
    getWerkgebiedGrenzen(),
  ])

  if (!detail) {
    notFound()
  }

  const { lead } = detail

  // Seed de mobiele offerte-editor met de bevroren prijslijst van de laatste
  // verstuurde offerte, anders de live prijslijst. Zo toont een ongewijzigd
  // concept exact de verzonden prijzen. (De v2-desktop seedt via dossier-mappers.)
  const seedPricing = resolveSeedPricing(detail.offertes, pricing)

  return (
    <>
      {/* Mobile-only: volledig scherm lead-dossier, gevoed met echte
          getLeadDetail-data via de dossier-mapper. */}
      <div className={styles.mobileTree}>
        <MobileLeadDossier
          data={mapLeadDetailToDossier(detail, undefined, grenzen)}
          archived={lead.dashboard_archived}
          leadTags={leadTags}
          allTags={allTags}
          offerteForm={{
            leadId: lead.lead_id,
            lead,
            prijsregels: detail.prijsregels,
            offertes: detail.offertes,
            fotosCount: detail.fotos.length,
            pricing: seedPricing,
          }}
        />
      </div>
    </>
  )
}
