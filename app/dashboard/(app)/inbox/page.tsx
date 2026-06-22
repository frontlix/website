import {
  getActiveConversations,
  getMessagesForLead,
  getInboxLeadContext,
  type ConversationPreview,
} from '@/lib/dashboard/inbox-queries'
import { MobileChatDetail } from '@/components/dashboard/mobile/inbox/MobileChatDetail'
import { MobileInboxList } from '@/components/dashboard/mobile/inbox/MobileInboxList'
import { bucketFor } from '@/components/dashboard/mobile/inbox/inbox-mappers'
import { type InboxFilter } from '@/components/dashboard/inbox/InboxFilterTabs'
import { InboxRealtime } from '@/components/dashboard/inbox/InboxRealtime'
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

  // Counts per tab, stabiel over alle conversations.
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

  // chatbotNaam: default 'Surface' (uitbreidbaar via tenant_settings later)
  const chatbotNaam = 'Surface'

  return (
    <div className={styles.fullBleed}>
      {/* Live-subscription: refresht inbox-lijst zodra een nieuw bericht binnenkomt */}
      <InboxRealtime />

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

