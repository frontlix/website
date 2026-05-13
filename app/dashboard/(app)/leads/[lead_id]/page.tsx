import { notFound } from 'next/navigation'
import { getLeadDetail, aggregateActivityTimeline } from '@/lib/dashboard/lead-queries'
import { getAllTags, getTagsForLead } from '@/lib/dashboard/tag-queries'
import { requireApprovedUser } from '@/lib/dashboard/require-approved-user'
import { LeadDetailHeader } from '@/components/dashboard/lead-detail/LeadDetailHeader'
import { LeadTabs } from '@/components/dashboard/lead-detail/LeadTabs'
import { LeadInfoTab } from '@/components/dashboard/lead-detail/LeadInfoTab'
import { WhatsAppPane } from '@/components/dashboard/lead-detail/WhatsAppPane'
import { LeadStatusBadges } from '@/components/dashboard/leads/LeadStatusBadges'
import { LeadTagsEditor } from '@/components/dashboard/leads/LeadTagsEditor'
import { LeadOfferte } from '@/components/dashboard/leads/LeadOfferte'
import { LeadAfspraak } from '@/components/dashboard/leads/LeadAfspraak'
import { LeadNotes } from '@/components/dashboard/leads/LeadNotes'
import { LeadPhotos } from '@/components/dashboard/leads/LeadPhotos'
import { LeadActivityTimeline } from '@/components/dashboard/leads/LeadActivityTimeline'
import { LeadDangerZone } from '@/components/dashboard/leads/LeadDangerZone'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

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

  const { lead } = detail

  return (
    <>
      <LeadDetailHeader lead={lead} />

      <div className={styles.split}>
        {/* Linkerkolom: tabs met info/offerte/foto's/notities/activiteit */}
        <div className={styles.colMain}>
          <LeadTabs
            info={
              <div className={styles.tabStack}>
                <LeadInfoTab lead={lead} />
                <div className={styles.metaActions}>
                  <LeadStatusBadges lead={lead} />
                  <LeadTagsEditor
                    leadId={lead.lead_id}
                    leadTags={leadTags}
                    allTags={allTags}
                  />
                </div>
              </div>
            }
            offerte={
              <div className={styles.tabStack}>
                <LeadOfferte
                  offertes={detail.offertes}
                  prijsregels={detail.prijsregels}
                />
                <LeadAfspraak lead={lead} />
              </div>
            }
            fotos={<LeadPhotos fotos={detail.fotos} />}
            notities={
              <div className={styles.tabStack}>
                <LeadNotes
                  leadId={lead.lead_id}
                  notes={detail.notes}
                  currentUserId={user.id}
                />
                <LeadDangerZone
                  leadId={lead.lead_id}
                  archived={lead.dashboard_archived}
                />
              </div>
            }
            activiteit={
              <LeadActivityTimeline events={aggregateActivityTimeline(detail)} />
            }
          />
        </div>

        {/* Rechterkolom: WhatsApp transcript */}
        <div className={styles.colChat}>
          <WhatsAppPane
            leadId={lead.lead_id}
            leadNaam={lead.naam}
            berichten={detail.berichten}
          />
        </div>
      </div>
    </>
  )
}
