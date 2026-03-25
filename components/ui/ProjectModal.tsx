'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
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
        setVoornaam('')
        setAchternaam('')
        setTelefoon('')
        setBedrijfsnaam('')
        setEmail('')
        setWebsite('')
        setExtra('')
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
                  required
                />
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
                  required
                />
              </div>

              {/* Bedrijfsnaam */}
              <div className={styles.field}>
                <label htmlFor="project-bedrijf" className={styles.label}>
                  Bedrijfsnaam
                </label>
                <input
                  id="project-bedrijf"
                  type="text"
                  className={styles.input}
                  placeholder="Naam van je bedrijf"
                  value={bedrijfsnaam}
                  onChange={(e) => setBedrijfsnaam(e.target.value)}
                  required
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
                />
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
    </div>
  )
}
