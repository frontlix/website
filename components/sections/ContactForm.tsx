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
    href: 'https://wa.me/31624965270',
  },
  {
    icon: Phone,
    label: 'Telefoon',
    value: '+31 6 24965270',
    href: 'tel:+31624965270',
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
                Plan een gesprek →
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
