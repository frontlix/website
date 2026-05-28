import Link from 'next/link'
import { MessageCircle, Filter, RefreshCw, ChevronLeft } from 'lucide-react'
import {
  getActiveConversations,
  getMessagesForLead,
  getInboxLeadContext,
  type ConversationPreview,
} from '@/lib/dashboard/inbox-queries'
import { botStatusForFase } from '@/lib/dashboard/fase-labels'
import { MobileChatDetail } from '@/components/dashboard/mobile/inbox/MobileChatDetail'
import { MobileInboxList } from '@/components/dashboard/mobile/inbox/MobileInboxList'
import { bucketFor } from '@/components/dashboard/mobile/inbox/inbox-mappers'
import { InboxBotToggle } from '@/components/dashboard/inbox/InboxBotToggle'
import { ConversationsList } from '@/components/dashboard/inbox/ConversationsList'
import { LeadContextPane } from '@/components/dashboard/inbox/LeadContextPane'
import {
  InboxFilterTabs,
  type InboxFilter,
} from '@/components/dashboard/inbox/InboxFilterTabs'
import { InboxSearch } from '@/components/dashboard/inbox/InboxSearch'
import { InboxMarkRead } from '@/components/dashboard/inbox/InboxMarkRead'
import { InboxRealtime } from '@/components/dashboard/inbox/InboxRealtime'
import { MobileContextButton } from '@/components/dashboard/inbox/MobileContextButton'
import { WhatsAppComposer } from '@/components/dashboard/inbox/WhatsAppComposer'
import { LeadConversation } from '@/components/dashboard/leads/LeadConversation'
import { LeadDetailRealtime } from '@/components/dashboard/leads/LeadDetailRealtime'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

function matchesFilter(c: ConversationPreview, filter: InboxFilter): boolean {
  switch (filter) {
    case 'all':
      return true
    case 'unread':
      // Ongelezen als het laatste bericht inkomend is EN ofwel:
      //  - nooit geopend (inboxGelezenOp === null), of
      //  - dat inkomende bericht is binnengekomen NA de laatste opening.
      // String-vergelijking werkt voor ISO-timestamps (lex == chrono).
      if (c.laatsteBericht.richting !== 'inkomend') return false
      if (c.inboxGelezenOp === null) return true
      return c.laatsteBericht.timestamp > c.inboxGelezenOp
    case 'action':
      // V1 heuristic: in onderhandeling = wacht op owner-actie.
      return c.gesprekFase === 'onderhandelen'
  }
}

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string; filter?: string; q?: string }>
}) {
  const sp = await searchParams
  const selectedLeadId = sp.lead ?? null
  const filter = (['all', 'unread', 'action'].includes(sp.filter ?? '')
    ? sp.filter
    : 'all') as InboxFilter
  const search = (sp.q ?? '').trim().toLowerCase()

  const [allConversations, messages, leadContext] = await Promise.all([
    getActiveConversations(50),
    selectedLeadId ? getMessagesForLead(selectedLeadId) : Promise.resolve([]),
    selectedLeadId ? getInboxLeadContext(selectedLeadId) : Promise.resolve(null),
  ])

  // Counts per tab — stabiel over alle conversations.
  const counts: Record<InboxFilter, number> = {
    all:    allConversations.length,
    unread: allConversations.filter((c) => matchesFilter(c, 'unread')).length,
    action: allConversations.filter((c) => matchesFilter(c, 'action')).length,
  }

  let conversations = allConversations.filter((c) => matchesFilter(c, filter))
  if (search) {
    conversations = conversations.filter(
      (c) =>
        c.naam.toLowerCase().includes(search) ||
        c.telefoon.toLowerCase().includes(search) ||
        (c.laatsteBericht.tekst ?? '').toLowerCase().includes(search),
    )
  }

  // Behoud filter + search wanneer een gesprek wordt aangeklikt — anders
  // klapt de URL terug naar /inbox?lead=... en verliest de gebruiker de
  // actieve filter-tab (bv. Actie of Ongelezen).
  const preservedParams = new URLSearchParams()
  if (sp.filter && sp.filter !== 'all') preservedParams.set('filter', sp.filter)
  if (sp.q) preservedParams.set('q', sp.q)
  const preservedQuery = preservedParams.toString()

  // chatbotNaam: default 'Surface' (uitbreidbaar via tenant_settings later)
  const chatbotNaam = 'Surface'

  return (
    <div className={styles.fullBleed}>
      {/* Live-subscription: refresht inbox-lijst zodra een nieuw bericht binnenkomt */}
      <InboxRealtime />

      {/* ── Desktop tree (> 640px) ─────────────────────── */}
      <div className={styles.desktopTree}>
      <div className={styles.grid} data-pane={selectedLeadId ? 'detail' : 'list'}>
        {/* Linkerkolom — conversaties-lijst */}
        <aside className={styles.colList}>
          <div className={styles.colHead}>
            <div className={styles.colHeadTitle}>
              <span>Inbox</span>
              <div className={styles.colHeadActions}>
                <button
                  type="button"
                  className={styles.iconBtn}
                  disabled
                  title="Filter — binnenkort beschikbaar"
                  aria-label="Filter — binnenkort beschikbaar"
                >
                  <Filter size={14} />
                </button>
                <button
                  type="button"
                  className={styles.iconBtn}
                  disabled
                  title="Vernieuwen — binnenkort beschikbaar (inbox refresht nu automatisch via realtime)"
                  aria-label="Vernieuwen — binnenkort beschikbaar"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>
            <InboxSearch initial={search} />
            <InboxFilterTabs counts={counts} />
          </div>
          <ConversationsList
            conversations={conversations}
            selectedLeadId={selectedLeadId}
            preservedQuery={preservedQuery}
          />
        </aside>

        {/* Middenkolom — WhatsApp thread */}
        <section className={styles.colThread}>
          {selectedLeadId && leadContext ? (
            <>
              {/* Side-effect: markeer het gesprek als gelezen door de owner */}
              <InboxMarkRead leadId={selectedLeadId} />

              <div className={styles.threadHead}>
                <div className={styles.threadHeadLeft}>
                  {/* Terug naar lijst — alleen zichtbaar op mobile (<800px) */}
                  <Link href="/inbox" className={styles.mobileBackBtn} aria-label="Terug naar lijst">
                    <ChevronLeft size={18} />
                  </Link>
                  <MessageCircle size={16} />
                  <div>
                    <div className={styles.threadName}>{leadContext.naam}</div>
                    <div className={styles.threadSub}>
                      {leadContext.telefoon} · WhatsApp
                    </div>
                  </div>
                </div>
                <div className={styles.threadHeadRight}>
                  {/* Info-knop opent LeadContextPane als MobileSheet op <1200px */}
                  {selectedLeadId && leadContext && (
                    <MobileContextButton lead={leadContext} />
                  )}
                  <InboxBotToggle
                    leadId={selectedLeadId}
                    botPaused={leadContext.botGepauzeerd}
                  />
                  <LeadDetailRealtime leadId={selectedLeadId} />
                </div>
              </div>

              {/* Bot-status strip onder header — wat Surface 'denkt' nu te doen */}
              <div className={styles.botStatus}>
                <span className={styles.botStatusLabel}>Surface:</span>
                <span className={styles.botStatusText}>
                  {botStatusForFase(leadContext.gesprek_fase)}
                </span>
              </div>

              <div className={styles.threadScroll}>
                <LeadConversation berichten={messages} />
              </div>
              <WhatsAppComposer leadId={selectedLeadId} botPaused={leadContext.botGepauzeerd} />
            </>
          ) : (
            <div className={styles.threadEmpty}>
              <MessageCircle size={48} className={styles.threadEmptyIcon} />
              <div className={styles.threadEmptyTitle}>Kies een gesprek</div>
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
          ) : (
            <div className={styles.contextEmpty}>
              Selecteer een gesprek voor lead-info.
            </div>
          )}
        </aside>
      </div>
      </div>
      {/* ── Mobile tree (≤ 640px) ─────────────────────── */}
      <div className={styles.mobileTree}>
        {selectedLeadId && leadContext ? (
          <MobileChatDetail
            leadId={selectedLeadId}
            messages={messages}
            lead={leadContext}
            chatbotNaam={chatbotNaam}
          />
        ) : (
          <MobileInboxList
            conversations={conversations}
            ongelezenCount={counts.unread}
            liveCount={conversations.filter(
              (c) => bucketFor(c.laatsteBericht.timestamp) === 'live',
            ).length}
          />
        )}
      </div>
    </div>
  )
}

