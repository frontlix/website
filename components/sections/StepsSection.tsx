import styles from './StepsSection.module.css'

const steps = [
  {
    number: '01',
    title: 'Intake & Strategie',
    description:
      'In een gratis strategiegesprek brengen we jouw doelen en kansen in kaart — binnen een week heb je een concreet plan.',
  },
  {
    number: '02',
    title: 'Design & Development',
    description:
      'We ontwerpen en bouwen jouw website of platform in 2-4 weken — met tussentijdse feedback zodat het resultaat 100% klopt.',
  },
  {
    number: '03',
    title: 'Launch & Optimalisatie',
    description:
      'Na livegang monitoren we prestaties en sturen we bij op basis van data — zodat je resultaten blijven groeien.',
  },
]

export default function StepsSection() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <h2 className={styles.heading}>
            Van idee tot resultaat in drie stappen
          </h2>
        </div>

        <div className={styles.steps}>
          {steps.map((step) => (
            <div key={step.number} className={styles.step}>
              <span className={styles.stepNumber}>{step.number}</span>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepDescription}>{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
