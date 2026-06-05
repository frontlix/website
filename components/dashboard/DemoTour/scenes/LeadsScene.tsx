'use client'

import type { SceneProps } from '../types'
import { demoLead } from '../demo-data'
import { useSceneTimeline } from '../useSceneTimeline'
import { Reveal, SceneShell, type CameraFrame, type CursorMark } from './SceneShell'
import styles from './scenes.module.css'

// fase 1: lijst verschijnt, fase 2: muis scrolt door de lijst,
// fase 3: nieuwe lead schuift bovenaan binnen, fase 4: muis beweegt
// naar de lead, fase 5: klik en de detailkaart klapt open (camera zoomt in)
const DURATIONS = [600, 1000, 1000, 800, 1200]

const FULL: CameraFrame = { scale: 1, x: 50, y: 50 }
const CAMERA: readonly CameraFrame[] = [
  FULL,
  FULL,
  FULL,
  FULL,
  FULL,
  { scale: 1.3, x: 55, y: 72 }, // inzoomen op de detailkaart
]
const CURSOR: readonly CursorMark[] = [
  { x: 50, y: 50, hidden: true },
  { x: 82, y: 42 },
  { x: 82, y: 58 }, // scrolt mee omlaag
  { x: 82, y: 50 },
  { x: 38, y: 32 }, // naar de nieuwe lead
  { x: 38, y: 32, click: true },
]

const OVERIGE_LEADS = [
  'Bakkerij De Korenbloem',
  'VvE Parkzicht',
  'Restaurant De Smidse',
  'Huisartsenpraktijk Centrum',
  'Familie De Boer',
]

export function LeadsScene(props: SceneProps) {
  const phase = useSceneTimeline(DURATIONS, props)
  return (
    <SceneShell title="Leads" phase={phase} camera={CAMERA} cursor={CURSOR}>
      <Reveal at={1} phase={phase}>
        <div className={styles.panel}>
          <div className={styles.panelTitle}>Leadlijst</div>
          <div className={styles.leadsViewport}>
            <div
              className={styles.leadsInner}
              style={{ transform: phase === 2 ? 'translateY(-88px)' : 'translateY(0)' }}
            >
              <Reveal at={3} phase={phase}>
                <div className={`${styles.listRow} ${styles.listRowHot} ${styles.rowFixed}`}>
                  <span className={styles.dotLive} />
                  <strong>{demoLead.naam}</strong>
                  <span className={styles.badge}>Nieuw</span>
                </div>
              </Reveal>
              {OVERIGE_LEADS.map((naam) => (
                <div key={naam} className={`${styles.listRow} ${styles.rowFixed}`}>
                  <span className={styles.dotMuted} /> {naam}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Reveal>
      <Reveal at={5} phase={phase}>
        <div className={styles.detailCard}>
          <div className={styles.panelTitle}>{demoLead.naam}</div>
          <div className={styles.detailGrid}>
            <span>Dienst</span>
            <strong>{demoLead.dienst}</strong>
            <span>Oppervlakte</span>
            <strong>{demoLead.oppervlakte}</strong>
            <span>Adres</span>
            <strong>{demoLead.adres}</strong>
            <span>Bron</span>
            <strong>{demoLead.bron}</strong>
          </div>
        </div>
      </Reveal>
    </SceneShell>
  )
}
