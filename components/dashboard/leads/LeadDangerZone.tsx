'use client'

import { useState, useTransition } from 'react'
import { archiveLead, unarchiveLead } from '@/lib/dashboard/lead-actions'
import styles from './LeadDangerZone.module.css'

export function LeadDangerZone({
  leadId,
  archived,
}: {
  leadId: string
  archived: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const onToggle = () => {
    if (
      !confirm(
        archived
          ? 'Lead terugzetten naar de hoofdlijst?'
          : 'Lead archiveren? Hij verdwijnt uit de hoofdlijst (data blijft bewaard).'
      )
    ) {
      return
    }
    setError(null)
    startTransition(async () => {
      const result = archived
        ? await unarchiveLead(leadId)
        : await archiveLead(leadId)
      if (!result.ok) setError(result.error)
    })
  }

  return (
    <div className={styles.section}>
      <h3 className={styles.heading}>Acties</h3>
      <button
        type="button"
        className={styles.button}
        onClick={onToggle}
        disabled={pending}
      >
        {pending ? 'Bezig…' : archived ? 'Uit archief halen' : 'Archiveren'}
      </button>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  )
}
