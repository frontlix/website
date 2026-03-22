'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import styles from './SettingsIllustration.module.css'

const states = [
  { t1: true, t2: true, t3: false, s1: 20, s2: 65, select: 'Installatiebedrijf' },
  { t1: true, t2: false, t3: true, s1: 75, s2: 40, select: 'Schildersbedrijf' },
  { t1: true, t2: true, t3: true, s1: 55, s2: 80, select: 'Dakdekker' },
  { t1: false, t2: true, t3: false, s1: 30, s2: 55, select: 'Hoveniersbedrijf' },
]

export default function SettingsIllustration() {
  const [step, setStep] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const hasStarted = useRef(false)

  const startCycle = useCallback(() => {
    if (hasStarted.current) return
    hasStarted.current = true
    intervalRef.current = setInterval(() => {
      setStep(prev => (prev + 1) % states.length)
    }, 2200)
  }, [])

  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          startCycle()
          observer.disconnect()
        }
      },
      { threshold: 0.2 }
    )

    observer.observe(el)
    return () => {
      observer.disconnect()
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [startCycle])

  const s = states[step]

  return (
    <div ref={wrapperRef} className={styles.wrapper}>
      <div className={styles.settingsCard}>
        {/* Window chrome */}
        <div className={styles.cardBar}>
          <div className={`${styles.dot} ${styles.dotR}`} />
          <div className={`${styles.dot} ${styles.dotY}`} />
          <div className={`${styles.dot} ${styles.dotG}`} />
          <span className={styles.cardTitle}>Instellingen</span>
        </div>

        {/* Toggle: WhatsApp */}
        <div className={styles.row}>
          <span className={styles.label}>WhatsApp actief</span>
          <div className={`${styles.toggleWrap} ${s.t1 ? styles.toggleOn : ''}`}>
            <div className={styles.toggleKnob} />
          </div>
        </div>

        {/* Toggle: Automatisch reageren */}
        <div className={styles.row}>
          <span className={styles.label}>Automatisch reageren</span>
          <div className={`${styles.toggleWrap} ${s.t2 ? styles.toggleOn : ''}`}>
            <div className={styles.toggleKnob} />
          </div>
        </div>

        {/* Toggle: Offerte sturen */}
        <div className={styles.row}>
          <span className={styles.label}>Offerte sturen</span>
          <div className={`${styles.toggleWrap} ${s.t3 ? styles.toggleOn : ''}`}>
            <div className={styles.toggleKnob} />
          </div>
        </div>

        <div className={styles.divider} />

        {/* Slider: Reactietijd */}
        <div className={styles.row}>
          <span className={styles.label}>Reactietijd</span>
          <div className={styles.sliderWrap}>
            <div className={styles.sliderTrack}>
              <div className={styles.sliderFill} style={{ width: `${s.s1}%` }} />
            </div>
            <div className={styles.sliderThumb} style={{ left: `${s.s1}%` }} />
          </div>
        </div>

        {/* Slider: Toon */}
        <div className={styles.row}>
          <span className={styles.label}>Toon</span>
          <div className={styles.sliderWrap}>
            <div className={styles.sliderTrack}>
              <div className={styles.sliderFill} style={{ width: `${s.s2}%` }} />
            </div>
            <div className={styles.sliderThumb} style={{ left: `${s.s2}%` }} />
          </div>
        </div>

        <div className={styles.divider} />

        {/* Dropdown: Branche */}
        <div className={styles.row}>
          <span className={styles.label}>Branche</span>
          <div className={styles.selectBox}>
            <span>{s.select}</span>
            <span>▾</span>
          </div>
        </div>
      </div>
    </div>
  )
}
