import type { Metadata } from 'next'
import ContactForm from '@/components/sections/ContactForm'
import { buildBreadcrumbSchema } from '@/lib/breadcrumb-schema'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Contact | Frontlix',
  description:
    'Neem contact op met Frontlix voor een gratis kennismakingsgesprek. Ontdek hoe wij jouw leadopvolging automatiseren via WhatsApp — binnen 24 uur reactie.',
  alternates: {
    canonical: '/contact',
    languages: { nl: '/contact' },
  },
  openGraph: {
    title: 'Contact | Frontlix',
    description:
      'Neem contact op met Frontlix voor een gratis kennismakingsgesprek. Ontdek hoe wij jouw leadopvolging automatiseren via WhatsApp — binnen 24 uur reactie.',
    url: '/contact',
    locale: 'nl_NL',
  },
}

const breadcrumbSchema = buildBreadcrumbSchema([
  { name: 'Home', url: 'https://frontlix.com' },
  { name: 'Contact', url: 'https://frontlix.com/contact' },
])

export default function ContactPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.label}>Contact</span>
          <h1 className={styles.heroHeading}>Laten we jouw project bespreken</h1>
          <p className={styles.heroSubtext}>
            Plan een vrijblijvend gesprek. We reageren binnen 24 uur.
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
