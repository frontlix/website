'use client'

import { Component, useEffect, useState, type ReactNode } from 'react'
import posthog from 'posthog-js'
import { Check, Pause, Play, SkipBack, SkipForward, X } from 'lucide-react'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { DEMO_TOUR_STEPS } from './steps'
import { cumulativeStarts } from './timeline'
import styles from './DemoTour.module.css'

const DURS = DEMO_TOUR_STEPS.map((s) => s.durSec)
const STARTS = cumulativeStarts(DURS)
const TOTAL_SEC = STARTS[STARTS.length - 1]
const TOUR_TOTAL = DEMO_TOUR_STEPS.filter((s) => s.kind === 'tour').length

type DemoTourProps = {
  /** sluiten zonder afronden (kruisje rechtsboven, "Sla over") */
  onClose: () => void
  /** afronden op het slotscherm ("Start met instellen") */
  onFinish: () => void
}

/**
 * Zelf-afspelende rondleiding in videovorm: hoofdstukken spelen
 * automatisch achter elkaar, met onderaan een bedieningsbalk met
 * vorige/afspelen-pauzeren/volgende, een doorlopende tijdbalk met
 * klikbare hoofdstukpunten en een teller.
 */
export function DemoTour({ onClose, onFinish }: DemoTourProps) {
  const [chapter, setChapter] = useState(0)
  /** verstreken seconden binnen het huidige hoofdstuk */
  const [elapsed, setElapsed] = useState(0)
  const [paused, setPaused] = useState(false)
  const [ended, setEnded] = useState(false)
  // teller zorgt dat een (opnieuw) bezocht hoofdstuk zijn animatie opnieuw afspeelt
  const [playKey, setPlayKey] = useState(0)
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  const step = DEMO_TOUR_STEPS[chapter]
  const isLast = chapter === DEMO_TOUR_STEPS.length - 1

  // hoofdstukklok: tikt zolang er afgespeeld wordt, pauze bevriest alles
  useEffect(() => {
    if (paused || ended) return
    const timer = setInterval(() => setElapsed((e) => e + 0.1), 100)
    return () => clearInterval(timer)
  }, [paused, ended, playKey])

  // autoplay: door naar het volgende hoofdstuk zodra de duur is bereikt
  useEffect(() => {
    if (elapsed < step.durSec) return
    if (isLast) {
      setEnded(true)
      return
    }
    goTo(chapter + 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed])

  useEffect(() => {
    posthog.capture('demo_tour_started')
  }, [])

  useEffect(() => {
    posthog.capture('demo_tour_step_viewed', { step: chapter + 1 })
  }, [chapter])

  const goTo = (index: number) => {
    const next = Math.max(0, Math.min(DEMO_TOUR_STEPS.length - 1, index))
    setChapter(next)
    setElapsed(0)
    setEnded(false)
    setPlayKey((k) => k + 1)
  }

  const skip = () => {
    posthog.capture('demo_tour_skipped', { step: chapter + 1 })
    onClose()
  }

  const finish = () => {
    posthog.capture('demo_tour_completed')
    onFinish()
  }

  // doorlopende voortgang over alle hoofdstukken heen (0..1)
  const overall = (STARTS[chapter] + Math.min(elapsed, step.durSec)) / TOTAL_SEC

  const tourIndex = DEMO_TOUR_STEPS.slice(0, chapter + 1).filter((s) => s.kind === 'tour').length
  const counter =
    step.kind === 'welcome' ? 'Welkom' : step.kind === 'outro' ? 'Klaar' : `Stap ${tourIndex} van ${TOUR_TOTAL}`

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" aria-label="Rondleiding door Frontlix">
      <div className={styles.frame}>
        <header className={styles.header}>
          <div className={styles.headerTitle}>Rondleiding door Frontlix</div>
          <button type="button" onClick={skip} className={styles.skipBtn} aria-label="Sla over">
            <X size={16} /> Sla over
          </button>
        </header>

        <div className={styles.body}>
          <div className={styles.stageArea}>
            <SceneErrorBoundary key={`boundary-${playKey}`} onSkip={skip}>
              <step.Scene
                key={`scene-${playKey}`}
                playing={!paused && !ended}
                finished={reducedMotion}
                onSceneEnd={() => undefined}
              />
            </SceneErrorBoundary>
          </div>

          <aside className={styles.explain}>
            <div className={styles.explainKicker}>{counter}</div>
            <h2 className={styles.explainTitle}>{step.title}</h2>
            <p className={styles.explainBody}>{step.uitleg}</p>
            {step.bullets.length > 0 && (
              <ul className={styles.bullets}>
                {step.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            )}
            {step.kind === 'outro' && (
              <button
                type="button"
                onClick={finish}
                className={`${styles.btnPrimary} ${ended ? styles.btnPulse : ''}`}
              >
                <Check size={14} /> Start met instellen
              </button>
            )}
          </aside>
        </div>

        <div className={styles.controls}>
          <button
            type="button"
            onClick={() => goTo(chapter - 1)}
            className={styles.ctrlBtn}
            disabled={chapter === 0}
            aria-label="Vorig hoofdstuk"
          >
            <SkipBack size={15} />
          </button>
          <button
            type="button"
            onClick={() => (ended ? goTo(0) : setPaused((p) => !p))}
            className={`${styles.ctrlBtn} ${styles.playBtn}`}
            aria-label={ended ? 'Opnieuw afspelen' : paused ? 'Afspelen' : 'Pauzeren'}
          >
            {paused || ended ? <Play size={18} /> : <Pause size={18} />}
          </button>
          <button
            type="button"
            onClick={() => goTo(chapter + 1)}
            className={styles.ctrlBtn}
            disabled={isLast}
            aria-label="Volgend hoofdstuk"
          >
            <SkipForward size={15} />
          </button>

          <div className={styles.timeline}>
            <div className={styles.timelineRail} />
            <div className={styles.timelineFill} style={{ width: `${overall * 100}%` }} />
            {DEMO_TOUR_STEPS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => goTo(i)}
                className={`${styles.dot} ${i < chapter ? styles.dotDone : ''} ${i === chapter ? styles.dotActive : ''}`}
                style={{ left: `${(STARTS[i] / TOTAL_SEC) * 100}%` }}
                title={s.menuLabel}
                aria-label={`Naar hoofdstuk: ${s.menuLabel}`}
              />
            ))}
          </div>

          <div className={styles.counter}>{counter}</div>
        </div>
      </div>
    </div>
  )
}

/**
 * Vangt renderfouten in een scène af zodat niemand vast komt te zitten
 * vóór de wizard (spec §5). Key-remount per hoofdstuk reset de boundary.
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
          <p>Er ging iets mis bij het afspelen van dit hoofdstuk.</p>
          <button type="button" onClick={this.props.onSkip} className={styles.btnSecondary}>
            Sla de rondleiding over
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
