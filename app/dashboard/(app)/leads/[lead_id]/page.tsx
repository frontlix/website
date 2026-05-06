import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getLeadDetail, aggregateActivityTimeline } from '@/lib/dashboard/lead-queries'
import { LeadHeader } from '@/components/dashboard/leads/LeadHeader'
import { LeadStatusBadges } from '@/components/dashboard/leads/LeadStatusBadges'
import { LeadDetailTabs } from '@/components/dashboard/leads/LeadDetailTabs'
import { LeadConversation } from '@/components/dashboard/leads/LeadConversation'
import { LeadPhotos } from '@/components/dashboard/leads/LeadPhotos'
import { LeadActivityTimeline } from '@/components/dashboard/leads/LeadActivityTimeline'
import styles from './page.module.css'

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ lead_id: string }>
}) {
  const { lead_id } = await params
  const detail = await getLeadDetail(lead_id)

  if (!detail) {
    notFound()
  }

  return (
    <div>
      <Link href="/leads" className={styles.backLink}>
        ← Terug naar leads
      </Link>

      <div className={styles.grid}>
        {/* Linker kolom: klantgegevens + status */}
        <aside className={styles.colLeft}>
          <LeadHeader lead={detail.lead} />
          <LeadStatusBadges lead={detail.lead} />
        </aside>

        {/* Midden: gesprek/foto's/timeline (Task 9-12 vullen dit) */}
        <section className={styles.colCenter}>
          <LeadDetailTabs
            gesprek={<LeadConversation berichten={detail.berichten} />}
            fotos={<LeadPhotos fotos={detail.fotos} />}
            timeline={
              <LeadActivityTimeline events={aggregateActivityTimeline(detail)} />
            }
            countGesprek={detail.berichten.length}
            countFotos={detail.fotos.length}
          />
        </section>

        {/* Rechter kolom: offerte + afspraak + notities (Task 13-15 vullen dit) */}
        <aside className={styles.colRight}>
          <p className={styles.placeholder}>Offerte / Afspraak / Notities — komt in volgende tasks</p>
        </aside>
      </div>
    </div>
  )
}
