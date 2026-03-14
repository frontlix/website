import Button from '@/components/ui/Button'
import styles from './CtaSection.module.css'

export default function CtaSection() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <h2 className={styles.heading}>
          Jij verdient een digitale aanwezigheid die past bij jouw ambities
        </h2>
        <p className={styles.subtext}>
          Je stelt jezelf al de juiste vragen. Nu is het tijd om ze samen te
          beantwoorden.
        </p>
        <Button href="/contact" variant="primary" size="lg">
          Plan een gratis gesprek →
        </Button>
        <p className={styles.disclaimer}>
          Geen verplichtingen — alleen een eerlijk gesprek over jouw doelen
        </p>
      </div>
    </section>
  )
}
