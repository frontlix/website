import Button from '@/components/ui/Button'
import styles from './BenefitsSection.module.css'

const cards = [
  {
    title: 'Reactietijd',
    description:
      'Jouw lead krijgt binnen 60 seconden een persoonlijk WhatsApp bericht. Voordat de concurrent ook maar zijn telefoon pakt.',
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
      'Ook op zaterdagavond of vroeg in de ochtend. Het systeem slaapt nooit en mist geen enkele aanvraag.',
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
      'Geen generieke chatbot. Wij bouwen het systeem specifiek voor jouw bedrijf, jouw diensten en jouw klanten.',
    visual: (
      <div className={styles.visualMetric}>
        <span className={styles.visualLabel}>Volledig gepersonaliseerd</span>
        <span className={styles.visualValue}>100%</span>
        <span className={styles.visualSub}>voor jouw bedrijf</span>
      </div>
    ),
  },
  {
    title: 'Handmatig werk',
    description:
      'Van eerste berichtje tot kant-en-klare offerte — volledig automatisch. Jij hoeft er niets voor te doen.',
    visual: (
      <div className={styles.visualMetric}>
        <span className={styles.visualLabel}>Tijd die jij bespaart</span>
        <span className={styles.visualValue}>0 uur</span>
        <span className={styles.visualSub}>van lead tot offerte</span>
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
            Elke dag lopen bedrijven opdrachten mis omdat ze te laat reageren.{' '}
            <strong>Frontlix reageert binnen 60 seconden op elke nieuwe lead — persoonlijk, automatisch en met een kant-en-klare offerte.</strong>{' '}
            Zonder dat jij er iets voor hoeft te doen.
          </p>
        </div>

        {/* Cards grid */}
        <div className={styles.cards}>
          {cards.map((card, i) => (
            <div key={i} className={styles.card}>
              <h3 className={styles.cardTitle}>{card.title}</h3>
              <p className={styles.cardDesc}>{card.description}</p>
              <div className={styles.cardVisual}>{card.visual}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className={styles.cta}>
          <Button href="/contact" variant="primary" size="lg">
            Plan een gratis kennismakingsgesprek →
          </Button>
        </div>
      </div>
    </section>
  )
}
