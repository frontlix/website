import { notFound } from 'next/navigation'
import { getLeadDetail, aggregateActivityTimeline } from '@/lib/dashboard/lead-queries'
import { getAllTags, getTagsForLead } from '@/lib/dashboard/tag-queries'
import { requireApprovedUser } from '@/lib/dashboard/require-approved-user'
import { LeadDetailHeader } from '@/components/dashboard/lead-detail/LeadDetailHeader'
import { LeadBotStatus } from '@/components/dashboard/lead-detail/LeadBotStatus'
import { WebChatPanel } from '@/components/dashboard/lead-detail/WebChatPanel'
import { LeadTabs } from '@/components/dashboard/lead-detail/LeadTabs'
import { LeadInfoTab } from '@/components/dashboard/lead-detail/LeadInfoTab'
import { WhatsAppPane } from '@/components/dashboard/lead-detail/WhatsAppPane'
import { LeadStatusBadges } from '@/components/dashboard/leads/LeadStatusBadges'
import { LeadTagsEditor } from '@/components/dashboard/leads/LeadTagsEditor'
import { LeadOfferte } from '@/components/dashboard/leads/offerte/LeadOfferte'
import { LeadAfspraak } from '@/components/dashboard/leads/LeadAfspraak'
import { LeadNotes } from '@/components/dashboard/leads/LeadNotes'
import { LeadPhotos } from '@/components/dashboard/leads/LeadPhotos'
import { LeadActivityTimeline } from '@/components/dashboard/leads/LeadActivityTimeline'
import { LeadDangerZone } from '@/components/dashboard/leads/LeadDangerZone'
import { MobileLeadDossier } from '@/components/dashboard/mobile/dossier/MobileLeadDossier'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

export default async function LeadDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ lead_id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { user, profile } = await requireApprovedUser()
  const isOwner = profile.is_owner === true
  const { lead_id } = await params
  const { tab } = (await searchParams) ?? {}
  // Op mobile verbergen we de WhatsApp-thread én de Afspraak-kaart wanneer
  // de gebruiker actief de Offerte-tab bewerkt — het scherm moet zich dan
  // focussen op de offerte-edit-flow. Desktop blijft beide kolommen tonen.
  const offerteTabActief = (tab ?? 'info') === 'offerte'
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
      <div className={styles.desktopTree}>
        <LeadDetailHeader lead={lead} />
        {/* Bot-status strip — op desktop direct onder de header. Op mobile
            verbergt CSS deze versie en wordt 'ie binnen colChat (vlak voor
            WhatsApp-paneel) gerenderd zodat de gebruiker eerst de lead-
            gegevens leest en pas in de gespreks-context de Surface-status
            ziet. Twee render-instances delen dezelfde server-data; de
            verborgen variant wordt nooit door de user gezien. */}
        <div className={styles.botStatusDesktop}>
          <LeadBotStatus lead={lead} />
        </div>
        <WebChatPanel lead={lead} />

        <div className={styles.split}>
          {/* Linkerkolom: tabs met info/offerte/foto's/notities/activiteit */}
          <div className={styles.colMain}>
            <LeadTabs
              counts={{
                fotos: detail.fotos.length,
                notities: detail.notes.length,
                offerte: detail.offertes.length,
              }}
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
                    leadId={lead.lead_id}
                    offertes={detail.offertes}
                    prijsregels={detail.prijsregels}
                    lead={lead}
                    fotosCount={detail.fotos.length}
                    isOwner={isOwner}
                  />
                  {/* Afspraak-blok hoort bij de offerte-flow, maar op mobile
                      wil de gebruiker volle focus op de regel-editor — daar
                      verbergen we 'm. Desktop houdt 'm zichtbaar. */}
                  <div className={styles.afspraakDesktopOnly}>
                    <LeadAfspraak lead={lead} />
                  </div>
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
                    klusGeblokkeerd={lead.klus_geblokkeerd}
                  />
                </div>
              }
              activiteit={
                <LeadActivityTimeline events={aggregateActivityTimeline(detail)} />
              }
            />
          </div>

          {/* Rechterkolom: bot-status + WhatsApp transcript. Op mobile +
              Offerte-tab verbergen we de hele kolom — gebruiker wil zich
              focussen op de regel-editor zonder bot-status of chat eronder. */}
          <div
            className={`${styles.colChat} ${
              offerteTabActief ? styles.colChatHiddenOnMobileOfferte : ''
            }`}
          >
            {/* Mobile-only positie voor LeadBotStatus — op desktop verborgen
                via CSS, op andere mobile-tabs zichtbaar boven WhatsApp. */}
            <div className={styles.botStatusMobile}>
              <LeadBotStatus lead={lead} />
            </div>
            <WhatsAppPane
              leadId={lead.lead_id}
              leadNaam={lead.naam}
              berichten={detail.berichten}
              botPaused={lead.bot_gepauzeerd}
            />
          </div>
        </div>
      </div>
      {/* Mobile-only: volledig scherm lead-dossier (mock v1 — wiren aan
          getLeadDetail in de functionele eindpass). */}
      <div className={styles.mobileTree}>
        <MobileLeadDossier />
      </div>
    </>
  )
}
