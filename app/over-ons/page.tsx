import type { Metadata } from 'next'
import { Target, Heart, Lightbulb } from 'lucide-react'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Over ons | Frontlix',
  description:
    'Leer meer over Frontlix — ons team, onze missie en de waarden die ons drijven.',
}

const values = [
  {
    icon: Target,
    title: 'Resultaatgericht',
    description:
      'Elke beslissing die wij maken is gericht op één doel: meetbare resultaten voor jouw bedrijf.',
  },
  {
    icon: Heart,
    title: 'Passie voor kwaliteit',
    description:
      'Wij leveren geen half werk. Van de eerste pixel tot de laatste regel code — alles is zorgvuldig afgewerkt.',
  },
  {
    icon: Lightbulb,
    title: 'Innovatief denken',
    description:
      'Wij blijven continu leren en verbeteren zodat jij altijd profiteert van de nieuwste technologieën.',
  },
]

export default function OverOnsPage() {
  return (
    <>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.label}>Over ons</span>
          <h1 className={styles.heroHeading}>Over Frontlix</h1>
          <p className={styles.heroSubtext}>
            Wij zijn een team van gepassioneerde developers en designers die
            geloven dat elke onderneming recht heeft op een sterke digitale
            aanwezigheid.
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
                Gebouwd op passie, aangedreven door resultaten
              </h2>
              <p className={styles.text}>
                Frontlix is ontstaan vanuit de overtuiging dat goede technologie
                bereikbaar moet zijn voor elk bedrijf — niet alleen voor grote
                corporaties met diepe zakken. Wij zijn gestart als een klein
                team met een grote droom: de beste digitale partner zijn voor
                ondernemers die willen groeien.
              </p>
              <p className={styles.text}>
                Vandaag helpen wij startups, MKB-bedrijven en gevestigde
                organisaties met het bouwen van digitale oplossingen die het
                verschil maken. Onze aanpak is persoonlijk, transparant en
                altijd gericht op jouw succes.
              </p>
            </div>
            <div className={styles.storyVisual}>
              <div className={styles.storyCard}>
                <div className={styles.storyCardStat}>
                  <span className={styles.statNumber}>15+</span>
                  <span className={styles.statLabel}>Tevreden klanten</span>
                </div>
                <div className={styles.storyCardDivider} />
                <div className={styles.storyCardStat}>
                  <span className={styles.statNumber}>100%</span>
                  <span className={styles.statLabel}>Projecten op tijd</span>
                </div>
                <div className={styles.storyCardDivider} />
                <div className={styles.storyCardStat}>
                  <span className={styles.statNumber}>2+</span>
                  <span className={styles.statLabel}>Jaar ervaring</span>
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
              Digitale groei democratiseren voor elke ondernemer
            </h2>
            <p className={styles.missionText}>
              Onze missie is simpel: wij willen dat elke ondernemer — ongeacht
              de grootte van zijn of haar bedrijf — toegang heeft tot
              hoogwaardige digitale oplossingen. We geloven dat een sterke
              online aanwezigheid geen luxe is, maar een noodzaak in de
              moderne economie. Daarom werken we transparant, persoonlijk en
              met een onwrikbare focus op resultaten.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className={styles.section}>
        <div className={styles.inner}>
          <div className={styles.valuesHeader}>
            <span className={styles.sectionLabel}>Onze waarden</span>
            <h2 className={styles.sectionHeading}>
              Dit drijft ons elke dag opnieuw
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

      {/* Team placeholder */}
      <section className={styles.teamSection}>
        <div className={styles.inner}>
          <div className={styles.valuesHeader}>
            <span className={styles.sectionLabel}>Ons team</span>
            <h2 className={styles.sectionHeading}>
              De mensen achter Frontlix
            </h2>
            <p className={styles.teamSubtext}>
              Een hecht team van specialisten, elk met een passie voor digitale
              excellentie.
            </p>
          </div>
          <div className={styles.teamGrid}>
            {[
              { initials: 'CT', name: 'Christiaan Tromp', role: 'Oprichter & Lead Developer' },
              { initials: 'DV', name: 'Designer', role: 'UI/UX Designer' },
              { initials: 'MK', name: 'Marketing', role: 'SEO & Growth Specialist' },
            ].map((member) => (
              <div key={member.name} className={styles.teamCard}>
                <div className={styles.teamAvatar}>{member.initials}</div>
                <div className={styles.teamInfo}>
                  <span className={styles.teamName}>{member.name}</span>
                  <span className={styles.teamRole}>{member.role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
