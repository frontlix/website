import styles from './TestimonialSection.module.css'

export default function TestimonialSection() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <h2 className={styles.heading}>Wat onze klanten zeggen</h2>
        </div>

        <div className={styles.quoteCard}>
          <span className={styles.quoteSymbol}>&ldquo;</span>
          <p className={styles.quoteText}>
            Frontlix heeft onze online aanwezigheid compleet getransformeerd. De
            website is niet alleen mooier geworden, maar we zien ook een
            duidelijke stijging in conversies en organisch verkeer.
          </p>
          <div className={styles.attribution}>
            <div className={styles.avatar}>M</div>
            <div className={styles.attributionText}>
              <span className={styles.attributionName}>Mark de Vries</span>
              <span className={styles.attributionRole}>CEO bij TechStart BV</span>
            </div>
          </div>
        </div>

        <p className={styles.subLabel}>
          aan het hart van digitale transformatie
        </p>
      </div>
    </section>
  )
}
