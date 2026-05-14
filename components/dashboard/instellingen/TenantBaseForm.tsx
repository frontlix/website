'use client'

import { useState, useTransition } from 'react'
import { MapPin, Check, AlertTriangle } from 'lucide-react'
import { saveTenantBase } from '@/lib/dashboard/tenant-base-actions'
import styles from './TenantBaseForm.module.css'

/**
 * Editable form voor de thuisbasis-locatie van de tenant. Bij save:
 * - server-action geocodet postcode+huisnummer via postcode.tech
 * - lat/lng + label worden opgeslagen op `tenant_settings`
 * - routekaart gebruikt deze locatie als vertrekpunt voor alle dag-routes
 *
 * Toont status (success/error) inline zodat de gebruiker weet of de
 * geocoding gelukt is.
 */
export function TenantBaseForm({
  initialPostcode,
  initialHuisnummer,
  initialLabel,
  hasCoords,
  currentLat,
  currentLng,
}: {
  initialPostcode: string
  initialHuisnummer: string
  initialLabel: string
  hasCoords: boolean
  currentLat: number | null
  currentLng: number | null
}) {
  const [postcode, setPostcode] = useState(initialPostcode)
  const [huisnummer, setHuisnummer] = useState(initialHuisnummer)
  const [label, setLabel] = useState(initialLabel)
  const [status, setStatus] = useState<
    | { kind: 'idle' }
    | { kind: 'success'; lat: number; lng: number; city: string | null }
    | { kind: 'error'; message: string }
  >({ kind: 'idle' })
  const [pending, startTransition] = useTransition()

  function submit() {
    setStatus({ kind: 'idle' })
    startTransition(async () => {
      const result = await saveTenantBase({ postcode, huisnummer, label })
      if (result.ok) {
        setStatus({
          kind: 'success',
          lat: result.lat,
          lng: result.lng,
          city: result.city,
        })
      } else {
        setStatus({ kind: 'error', message: result.error })
      }
    })
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.grid}>
        <Field label="Postcode" required>
          <input
            type="text"
            value={postcode}
            onChange={(e) => setPostcode(e.target.value)}
            placeholder="4528 AB"
            className={styles.input}
            disabled={pending}
          />
        </Field>
        <Field label="Huisnummer" required>
          <input
            type="text"
            value={huisnummer}
            onChange={(e) => setHuisnummer(e.target.value)}
            placeholder="5"
            className={styles.input}
            disabled={pending}
          />
        </Field>
        <Field label="Pin-label" full>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="BASIS"
            className={styles.input}
            disabled={pending}
            maxLength={20}
          />
        </Field>
      </div>

      {hasCoords && status.kind === 'idle' && (
        <div className={styles.currentBox}>
          <MapPin size={13} />
          <span>
            Huidige coördinaten:{' '}
            <code className={styles.coords}>
              {currentLat?.toFixed(5)}, {currentLng?.toFixed(5)}
            </code>
          </span>
        </div>
      )}

      {status.kind === 'success' && (
        <div className={`${styles.statusBox} ${styles.statusOk}`}>
          <Check size={14} />
          <span>
            Opgeslagen!{' '}
            {status.city && (
              <>
                Locatie: <strong>{status.city}</strong> ·{' '}
              </>
            )}
            <code className={styles.coords}>
              {status.lat.toFixed(5)}, {status.lng.toFixed(5)}
            </code>
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
          disabled={pending || !postcode.trim() || !huisnummer.trim()}
          className="dash-btn dash-btn-primary"
        >
          {pending ? 'Geocoden…' : 'Opslaan & geocoden'}
        </button>
      </div>
    </div>
  )
}

function Field({
  label,
  required,
  full,
  children,
}: {
  label: string
  required?: boolean
  full?: boolean
  children: React.ReactNode
}) {
  return (
    <label className={`${styles.field} ${full ? styles.fieldFull : ''}`}>
      <span className={styles.fieldLabel}>
        {label}
        {required && <span className={styles.required}>*</span>}
      </span>
      {children}
    </label>
  )
}
