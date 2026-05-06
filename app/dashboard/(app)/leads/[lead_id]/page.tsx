import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getLeadDetail, aggregateActivityTimeline } from '@/lib/dashboard/lead-queries'
import { requireApprovedUser } from '@/lib/dashboard/require-approved-user'
import { LeadHeader } from '@/components/dashboard/leads/LeadHeader'
import { LeadStatusBadges } from '@/components/dashboard/leads/LeadStatusBadges'
import { LeadTagsEditor } from '@/components/dashboard/leads/LeadTagsEditor'
import { getAllTags, getTagsForLead } from '@/lib/dashboard/tag-queries'
import { LeadDetailTabs } from '@/components/dashboard/leads/LeadDetailTabs'
import { LeadConversation } from '@/components/dashboard/leads/LeadConversation'
import { LeadPhotos } from '@/components/dashboard/leads/LeadPhotos'
import { LeadActivityTimeline } from '@/components/dashboard/leads/LeadActivityTimeline'
import { LeadOfferte } from '@/components/dashboard/leads/LeadOfferte'
import { LeadAfspraak } from '@/components/dashboard/leads/LeadAfspraak'
import { LeadNotes } from '@/components/dashboard/leads/LeadNotes'
import { LeadDangerZone } from '@/components/dashboard/leads/LeadDangerZone'
import styles from './page.module.css'

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ lead_id: string }>
}) {
  const { user } = await requireApprovedUser()
  const { lead_id } = await params
  const [detail, allTags, leadTags] = await Promise.all([
    getLeadDetail(lead_id),
    getAllTags(),
    getTagsForLead(lead_id),
  ])

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
          <LeadTagsEditor
            leadId={detail.lead.lead_id}
            leadTags={leadTags}
            allTags={allTags}
          />
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
          <LeadOfferte offertes={detail.offertes} prijsregels={detail.prijsregels} />
          <LeadAfspraak lead={detail.lead} />
          <LeadNotes
            leadId={detail.lead.lead_id}
            notes={detail.notes}
            currentUserId={user.id}
          />
          <LeadDangerZone leadId={detail.lead.lead_id} archived={detail.lead.dashboard_archived} />
        </aside>
      </div>
    </div>
  )
}
