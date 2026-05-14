'use client'

import { useState, useTransition } from 'react'
import { toggleServiceOffering } from '@/lib/dashboard/service-offerings-actions'
import styles from './ServiceOfferingToggle.module.css'

/**
 * Aan/uit toggle voor een dienst in /instellingen → Diensten aanbod.
 *
 * Optimistic UI: switch flipt direct, fout → rolt terug + toont melding.
 * Bot pikt de wijziging op via de "Vernieuw bot-config" knop bovenin de
 * settings-pagina (of automatisch op de volgende lead-binnenkomst).
 */
export function ServiceOfferingToggle({
  dienstKey,
  label,
  initialActief,
}: {
  dienstKey: string
  label: string
  initialActief: boolean
}) {
  const [actief, setActief] = useState(initialActief)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const onToggle = () => {
    if (pending) return
    const next = !actief
    setActief(next) // optimistic
    setError(null)
    startTransition(async () => {
      const result = await toggleServiceOffering(dienstKey, next)
      if (!result.ok) {
        setActief(!next) // rollback
        setError(result.error)
      }
    })
  }

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        role="switch"
        aria-checked={actief}
        aria-label={`${label} ${actief ? 'uitzetten' : 'aanzetten'}`}
        onClick={onToggle}
        disabled={pending}
        className={`${styles.switch} ${actief ? styles.on : styles.off}`}
        title={actief ? 'Klik om uit te zetten' : 'Klik om aan te zetten'}
      >
        <span className={styles.knob} />
      </button>
      <span className={`${styles.status} ${actief ? styles.statusOn : styles.statusOff}`}>
        {actief ? 'Actief' : 'Uit'}
      </span>
      {error && <span className={styles.error}>{error}</span>}
    </div>
  )
}
