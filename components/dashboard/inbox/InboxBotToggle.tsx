'use client'

import { Pause, Play } from 'lucide-react'
import { useBotAction } from '@/components/dashboard/bot-actions/use-bot-action'
import styles from './InboxBotToggle.module.css'

/**
 * Klikbare pill in de inbox-header: schakelt de bot aan/uit voor deze lead.
 * Gebruikt dezelfde proxy-route als de lead-detail-pagina
 * (`/api/dashboard/lead/<id>/bot-pauzeren`), dus state blijft consistent
 * tussen beide views.
 *
 * Visueel: groen wanneer bot actief, oranje wanneer gepauzeerd, pill-shape
 * past in dezelfde threadHead-rij als voorheen.
 */
export function InboxBotToggle({
  leadId,
  botPaused,
}: {
  leadId: string
  botPaused: boolean
}) {
  const { run, pending } = useBotAction(
    `/api/dashboard/lead/${leadId}/bot-pauzeren`,
  )

  const onClick = () => {
    run({ paused: !botPaused })
  }

  return (
    <button
      type="button"
      className={`${styles.pill} ${botPaused ? styles.paused : styles.active}`}
      onClick={onClick}
      disabled={pending}
      title={
        botPaused
          ? 'Klik om de bot weer te activeren'
          : 'Klik om de bot te pauzeren en handmatig over te nemen'
      }
    >
      <span className={styles.dot} />
      {pending ? (
        <span>Bezig…</span>
      ) : botPaused ? (
        <>
          <Play size={11} />
          <span>Bot gepauzeerd, hervatten</span>
        </>
      ) : (
        <>
          <Pause size={11} />
          <span>Bot actief, pauzeren</span>
        </>
      )}
    </button>
  )
}
