'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import {
  ClipboardList,
  Bot,
  FileText,
  UserCheck,
  Send,
} from 'lucide-react'
import styles from './Pipeline.module.css'

const PIPELINE_STEPS = [
  { id: 1, icon: ClipboardList, title: 'Formulier ingediend', subtitle: 'Lead binnengehaald' },
  { id: 2, icon: Bot, title: 'AI start gesprek', subtitle: 'Frontlix AI actief' },
  { id: 3, icon: FileText, title: 'Offerte opstellen', subtitle: 'Document gegenereerd' },
  { id: 4, icon: UserCheck, title: 'Controle eigenaar', subtitle: 'Wacht op goedkeuring' },
  { id: 5, icon: Send, title: 'Offerte verstuurd', subtitle: 'Email verzonden' },
]

interface PipelineProps {
  currentStep: number
  showComplete: boolean
  onStepClick?: (stepId: number) => void
}

export default function Pipeline({ currentStep, showComplete, onStepClick }: PipelineProps) {
  const stepsListRef = useRef<HTMLDivElement>(null)
  const circleRefs = useRef<(HTMLDivElement | null)[]>([])
  const [trackStyle, setTrackStyle] = useState<{ top: number; height: number }>({ top: 0, height: 0 })
  const [lineStyle, setLineStyle] = useState<{ top: number; height: number }>({ top: 0, height: 0 })

  const setCircleRef = useCallback((el: HTMLDivElement | null, idx: number) => {
    circleRefs.current[idx] = el
  }, [])

  /* Measure actual circle centers and compute line position */
  useEffect(() => {
    const container = stepsListRef.current
    if (!container) return

    const circles = circleRefs.current
    const firstCircle = circles[0]
    if (!firstCircle) return

    const containerRect = container.getBoundingClientRect()
    const firstRect = firstCircle.getBoundingClientRect()
    const firstCenter = firstRect.top + firstRect.height / 2 - containerRect.top

    const lastCircle = circles[PIPELINE_STEPS.length - 1]
    if (lastCircle) {
      const lastRect = lastCircle.getBoundingClientRect()
      const lastCenter = lastRect.top + lastRect.height / 2 - containerRect.top
      setTrackStyle({ top: firstCenter, height: lastCenter - firstCenter })
    }

    if (currentStep <= 1) {
      setLineStyle({ top: firstCenter, height: 0 })
      return
    }

    const activeIdx = Math.min(currentStep, PIPELINE_STEPS.length) - 1
    const activeCircle = circles[activeIdx]
    if (!activeCircle) return

    const activeRect = activeCircle.getBoundingClientRect()
    const activeCenter = activeRect.top + activeRect.height / 2 - containerRect.top

    setLineStyle({ top: firstCenter, height: activeCenter - firstCenter })
  }, [currentStep])

  return (
    <div className={styles.column}>
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.headerLeft}>
          <Image src="/logo.png" alt="Frontlix" width={30} height={30} className={styles.headerIcon} />
          <span className={styles.headerTitle}>Automatisering pipeline</span>
        </span>
        <span className={`${styles.completeBadge} ${showComplete ? styles.completeVisible : ''}`}>
          ✓ compleet
        </span>
      </div>

      {/* Steps */}
      <div ref={stepsListRef} className={styles.stepsList}>
        {/* Progress track — background line from first to last circle */}
        <div
          className={styles.progressTrack}
          style={{ top: trackStyle.top, height: trackStyle.height }}
        />

        {/* Progress fill — positioned dynamically to stop at active circle center */}
        <div
          className={styles.progressFill}
          style={{ top: lineStyle.top, height: lineStyle.height }}
        />

        {PIPELINE_STEPS.map((step, idx) => {
          const isDone = currentStep > step.id
          const isActive = currentStep === step.id
          const Icon = step.icon

          return (
            <div
              key={step.id}
              className={styles.stepRow}
              onClick={() => onStepClick?.(step.id)}
            >
              {/* Circle indicator */}
              <div
                ref={(el) => setCircleRef(el, idx)}
                className={`${styles.circle} ${
                  isDone ? styles.circleDone : isActive ? styles.circleActive : styles.circleFuture
                }`}
              >
                {isDone && (
                  <svg className={styles.checkSvg} viewBox="0 0 12 12">
                    <path className={styles.checkPath} d="M2.5 6.5L5 9L9.5 3.5" />
                  </svg>
                )}
              </div>

              {/* Card */}
              <div
                className={`${styles.card} ${
                  isDone ? styles.cardDone : isActive ? styles.cardActive : ''
                }`}
              >
                <span className={styles.cardIcon}>
                  <Icon size={16} />
                </span>
                <div className={styles.cardInfo}>
                  <span className={styles.cardTitle}>{step.title}</span>
                  <span className={styles.cardSubtitle}>{step.subtitle}</span>
                </div>
                <span className={`${styles.klarBadge} ${isDone ? styles.klarVisible : ''}`}>
                  KLAAR
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
