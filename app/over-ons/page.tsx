import type { Metadata } from 'next'
import Image from 'next/image'
import { Target, Heart, Lightbulb } from 'lucide-react'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Over ons | Frontlix',
  description:
    'Maak kennis met Christiaan en Georg, de broers achter Frontlix. Wij helpen MKB-bedrijven groeien met AI-automatisering.',
}

const values = [
  {
    icon: Target,
    title: 'Resultaatgericht',
    description:
      'Geen vage beloftes, maar concrete oplossingen die je direct tijd en geld besparen.',
  },
  {
    icon: Heart,
    title: 'Persoonlijk',
    description:
      'Wij zijn geen groot bureau. Je werkt direct met ons, kort lijntje, snelle schakels.',
  },
  {
    icon: Lightbulb,
    title: 'Vooruitdenkend',
    description:
      'AI ontwikkelt zich razendsnel. Wij zorgen dat jouw bedrijf voorop blijft lopen.',
  },
]

const team = [
  {
    nummer: '01',
    name: 'Christiaan Tromp',
    role: 'Hoofdontwikkelaar AI',
    photo: '/images/christiaan Tromp pf.png',
    description:
      'Bouwt de AI-systemen en automatiseringen die Frontlix laten draaien. Van WhatsApp workflows tot geïntegreerde offerte-engines.',
  },
  {
    nummer: '02',
    name: 'Georg Tromp',
    role: 'Design & Strategie',
    photo: '/images/Georg tromp pf.png',
    description:
      'Vertaalt klantbehoeften naar strategie en zorgt dat alles er strak en professioneel uitziet. Kort lijntje, snel schakelen.',
  },
]

export default function OverOnsPage() {
  return (
    <>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.label}>Over ons</span>
          <h1 className={styles.heroHeading}>Twee broers, één missie</h1>
          <p className={styles.heroSubtext}>
            Wij zijn Christiaan en Georg, de broers achter Frontlix. Samen
            helpen wij MKB-bedrijven slimmer werken met AI-automatisering.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className={styles.section}>
        <div className={styles.inner}>
          <div className={styles.storyGrid}>
            <div className={styles.storyText}>
              <span className={styles.sectionLabel}>Ons verhaal</span>
              <h2 className={styles.sectionHeading}>
                Van idee naar impact
              </h2>
              <p className={styles.text}>
                Frontlix is begonnen vanuit een simpele observatie: veel
                MKB-bedrijven besteden uren aan werk dat geautomatiseerd kan
                worden. Denk aan handmatige data-invoer, leadopvolging die
                blijft liggen, of klanten die te lang op een antwoord wachten.
              </p>
              <p className={styles.text}>
                Als broers vullen wij elkaar perfect aan. Christiaan bouwt de
                technische oplossingen, Georg zorgt dat alles er strak en
                professioneel uitziet. Samen maken wij AI-automatisering
                toegankelijk voor ondernemers die willen groeien, zonder
                technische kennis nodig te hebben.
              </p>
            </div>
            <div className={styles.storyVisual}>
              <div className={styles.storyCard}>
                <div className={styles.storyCardStat}>
                  <span className={styles.statNumber}>100%</span>
                  <span className={styles.statLabel}>Toewijding</span>
                </div>
                <div className={styles.storyCardDivider} />
                <div className={styles.storyCardStat}>
                  <span className={styles.statNumber}>2</span>
                  <span className={styles.statLabel}>Broers, één team</span>
                </div>
                <div className={styles.storyCardDivider} />
                <div className={styles.storyCardStat}>
                  <span className={styles.statNumber}>MKB</span>
                  <span className={styles.statLabel}>Onze focus</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className={styles.missionSection}>
        <div className={styles.inner}>
          <div className={styles.missionCard}>
            <span className={styles.sectionLabel}>Onze missie</span>
            <h2 className={styles.missionHeading}>
              AI-automatisering toegankelijk maken voor elk MKB-bedrijf
            </h2>
            <p className={styles.missionText}>
              Grote bedrijven hebben hele IT-afdelingen om processen te
              automatiseren. Wij geloven dat MKB-ondernemers diezelfde
              voordelen verdienen, zonder het grote budget. Daarom bouwen wij
              slimme, betaalbare AI-oplossingen die direct resultaat opleveren.
            </p>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className={styles.teamSection}>
        <div className={styles.inner}>
          <div className={styles.teamHeader}>
            <span className={styles.sectionLabel}>Ons team</span>
            <h2 className={styles.sectionHeading}>
              De broers achter <em className={styles.headingAccent}>Frontlix</em>
            </h2>
          </div>
          <div className={styles.teamGrid}>
            {team.map((member, i) => (
              <article
                key={member.name}
                className={`${styles.teamCard} ${i === 1 ? styles.teamCardOffset : ''}`}
              >
                {/* Foto met overlay-elementen */}
                <div className={styles.teamPhotoWrap}>
                  <Image
                    src={member.photo}
                    alt={`Profielfoto van ${member.name}`}
                    fill
                    className={styles.teamPhotoImg}
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />

                  <div className={styles.teamBlueCorner} />
                </div>

                {/* Info onder de foto */}
                <div className={styles.teamInfo}>
                  <p className={styles.teamRole}>{member.role}</p>
                  <h3 className={styles.teamName}>{member.name}</h3>
                  <div className={styles.teamDivider} />
                  <p className={styles.teamDescription}>{member.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className={styles.valuesSection}>
        <div className={styles.inner}>
          <div className={styles.valuesHeader}>
            <span className={styles.sectionLabel}>Onze waarden</span>
            <h2 className={styles.sectionHeading}>
              Waar wij voor staan
            </h2>
          </div>
          <div className={styles.valuesGrid}>
            {values.map((value) => {
              const Icon = value.icon
              return (
                <div key={value.title} className={styles.valueCard}>
                  <div className={styles.valueIcon}>
                    <Icon size={24} />
                  </div>
                  <h3 className={styles.valueTitle}>{value.title}</h3>
                  <p className={styles.valueDescription}>{value.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </>
  )
}
