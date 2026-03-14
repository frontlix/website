'use client'

import { useState } from 'react'
import { Mail, Phone, MapPin } from 'lucide-react'
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
    icon: Phone,
    label: 'Telefoon',
    value: '+31 6 12345678',
    href: 'tel:+31612345678',
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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <div className={styles.wrapper}>
      {/* Left: contact info */}
      <div className={styles.infoColumn}>
        <h2 className={styles.infoTitle}>Laten we kennismaken</h2>
        <p className={styles.infoText}>
          Heb je een project in gedachten of wil je gewoon eens praten over de
          mogelijkheden? Stuur ons een bericht — we reageren binnen één
          werkdag.
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
            Bedankt voor je bericht! We nemen zo snel mogelijk contact op.
          </div>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit} noValidate>
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
                />
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="onderwerp" className={styles.label}>
                Onderwerp
              </label>
              <input
                type="text"
                id="onderwerp"
                name="onderwerp"
                placeholder="Waar gaat het over?"
                required
                className={styles.input}
              />
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
              />
            </div>

            <div className={styles.submitRow}>
              <Button type="submit" variant="primary" size="lg" fullWidth>
                Verstuur bericht →
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
