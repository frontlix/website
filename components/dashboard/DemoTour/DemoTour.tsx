'use client'

import { Component, useEffect, useState, type ReactNode } from 'react'
import posthog from 'posthog-js'
import { Check, ChevronLeft, ChevronRight, Pause, Play, X } from 'lucide-react'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { DEMO_TOUR_STEPS } from './steps'
import { createTourState, goToStep, isLastStep, nextStep, prevStep, type TourState } from './tour-state'
import styles from './DemoTour.module.css'

type DemoTourProps = {
  /** sluiten zonder afronden (kruisje rechtsboven, "Sla over") */
  onClose: () => void
  /** afronden op de laatste stap ("Start met instellen") */
  onFinish: () => void
}

export function DemoTour({ onClose, onFinish }: DemoTourProps) {
  const [tour, setTour] = useState(() => createTourState(DEMO_TOUR_STEPS.length))
  const [paused, setPaused] = useState(false)
  const [sceneDone, setSceneDone] = useState(false)
  // teller zorgt dat een (opnieuw) bezochte stap zijn animatie opnieuw afspeelt
  const [playKey, setPlayKey] = useState(0)
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  const step = DEMO_TOUR_STEPS[tour.stepIndex]

  useEffect(() => {
    posthog.capture('demo_tour_started')
  }, [])

  useEffect(() => {
    posthog.capture('demo_tour_step_viewed', { step: tour.stepIndex + 1 })
  }, [tour.stepIndex])

  const navigate = (next: TourState) => {
    if (next === tour) return
    setTour(next)
    setSceneDone(false)
    setPlayKey((k) => k + 1)
  }

  const skip = () => {
    posthog.capture('demo_tour_skipped', { step: tour.stepIndex + 1 })
    onClose()
  }

  const finish = () => {
    posthog.capture('demo_tour_completed')
    onFinish()
  }

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" aria-label="Rondleiding door Frontlix">
      <div className={styles.frame}>
        <header className={styles.header}>
          <div className={styles.headerTitle}>Rondleiding door Frontlix</div>
          <div className={styles.stepCounter}>
            Stap {tour.stepIndex + 1} van {DEMO_TOUR_STEPS.length}
          </div>
          <button type="button" onClick={skip} className={styles.skipBtn} aria-label="Sla over">
            <X size={16} /> Sla over
          </button>
        </header>

        <div className={styles.body}>
          <nav className={styles.stepsNav} aria-label="Stappen">
            {DEMO_TOUR_STEPS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => navigate(goToStep(tour, i))}
                className={`${styles.stepItem} ${i === tour.stepIndex ? styles.stepActive : ''}`}
              >
                <span className={styles.stepIcon}>
                  {tour.visited[i] && i !== tour.stepIndex ? <Check size={13} /> : <s.Icon size={13} />}
                </span>
                <span>
                  {i + 1}. {s.menuLabel}
                </span>
              </button>
            ))}
            <button type="button" onClick={() => setPaused((p) => !p)} className={styles.pauseBtn}>
              {paused ? <Play size={13} /> : <Pause size={13} />} {paused ? 'Hervat' : 'Pauze'}
            </button>
          </nav>

          <div className={styles.stageWrap}>
            <div className={styles.stageArea}>
              <SceneErrorBoundary key={`boundary-${playKey}`} onSkip={skip}>
                <step.Scene
                  key={`scene-${playKey}`}
                  playing={!paused}
                  finished={reducedMotion}
                  onSceneEnd={() => setSceneDone(true)}
                />
              </SceneErrorBoundary>
            </div>

            <div className={styles.explain}>
              <h2 className={styles.explainTitle}>{step.title}</h2>
              <p className={styles.explainBody}>{step.uitleg}</p>
              <div className={styles.controls}>
                {tour.stepIndex > 0 ? (
                  <button
                    type="button"
                    onClick={() => navigate(prevStep(tour))}
                    className={styles.btnSecondary}
                  >
                    <ChevronLeft size={14} /> Vorige
                  </button>
                ) : (
                  <span />
                )}
                {isLastStep(tour) ? (
                  <button
                    type="button"
                    onClick={finish}
                    className={`${styles.btnPrimary} ${sceneDone ? styles.btnPulse : ''}`}
                  >
                    <Check size={14} /> Start met instellen
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate(nextStep(tour))}
                    className={`${styles.btnPrimary} ${sceneDone ? styles.btnPulse : ''}`}
                  >
                    Volgende <ChevronRight size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Vangt renderfouten in een scène af zodat niemand vast komt te zitten
 * vóór de wizard (spec §5). Key-remount per stap reset de boundary.
 */
class SceneErrorBoundary extends Component<{ onSkip: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (this.state.failed) {
      return (
        <div className={styles.sceneError}>
          <p>Er ging iets mis bij het afspelen van deze stap.</p>
          <button type="button" onClick={this.props.onSkip} className={styles.btnSecondary}>
            Sla de rondleiding over
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
