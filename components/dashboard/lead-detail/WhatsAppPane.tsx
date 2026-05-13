import { MessageCircle, Bot } from 'lucide-react'
import { LeadConversation } from '@/components/dashboard/leads/LeadConversation'
import { LeadDetailRealtime } from '@/components/dashboard/leads/LeadDetailRealtime'
import type { Bericht } from '@/lib/dashboard/database.types'
import styles from './WhatsAppPane.module.css'

/**
 * WhatsApp-pane voor het lead-detail scherm. Header lijkt op WhatsApp Web
 * (donkergroene bar met chatbot-naam), body = de bestaande LeadConversation
 * (nu in WhatsApp-look) met live-realtime updates. Onderaan een strip die
 * laat zien dat Surface autonoom antwoordt — met een "Pauzeren" optie voor
 * handmatige overname.
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
            <div className={styles.sub}>online · via Surface bot</div>
          </div>
        </div>
        <LeadDetailRealtime leadId={leadId} />
      </div>

      <LeadConversation berichten={berichten} />

      <div className={styles.footer}>
        <div className={styles.footerLeft}>
          <Bot size={14} className={styles.footerIcon} />
          <span className={styles.footerText}>
            <strong>Surface antwoordt automatisch.</strong> Wil je zelf overnemen?
          </span>
        </div>
        <button type="button" className={styles.footerBtn} disabled>
          Pauzeren
        </button>
      </div>
    </div>
  )
}
