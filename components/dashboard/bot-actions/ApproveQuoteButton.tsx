'use client'

import { Send } from 'lucide-react'
import { useBotAction } from './use-bot-action'
import styles from './BotActions.module.css'

/**
 * "Stuur naar klant" knop. Owner approveert de huidige offerte vanuit het
 * dashboard, Surface stuurt vervolgens PDF + bevestigingsmail naar de klant
 * (zelfde flow als wanneer de klant "akkoord" typt in WhatsApp).
 */
export function ApproveQuoteButton({
  leadId,
  versie,
}: {
  leadId: string
  versie: number
}) {
  const { run, pending, error, success } = useBotAction(
    `/api/dashboard/lead/${leadId}/approve-quote`,
  )

  const onClick = () => {
    if (
      !confirm(
        `Offerte v${versie} naar klant sturen via WhatsApp + e-mail?\n\nSurface verstuurt de PDF en bevestigt de bestelling.`,
      )
    ) {
      return
    }
    run()
  }

  return (
    <>
      <button
        type="button"
        className={styles.actionBtn}
        onClick={onClick}
        disabled={pending}
      >
        <Send size={13} />
        {pending ? 'Versturen…' : 'Stuur naar klant'}
      </button>
      {error && <p className={styles.error}>{error}</p>}
      {success && <p className={styles.success}>{success}</p>}
    </>
  )
}
