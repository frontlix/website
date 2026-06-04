'use client'

import { Star } from 'lucide-react'
import type { SceneProps } from '../types'
import { demoReview } from '../demo-data'
import { useSceneTimeline } from '../useSceneTimeline'
import { Reveal, SceneShell } from './SceneShell'
import styles from './scenes.module.css'

// fase 1: verzoek-melding, fase 2: reviewkaart, fase 3: sterren vullen, fase 4: reviewtekst
const DURATIONS = [900, 1000, 1100, 900]

export function ReviewsScene(props: SceneProps) {
  const phase = useSceneTimeline(DURATIONS, props)
  return (
    <SceneShell title="Reviews">
      <Reveal at={1} phase={phase}>
        <div className={styles.noticeRow}>
          <span className={styles.dotMuted} /> Klus afgerond, Frontlix stuurt automatisch een
          review-verzoek
        </div>
      </Reveal>
      <Reveal at={2} phase={phase}>
        <div className={styles.reviewCard}>
          <div className={styles.panelTitle}>{demoReview.naam}</div>
          <div className={styles.stars}>
            {Array.from({ length: 5 }, (_, i) => (
              <Star
                key={i}
                size={18}
                className={phase >= 3 ? styles.starFill : styles.starEmpty}
                style={{ transitionDelay: `${i * 120}ms` }}
              />
            ))}
          </div>
          <Reveal at={4} phase={phase}>
            <p className={styles.reviewText}>{demoReview.tekst}</p>
          </Reveal>
        </div>
      </Reveal>
    </SceneShell>
  )
}
