'use client'

import type { SceneProps } from '../types'
import { demoAfspraak } from '../demo-data'
import { useSceneTimeline } from '../useSceneTimeline'
import { Reveal, SceneShell } from './SceneShell'
import styles from './scenes.module.css'

// fase 1: weekgrid, fase 2: afspraak verschijnt, fase 3: route-melding
const DURATIONS = [700, 1100, 1000]
const DAGEN = ['Ma', 'Di', 'Wo', 'Do', 'Vr']

export function AgendaScene(props: SceneProps) {
  const phase = useSceneTimeline(DURATIONS, props)
  return (
    <SceneShell title="Agenda">
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
      <Reveal at={3} phase={phase}>
        <div className={styles.noticeRow}>
          <span className={styles.dotLive} /> Rijroute voor donderdag berekend: 28 minuten, 2 stops
        </div>
      </Reveal>
    </SceneShell>
  )
}
