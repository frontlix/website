'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import styles from './WhatsAppIllustration.module.css'

const bubbles = [
  {
    id: 'b1',
    type: 'in' as const,
    text: 'Super. Om hoeveel m² gaat het ongeveer? Denk aan je oprit, terras of pad. 🏠',
    time: '14:02',
  },
  {
    id: 'b2',
    type: 'out' as const,
    text: 'Ik schat zo\'n 60 m²',
    time: '14:03',
  },
  {
    id: 'b3',
    type: 'in' as const,
    text: 'Duidelijk! Wanneer wil je dit het liefst gedaan hebben?',
    time: '14:03',
  },
  {
    id: 'b4',
    type: 'out' as const,
    text: 'Het liefst voor het einde van de maand.',
    time: '14:04',
  },
  {
    id: 'b5',
    type: 'in' as const,
    text: 'Goed te horen. Heb je al foto\'s van de situatie? Dan kan ik de offerte nog nauwkeuriger maken. 📸',
    time: '14:04',
  },
]

const BUBBLE_DELAYS = [200, 600, 1100, 1600, 2100]
const TOTAL = 60
const CIRCUMFERENCE = 2 * Math.PI * 45

export default function WhatsAppIllustration() {
  const [visibleBubbles, setVisibleBubbles] = useState<Set<string>>(new Set())
  const [showTyping, setShowTyping] = useState(false)
  const [timerCount, setTimerCount] = useState(60)
  const sectionRef = useRef<HTMLDivElement>(null)
  const hasStarted = useRef(false)

  const startAnimation = useCallback(() => {
    if (hasStarted.current) return
    hasStarted.current = true

    // Show bubbles with staggered delays
    bubbles.forEach((bubble, i) => {
      setTimeout(() => {
        setVisibleBubbles(prev => new Set(prev).add(bubble.id))
      }, BUBBLE_DELAYS[i])
    })

    // Show typing indicator
    setTimeout(() => setShowTyping(true), 2700)

    // Timer countdown (60 ticks × 60ms = 3.6s)
    let current = TOTAL
    const interval = setInterval(() => {
      current--
      setTimerCount(current)
      if (current <= 0) {
        clearInterval(interval)
        // Reset after pause
        setTimeout(() => {
          setVisibleBubbles(new Set())
          setShowTyping(false)
          setTimerCount(TOTAL)
          hasStarted.current = false

          // Restart after short pause
          setTimeout(() => {
            hasStarted.current = true
            bubbles.forEach((bubble, i) => {
              setTimeout(() => {
                setVisibleBubbles(prev => new Set(prev).add(bubble.id))
              }, BUBBLE_DELAYS[i])
            })
            setTimeout(() => setShowTyping(true), 2700)

            let c2 = TOTAL
            const iv2 = setInterval(() => {
              c2--
              setTimerCount(c2)
              if (c2 <= 0) {
                clearInterval(iv2)
                setTimeout(() => {
                  setVisibleBubbles(new Set())
                  setShowTyping(false)
                  setTimerCount(TOTAL)
                  hasStarted.current = false
                }, 1200)
              }
            }, 60)
          }, 600)
        }, 1200)
      }
    }, 60)
  }, [])

  useEffect(() => {
    const el = sectionRef.current
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
    return () => observer.disconnect()
  }, [startAnimation])

  const strokeOffset = CIRCUMFERENCE * (1 - timerCount / TOTAL)

  return (
    <div ref={sectionRef} className={styles.scene}>
      {/* iPhone */}
      <div className={styles.iphone}>
        <div className={styles.iphoneScreen}>
          {/* Status bar */}
          <div className={styles.statusBar}>
            <span className={styles.time}>14:01</span>
            <div className={styles.statusIcons}>
              <div className={styles.signalBar}>
                <span /><span /><span /><span />
              </div>
              <span className={styles.statusText}>WiFi</span>
              <span className={styles.statusText}>🔋</span>
            </div>
          </div>

          {/* WhatsApp header */}
          <div className={styles.waHeader}>
            <span className={styles.backArrow}>‹</span>
            <div className={styles.contactAvatar}>IV</div>
            <div className={styles.contactInfo}>
              <div className={styles.contactStatus}>online</div>
            </div>
            <div className={styles.headerIcons}>
              <span>📹</span>
              <span>📞</span>
            </div>
          </div>

          {/* Chat area */}
          <div className={styles.chatArea}>
            {bubbles.map((bubble) => (
              <div
                key={bubble.id}
                className={`${styles.bubble} ${styles[bubble.type]} ${
                  visibleBubbles.has(bubble.id) ? styles.show : ''
                }`}
              >
                {bubble.text}
                <div className={styles.bubbleTime}>
                  {bubble.time}
                  {bubble.type === 'out' && (
                    <span className={styles.ticks}>✓✓</span>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            <div className={`${styles.typing} ${showTyping ? styles.show : ''}`}>
              <span /><span /><span />
            </div>
          </div>

          {/* Input bar */}
          <div className={styles.inputBar}>
            <span className={styles.plusIcon}>+</span>
            <div className={styles.inputField}>Bericht</div>
          </div>
        </div>
      </div>

      {/* Timer */}
      <div className={styles.timerWrap}>
        <div className={styles.timerRingWrap}>
          <svg viewBox="0 0 110 110">
            <circle
              className={styles.timerBgCircle}
              cx="55"
              cy="55"
              r="45"
            />
            <circle
              className={styles.timerProgress}
              cx="55"
              cy="55"
              r="45"
              style={{
                strokeDasharray: CIRCUMFERENCE,
                strokeDashoffset: strokeOffset,
              }}
            />
          </svg>
          <div className={styles.timerInner}>
            <div className={styles.timerNumber}>{timerCount}</div>
            <div className={styles.timerLabel}>seconds</div>
          </div>
        </div>
        <div className={styles.timerCaption}>
          Gemiddelde<br />reactietijd
        </div>
      </div>
    </div>
  )
}
