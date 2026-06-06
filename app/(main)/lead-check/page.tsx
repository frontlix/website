import type { Metadata } from 'next'
import LeadCheckWizard from './LeadCheckWizard'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Lead-lek-check · Frontlix',
  description:
    'Reken in 1 minuut uit hoeveel aanvragen en omzet je misloopt door trage opvolging. Gratis, zonder account.',
}

/* De wizard is zelf het hele scherm (intro, vragen, uitslag); deze pagina
   zet er alleen de sectie-omlijsting omheen. */
export default function LeadCheckPage() {
  return (
    <section id="lead-check" className={styles.section}>
      <LeadCheckWizard />
    </section>
  )
}
