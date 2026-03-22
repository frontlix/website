'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import styles from './AutomationIllustration.module.css'

/* Milestones (percentage) where steps appear and get checked */
const STEP_SHOW = [5, 38, 72]
const CHECK_MARK = [28, 65, 98]

export default function AutomationIllustration() {
  const [pct, setPct] = useState(0)
  const phaseRef = useRef(0) // 0 = filling, 1 = pause, 2 = reset
  const pctRef = useRef(0)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hasStarted = useRef(false)

  const startAnimation = useCallback(() => {
    if (hasStarted.current) return
    hasStarted.current = true

    intervalRef.current = setInterval(() => {
      const phase = phaseRef.current

      if (phase === 0) {
        pctRef.current += 0.8
        if (pctRef.current >= 100) {
          pctRef.current = 100
          phaseRef.current = 1
          setTimeout(() => {
            phaseRef.current = 2
          }, 1400)
        }
        setPct(pctRef.current)
      } else if (phase === 2) {
        /* Reset */
        pctRef.current = 0
        phaseRef.current = 0
        setPct(0)
      }
    }, 22)
  }, [])

  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          startAnimation()
        }
      },
      { threshold: 0.2 }
    )

    observer.observe(el)
    return () => {
      observer.disconnect()
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [startAnimation])

  const rounded = Math.round(pct)

  return (
    <div ref={wrapperRef} className={styles.wrapper}>
      <div className={styles.card}>
        {/* Steps */}
        <div className={styles.steps}>
          {/* Step 1 — Lead binnenkomt */}
          <div className={`${styles.step} ${pct >= STEP_SHOW[0] ? styles.visible : ''}`}>
            <div className={`${styles.stepIcon} ${styles.blue}`}>
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                <rect x="2" y="4" width="14" height="10" rx="2" stroke="#2563eb" strokeWidth="1.6" />
                <path d="M2 6.5l7 4.5 7-4.5" stroke="#2563eb" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </div>
            <span className={styles.stepLabel}>Lead binnenkomt</span>
            <div className={`${styles.stepCheck} ${pct >= CHECK_MARK[0] ? styles.done : ''}`}>
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          {/* Step 2 — Automatisch verwerkt */}
          <div className={`${styles.step} ${pct >= STEP_SHOW[1] ? styles.visible : ''}`}>
            <div className={`${styles.stepIcon} ${styles.yellow}`}>
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                <path d="M10.5 2L4 10h5.5L7.5 16 14 8H8.5L10.5 2z" stroke="#3b82f6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className={styles.stepLabel}>Automatisch verwerkt</span>
            <div className={`${styles.stepCheck} ${pct >= CHECK_MARK[1] ? styles.done : ''}`}>
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          {/* Step 3 — Offerte verstuurd */}
          <div className={`${styles.step} ${pct >= STEP_SHOW[2] ? styles.visible : ''}`}>
            <div className={`${styles.stepIcon} ${styles.green}`}>
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                <path d="M3 9l4.5 4.5L15 5" stroke="#1d4ed8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className={styles.stepLabel}>Offerte verstuurd</span>
            <div className={`${styles.stepCheck} ${pct >= CHECK_MARK[2] ? styles.done : ''}`}>
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className={styles.progressWrap}>
          <div className={styles.progressLabel}>
            <span className={styles.progressTitle}>Automatisch</span>
            <span className={styles.progressPct}>{rounded}%</span>
          </div>
          <div className={styles.barTrack}>
            <div className={styles.barFill} style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    </div>
  )
}
