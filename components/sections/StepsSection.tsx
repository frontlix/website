import styles from './StepsSection.module.css'

const steps = [
  {
    number: '01',
    title: 'Intake & Strategie',
    description:
      'We beginnen met een grondige analyse van jouw doelen, doelgroep en marktpositie.',
  },
  {
    number: '02',
    title: 'Design & Development',
    description:
      'Van wireframe tot pixel-perfect product — wij bouwen snel, schoon en schaalbaar.',
  },
  {
    number: '03',
    title: 'Launch & Optimalisatie',
    description:
      'Na de lancering blijven we meten, verbeteren en optimaliseren voor maximale groei.',
  },
]

export default function StepsSection() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <h2 className={styles.heading}>
            Een drietraps aanpak voor heldere digitale groei
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
