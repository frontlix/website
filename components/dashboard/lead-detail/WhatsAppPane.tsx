import { MessageCircle } from 'lucide-react'
import { LeadConversation } from '@/components/dashboard/leads/LeadConversation'
import { LeadDetailRealtime } from '@/components/dashboard/leads/LeadDetailRealtime'
import type { Bericht } from '@/lib/dashboard/database.types'
import styles from './WhatsAppPane.module.css'

/**
 * WhatsApp-pane voor het lead-detail scherm. Header lijkt op WhatsApp Web
 * (donkergroene bar met chatbot-naam), body = de bestaande LeadConversation
 * (nu in WhatsApp-look) met live-realtime updates.
 */
export function WhatsAppPane({
  leadId,
  leadNaam,
  berichten,
}: {
  leadId: string
  leadNaam: string
  berichten: Bericht[]
}) {
  return (
    <div className={styles.pane}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <MessageCircle size={16} />
          <div>
            <div className={styles.title}>{leadNaam}</div>
            <div className={styles.sub}>WhatsApp · live</div>
          </div>
        </div>
        <LeadDetailRealtime leadId={leadId} />
      </div>

      <LeadConversation berichten={berichten} />
    </div>
  )
}
