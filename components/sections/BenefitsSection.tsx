import Button from '@/components/ui/Button'
import styles from './BenefitsSection.module.css'

const cards = [
  {
    title: 'Duidelijke communicatie, altijd',
    description:
      'Geen vage beloftes. Jij weet altijd waar je project staat en wat de volgende stap is.',
    visual: (
      <div className={styles.visualMetric}>
        <span className={styles.visualLabel}>Reactietijd</span>
        <span className={styles.visualValue}>&lt; 2u</span>
        <span className={styles.visualSub}>gemiddeld op werkdagen</span>
      </div>
    ),
  },
  {
    title: 'Projecten op tijd en binnen budget',
    description:
      'Gestructureerde aanpak met vaste mijlpalen. Geen verrassingen achteraf.',
    visual: (
      <div className={styles.visualMetric}>
        <span className={styles.visualLabel}>On-time delivery</span>
        <span className={styles.visualValue}>97%</span>
        <span className={styles.visualSub}>van alle projecten</span>
      </div>
    ),
  },
  {
    title: 'Technisch sterk, visueel verbluffend',
    description:
      'Wij combineren solide code met strak design — zodat jouw product presteert én indruk maakt.',
    visual: (
      <div className={styles.visualBars}>
        <div className={styles.barRow}>
          <span className={styles.barLabel}>Performance</span>
          <div className={styles.barTrack}><div className={`${styles.barFill} ${styles.barFill94}`} /></div>
          <span className={styles.barVal}>94</span>
        </div>
        <div className={styles.barRow}>
          <span className={styles.barLabel}>SEO</span>
          <div className={styles.barTrack}><div className={`${styles.barFill} ${styles.barFill98}`} /></div>
          <span className={styles.barVal}>98</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Langdurige samenwerking',
    description:
      'We bouwen geen eenmalige producten — we groeien mee met jouw bedrijf.',
    visual: (
      <div className={styles.visualMetric}>
        <span className={styles.visualLabel}>Klanten die terugkomen</span>
        <span className={styles.visualValue}>85%</span>
        <span className={styles.visualSub}>kiest voor een vervolgopdracht</span>
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
              Neem betere beslissingen, zonder uren te verspillen aan zoekopdrachten
            </h2>
          </div>
          <p className={styles.description}>
            In een wereld vol digitale keuzes is het moeilijk om de juiste partner te vinden.{' '}
            <strong>Bij Frontlix geloven we dat technologie pas waarde heeft als het jouw doelen dient</strong>{' '}
            — niet andersom. Geen overbodige complexiteit, geen vage beloftes.
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
            Start jouw project
          </Button>
        </div>
      </div>
    </section>
  )
}
