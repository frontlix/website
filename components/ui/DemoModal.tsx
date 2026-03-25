'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import styles from './DemoModal.module.css'

interface DemoModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function DemoModal({ isOpen, onClose }: DemoModalProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /* Sluit modal met Escape */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKey)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  /* Reset formulier bij sluiten */
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setName('')
        setEmail('')
        setPhone('')
        setSubmitted(false)
        setError(null)
      }, 200)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ naam: name, email, telefoon: phone }),
      })

      const result = await res.json()

      if (!res.ok || !result.success) {
        setError(result.message || 'Er is een fout opgetreden.')
        return
      }

      setSubmitted(true)
    } catch {
      setError('Kan geen verbinding maken. Probeer het later opnieuw.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.close} onClick={onClose} aria-label="Sluiten">
          <X size={20} />
        </button>

        {submitted ? (
          <div className={styles.success}>
            <div className={styles.successIcon}>✓</div>
            <h3 className={styles.successHeading}>Aanvraag verstuurd</h3>
            <p className={styles.successText}>
              We nemen zo snel mogelijk contact met je op om de demo in te plannen.
            </p>
          </div>
        ) : (
          <>
            <h2 className={styles.heading}>Ontvang een gratis demo</h2>
            <p className={styles.subtext}>
              Vul je gegevens in en wij laten je zien hoe automatische
              leadopvolging werkt voor jouw bedrijf.
            </p>

            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.field}>
                <label htmlFor="demo-name" className={styles.label}>Naam</label>
                <input
                  id="demo-name"
                  type="text"
                  className={styles.input}
                  placeholder="Je volledige naam"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="demo-email" className={styles.label}>E-mailadres</label>
                <input
                  id="demo-email"
                  type="email"
                  className={styles.input}
                  placeholder="naam@bedrijf.nl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="demo-phone" className={styles.label}>Telefoonnummer</label>
                <input
                  id="demo-phone"
                  type="tel"
                  className={styles.input}
                  placeholder="+31 6 1234 5678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>

              {error && <p className={styles.error}>{error}</p>}

              <button type="submit" className={styles.submit} disabled={loading}>
                {loading ? 'Versturen...' : 'Demo aanvragen →'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
