'use client'

import { useEffect, useState, type ReactNode } from 'react'
import styles from './scenes.module.css'

/**
 * Gedeeld podium-frame: silhouet van het dashboard (mini-sidebar +
 * topbar) zodat elke scène herkenbaar "in het product" speelt.
 */
export function SceneShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={styles.stage}>
      <div className={styles.miniSidebar}>
        <div className={styles.miniLogo} />
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className={styles.miniNavItem} />
        ))}
      </div>
      <div className={styles.miniMain}>
        <div className={styles.miniTopbar}>{title}</div>
        <div className={styles.miniContent}>{children}</div>
      </div>
    </div>
  )
}

/** Toont children met fade/slide zodra de scène-fase `at` bereikt is. */
export function Reveal({
  at,
  phase,
  children,
  className,
}: {
  at: number
  phase: number
  children: ReactNode
  className?: string
}) {
  const on = phase >= at
  return (
    <div
      className={`${styles.reveal} ${on ? styles.revealOn : ''} ${className ?? ''}`}
      aria-hidden={!on}
    >
      {children}
    </div>
  )
}

/** WhatsApp-achtige "bot typt" indicator. */
export function TypingDots() {
  return (
    <div className={styles.typing} aria-label="De bot typt">
      <span className={styles.typingDot} />
      <span className={styles.typingDot} />
      <span className={styles.typingDot} />
    </div>
  )
}

/**
 * Telt van 0 naar `target` zodra `active` true is; springt direct naar
 * het eind bij `finished` (reduced motion of eindstand).
 */
export function CountUp({
  target,
  active,
  finished,
  durationMs = 700,
  suffix = '',
}: {
  target: number
  active: boolean
  finished: boolean
  durationMs?: number
  suffix?: string
}) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (finished) {
      setValue(target)
      return
    }
    if (!active) return
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      setValue(Math.round(t * target))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active, finished, target, durationMs])

  return (
    <>
      {value}
      {suffix}
    </>
  )
}
