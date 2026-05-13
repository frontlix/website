import { MessageCircle } from 'lucide-react'
import {
  getActiveConversations,
  getMessagesForLead,
  getInboxLeadContext,
} from '@/lib/dashboard/inbox-queries'
import { LiveDot } from '@/components/dashboard/ui/LiveDot'
import { ConversationsList } from '@/components/dashboard/inbox/ConversationsList'
import { LeadContextPane } from '@/components/dashboard/inbox/LeadContextPane'
import { LeadConversation } from '@/components/dashboard/leads/LeadConversation'
import { LeadDetailRealtime } from '@/components/dashboard/leads/LeadDetailRealtime'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string }>
}) {
  const sp = await searchParams
  const selectedLeadId = sp.lead ?? null

  // Conversations altijd fetchen. Bij geselecteerde lead: parallel ook
  // de message-thread + context ophalen.
  const [conversations, messages, leadContext] = await Promise.all([
    getActiveConversations(50),
    selectedLeadId ? getMessagesForLead(selectedLeadId) : Promise.resolve([]),
    selectedLeadId ? getInboxLeadContext(selectedLeadId) : Promise.resolve(null),
  ])

  const selectedConversation = conversations.find((c) => c.leadId === selectedLeadId)

  return (
    <>
      <div className="dash-section-head">
        <div>
          <div className="dash-section-title">Inbox</div>
          <div className="dash-section-sub">
            <LiveDot />
            <span style={{ marginLeft: 8, verticalAlign: 'middle' }}>
              {conversations.length} actief
              {conversations.length === 1 ? ' gesprek' : 'e gesprekken'}
            </span>
          </div>
        </div>
      </div>

      <div className={styles.grid}>
        {/* Linkerkolom — conversaties-lijst */}
        <aside className={styles.colList}>
          <div className={styles.colHead}>
            <span className={styles.colHeadTitle}>Gesprekken</span>
          </div>
          <ConversationsList
            conversations={conversations}
            selectedLeadId={selectedLeadId}
          />
        </aside>

        {/* Middenkolom — WhatsApp thread */}
        <section className={styles.colThread}>
          {selectedLeadId && leadContext ? (
            <>
              <div className={styles.threadHead}>
                <div className={styles.threadHeadLeft}>
                  <MessageCircle size={16} />
                  <div>
                    <div className={styles.threadName}>{leadContext.naam}</div>
                    <div className={styles.threadSub}>
                      {leadContext.telefoon} · WhatsApp
                    </div>
                  </div>
                </div>
                <LeadDetailRealtime leadId={selectedLeadId} />
              </div>
              <LeadConversation berichten={messages} />
            </>
          ) : (
            <div className={styles.threadEmpty}>
              <MessageCircle size={48} className={styles.threadEmptyIcon} />
              <div className={styles.threadEmptyTitle}>
                Kies een gesprek
              </div>
              <div className={styles.threadEmptySub}>
                Selecteer een conversatie uit de lijst om de WhatsApp-thread
                te bekijken.
              </div>
            </div>
          )}
        </section>

        {/* Rechterkolom — lead-context */}
        <aside className={styles.colContext}>
          {leadContext ? (
            <LeadContextPane lead={leadContext} />
          ) : selectedConversation ? (
            <div className={styles.contextEmpty}>
              Lead niet gevonden of gearchiveerd.
            </div>
          ) : (
            <div className={styles.contextEmpty}>
              Selecteer een gesprek voor lead-info.
            </div>
          )}
        </aside>
      </div>
    </>
  )
}
