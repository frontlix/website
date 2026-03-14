import type { Metadata } from 'next'
import ContactForm from '@/components/sections/ContactForm'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Contact | Frontlix',
  description:
    'Neem contact op met Frontlix. Plan een gratis gesprek en ontdek hoe wij jouw digitale aanwezigheid kunnen versterken.',
}

export default function ContactPage() {
  return (
    <>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.label}>Contact</span>
          <h1 className={styles.heroHeading}>Neem contact op</h1>
          <p className={styles.heroSubtext}>
            Heb je een project in gedachten? Of wil je gewoon eens praten over
            de mogelijkheden? We horen graag van je.
          </p>
        </div>
      </section>

      {/* Form section */}
      <section className={styles.formSection}>
        <ContactForm />
      </section>
    </>
  )
}
