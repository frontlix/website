'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Play, RotateCcw } from 'lucide-react'
import styles from './LeadDemo.module.css'
import Pipeline from './Pipeline'
import FormPanel from './panels/FormPanel'
import AIChatPanel from './panels/AIChatPanel'
import OfferteGenPanel from './panels/OfferteGenPanel'
import ControlePanel from './panels/ControlePanel'
import OfferteMailPanel from './panels/OfferteMailPanel'

/* Variable duration per step (in ms) */
const STEP_DURATIONS = [8500, 6000, 5000, 5000, 4000]
const RESTART_DELAY = 3000

export default function LeadDemo() {
  const [currentStep, setCurrentStep] = useState(0)
  const [showComplete, setShowComplete] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const sectionRef = useRef<HTMLElement>(null)
  const hasStarted = useRef(false)

  const clearAllTimers = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }, [])

  const startSequence = useCallback(() => {
    clearAllTimers()
    setCurrentStep(1)
    setShowComplete(false)

    const add = (fn: () => void, delay: number) => {
      timers.current.push(setTimeout(fn, delay))
    }

    /* Build cumulative timer chain from variable durations */
    let cumulative = 0
    for (let i = 0; i < STEP_DURATIONS.length; i++) {
      cumulative += STEP_DURATIONS[i]
      const nextStep = i + 2 // steps are 1-indexed; after step i+1, go to step i+2

      if (nextStep <= 5) {
        add(() => setCurrentStep(nextStep), cumulative)
      } else {
        /* After last step — show complete, then restart */
        add(() => setShowComplete(true), cumulative)
        add(() => {
          setResetKey((k) => k + 1)
          setCurrentStep(0)
          setShowComplete(false)
          timers.current.push(setTimeout(() => startSequence(), 100))
        }, cumulative + RESTART_DELAY)
      }
    }
  }, [clearAllTimers])

  const handleStepClick = useCallback(
    (stepId: number) => {
      clearAllTimers()
      setShowComplete(false)
      setResetKey((k) => k + 1)
      setCurrentStep(stepId)
    },
    [clearAllTimers]
  )

  const resetAndStart = useCallback(() => {
    setResetKey((k) => k + 1)
    startSequence()
  }, [startSequence])

  /* IntersectionObserver — auto-start when scrolled into view */
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted.current) {
          hasStarted.current = true
          startSequence()
        }
      },
      { threshold: 0.3 }
    )

    observer.observe(el)
    return () => {
      observer.disconnect()
      clearAllTimers()
    }
  }, [startSequence, clearAllTimers])

  return (
    <section ref={sectionRef} className={styles.wrapper}>
      <div className={styles.dashboard}>
        {/* Header */}
        <div className={styles.topBar}>
          <div className={styles.topBarLeft}>
            <h2 className={styles.heading}>
              Lead kwalificatie{' '}
              <span className={styles.accentWord}>demo</span>
            </h2>
            <p className={styles.subtitle}>
              Van formulier tot offerte · volledig automatisch
            </p>
          </div>
          <div className={styles.topBarRight}>
            <button className={styles.btnGhost} onClick={resetAndStart}>
              <RotateCcw size={14} />
              Opnieuw
            </button>
            <button className={styles.btnPrimary} onClick={resetAndStart}>
              <Play size={14} />
              Opnieuw
            </button>
          </div>
        </div>

        {/* 2-column layout */}
        <div className={styles.columns}>
          <Pipeline currentStep={currentStep} showComplete={showComplete} onStepClick={handleStepClick} />
          <div className={styles.panelContainer}>
            <FormPanel key={`form-${resetKey}`} isActive={currentStep === 1} />
            <AIChatPanel key={`ai-${resetKey}`} isActive={currentStep === 2} />
            <OfferteGenPanel key={`gen-${resetKey}`} isActive={currentStep === 3} />
            <ControlePanel key={`ctrl-${resetKey}`} isActive={currentStep === 4} />
            <OfferteMailPanel key={`mail-${resetKey}`} isActive={currentStep === 5} />
          </div>
        </div>
      </div>
    </section>
  )
}
