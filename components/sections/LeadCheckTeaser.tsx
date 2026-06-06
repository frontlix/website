import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import styles from './LeadCheckTeaser.module.css'

export default function LeadCheckTeaser() {
  return (
    <section id="lead-check-teaser" className={styles.teaser}>
      <div className={styles.inner}>
        <Badge variant="default" dot>
          Gratis check
        </Badge>
        <h2 className={styles.heading}>Hoeveel omzet lekt er bij jou weg?</h2>
        <p className={styles.tekst}>
          Beantwoord 6 korte vragen en zie in 1 minuut hoeveel aanvragen en omzet je misloopt door trage opvolging.
        </p>
        <Button variant="primary" size="lg" href="/lead-check">
          Doe de gratis lead-check
        </Button>
      </div>
    </section>
  )
}
