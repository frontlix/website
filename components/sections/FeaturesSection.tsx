import styles from './FeaturesSection.module.css'

const voordelen = [
  {
    number: '60 sec',
    label: 'Gemiddelde reactie',
    title: 'Reactietijd',
    description:
      'Jouw lead krijgt binnen 60 seconden een persoonlijk WhatsApp bericht. Voordat de concurrent ook maar zijn telefoon pakt.',
  },
  {
    number: '24/7',
    label: 'Beschikbaarheid',
    title: 'Altijd beschikbaar',
    description:
      'Ook op zaterdagavond of vroeg in de ochtend. Het systeem slaapt nooit en mist geen enkele aanvraag.',
  },
  {
    number: '100%',
    label: 'Maatwerk',
    title: 'Op maat gebouwd',
    description:
      'Geen generieke chatbot. Wij bouwen het systeem specifiek voor jouw bedrijf, jouw diensten en jouw klanten.',
  },
  {
    number: '0 uur',
    label: 'Jouw tijdsinvestering',
    title: 'Handmatig werk',
    description:
      'Van eerste berichtje tot kant-en-klare offerte — volledig automatisch. Jij hoeft er niets voor te doen.',
  },
]

export default function FeaturesSection() {
  return (
    <section className={styles.section} id="waarom-frontlix">
      <div className={styles.inner}>
        <div className={styles.header}>
          <h2 className={styles.heading}>Waarom Frontlix?</h2>
          <p className={styles.subtitle}>
            Alles wat jij nodig hebt om nooit meer een lead te missen
          </p>
        </div>

        <div className={styles.grid}>
          {voordelen.map((item) => (
            <div key={item.title} className={styles.card}>
              <span className={styles.cardNumber}>{item.number}</span>
              <div className={styles.cardLabel}>{item.label}</div>
              <h3 className={styles.cardTitle}>{item.title}</h3>
              <p className={styles.cardDescription}>{item.description}</p>
            </div>
          ))}
        </div>

        <a href="#contact" className={styles.sectionCta}>Plan een gratis gesprek →</a>
      </div>
    </section>
  )
}
