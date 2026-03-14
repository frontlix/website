import { Rocket, Building2 } from 'lucide-react'
import styles from './ProfilesSection.module.css'

const profiles = [
  {
    icon: Rocket,
    title: 'Startups & Ondernemers',
    description:
      'Je hebt een idee of jonge onderneming en hebt een sterke digitale basis nodig die kan meegroeien.',
    features: ['MVP-websites', 'Branding', 'Snelle lancering', 'Schaalbare architectuur'],
    variant: 'cardGradient',
  },
  {
    icon: Building2,
    title: 'Gevestigde Bedrijven',
    description:
      'Je hebt een bestaand bedrijf en wilt jouw digitale aanwezigheid naar een hoger niveau tillen.',
    features: ['Redesign & migratie', 'Prestatie-optimalisatie', 'SEO-strategie', 'Maatwerk functionaliteit'],
    variant: 'cardDefault',
  },
]

export default function ProfilesSection() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <h2 className={styles.heading}>
            Twee type klanten, één ambitie: digitaal groeien
          </h2>
        </div>

        <div className={styles.grid}>
          {profiles.map((profile) => {
            const Icon = profile.icon
            return (
              <div
                key={profile.title}
                className={`${styles.card} ${styles[profile.variant as keyof typeof styles]}`}
              >
                <div className={styles.cardIcon}>
                  <Icon size={24} />
                </div>
                <h3 className={styles.cardTitle}>{profile.title}</h3>
                <p className={styles.cardDescription}>{profile.description}</p>
                <div className={styles.features}>
                  {profile.features.map((feature) => (
                    <span key={feature} className={styles.feature}>
                      <span className={styles.featureDot} />
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
