'use client'

import { useState, useCallback } from 'react'
import { validatePhone } from '@/lib/utils'
import { useFormTracking } from '@/hooks/useFormTracking'
import styles from './DemoPhoneForm.module.css'

interface DemoPhoneFormProps {
  personalizedDemoId: string
}

export default function DemoPhoneForm({ personalizedDemoId }: DemoPhoneFormProps) {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const getFieldData = useCallback(() => ({ phone }), [phone])
  const { trackBlur, markCompleted } = useFormTracking({
    formName: 'personalized_demo',
    getFieldData,
    isSubmitted: success,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!phone.trim()) {
      setError('Vul je telefoonnummer in.')
      return
    }

    const normalized = validatePhone(phone.trim())
    if (!normalized) {
      setError('Vul een geldig mobiel nummer in (bijv. 06 12345678).')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/demo-chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telefoon: normalized,
          personalized_demo_id: personalizedDemoId,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Er ging iets mis.')
        return
      }

      setSuccess(true)
      markCompleted()
    } catch {
      setError('Verbindingsfout. Probeer het opnieuw.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className={styles.success}>
        <div className={styles.successIcon}>✓</div>
        <p className={styles.successText}>
          Check je WhatsApp! De demo is onderweg.
        </p>
      </div>
    )
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.inputRow}>
        <label htmlFor="demo-phone" className="sr-only">
          Telefoonnummer
        </label>
        <input
          id="demo-phone"
          type="tel"
          className={styles.input}
          placeholder="Vul je mobiele nummer in"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onBlur={trackBlur}
        />
        <button type="submit" className={styles.button} disabled={loading}>
          {loading ? 'Bezig...' : 'Start de demo'}
        </button>
      </div>
      {error && <p className={styles.error}>{error}</p>}
    </form>
  )
}
