import type { Metadata } from 'next'
import Services from '@/components/sections/Services'
import CtaSection from '@/components/sections/CtaSection'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Diensten | Frontlix',
  description:
    'Ontdek alle diensten van Frontlix: webdevelopment, SEO, web applicaties, UI/UX design, prestatie-optimalisatie en onderhoud.',
}

export default function DienstenPage() {
  return (
    <>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.label}>Wat wij doen</span>
          <h1 className={styles.heroHeading}>Onze Diensten</h1>
          <p className={styles.heroSubtext}>
            Van strategie tot lancering — wij bieden alles wat jouw digitale
            aanwezigheid nodig heeft om te groeien en te presteren.
          </p>
        </div>
      </section>

      <Services />
      <CtaSection />
    </>
  )
}
