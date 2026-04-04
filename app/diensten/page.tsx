import type { Metadata } from 'next'
import Services from '@/components/sections/Services'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Diensten | Frontlix',
  description:
    'Automatische leadopvolging: van formulier tot offerte, volledig geautomatiseerd. Bekijk hoe het werkt in 6 stappen.',
  alternates: {
    canonical: '/diensten',
    languages: { nl: '/diensten' },
  },
  openGraph: {
    title: 'Diensten | Frontlix',
    description:
      'Automatische leadopvolging: van formulier tot offerte, volledig geautomatiseerd. Bekijk hoe het werkt in 6 stappen.',
    url: '/diensten',
    locale: 'nl_NL',
  },
}

const howToSchema = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'Van lead naar offerte, volledig automatisch',
  description:
    'Automatische leadopvolging: van formulier tot offerte in 6 stappen, volledig geautomatiseerd via WhatsApp.',
  inLanguage: 'nl',
  step: [
    {
      '@type': 'HowToStep',
      position: 1,
      name: 'Nooit meer een lead missen',
      text: 'Een potentiële klant vult een formulier in op de website, via een advertentie of social media. De gegevens worden direct opgeslagen en het systeem start automatisch.',
    },
    {
      '@type': 'HowToStep',
      position: 2,
      name: 'De juiste vragen worden gesteld',
      text: 'Via WhatsApp worden stap voor stap de juiste vragen gesteld. Type oppervlak, afmetingen, materiaal — alles wordt slim uitgevraagd.',
    },
    {
      '@type': 'HowToStep',
      position: 3,
      name: 'Offerte in seconden klaar',
      text: 'Op basis van de verzamelde gegevens wordt de prijs automatisch berekend. Een professionele PDF-offerte wordt gegenereerd, klaar om te versturen.',
    },
    {
      '@type': 'HowToStep',
      position: 4,
      name: 'Jij blijft in controle',
      text: 'Jij ontvangt een email met alle klantgegevens en de berekende offerte. Met één klik keur je goed of pas je aan.',
    },
    {
      '@type': 'HowToStep',
      position: 5,
      name: 'Klant ontvangt alles direct',
      text: 'Na goedkeuring wordt de offerte automatisch verstuurd via WhatsApp én email. De klant kan direct een afspraak inplannen.',
    },
    {
      '@type': 'HowToStep',
      position: 6,
      name: 'Afspraak automatisch ingepland',
      text: 'De klant ontvangt via WhatsApp een uitnodiging om een afspraak in te plannen. Met één klik kiest de klant een moment dat past.',
    },
  ],
}

export default function DienstenPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />
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
