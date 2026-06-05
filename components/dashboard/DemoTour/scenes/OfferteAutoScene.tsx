'use client'

import type { SceneProps } from '../types'
import { demoLead, demoOfferte } from '../demo-data'
import { useSceneTimeline } from '../useSceneTimeline'
import { Reveal, SceneShell, type CameraFrame } from './SceneShell'
import styles from './scenes.module.css'

// fase 1: melding, fase 2: documentkaart met regels, fase 3: totaal, fase 4: status verzonden
// bewust géén muis: dit proces doet Frontlix volledig zelf
const DURATIONS = [900, 1100, 800, 900]

const FULL: CameraFrame = { scale: 1, x: 50, y: 50 }
const CAMERA: readonly CameraFrame[] = [
  FULL,
  FULL,
  { scale: 1.22, x: 46, y: 55 }, // inzoomen op het offertedocument
  { scale: 1.22, x: 46, y: 55 },
  { scale: 1.1, x: 50, y: 62 }, // ietsje uitzoomen voor de verzonden-status
]

export function OfferteAutoScene(props: SceneProps) {
  const phase = useSceneTimeline(DURATIONS, props)
  return (
    <SceneShell title="Offertes" phase={phase} camera={CAMERA}>
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
