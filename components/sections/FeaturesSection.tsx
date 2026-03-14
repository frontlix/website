import { Globe, Search, AppWindow, Paintbrush, Zap, Shield } from 'lucide-react'
import styles from './FeaturesSection.module.css'

const features = [
  {
    icon: Globe,
    title: 'Webdevelopment',
    description:
      'Razendsnelle, moderne websites gebouwd met Next.js en de nieuwste webtechnologieën.',
  },
  {
    icon: Search,
    title: 'SEO & Marketing',
    description:
      'Van technische SEO tot content-strategie: wij zorgen dat jij gevonden wordt.',
  },
  {
    icon: AppWindow,
    title: 'Web Applicaties',
    description:
      'Op maat gemaakte web-apps die jouw bedrijfsprocessen stroomlijnen en automatiseren.',
  },
  {
    icon: Paintbrush,
    title: 'UI/UX Design',
    description:
      'Gebruikerservaringen die converteren — doordacht ontwerp, pixel-perfect uitgewerkt.',
  },
  {
    icon: Zap,
    title: 'Prestatie-optimalisatie',
    description:
      'Sneller laden, hogere scores, betere rankingen. Elke milliseconde telt.',
  },
  {
    icon: Shield,
    title: 'Onderhoud & Support',
    description:
      'Geen zorgen meer over updates, beveiliging of downtime — wij regelen het.',
  },
]

const stats = [
  { number: '15+', label: 'Projecten opgeleverd' },
  { number: '100%', label: 'Klanttevredenheid' },
]

export default function FeaturesSection() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <h2 className={styles.heading}>
            Geavanceerde oplossingen, meetbare resultaten
          </h2>
        </div>

        <div className={styles.grid}>
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <div key={feature.title} className={styles.card}>
                <div className={styles.cardIcon}>
                  <Icon size={22} />
                </div>
                <h3 className={styles.cardTitle}>{feature.title}</h3>
                <p className={styles.cardDescription}>{feature.description}</p>
              </div>
            )
          })}
        </div>

        <div className={styles.statsRow}>
          {stats.map((stat) => (
            <div key={stat.number} className={styles.statItem}>
              <span className={styles.statNumber}>{stat.number}</span>
              <span className={styles.statLabel}>{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
