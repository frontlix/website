'use client'

import type { SceneProps } from '../types'
import { useSceneTimeline } from '../useSceneTimeline'
import { Reveal, SceneShell, type CameraFrame, type CursorMark } from './SceneShell'
import styles from './scenes.module.css'

// fase 1: bot-paneel verschijnt, fase 2: muis klikt de toon "Vriendelijk"
// aan, fase 3: diensten en prijzen verschijnen, fase 4: WhatsApp-status
const DURATIONS = [800, 1000, 1100, 1000]

const FULL: CameraFrame = { scale: 1, x: 50, y: 50 }
const CAMERA: readonly CameraFrame[] = [
  FULL,
  { scale: 1.18, x: 45, y: 30 }, // inzoomen op het bot-paneel
  { scale: 1.18, x: 45, y: 30 },
  { scale: 1, x: 50, y: 55 },
  FULL,
]
const CURSOR: readonly CursorMark[] = [
  { x: 50, y: 50, hidden: true },
  { x: 38, y: 34 }, // naar de toon-optie
  { x: 38, y: 34, click: true },
  { x: 38, y: 60 },
  { x: 38, y: 60, hidden: true },
]

export function InstellingenScene(props: SceneProps) {
  const phase = useSceneTimeline(DURATIONS, props)
  return (
    <SceneShell title="Instellingen" phase={phase} camera={CAMERA} cursor={CURSOR}>
      <Reveal at={1} phase={phase}>
        <div className={styles.panel}>
          <div className={styles.panelTitle}>Surface, jouw assistent</div>
          <div className={styles.listRow}>
            Toon van de bot
            <span className={`${styles.badge} ${phase < 2 ? styles.badgeMuted : ''}`}>
              Vriendelijk
            </span>
          </div>
          <div className={styles.listRow}>
            <span className={styles.dotMuted} /> Welkomstbericht en openingstijden
          </div>
        </div>
      </Reveal>
      <Reveal at={3} phase={phase}>
        <div className={styles.panel}>
          <div className={styles.panelTitle}>Diensten en prijzen</div>
          <div className={styles.docRow}>
            <span>Gevelreiniging</span>
            <strong>€ 3,50 per m²</strong>
          </div>
          <div className={styles.docRow}>
            <span>Glasbewassing</span>
            <strong>€ 4,00 per raam</strong>
          </div>
        </div>
      </Reveal>
      <Reveal at={4} phase={phase}>
        <div className={styles.statusPill}>WhatsApp gekoppeld</div>
      </Reveal>
    </SceneShell>
  )
}
