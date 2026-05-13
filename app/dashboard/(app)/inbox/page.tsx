import { MessageCircle, Filter, RefreshCw } from 'lucide-react'
import {
  getActiveConversations,
  getMessagesForLead,
  getInboxLeadContext,
  type ConversationPreview,
} from '@/lib/dashboard/inbox-queries'
import { Pill } from '@/components/dashboard/ui/Pill'
import { ConversationsList } from '@/components/dashboard/inbox/ConversationsList'
import { LeadContextPane } from '@/components/dashboard/inbox/LeadContextPane'
import {
  InboxFilterTabs,
  type InboxFilter,
} from '@/components/dashboard/inbox/InboxFilterTabs'
import { InboxSearch } from '@/components/dashboard/inbox/InboxSearch'
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
      // V1 heuristic: laatste bericht is inkomend = ongelezen door owner.
      // Strikte unread-tracking vereist een nieuwe DB-kolom.
      return c.laatsteBericht.richting === 'inkomend'
    case 'action':
      // V1 heuristic: in onderhandeling = wacht op owner-actie.
      return c.gesprekFase === 'onderhandelen'
    case 'bot':
      // V1 heuristic: laatste bericht is uitgaand (= bot praat).
      return c.laatsteBericht.richting === 'uitgaand'
  }
}

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string; filter?: string; q?: string }>
}) {
  const sp = await searchParams
  const selectedLeadId = sp.lead ?? null
  const filter = (['all', 'unread', 'action', 'bot'].includes(sp.filter ?? '')
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
    bot:    allConversations.filter((c) => matchesFilter(c, 'bot')).length,
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

  return (
    <div className={styles.fullBleed}>
      <div className={styles.grid}>
        {/* Linkerkolom — conversaties-lijst */}
        <aside className={styles.colList}>
          <div className={styles.colHead}>
            <div className={styles.colHeadTitle}>
              <span>Inbox</span>
              <div className={styles.colHeadActions}>
                <button type="button" className={styles.iconBtn} aria-label="Filter" disabled>
                  <Filter size={14} />
                </button>
                <button type="button" className={styles.iconBtn} aria-label="Vernieuwen" disabled>
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
                <div className={styles.threadHeadRight}>
                  <Pill tone="green" dot>
                    Bot actief — pauzeren
                  </Pill>
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
              <WhatsAppComposer />
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
  )
}

function botStatusForFase(fase: string | null | undefined): string {
  const labels: Record<string, string> = {
    info_verzamelen:    'Verzamelt info — wacht op klant-antwoord',
    offerte_besproken:  'Offerte verstuurd — wacht op reactie',
    onderhandelen:      'Onderhandelt — owner-aandacht mogelijk nodig',
    datum_kiezen:       'Datum kiezen — klant kiest afspraak',
    afspraak_bevestigd: 'Afspraak bevestigd — wacht op afronding',
  }
  return fase ? labels[fase] ?? 'Actief in gesprek' : 'Actief in gesprek'
}
