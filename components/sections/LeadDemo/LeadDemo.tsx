'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import styles from './LeadDemo.module.css'
import Pipeline from './Pipeline'
import FormPanel from './panels/FormPanel'
import AIChatPanel from './panels/AIChatPanel'
import OfferteGenPanel from './panels/OfferteGenPanel'
import ControlePanel from './panels/ControlePanel'
import OfferteMailPanel from './panels/OfferteMailPanel'

/* Variable duration per step (in ms) */
const STEP_DURATIONS = [1800, 8000, 3000, 2500, 1200]
const RESTART_DELAY = 1000

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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const resetAndStart = useCallback(() => {
    setResetKey((k) => k + 1)
    startSequence()
  }, [startSequence])

  /* IntersectionObserver — auto-start when scrolled into view */
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return

    // Reset on mount so hot-reload / re-mount always works
    hasStarted.current = false

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted.current) {
          hasStarted.current = true
          startSequence()
        }
      },
      { threshold: 0.05 }
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
        {/* Glow flare hugging the left edge of the dashboard */}
        <Image
          src="/images/flare-blue.png"
          alt=""
          aria-hidden="true"
          width={400}
          height={800}
          className={styles.flareRight}
        />

        <div className={styles.columns}>
          {/* Section header: separate element for mobile reordering */}
          <div className={styles.sectionHeader}>
            <h2 className={styles.heading}>
              Zo werkt{' '}
              <span className={styles.accentWord}>het!</span>
            </h2>
            <p className={styles.subtitle}>
              Van formulier tot offerte · volledig automatisch
            </p>
          </div>

          {/* Left column: pipeline */}
          <div className={styles.leftCol}>
            <Pipeline currentStep={currentStep} showComplete={showComplete} onStepClick={handleStepClick} />
          </div>

          {/* Right column: animation panels */}
          <div className={styles.panelContainer}>
            <FormPanel key={`form-${resetKey}`} isActive={currentStep === 1} />
            <AIChatPanel key={`ai-${resetKey}`} isActive={currentStep === 2} />
            <OfferteGenPanel key={`gen-${resetKey}`} isActive={currentStep === 3} />
            <ControlePanel key={`ctrl-${resetKey}`} isActive={currentStep === 4} />
            <OfferteMailPanel key={`mail-${resetKey}`} isActive={currentStep === 5} />
          </div>
        </div>

        {/* Glow flare hugging the right edge of the dashboard */}
        <Image
          src="/images/flare-blue.png"
          alt=""
          aria-hidden="true"
          width={400}
          height={800}
          className={styles.flareLeft}
        />
      </div>
    </section>
  )
}
