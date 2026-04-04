'use client'

import { useState, useRef, useCallback } from 'react'
import { Mail, MessageCircle, Phone, CheckCircle } from 'lucide-react'
import { validatePhone } from '@/lib/utils'
import { useFormTracking } from '@/hooks/useFormTracking'
import Button from '@/components/ui/Button'
import styles from './ContactForm.module.css'

const contactInfo = [
  {
    icon: Mail,
    label: 'E-mail',
    value: 'info@frontlix.com',
    href: 'mailto:info@frontlix.com',
  },
  {
    icon: MessageCircle,
    label: 'WhatsApp',
    value: 'Stuur een berichtje',
    href: 'https://wa.me/31624965270',
  },
  {
    icon: Phone,
    label: 'Telefoon',
    value: '+31 6 24965270',
    href: 'tel:+31624965270',
  },
]

export default function ContactForm() {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /* Per-veld validatiefouten */
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const formRef = useRef<HTMLFormElement>(null)

  const getFieldData = useCallback((): Record<string, string> => {
    if (!formRef.current) return { naam: '', email: '', telefoon: '', bericht: '' }
    const fd = new FormData(formRef.current)
    return {
      naam: (fd.get('naam') as string) || '',
      email: (fd.get('email') as string) || '',
      telefoon: (fd.get('telefoon') as string) || '',
      bericht: (fd.get('bericht') as string) || '',
    }
  }, [])
  const { trackBlur, markCompleted } = useFormTracking({
    formName: 'contact',
    getFieldData,
    isSubmitted: submitted,
  })

  /** Validatie-helper voor het contactformulier */
  const validateFields = (emailVal: string, telefoonVal: string): boolean => {
    const errors: Record<string, string> = {}

    /* E-mailadres: basis format-check */
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailVal)) {
      errors.email = 'Vul een geldig e-mailadres in (bijv. naam@bedrijf.nl).'
    }

    /* Telefoonnummer: moet een geldig Nederlands nummer zijn */
    if (!validatePhone(telefoonVal)) {
      errors.telefoon = 'Vul een geldig Nederlands telefoonnummer in (bijv. 06 1234 5678).'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)
    const data = {
      naam: formData.get('naam') as string,
      email: formData.get('email') as string,
      telefoon: formData.get('telefoon') as string,
      bericht: formData.get('bericht') as string,
    }

    /* Client-side validatie — stop als er fouten zijn */
    if (!validateFields(data.email, data.telefoon)) return

    setLoading(true)

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
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

  return (
    <div className={styles.wrapper}>
      {/* Left: contact info */}
      <div className={styles.infoColumn}>
        <h2 className={styles.infoTitle}>Liever direct contact?</h2>
        <p className={styles.infoText}>
          Geen formulieren fan? Stuur een e-mail of bel ons. We denken graag
          vrijblijvend met je mee.
        </p>

        <div className={styles.contactItems}>
          {contactInfo.map((item) => {
            const Icon = item.icon
            return (
              <div key={item.label} className={styles.contactItem}>
                <div className={styles.contactIcon}>
                  <Icon size={18} />
                </div>
                <div className={styles.contactItemText}>
                  <span className={styles.contactItemLabel}>{item.label}</span>
                  {item.href === '#' ? (
                    <span className={styles.contactItemValueStatic}>
                      {item.value}
                    </span>
                  ) : (
                    <a
                      href={item.href}
                      className={styles.contactItemValue}
                      {...(item.href.startsWith('http') && {
                        target: '_blank',
                        rel: 'noopener noreferrer',
                      })}
                    >
                      {item.value}
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Right: form */}
      <div className={styles.formCard}>
        <h3 className={styles.formTitle}>Stuur ons een bericht</h3>

        {submitted ? (
          <div className={styles.successMessage}>
            <div className={styles.successIcon}>
              <CheckCircle size={48} />
            </div>
            <h4 className={styles.successTitle}>Bericht verstuurd!</h4>
            <p className={styles.successText}>
              Bedankt voor je bericht. We reageren binnen 24 uur op werkdagen.
            </p>
          </div>
        ) : (
          <form ref={formRef} className={styles.form} onSubmit={handleSubmit} noValidate>
            <div className={styles.formRow}>
              <div className={styles.fieldGroup}>
                <label htmlFor="naam" className={styles.label}>
                  Naam
                </label>
                <input
                  type="text"
                  id="naam"
                  name="naam"
                  placeholder="Jouw volledige naam"
                  required
                  className={styles.input}
                  onBlur={trackBlur}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label htmlFor="email" className={styles.label}>
                  E-mail
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="jouw@email.nl"
                  required
                  className={styles.input}
                  onBlur={trackBlur}
                />
                {fieldErrors.email && (
                  <span className={styles.fieldError}>{fieldErrors.email}</span>
                )}
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="telefoon" className={styles.label}>
                Telefoonnummer
              </label>
              <input
                type="tel"
                id="telefoon"
                name="telefoon"
                placeholder="+31 6 1234 5678"
                required
                className={styles.input}
                onBlur={trackBlur}
              />
              {fieldErrors.telefoon && (
                <span className={styles.fieldError}>{fieldErrors.telefoon}</span>
              )}
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="bericht" className={styles.label}>
                Bericht
              </label>
              <textarea
                id="bericht"
                name="bericht"
                placeholder="Vertel ons over jouw project of vraag..."
                required
                className={styles.textarea}
                onBlur={trackBlur}
              />
            </div>

            {error && (
              <p className={styles.errorMessage}>{error}</p>
            )}

            <div className={styles.submitRow}>
              <Button type="submit" variant="primary" size="lg" fullWidth disabled={loading}>
                {loading ? 'Versturen...' : 'Plan een gesprek →'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
