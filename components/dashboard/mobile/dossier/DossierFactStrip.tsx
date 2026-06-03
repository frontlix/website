import styles from './DossierFactStrip.module.css'

export interface DossierFact {
  /** Waarde, bv. '145 m²' */
  v: string
  /** Label, bv. 'Oppervlak' */
  l: string
}

interface DossierFactStripProps {
  facts: DossierFact[]
}

/**
 * DossierFactStrip, surface-card met 4 gelijke cellen (KPI's). Waarde 16/800,
 * label 10.5 uppercase muted. Cellen 2–4 krijgen een 0.5px linker scheidslijn.
 */
export function DossierFactStrip({ facts }: DossierFactStripProps) {
  return (
    <div className={styles.wrap}>
      <div className={styles.strip}>
        {facts.map((f, i) => (
          <div key={i} className={styles.cell}>
            <div className={styles.value}>{f.v}</div>
            <div className={styles.label}>{f.l}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
