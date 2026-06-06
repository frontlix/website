import type { Metadata } from 'next'
import Badge from '@/components/ui/Badge'
import LeadCheckWizard from './LeadCheckWizard'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Lead-lek-check · Frontlix',
  description:
    'Reken in 1 minuut uit hoeveel aanvragen en omzet je misloopt door trage opvolging. Gratis, zonder account.',
}

export default function LeadCheckPage() {
  return (
    <section id="lead-check" className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.intro}>
          <Badge variant="default" dot>
            Gratis check, 1 minuut
          </Badge>
          <h1 className={styles.heading}>
            Hoeveel leads laat <span className={styles.headingAccent}>jij</span> liggen?
          </h1>
          <p className={styles.subtext}>
            Beantwoord 6 korte vragen en zie meteen een eerlijke schatting van je gemiste aanvragen en omzet.
            Geen account nodig.
          </p>
        </div>
        <LeadCheckWizard />
      </div>
    </section>
  )
}
