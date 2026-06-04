'use client'

import type { SceneProps } from '../types'
import { demoLead, demoOfferte } from '../demo-data'
import { useSceneTimeline } from '../useSceneTimeline'
import { Reveal, SceneShell } from './SceneShell'
import styles from './scenes.module.css'

// fase 1: melding, fase 2: documentkaart met regels, fase 3: totaal, fase 4: status verzonden
const DURATIONS = [900, 1100, 800, 900]

export function OfferteAutoScene(props: SceneProps) {
  const phase = useSceneTimeline(DURATIONS, props)
  return (
    <SceneShell title="Offertes">
      <Reveal at={1} phase={phase}>
        <div className={styles.noticeRow}>
          <span className={styles.dotLive} /> Frontlix stelt automatisch een offerte op voor{' '}
          {demoLead.naam}
        </div>
      </Reveal>
      <Reveal at={2} phase={phase}>
        <div className={styles.docCard}>
          <div className={styles.docHead}>Offerte {demoOfferte.nummer}</div>
          {demoOfferte.regels.map((regel) => (
            <div key={regel.omschrijving} className={styles.docRow}>
              <span>
                {regel.omschrijving}
                <em className={styles.docDetail}>{regel.detail}</em>
              </span>
              <strong>{regel.bedrag}</strong>
            </div>
          ))}
          <Reveal at={3} phase={phase}>
            <div className={styles.docTotal}>
              <span>Totaal incl. btw</span>
              <strong>{demoOfferte.totaal}</strong>
            </div>
          </Reveal>
        </div>
      </Reveal>
      <Reveal at={4} phase={phase}>
        <div className={styles.statusPill}>Verzonden via WhatsApp</div>
      </Reveal>
    </SceneShell>
  )
}
