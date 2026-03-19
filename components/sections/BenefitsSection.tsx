import Button from '@/components/ui/Button'
import styles from './BenefitsSection.module.css'

const cards = [
  {
    title: 'Reactietijd',
    description:
      'Jouw lead krijgt binnen 60 seconden een persoonlijk WhatsApp-bericht.',
    visual: (
      <div className={styles.visualMetric}>
        <span className={styles.visualLabel}>Gemiddelde reactie</span>
        <span className={styles.visualValue}>60 sec</span>
        <span className={styles.visualSub}>op elke nieuwe lead</span>
      </div>
    ),
  },
  {
    title: 'Altijd beschikbaar',
    description:
      'Ook \'s avonds en in het weekend. Het systeem mist geen enkele aanvraag.',
    visual: (
      <div className={styles.visualMetric}>
        <span className={styles.visualLabel}>Beschikbaarheid</span>
        <span className={styles.visualValue}>24/7</span>
        <span className={styles.visualSub}>ook buiten werktijden</span>
      </div>
    ),
  },
  {
    title: 'Op maat gebouwd',
    description:
      'Geen standaard chatbot — specifiek gebouwd voor jouw bedrijf en diensten.',
    visual: (
      <div className={styles.visualMetric}>
        <span className={styles.visualLabel}>Maatwerk</span>
        <span className={styles.visualValue}>100%</span>
        <span className={styles.visualSub}>op maat voor jouw bedrijf</span>
      </div>
    ),
  },
  {
    title: 'Volledig automatisch',
    description:
      'Van eerste bericht tot offerte zonder dat jij iets hoeft te doen.',
    visual: (
      <div className={styles.visualMetric}>
        <span className={styles.visualLabel}>Jouw tijdsinvestering</span>
        <span className={styles.visualValue}>{'< 1 min'}</span>
        <span className={styles.visualSub}>werk voor jou</span>
      </div>
    ),
  },
]

export default function BenefitsSection() {
  return (
    <section id="waarom" className={styles.section}>
      <div className={styles.inner}>

        {/* Top: label + heading / description */}
        <div className={styles.top}>
          <div className={styles.topLeft}>
            <div className={styles.labelRow}>
              <span className={styles.labelLine} />
              <span className={styles.labelDot} />
              <span className={styles.label}>Waarom Frontlix?</span>
            </div>
            <h2 className={styles.heading}>
              Jouw concurrenten reageren te laat.
              <br />
              Jij niet meer.
            </h2>
          </div>
          <p className={styles.description}>
            <strong>Binnen 60 seconden</strong> krijgt elke nieuwe lead een persoonlijk WhatsApp-bericht met een kant-en-klare offerte. Volledig automatisch — jij hoeft niets te doen.
          </p>
        </div>

        {/* Cards grid */}
        <div className={styles.cards}>
          {cards.map((card, i) => (
            <div key={i} className={styles.card}>
              <div className={styles.cardVisual}>{card.visual}</div>
              <h3 className={styles.cardTitle}>{card.title}</h3>
              <p className={styles.cardDesc}>{card.description}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className={styles.cta}>
          <Button href="/contact" variant="primary" size="lg">
            Plan een gratis gesprek →
          </Button>
        </div>
      </div>
    </section>
  )
}
