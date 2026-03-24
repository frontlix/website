import Link from 'next/link'
import { UserX, Clock, Layers } from 'lucide-react'
import styles from './ProfilesSection.module.css'

interface PainCard {
  icon: typeof UserX
  pain: string
  explanation: string
  solutions: string[]
}

const painCards: PainCard[] = [
  {
    icon: UserX,
    pain: 'Ik mis leads omdat opvolging niet consistent gebeurt',
    explanation:
      'Potenti\u00eble klanten haken af omdat ze te laat of helemaal geen reactie krijgen. Elke gemiste follow-up is omzet die je laat liggen.',
    solutions: [
      'Elke lead krijgt binnen minuten een reactie \u2014 zonder dat jij iets hoeft te doen',
      'Geen enkele lead valt meer tussen wal en schip dankzij slimme e-mailflows',
      'Je krijgt direct een melding zodra een lead actie onderneemt',
    ],
  },
  {
    icon: Clock,
    pain: 'Mijn team verspilt uren aan werk dat geautomatiseerd kan worden',
    explanation:
      'Handmatig data overtypen, rapporten maken, mailtjes sturen \u2014 je team is druk, maar niet productief. Dat kost je duizenden euro\u2019s per maand.',
    solutions: [
      'Jij keurt goed, wij regelen de rest \u2014 automatisch',
      'Rapporten die zichzelf schrijven, klaar als jij \u2019s ochtends begint',
      'Slimme koppelingen tussen je tools zodat data vanzelf stroomt',
    ],
  },
  {
    icon: Layers,
    pain: 'Mijn bedrijf groeit, maar mijn processen houden me tegen',
    explanation:
      'Wat vroeger werkte, werkt nu niet meer. Naarmate je meer klanten, meer werk en meer mensen krijgt, stapelen de fouten en vertragingen zich op \u2014 omdat alles nog handmatig gaat.',
    solutions: [
      'Slimme workflows die meeschalen zodra jij dat doet',
      'Geen losse Excel-sheets meer \u2014 alles op \u00e9\u00e9n plek, altijd actueel',
      'Van chaos naar systeem, zonder dat jij daar uren aan kwijt bent',
    ],
  },
]

export default function ProfilesSection() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <h2 className={styles.heading}>Herken jij dit?</h2>
        </div>

        <div className={styles.grid}>
          {painCards.map((card) => {
            const Icon = card.icon
            return (
              <div key={card.pain} className={`${styles.card} ${styles.cardGradient}`}>
                <div className={styles.cardIcon}>
                  <Icon size={24} />
                </div>
                <h3 className={styles.cardPain}>{card.pain}</h3>
                <p className={styles.cardDescription}>{card.explanation}</p>
                <div className={styles.solutions}>
                  {card.solutions.map((solution) => (
                    <span key={solution} className={styles.solution}>
                      <span className={styles.solutionDot} />
                      {solution}
                    </span>
                  ))}
                </div>
                <Link href="/contact" className={styles.cardCta}>
                  Herken jij dit? Bekijk hoe we helpen →
                </Link>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
