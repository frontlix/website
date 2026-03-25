import type { Metadata } from 'next'
import Services from '@/components/sections/Services'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Diensten | Frontlix',
  description:
    'Automatische lead opvolging: van formulier tot offerte, volledig geautomatiseerd met AI. Bekijk hoe het werkt in 6 stappen.',
}

export default function DienstenPage() {
  return (
    <>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.label}>In 6 stappen</span>
          <h1 className={styles.heroHeading}>
            Van lead naar offerte, volledig automatisch
          </h1>
          <p className={styles.heroSubtext}>
            Terwijl jij bezig bent met je klanten, vangt AI je leads op,
            stelt de juiste vragen en stuurt een offerte, zonder dat jij
            iets hoeft te doen.
          </p>
        </div>
      </section>

      <Services />
    </>
  )
}
