'use client'

import { useState, useCallback } from 'react'
import { validatePhone } from '@/lib/utils'
import { useFormTracking } from '@/hooks/useFormTracking'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { BGPattern } from '@/components/ui/bg-pattern'
import LeadDemo from '@/components/sections/LeadDemo'
import ProjectModal from '@/components/ui/ProjectModal'
import styles from './Hero.module.css'

export default function Hero() {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [projectModalOpen, setProjectModalOpen] = useState(false)

  const getFieldData = useCallback(() => ({ phone }), [phone])
  const { trackBlur, markCompleted } = useFormTracking({
    formName: 'hero_demo',
    getFieldData,
    isSubmitted: success,
  })

  async function handleDemoSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!phone.trim()) {
      setError('Vul je telefoonnummer in.')
      return
    }

    const normalized = validatePhone(phone.trim())
    if (!normalized) {
      setError('Vul een geldig mobiel nummer in.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/demo-chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefoon: normalized }),
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

  return (
    <section className={styles.hero}>
      <BGPattern variant="grid" mask="fade-edges" fill="rgba(37,99,235,0.15)" size={32} />
      <div className={styles.inner}>
        {/* Text content */}
        <div className={styles.content}>
          <div className={styles.badge}>
            <Badge variant="default" dot>
              Automatische leadopvolging via WhatsApp
            </Badge>
          </div>

          <h1 className={styles.heading}>
            Jij bent aan het werk.
            <br />
            <span className={styles.headingBlue}>Jouw leads worden al opgevolgd.</span>
          </h1>

          <p className={styles.subtext}>
            Binnen 60 seconden reageert ons systeem op elke nieuwe lead via
            WhatsApp, persoonlijk, automatisch en met een kant-en-klare offerte.
          </p>

          <div className={styles.ctas}>
            <Button variant="primary" size="lg" onClick={() => setProjectModalOpen(true)}>
              <span className={styles.ctaTextMobile}>→ Gratis kennismakingsgesprek</span>
              <span className={styles.ctaTextDesktop}>→ Plan een gratis kennismakingsgesprek</span>
            </Button>

            <div className={styles.whatsappBlock}>
            <p className={styles.whatsappLabel}>→ Ontvang de demo op WhatsApp</p>
            {success ? (
              <p className={styles.successMessage}>Check je WhatsApp! De demo is onderweg.</p>
            ) : (
            <form
              className={styles.phoneForm}
              onSubmit={handleDemoSubmit}
            >
              <label htmlFor="hero-phone" className="sr-only">Telefoonnummer</label>
              <input
                id="hero-phone"
                type="tel"
                className={`${styles.phoneInput} ${validatePhone(phone.trim()) ? styles.phoneInputValid : ''}`}
                placeholder="Vul je nummer in"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value)
                  // D1: foutmelding verdwijnt zodra user begint te typen
                  if (error) setError('')
                }}
                onBlur={trackBlur}
              />
              <button type="submit" className={styles.phoneButton} disabled={loading}>
                {loading ? 'Bezig...' : (<><span className={styles.lockIcon}>🔒</span> Ontvang demo</>)}
              </button>
              {error && <p className={styles.errorMessage}>{error}</p>}
            </form>
            )}
            </div>
          </div>

          <div className={styles.proofBar}>
            <span className={styles.proofItem}><span className={styles.check}>✓</span> Op maat gebouwd</span>
            <span className={`${styles.proofItem} ${styles.proofItemDesktop}`}><span className={styles.check}>✓</span> Binnen 2-3 weken live</span>
            <span className={`${styles.proofItem} ${styles.proofItemDesktop}`}><span className={styles.check}>✓</span> Geen technische kennis nodig</span>
            <span className={styles.proofItem}><span className={styles.check}>✓</span> Free trial</span>
          </div>
        </div>

        {/* Lead kwalificatie demo */}
        <div className={styles.demoWrapper}>
          <LeadDemo />
        </div>
      </div>
      <ProjectModal isOpen={projectModalOpen} onClose={() => setProjectModalOpen(false)} />
    </section>
  )
}
