'use client'

import { MessageCircle, Bot, Pause, Play } from 'lucide-react'
import { LeadConversation } from '@/components/dashboard/leads/LeadConversation'
import { LeadDetailRealtime } from '@/components/dashboard/leads/LeadDetailRealtime'
import { WhatsAppComposer } from '@/components/dashboard/inbox/WhatsAppComposer'
import { useBotAction } from '@/components/dashboard/bot-actions/use-bot-action'
import type { Bericht } from '@/lib/dashboard/database.types'
import styles from './WhatsAppPane.module.css'

/**
 * WhatsApp-pane voor het lead-detail scherm. Bevat de transcript + composer
 * onderaan. De composer is alleen actief wanneer Surface gepauzeerd is —
 * anders typt de bot en de owner door elkaar heen.
 */
export function WhatsAppPane({
  leadId,
  leadNaam,
  berichten,
  botPaused,
}: {
  leadId: string
  leadNaam: string
  berichten: Bericht[]
  botPaused: boolean
}) {
  const { run, pending, error } = useBotAction(
    `/api/dashboard/lead/${leadId}/bot-pauzeren`,
  )
  const onTogglePause = () => run({ paused: !botPaused })

  return (
    <div className={styles.pane}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <MessageCircle size={16} />
          <div>
            <div className={styles.title}>{leadNaam}</div>
            <div className={styles.sub}>
              {botPaused ? 'gepauzeerd · jij antwoordt' : 'online · via Surface bot'}
            </div>
          </div>
        </div>
        <LeadDetailRealtime leadId={leadId} />
      </div>

      <LeadConversation berichten={berichten} />

      <div className={styles.footer}>
        <div className={styles.footerLeft}>
          <Bot size={14} className={styles.footerIcon} />
          <span className={styles.footerText}>
            {botPaused ? (
              <>
                <strong>Jij neemt over.</strong> Surface staat stil tot je hervat.
              </>
            ) : (
              <>
                <strong>Surface antwoordt automatisch.</strong> Wil je zelf overnemen?
              </>
            )}
          </span>
          {error && <span style={{ color: 'var(--color-danger)', fontSize: 12 }}>{error}</span>}
        </div>
        <button
          type="button"
          className={styles.footerBtn}
          onClick={onTogglePause}
          disabled={pending}
        >
          {botPaused ? <Play size={12} style={{ marginRight: 4 }} /> : <Pause size={12} style={{ marginRight: 4 }} />}
          {pending ? 'Bezig…' : botPaused ? 'Hervatten' : 'Pauzeren'}
        </button>
      </div>

      <WhatsAppComposer leadId={leadId} botPaused={botPaused} />
    </div>
  )
}
