'use client'

import { RefreshCw } from 'lucide-react'
import { useBotAction } from './use-bot-action'
import styles from './BotActions.module.css'

/**
 * Forceert een Surface config-reload. Nuttig wanneer iemand handmatig
 * tenant_settings of pricing_rules wijzigt in Studio en de bot direct met
 * de nieuwe waarden moet werken (i.p.v. te wachten op de 60s achtergrondrefresh).
 */
export function BotRefreshButton() {
  const { run, pending, error, success } = useBotAction(
    '/api/dashboard/config/reload',
  )

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <button
        type="button"
        className={styles.actionBtn}
        onClick={() => run()}
        disabled={pending}
      >
        <RefreshCw size={13} />
        {pending ? 'Vernieuwen…' : 'Vernieuw bot-config'}
      </button>
      {error && <span className={styles.error}>{error}</span>}
      {success && <span className={styles.success}>{success}</span>}
    </div>
  )
}
