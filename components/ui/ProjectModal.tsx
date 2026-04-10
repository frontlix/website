'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { validatePhone } from '@/lib/utils'
import { useFormTracking } from '@/hooks/useFormTracking'
import styles from './ProjectModal.module.css'

interface ProjectModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function ProjectModal({ isOpen, onClose }: ProjectModalProps) {
  const [voornaam, setVoornaam] = useState('')
  const [achternaam, setAchternaam] = useState('')
  const [telefoon, setTelefoon] = useState('')
  const [bedrijfsnaam, setBedrijfsnaam] = useState('')
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [extra, setExtra] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /* Per-veld validatiefouten */
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const getFieldData = useCallback(
    () => ({ voornaam, achternaam, telefoon, email, bedrijfsnaam, website, extra }),
    [voornaam, achternaam, telefoon, email, bedrijfsnaam, website, extra]
  )
  const { trackBlur, markCompleted } = useFormTracking({
    formName: 'project',
    getFieldData,
    isSubmitted: submitted,
  })

  /* Bewaar scrollpositie in een ref zodat deze niet verloren gaat */
  const scrollYRef = useRef(0)

  /* Sluit modal met Escape + voorkom body scroll op mobiel */
  useEffect(() => {
    if (!isOpen) return

    /* Sla huidige scrollpositie op */
    scrollYRef.current = window.scrollY

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    /* position: fixed voorkomt iOS Safari bounce-scroll bug */
    document.body.style.position = 'fixed'
    document.body.style.width = '100%'
    document.body.style.top = `-${scrollYRef.current}px`

    return () => {
      document.removeEventListener('keydown', handleKey)
      /* Herstel body styles */
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
      document.body.style.top = ''
      /* Herstel scrollpositie */
      window.scrollTo(0, scrollYRef.current)
    }
  }, [isOpen, onClose])

  /* Reset formulier bij sluiten */
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setVoornaam('')
        setAchternaam('')
        setTelefoon('')
        setBedrijfsnaam('')
        setEmail('')
        setWebsite('')
        setExtra('')
        setSubmitted(false)
        setError(null)
        setFieldErrors({})
      }, 200)
    }
  }, [isOpen])

  if (!isOpen) return null

  /** Validatie-helpers */
  const validateFields = (): boolean => {
    const errors: Record<string, string> = {}

    /* Telefoonnummer: moet een geldig Nederlands nummer zijn */
    if (!validatePhone(telefoon)) {
      errors.telefoon = 'Vul een geldig Nederlands telefoonnummer in (bijv. 06 1234 5678).'
    }

    /* E-mailadres: basis format-check */
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      errors.email = 'Vul een geldig e-mailadres in (bijv. naam@bedrijf.nl).'
    }

    /* Website URL: alleen valideren als het veld is ingevuld */
    if (website.trim()) {
      try {
        const url = new URL(
          website.startsWith('http') ? website : `https://${website}`
        )
        /* Controleer of er een geldig domein met extensie is */
        if (!url.hostname.includes('.')) {
          errors.website = 'Vul een geldige website-URL in (bijv. https://jouwbedrijf.nl).'
        }
      } catch {
        errors.website = 'Vul een geldige website-URL in (bijv. https://jouwbedrijf.nl).'
      }
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    /* Client-side validatie — stop als er fouten zijn */
    if (!validateFields()) return

    setLoading(true)

    try {
      const res = await fetch('/api/project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voornaam, achternaam, telefoon, email, bedrijfsnaam, website, extra }),
      })

      const result = await res.json()

      if (!res.ok || !result.success) {
        setError(result.message || 'Er is een fout opgetreden.')
        return
      }

      setSubmitted(true)
      markCompleted()
    } catch {
      setError('Kan geen verbinding maken. Probeer het later opnieuw.')
    } finally {
      setLoading(false)
    }
  }

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.close} onClick={onClose} aria-label="Sluiten">
          <X size={20} />
        </button>

        {submitted ? (
          <div className={styles.success}>
            <div className={styles.successIcon}>✓</div>
            <h3 className={styles.successHeading}>Aanvraag verstuurd!</h3>
            <p className={styles.successText}>
              Bedankt voor je interesse. We nemen zo snel mogelijk contact met je op
              om je project te bespreken.
            </p>
          </div>
        ) : (
          <>
            <h2 className={styles.heading}>Start jouw project</h2>
            <p className={styles.subtext}>
              Vul je gegevens in en wij nemen zo snel mogelijk contact met je op.
            </p>

            <form className={styles.form} onSubmit={handleSubmit}>
              {/* Voornaam + Achternaam naast elkaar */}
              <div className={styles.row}>
                <div className={styles.field}>
                  <label htmlFor="project-voornaam" className={styles.label}>
                    Voornaam
                  </label>
                  <input
                    id="project-voornaam"
                    type="text"
                    className={styles.input}
                    placeholder="Voornaam"
                    value={voornaam}
                    onChange={(e) => setVoornaam(e.target.value)}
                    onBlur={trackBlur}
                    required
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="project-achternaam" className={styles.label}>
                    Achternaam
                  </label>
                  <input
                    id="project-achternaam"
                    type="text"
                    className={styles.input}
                    placeholder="Achternaam"
                    value={achternaam}
                    onChange={(e) => setAchternaam(e.target.value)}
                    onBlur={trackBlur}
                    required
                  />
                </div>
              </div>

              {/* Telefoonnummer */}
              <div className={styles.field}>
                <label htmlFor="project-telefoon" className={styles.label}>
                  Telefoonnummer
                </label>
                <input
                  id="project-telefoon"
                  type="tel"
                  className={styles.input}
                  placeholder="+31 6 1234 5678"
                  value={telefoon}
                  onChange={(e) => setTelefoon(e.target.value)}
                  onBlur={trackBlur}
                  required
                />
                {fieldErrors.telefoon && (
                  <span className={styles.fieldError}>{fieldErrors.telefoon}</span>
                )}
              </div>

              {/* E-mailadres */}
              <div className={styles.field}>
                <label htmlFor="project-email" className={styles.label}>
                  E-mailadres
                </label>
                <input
                  id="project-email"
                  type="email"
                  className={styles.input}
                  placeholder="naam@bedrijf.nl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={trackBlur}
                  required
                />
                {fieldErrors.email && (
                  <span className={styles.fieldError}>{fieldErrors.email}</span>
                )}
              </div>

              {/* Bedrijfsnaam — optioneel */}
              <div className={styles.field}>
                <label htmlFor="project-bedrijf" className={styles.label}>
                  Bedrijfsnaam <span className={styles.optional}>(optioneel)</span>
                </label>
                <input
                  id="project-bedrijf"
                  type="text"
                  className={styles.input}
                  placeholder="Naam van je bedrijf"
                  value={bedrijfsnaam}
                  onChange={(e) => setBedrijfsnaam(e.target.value)}
                  onBlur={trackBlur}
                />
              </div>

              {/* Website URL — optioneel */}
              <div className={styles.field}>
                <label htmlFor="project-website" className={styles.label}>
                  Website URL <span className={styles.optional}>(optioneel)</span>
                </label>
                <input
                  id="project-website"
                  type="url"
                  className={styles.input}
                  placeholder="https://jouwbedrijf.nl"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  onBlur={trackBlur}
                />
                {fieldErrors.website && (
                  <span className={styles.fieldError}>{fieldErrors.website}</span>
                )}
              </div>

              {/* Extra informatie — optioneel */}
              <div className={styles.field}>
                <label htmlFor="project-extra" className={styles.label}>
                  Extra informatie <span className={styles.optional}>(optioneel)</span>
                </label>
                <textarea
                  id="project-extra"
                  className={styles.textarea}
                  placeholder="Vertel ons meer over je project, wensen of vragen..."
                  value={extra}
                  onChange={(e) => setExtra(e.target.value)}
                  onBlur={trackBlur}
                  rows={4}
                />
              </div>

              {error && <p className={styles.error}>{error}</p>}

              <button type="submit" className={styles.submit} disabled={loading}>
                {loading ? 'Versturen...' : 'Verstuur aanvraag →'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}
