'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { Check, AlertCircle } from 'lucide-react'
import { updatePricingRule } from '@/lib/dashboard/pricing-actions'
import styles from './PricingRuleEditor.module.css'

type Status = 'idle' | 'pending' | 'saved' | 'error'

/**
 * Inline-editor voor één prijsregel. Toont een number-achtige input + de
 * eenheid; slaat automatisch op bij blur (geen extra knop). Strategie:
 *  - Tijdens typen: lokale string-state, server wordt niet gebeld.
 *  - Bij blur: parse → vergelijk met committed → indien gewijzigd, save.
 *  - Optimistic: committed-value verandert direct, dus de waarde "plakt"
 *    al voor de server reageert. Bij error → revert + foutmelding.
 *  - "Saved" indicator (checkmark) flasht ~1.5s en fade out.
 *
 * Europees formaat: punt én komma als decimaal-scheider geaccepteerd.
 * Weergave gebruikt komma (nl-NL standaard).
 */
export function PricingRuleEditor({
  ruleKey,
  eenheid,
  initialValue,
}: {
  ruleKey: string
  eenheid: string | null
  initialValue: number
}) {
  const [committed, setCommitted] = useState<number>(initialValue)
  const [display, setDisplay] = useState<string>(formatForDisplay(initialValue))
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  // Saved-flash automatisch laten verdwijnen na 1,5s.
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (status !== 'saved') return
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
    flashTimerRef.current = setTimeout(() => setStatus('idle'), 1500)
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
    }
  }, [status])

  const handleBlur = () => {
    const parsed = parseValue(display)
    if (parsed === null) {
      // Ongeldige input → terug naar laatst opgeslagen waarde.
      setDisplay(formatForDisplay(committed))
      setErrorMsg('Ongeldig getal')
      setStatus('error')
      return
    }
    // Geen verandering → niets doen, formatteer netjes terug.
    if (Math.abs(parsed - committed) < 1e-9) {
      setDisplay(formatForDisplay(committed))
      return
    }

    // Optimistic update — committed gaat direct mee, save loopt asynchroon.
    const previous = committed
    setCommitted(parsed)
    setDisplay(formatForDisplay(parsed))
    setStatus('pending')
    setErrorMsg(null)

    startTransition(async () => {
      const res = await updatePricingRule(ruleKey, parsed)
      if (res.ok) {
        setStatus('saved')
      } else {
        // Revert
        setCommitted(previous)
        setDisplay(formatForDisplay(previous))
        setErrorMsg(res.error)
        setStatus('error')
      }
    })
  }

  return (
    <div className={`${styles.wrap} ${statusClass(status, styles)}`}>
      <input
        type="text"
        inputMode="decimal"
        className={styles.input}
        value={display}
        onChange={(e) => {
          setDisplay(e.target.value)
          if (status === 'error') setStatus('idle')
        }}
        onBlur={handleBlur}
        aria-label={`Waarde voor ${ruleKey}`}
      />
      {eenheid && <span className={styles.eenheid}>{eenheid}</span>}
      {status === 'pending' && <span className={styles.spinner} aria-hidden="true" />}
      {status === 'saved' && <Check size={12} className={styles.savedIcon} aria-label="Opgeslagen" />}
      {status === 'error' && errorMsg && (
        <span className={styles.errorMsg}>
          <AlertCircle size={12} /> {errorMsg}
        </span>
      )}
    </div>
  )
}

function statusClass(status: Status, s: { [k: string]: string }): string {
  switch (status) {
    case 'pending': return s.pending
    case 'saved':   return s.saved
    case 'error':   return s.errorState
    default:        return ''
  }
}

function formatForDisplay(n: number): string {
  // Toon zonder onnodige decimalen, met komma als scheider.
  // 3 → "3", 3.5 → "3,5", 3.95 → "3,95"
  return n.toLocaleString('nl-NL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

function parseValue(s: string): number | null {
  const trimmed = s.trim()
  if (!trimmed) return null
  // Accepteer "3,95" en "3.95" — vervang komma door punt vóór parse.
  // Strip duizendtal-separators (zelden gebruikt in prijslijsten, maar
  // veiligheid: een typo als "1.000,50" wordt 1000.50).
  const cleaned = trimmed.replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')
  const n = Number(cleaned)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}
