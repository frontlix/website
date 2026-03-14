import styles from './StatsSection.module.css'

const stats = [
  {
    number: '+50%',
    description: 'Meer organisch verkeer voor onze klanten na 3 maanden',
  },
  {
    number: '3×',
    description: 'Hogere conversierates met een professionele website',
  },
  {
    number: '80%',
    description: 'Snellere laadtijden door moderne technologieën',
  },
  {
    number: '100%',
    description: 'Focus op jouw groei, elke dag opnieuw',
  },
]

export default function StatsSection() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.grid}>
          {stats.map((stat) => (
            <div key={stat.number} className={styles.statCard}>
              <span className={styles.statNumber}>{stat.number}</span>
              <p className={styles.statDescription}>{stat.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
