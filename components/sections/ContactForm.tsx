'use client'

import { useState } from 'react'
import { Mail, MessageCircle, Phone, MapPin, CheckCircle } from 'lucide-react'
import Button from '@/components/ui/Button'
import styles from './ContactForm.module.css'

const contactInfo = [
  {
    icon: Mail,
    label: 'E-mail',
    value: 'info@frontlix.nl',
    href: 'mailto:info@frontlix.nl',
  },
  {
    icon: MessageCircle,
    label: 'WhatsApp',
    value: 'Stuur een berichtje',
    href: 'https://wa.me/31624752476',
  },
  {
    icon: Phone,
    label: 'Telefoon',
    value: '+31 6 24752476',
    href: 'tel:+31624752476',
  },
  {
    icon: MapPin,
    label: 'Locatie',
    value: 'Nederland',
    href: '#',
  },
]

export default function ContactForm() {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const data = {
      voornaam: formData.get('voornaam') as string,
      achternaam: formData.get('achternaam') as string,
      telefoon: formData.get('telefoon') as string,
      email: formData.get('email') as string,
      bedrijfsnaam: formData.get('bedrijfsnaam') as string,
      website: formData.get('website') as string,
      bericht: formData.get('bericht') as string,
    }

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
          Geen formulieren-fan? Stuur een e-mail of bel ons. We denken graag
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
                  <a href={item.href} className={styles.contactItemValue}>
                    {item.value}
                  </a>
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
          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            {/* Voornaam + Achternaam */}
            <div className={styles.formRow}>
              <div className={styles.fieldGroup}>
                <label htmlFor="voornaam" className={styles.label}>
                  Voornaam
                </label>
                <input
                  type="text"
                  id="voornaam"
                  name="voornaam"
                  placeholder="Voornaam"
                  required
                  className={styles.input}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label htmlFor="achternaam" className={styles.label}>
                  Achternaam
                </label>
                <input
                  type="text"
                  id="achternaam"
                  name="achternaam"
                  placeholder="Achternaam"
                  required
                  className={styles.input}
                />
              </div>
            </div>

            {/* Telefoon + E-mail */}
            <div className={styles.formRow}>
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
                  placeholder="naam@bedrijf.nl"
                  required
                  className={styles.input}
                />
              </div>
            </div>

            {/* Bedrijfsnaam */}
            <div className={styles.fieldGroup}>
              <label htmlFor="bedrijfsnaam" className={styles.label}>
                Bedrijfsnaam
              </label>
              <input
                type="text"
                id="bedrijfsnaam"
                name="bedrijfsnaam"
                placeholder="Naam van je bedrijf"
                required
                className={styles.input}
              />
            </div>

            {/* Website — optioneel */}
            <div className={styles.fieldGroup}>
              <label htmlFor="website" className={styles.label}>
                Website URL <span className={styles.optional}>(optioneel)</span>
              </label>
              <input
                type="url"
                id="website"
                name="website"
                placeholder="https://jouwbedrijf.nl"
                className={styles.input}
              />
            </div>

            {/* Bericht — optioneel */}
            <div className={styles.fieldGroup}>
              <label htmlFor="bericht" className={styles.label}>
                Bericht <span className={styles.optional}>(optioneel)</span>
              </label>
              <textarea
                id="bericht"
                name="bericht"
                placeholder="Vertel ons meer over je project, wensen of vragen..."
                className={styles.textarea}
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
