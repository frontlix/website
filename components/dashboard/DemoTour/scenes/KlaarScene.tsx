'use client'

import { Check } from 'lucide-react'
import type { SceneProps } from '../types'
import { useSceneTimeline } from '../useSceneTimeline'
import { Reveal, SceneShell } from './SceneShell'
import styles from './scenes.module.css'

// fases 1 t/m 4: checklist-items verschijnen één voor één
const DURATIONS = [700, 700, 700, 700]
const ITEMS = ['Bedrijfsgegevens en logo', 'Diensten en prijzen', 'WhatsApp-koppeling', 'Toon van de bot']

export function KlaarScene(props: SceneProps) {
  const phase = useSceneTimeline(DURATIONS, props)
  return (
    <SceneShell title="Klaar voor de start">
      <div className={styles.centerCol}>
        <div className={styles.heroTitle}>Nu jij nog!</div>
        <div className={styles.checkList}>
          {ITEMS.map((item, i) => (
            <Reveal key={item} at={i + 1} phase={phase}>
              <div className={styles.checkItem}>
                <Check size={14} /> {item}
              </div>
            </Reveal>
          ))}
        </div>
        <div className={styles.heroSub}>
          Klik op Start met instellen, dan lopen we deze punten samen door.
        </div>
      </div>
    </SceneShell>
  )
}
