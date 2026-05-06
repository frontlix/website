import type { Lead } from '@/lib/dashboard/database.types'
import { dashboardStatusLabel, gesprekFaseLabel } from '@/lib/dashboard/format'
import styles from './LeadStatusBadges.module.css'

export function LeadStatusBadges({ lead }: { lead: Lead }) {
  return (
    <div className={styles.badges}>
      <div className={styles.row}>
        <span className={styles.label}>Bot-status</span>
        <span className={styles.value}>{lead.status}</span>
      </div>
      <div className={styles.row}>
        <span className={styles.label}>Gesprek-fase</span>
        <span className={styles.value}>{gesprekFaseLabel(lead.gesprek_fase)}</span>
      </div>
      <div className={styles.row}>
        <span className={styles.label}>Dashboard-status</span>
        <span className={styles.value}>{dashboardStatusLabel(lead.dashboard_status)}</span>
      </div>
    </div>
  )
}
