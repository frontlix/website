'use client'

import type { SceneProps } from '../types'
import { demoAfspraak } from '../demo-data'
import { useSceneTimeline } from '../useSceneTimeline'
import { Reveal, SceneShell, type CameraFrame, type CursorMark } from './SceneShell'
import styles from './scenes.module.css'

// fase 1: weekgrid, fase 2: afspraak verschijnt (camera zoomt op donderdag),
// fase 3: muis wijst de afspraak aan, fase 4: route-melding (camera weer uit)
const DURATIONS = [700, 1100, 800, 1000]
const DAGEN = ['Ma', 'Di', 'Wo', 'Do', 'Vr']

const FULL: CameraFrame = { scale: 1, x: 50, y: 50 }
const CAMERA: readonly CameraFrame[] = [
  FULL,
  FULL,
  { scale: 1.28, x: 68, y: 38 }, // inzoomen op de donderdag-kolom
  { scale: 1.28, x: 68, y: 38 },
  FULL,
]
const CURSOR: readonly CursorMark[] = [
  { x: 50, y: 50, hidden: true },
  { x: 50, y: 50, hidden: true },
  { x: 50, y: 50, hidden: true },
  { x: 70, y: 36 }, // wijst de nieuwe afspraak aan
  { x: 70, y: 36 },
]

export function AgendaScene(props: SceneProps) {
  const phase = useSceneTimeline(DURATIONS, props)
  return (
    <SceneShell title="Agenda" phase={phase} camera={CAMERA} cursor={CURSOR}>
      <Reveal at={1} phase={phase}>
        <div className={styles.calGrid}>
          {DAGEN.map((dag) => (
            <div key={dag} className={styles.calDay}>
              <div className={styles.calDayName}>{dag}</div>
              {dag === 'Di' && (
                <div className={styles.calEventMuted}>09:00 Bakkerij De Korenbloem</div>
              )}
              {dag === demoAfspraak.dag && (
                <Reveal at={2} phase={phase}>
                  <div className={styles.calEvent}>
                    {demoAfspraak.tijd} {demoAfspraak.titel}
                  </div>
                </Reveal>
              )}
            </div>
          ))}
        </div>
      </Reveal>
      <Reveal at={4} phase={phase}>
        <div className={styles.noticeRow}>
          <span className={styles.dotLive} /> Rijroute voor donderdag berekend: 28 minuten, 2 stops
        </div>
      </Reveal>
    </SceneShell>
  )
}
