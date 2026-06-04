'use client'

import type { SceneProps } from '../types'
import { demoLead } from '../demo-data'
import { useSceneTimeline } from '../useSceneTimeline'
import { Reveal, SceneShell } from './SceneShell'
import styles from './scenes.module.css'

// fase 1: bestaande lijst, fase 2: nieuwe lead schuift erin, fase 3: detailkaart klapt open
const DURATIONS = [600, 1000, 1100]

export function LeadsScene(props: SceneProps) {
  const phase = useSceneTimeline(DURATIONS, props)
  return (
    <SceneShell title="Leads">
      <Reveal at={1} phase={phase}>
        <div className={styles.panel}>
          <div className={styles.panelTitle}>Leadlijst</div>
          <Reveal at={2} phase={phase}>
            <div className={`${styles.listRow} ${styles.listRowHot}`}>
              <span className={styles.dotLive} />
              <strong>{demoLead.naam}</strong>
              <span className={styles.badge}>Nieuw</span>
            </div>
          </Reveal>
          <div className={styles.listRow}>
            <span className={styles.dotMuted} /> Bakkerij De Korenbloem
          </div>
          <div className={styles.listRow}>
            <span className={styles.dotMuted} /> VvE Parkzicht
          </div>
        </div>
      </Reveal>
      <Reveal at={3} phase={phase}>
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
