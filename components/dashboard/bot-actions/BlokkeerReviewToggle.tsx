'use client'

import { useState } from 'react'
import { useBotAction } from './use-bot-action'
import styles from './BotActions.module.css'

/**
 * Toggle voor `klus_geblokkeerd`. Wanneer aan, slaat de review-cron deze lead
 * over bij het 2-dagen-na-klus reviewverzoek. Optimistic update, bij failure
 * draaien we de UI-stand terug en tonen we de error.
 */
export function BlokkeerReviewToggle({
  leadId,
  initialBlocked,
}: {
  leadId: string
  initialBlocked: boolean
}) {
  const [blocked, setBlocked] = useState(initialBlocked)
  const { run, pending, error } = useBotAction(
    `/api/dashboard/lead/${leadId}/klus-status`,
  )

  const onToggle = () => {
    const next = !blocked
    setBlocked(next) // optimistic
    run({ klus_geblokkeerd: next }, undefined)
  }

  // Bij error: setBlocked terugdraaien. useBotAction's error blijft hangen,
  // dus we lezen het in een effect-vrije check.
  if (error && blocked === !initialBlocked) {
    setBlocked(initialBlocked)
  }

  return (
    <>
      <div className={styles.toggleRow}>
        <div>
          <div style={{ fontWeight: 600 }}>Blokkeer review-verzoek</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            Surface stuurt geen NPS-vraag na deze klus
          </div>
        </div>
        <button
          type="button"
          className={styles.toggleSwitch}
          data-on={blocked ? 'true' : 'false'}
          onClick={onToggle}
          disabled={pending}
          aria-label={blocked ? 'Reviewverzoek deblokkeren' : 'Reviewverzoek blokkeren'}
        />
      </div>
      {error && <p className={styles.error}>{error}</p>}
    </>
  )
}
