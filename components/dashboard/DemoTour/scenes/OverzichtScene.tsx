'use client'

import type { SceneProps } from '../types'
import { demoKpis, demoLead } from '../demo-data'
import { useSceneTimeline } from '../useSceneTimeline'
import { CountUp, Reveal, SceneShell, type CameraFrame, type CursorMark } from './SceneShell'
import styles from './scenes.module.css'

// fase 1: kpi-kaarten, fase 2: tellers lopen, fase 3: activity-feed, fase 4: nieuwe aanvraag
const DURATIONS = [500, 800, 800, 1100]

const FULL: CameraFrame = { scale: 1, x: 50, y: 50 }
const CAMERA: readonly CameraFrame[] = [
  FULL,
  FULL,
  FULL,
  { scale: 1.22, x: 50, y: 78 }, // inzoomen op de live activiteit
  { scale: 1.22, x: 50, y: 78 },
]
const CURSOR: readonly CursorMark[] = [
  { x: 50, y: 50, hidden: true },
  { x: 50, y: 50, hidden: true },
  { x: 30, y: 34 }, // wijst naar de kpi-tellers
  { x: 42, y: 74 }, // glijdt mee naar de feed
  { x: 42, y: 80 },
]

export function OverzichtScene(props: SceneProps) {
  const phase = useSceneTimeline(DURATIONS, props)
  const done = phase >= DURATIONS.length
  return (
    <SceneShell title="Overzicht" phase={phase} camera={CAMERA} cursor={CURSOR}>
      <Reveal at={1} phase={phase}>
        <div className={styles.kpiRow}>
          {demoKpis.map((kpi) => (
            <div key={kpi.label} className={styles.kpiCard}>
              <div className={styles.kpiValue}>
                <CountUp
                  target={kpi.waarde}
                  active={phase >= 2 && props.playing}
                  finished={done || props.finished}
                />
              </div>
              <div className={styles.kpiLabel}>{kpi.label}</div>
            </div>
          ))}
        </div>
      </Reveal>
      <Reveal at={3} phase={phase}>
        <div className={styles.panel}>
          <div className={styles.panelTitle}>Live activiteit</div>
          <div className={styles.listRow}>
            <span className={styles.dotMuted} /> Offerte OFF-2026-017 geopend door klant
          </div>
          <Reveal at={4} phase={phase}>
            <div className={`${styles.listRow} ${styles.listRowHot}`}>
              <span className={styles.dotLive} /> Nieuwe aanvraag: {demoLead.naam}, {demoLead.dienst}
            </div>
          </Reveal>
        </div>
      </Reveal>
    </SceneShell>
  )
}
