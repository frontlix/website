import { Star } from 'lucide-react'
import styles from './MobileReviewsSoon.module.css'

/**
 * "Binnenkort"-placeholder voor de mobiele reviews-pagina. Mirror van de
 * desktop /dashboard/v2/reviews placeholder: zolang er nog geen reviews-
 * backend is tonen we geen (nep) voorbeelddata meer, maar deze nette melding.
 * De demo-component MobileReviews blijft als skelet bestaan; zodra de echte
 * reviews-backend er is komt die (met echte data) terug.
 */
export function MobileReviewsSoon() {
  return (
    <div className={styles.soon}>
      <div className={styles.soonIcon}>
        <Star size={26} strokeWidth={2} />
      </div>
      <span className={styles.soonBadge}>Binnenkort</span>
      <h1 className={styles.soonTitle}>Reviews komen eraan</h1>
      <p className={styles.soonText}>
        Straks verzamelt Surface automatisch reviews van je klanten via WhatsApp
        en zet er een conceptantwoord bij klaar. Zodra dit live staat verschijnen
        je echte beoordelingen hier, met je gemiddelde score en de reacties per
        kanaal.
      </p>
    </div>
  )
}
