'use client'

import type { SceneProps } from '../types'
import { demoStats } from '../demo-data'
import { useSceneTimeline } from '../useSceneTimeline'
import { CountUp, Reveal, SceneShell, type CameraFrame } from './SceneShell'
import styles from './scenes.module.css'

// fase 1: lijn tekent zichzelf (camera start ingezoomd op de grafiek),
// fase 2: uitzoomen en de conversiecijfers tellen op
const DURATIONS = [1600, 1100]

const CAMERA: readonly CameraFrame[] = [
  { scale: 1.18, x: 55, y: 32 }, // start ingezoomd op de grafiek
  { scale: 1.18, x: 55, y: 32 },
  { scale: 1, x: 50, y: 50 }, // uitzoomen zodra de cijfers verschijnen
]

export function StatistiekenScene(props: SceneProps) {
  const phase = useSceneTimeline(DURATIONS, props)
  const done = phase >= DURATIONS.length
  const points = demoStats.lijn.map((y, i) => `${8 + i * 32},${y}`).join(' ')
  return (
    <SceneShell title="Analyses" phase={phase} camera={CAMERA}>
      <div data-paused={!props.playing}>
        <svg viewBox="0 0 240 60" className={styles.chart} aria-hidden="true">
          <polyline
            points={points}
            className={`${styles.chartLine} ${done || props.finished ? styles.chartLineDone : ''}`}
          />
        </svg>
      </div>
      <Reveal at={1} phase={phase}>
        <div className={styles.statRow}>
          {demoStats.conversie.map((stat) => (
            <div key={stat.label} className={styles.kpiCard}>
              <div className={styles.kpiValue}>
                <CountUp
                  target={stat.waarde}
                  active={phase >= 1 && props.playing}
                  finished={done || props.finished}
                  suffix="%"
                />
              </div>
              <div className={styles.kpiLabel}>{stat.label}</div>
            </div>
          ))}
        </div>
      </Reveal>
    </SceneShell>
  )
}
