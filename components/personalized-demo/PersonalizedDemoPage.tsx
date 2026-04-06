'use client'

import Badge from '@/components/ui/Badge'
import LeadDemo from '@/components/sections/LeadDemo'
import IndustryIntro from './IndustryIntro'
import DemoPhoneForm from './DemoPhoneForm'
import styles from './PersonalizedDemoPage.module.css'

interface PersonalizedDemoPageProps {
  id: string
  naam: string
  bedrijf: string
  branche: string
}

export default function PersonalizedDemoPage({
  id,
  naam,
  bedrijf,
  branche,
}: PersonalizedDemoPageProps) {
  return (
    <div className={styles.page}>
      {/* Hero sectie */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <Badge variant="default" dot>
            Persoonlijke demo
          </Badge>

          <h1 className={styles.heading}>
            Hoi {naam},
            <br />
            <span className={styles.headingGradient}>
              bekijk hoe automatisering werkt voor {bedrijf}
            </span>
          </h1>

          <p className={styles.subtext}>
            We hebben een demo klaargezet speciaal voor jou. Ervaar hoe leads
            automatisch worden opgevolgd van aanvraag tot offerte tot afspraak
            via WhatsApp, binnen 60 seconden.
          </p>

          <IndustryIntro branche={branche} />
        </div>
      </section>

      {/* CTA sectie */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaInner}>
          <h2 className={styles.ctaHeading}>Probeer het zelf</h2>
          <p className={styles.ctaSubtext}>
            Vul je telefoonnummer in en ontvang de demo direct op WhatsApp.
            Je ervaart precies wat jouw klanten zouden meemaken.
          </p>
          <DemoPhoneForm personalizedDemoId={id} />
        </div>
      </section>

      {/* Demo visualisatie */}
      <section className={styles.demoSection}>
        <div className={styles.demoInner}>
          <h2 className={styles.sectionHeading}>Zo werkt het</h2>
          <p className={styles.sectionSubtext}>
            Van aanvraag tot offerte tot afspraak volledig automatisch.
          </p>
          <LeadDemo />
        </div>
      </section>
    </div>
  )
}
