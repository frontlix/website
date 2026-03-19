import { Rocket, Building2 } from 'lucide-react'
import styles from './ProfilesSection.module.css'

const profiles = [
  {
    icon: Rocket,
    title: 'Groeiende Bedrijven',
    description:
      'Je groeit snel en merkt dat handmatig werk niet meer schaalt. Leads opvolgen, offertes maken, klanten onboarden — het kost te veel tijd.',
    features: ['Automatische leadopvolging', 'AI-chatbot voor klantvragen', 'Workflow-automatisering', 'Slimme e-mailflows'],
    variant: 'cardGradient',
  },
  {
    icon: Building2,
    title: 'Gevestigde Bedrijven',
    description:
      'Je hebt een draaiend bedrijf maar weet dat er efficiënter kan. Repetitieve taken kosten je team uren per week die beter besteed kunnen worden.',
    features: ['Procesoptimalisatie met AI', 'Rapportage-automatisering', 'Integratie met bestaande tools', 'Op maat gebouwde AI-oplossingen'],
    variant: 'cardGradient',
  },
]

export default function ProfilesSection() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <h2 className={styles.heading}>
            Voor wie is Frontlix?
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
                <a href="#contact" className={styles.cardCta}>
                  Bekijk hoe we helpen →
                </a>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
