import styles from './NPSDistributionBar.module.css'

/**
 * Horizontale stacked-bar voor NPS-verdeling, visualiseert
 * promoters/passives/detractors als gekleurde segmenten met gradient.
 * Bar groeit proportioneel via flex i.p.v. percentage-berekening.
 */
export function NPSDistributionBar({
  promoters,
  passives,
  detractors,
}: {
  promoters: number
  passives: number
  detractors: number
}) {
  return (
    <div className="dash-card" style={{ marginBottom: 20 }}>
      <div className="dash-card-head">
        <div>
          <div className="dash-card-title">NPS-verdeling</div>
          <div className="dash-card-sub">
            {promoters + passives + detractors} respondenten
          </div>
        </div>
      </div>
      <div className={styles.body}>
        <div className={styles.bar}>
          <div
            className={`${styles.segment} ${styles.promoters}`}
            style={{ flex: promoters }}
          >
            {promoters} promoters
          </div>
          <div
            className={`${styles.segment} ${styles.passives}`}
            style={{ flex: passives }}
          >
            {passives}
          </div>
          <div
            className={`${styles.segment} ${styles.detractors}`}
            style={{ flex: detractors }}
          >
            {detractors}
          </div>
        </div>

        <div className={styles.legend}>
          <span>
            <span className={`${styles.legendDot} ${styles.promoters}`} />
            <strong>Promoters</strong> (9–10): geven actief aanbevelingen
          </span>
          <span>
            <span className={`${styles.legendDot} ${styles.passives}`} />
            <strong>Passives</strong> (7–8): tevreden maar niet enthousiast
          </span>
          <span>
            <span className={`${styles.legendDot} ${styles.detractors}`} />
            <strong>Detractors</strong> (0–6): risico op negatieve mond-tot-mond
          </span>
        </div>
      </div>
    </div>
  )
}
