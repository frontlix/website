'use client'

import { Sparkles } from 'lucide-react'
import type { SceneProps } from '../types'
import { useSceneTimeline } from '../useSceneTimeline'
import { Reveal, SceneShell } from './SceneShell'
import styles from './scenes.module.css'

// fase 1: icoon, fase 2: titel, fase 3: subtekst
const DURATIONS = [600, 900, 900]

export function WelkomScene(props: SceneProps) {
  const phase = useSceneTimeline(DURATIONS, props)
  return (
    <SceneShell title="Welkom">
      <div className={styles.centerCol}>
        <Reveal at={1} phase={phase}>
          <div className={styles.heroIcon}>
            <Sparkles size={26} />
          </div>
        </Reveal>
        <Reveal at={2} phase={phase}>
          <div className={styles.heroTitle}>Dit is jouw Frontlix-dashboard</div>
        </Reveal>
        <Reveal at={3} phase={phase}>
          <div className={styles.heroSub}>
            We volgen zo één aanvraag door het hele product, van eerste bericht tot review.
            De rondleiding speelt vanzelf af, pauzeren of terugspoelen kan altijd via de balk onderaan.
          </div>
        </Reveal>
      </div>
    </SceneShell>
  )
}
