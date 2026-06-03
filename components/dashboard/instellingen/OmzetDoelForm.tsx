'use client'

import { useState, useTransition } from 'react'
import { Check, AlertTriangle, Target } from 'lucide-react'
import { saveOmzetDoelMaand } from '@/lib/dashboard/omzet-doel-actions'
import styles from './OmzetDoelForm.module.css'

/**
 * Editable form voor het maand-omzetdoel (`tenant_settings.omzet_doel_maand`).
 *
 * Lege input → NULL in DB (= geen doel ingesteld, placeholder elders).
 * Niet-lege input → integer aantal euros.
 *
 * Volgt het patroon van TenantBaseForm: useState voor lokale waarde,
 * useTransition voor de server-action, inline status (success/error).
 */
export function OmzetDoelForm({
  initialValue,
}: {
  initialValue: number | null
}) {
  const [raw, setRaw] = useState<string>(
    initialValue === null || initialValue === undefined ? '' : String(initialValue),
  )
  const [status, setStatus] = useState<
    { kind: 'idle' } | { kind: 'success'; value: number | null } | { kind: 'error'; message: string }
  >({ kind: 'idle' })
  const [pending, startTransition] = useTransition()

  function submit() {
    setStatus({ kind: 'idle' })
    const trimmed = raw.trim()
    const value = trimmed === '' ? null : Number(trimmed)

    // Client-side guard, server doet ook validatie.
    if (value !== null && (!Number.isFinite(value) || value < 0)) {
      setStatus({ kind: 'error', message: 'Voer een geldig, niet-negatief getal in.' })
      return
    }

    startTransition(async () => {
      const result = await saveOmzetDoelMaand(value)
      if (result.ok) {
        setStatus({ kind: 'success', value: result.value })
      } else {
        setStatus({ kind: 'error', message: result.error })
      }
    })
  }

  return (
    <div className={styles.wrap}>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Maand-omzetdoel</span>
        <div className={styles.inputRow}>
          <span className={styles.prefix} aria-hidden>
            €
          </span>
          <input
            type="number"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder="bv. 25000"
            step={100}
            min={0}
            inputMode="numeric"
            className={styles.input}
            disabled={pending}
          />
        </div>
        <span className={styles.help}>
          Toont de voortgangsring op je mobiele Overzicht. Laat leeg om geen
          doel te tonen.
        </span>
      </label>

      {status.kind === 'success' && (
        <div className={`${styles.statusBox} ${styles.statusOk}`}>
          <Check size={14} />
          <span>
            {status.value === null
              ? 'Doel gewist, er wordt geen ring meer getoond.'
              : `Doel opgeslagen: € ${status.value.toLocaleString('nl-NL')} per maand.`}
          </span>
        </div>
      )}

      {status.kind === 'error' && (
        <div className={`${styles.statusBox} ${styles.statusErr}`}>
          <AlertTriangle size={14} />
          <span>{status.message}</span>
        </div>
      )}

      <div className={styles.actions}>
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="dash-btn dash-btn-primary"
        >
          <Target size={14} style={{ marginRight: 4 }} />
          {pending ? 'Opslaan…' : 'Opslaan'}
        </button>
      </div>
    </div>
  )
}
