'use client'

import { useState, useTransition } from 'react'
import type { Lead, DashboardStatus } from '@/lib/dashboard/database.types'
import { dashboardStatusLabel, gesprekFaseLabel } from '@/lib/dashboard/format'
import { setDashboardStatus } from '@/lib/dashboard/lead-actions'
import styles from './LeadStatusBadges.module.css'

const STATUS_OPTIONS: ReadonlyArray<{ value: DashboardStatus | ''; label: string }> = [
  { value: '', label: 'Geen status' },
  { value: 'open', label: 'Open' },
  { value: 'opgevolgd', label: 'Opgevolgd' },
  { value: 'afgehandeld', label: 'Afgehandeld' },
  { value: 'no_show', label: 'No-show' },
  { value: 'geen_interesse', label: 'Geen interesse' },
  { value: 'archief', label: 'Archief' },
]

export function LeadStatusBadges({ lead }: { lead: Lead }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [optimisticStatus, setOptimisticStatus] = useState<DashboardStatus | null>(
    lead.dashboard_status
  )

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value === '' ? null : (e.target.value as DashboardStatus)
    setOptimisticStatus(next)
    setError(null)

    startTransition(async () => {
      const result = await setDashboardStatus(lead.lead_id, next)
      if (!result.ok) {
        setError(result.error)
        // Revert optimistic update
        setOptimisticStatus(lead.dashboard_status)
      }
    })
  }

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
        <label htmlFor="dashboard-status" className={styles.label}>
          Dashboard-status
        </label>
        <select
          id="dashboard-status"
          className={styles.select}
          value={optimisticStatus ?? ''}
          onChange={onChange}
          disabled={pending}
          aria-label="Dashboard-status"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      {pending && <p className={styles.hint}>Bezig met opslaan…</p>}
      {error && <p className={styles.error}>{dashboardStatusLabel(optimisticStatus)} kon niet worden opgeslagen: {error}</p>}
    </div>
  )
}
