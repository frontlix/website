'use client'

// Echte diensten uit service_offerings. Toggle is gewired aan
// toggleServiceOffering(dienst_key, actief): optimistic update + revert bij fout.

import { useState, useTransition } from 'react'
import { AlertTriangle } from 'lucide-react'
import { toggleServiceOffering } from '@/lib/dashboard/service-offerings-actions'
import type { ServiceOffering } from '@/components/dashboard/instellingen/SettingSections'
import { InstGroupCard } from './InstAtoms'
import { MobileToggle } from '../shared/MobileToggle'
import styles from './InstDiensten.module.css'

/** Diensten-detailscherm, toggle per dienst (echt persistent). */
export function InstDiensten({ services }: { services: ServiceOffering[] }) {
  // Lokale state per dienst_key, geseed uit de echte data.
  const [actief, setActief] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(services.map((s) => [s.dienst_key, s.actief])),
  )
  const [error, setError] = useState<string | null>(null)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function handleToggle(dienstKey: string, next: boolean) {
    const prev = actief[dienstKey]
    // Optimistic update.
    setActief((cur) => ({ ...cur, [dienstKey]: next }))
    setError(null)
    setSavingKey(dienstKey)
    startTransition(async () => {
      const res = await toggleServiceOffering(dienstKey, next)
      setSavingKey(null)
      if (!res.ok) {
        // Revert + toon fout.
        setActief((cur) => ({ ...cur, [dienstKey]: prev }))
        setError(res.error)
      }
    })
  }

  return (
    <div className={styles.wrap}>
      <InstGroupCard>
        {services.map((d, i) => (
          <div
            key={d.dienst_key}
            className={styles.row}
            /* last row has no border */
            data-last={i === services.length - 1 || undefined}
          >
            <span className={styles.label}>{d.label}</span>
            <MobileToggle
              on={actief[d.dienst_key] ?? false}
              onChange={(next) => handleToggle(d.dienst_key, next)}
              label={d.label}
            />
          </div>
        ))}
        {services.length === 0 && (
          <div className={styles.row} data-last>
            <span className={styles.label}>Geen diensten gevonden.</span>
          </div>
        )}
      </InstGroupCard>

      {error && (
        <div className={styles.error} role="status">
          <AlertTriangle size={13} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
      {savingKey && !error && <div className={styles.saving}>Opslaan…</div>}
    </div>
  )
}
