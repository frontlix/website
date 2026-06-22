import { notFound } from 'next/navigation'
import { getLeadDetail } from '@/lib/dashboard/lead-queries'
import { requireApprovedUser } from '@/lib/dashboard/require-approved-user'
import { getManualOffertePricing } from '@/lib/dashboard/pricing-queries'
import { MobileLeadDossier } from '@/components/dashboard/mobile/dossier/MobileLeadDossier'
import { mapLeadDetailToDossier } from '@/components/dashboard/mobile/dossier/dossier-mappers'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ lead_id: string }>
}) {
  await requireApprovedUser()
  const { lead_id } = await params
  const [detail, pricing] = await Promise.all([
    getLeadDetail(lead_id),
    getManualOffertePricing(),
  ])

  if (!detail) {
    notFound()
  }

  const { lead } = detail

  return (
    <>
      {/* Mobile-only: volledig scherm lead-dossier, gevoed met echte
          getLeadDetail-data via de dossier-mapper. */}
      <div className={styles.mobileTree}>
        <MobileLeadDossier
          data={mapLeadDetailToDossier(detail)}
          offerteForm={{
            leadId: lead.lead_id,
            lead,
            prijsregels: detail.prijsregels,
            offertes: detail.offertes,
            fotosCount: detail.fotos.length,
            pricing,
          }}
        />
      </div>
    </>
  )
}
