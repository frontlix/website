'use client'

import { useEffect, useState, type ReactNode } from 'react'
import styles from './scenes.module.css'

/**
 * Regie-laag: per fase kan een scène een camerastand (zoom op een
 * focuspunt) en een cursorpositie (nepmuis met klik-effect) opgeven.
 * Arrays worden geïndexeerd op fase en geklemd op hun laatste waarde,
 * zodat de eindstand stabiel is.
 */
export type CameraFrame = {
  /** zoomfactor; 1 = hele scherm in beeld */
  scale: number
  /** focuspunt in % van het mini-scherm */
  x: number
  y: number
}

export type CursorMark = {
  /** positie in % van het mini-scherm */
  x: number
  y: number
  /** speel op deze fase een klik-effect af */
  click?: boolean
  /** verberg de cursor (intro-fases, automatische processen) */
  hidden?: boolean
}

const FULL_VIEW: CameraFrame = { scale: 1, x: 50, y: 50 }
const NO_CURSOR: CursorMark = { x: 50, y: 50, hidden: true }

function at<T>(list: readonly T[], phase: number, fallback: T): T {
  if (list.length === 0) return fallback
  return list[Math.min(phase, list.length - 1)] ?? fallback
}

type SceneShellProps = {
  title: string
  children: ReactNode
  /** huidige fase uit useSceneTimeline; nodig zodra camera/cursor meedoen */
  phase?: number
  /** camerastand per fase (geklemd op de laatste) */
  camera?: readonly CameraFrame[]
  /** cursorpositie per fase (geklemd op de laatste) */
  cursor?: readonly CursorMark[]
}

/**
 * Gedeeld podium-frame: silhouet van het dashboard (mini-sidebar +
 * topbar) zodat elke scène herkenbaar "in het product" speelt.
 */
export function SceneShell({ title, children, phase = 0, camera, cursor }: SceneShellProps) {
  const frame = camera ? at(camera, phase, FULL_VIEW) : FULL_VIEW
  const mark = cursor ? at(cursor, phase, NO_CURSOR) : null
  return (
    <div className={styles.stage}>
      <div
        className={styles.camera}
        style={{ transform: `scale(${frame.scale})`, transformOrigin: `${frame.x}% ${frame.y}%` }}
      >
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
        {mark && <FakeCursor mark={mark} clickKey={phase} />}
      </div>
    </div>
  )
}

/**
 * Nepmuis die met CSS-transities tussen waypoints glijdt. De ripple en
 * de indruk-animatie worden per klik-fase opnieuw gemount zodat het
 * klik-effect telkens afspeelt.
 */
function FakeCursor({ mark, clickKey }: { mark: CursorMark; clickKey: number }) {
  return (
    <div
      className={`${styles.cursor} ${mark.hidden ? styles.cursorHidden : ''}`}
      style={{ left: `${mark.x}%`, top: `${mark.y}%` }}
      aria-hidden="true"
    >
      {mark.click && <span key={`ripple-${clickKey}`} className={styles.clickRipple} />}
      <svg
        key={mark.click ? `press-${clickKey}` : 'idle'}
        className={`${styles.cursorArrow} ${mark.click ? styles.cursorPress : ''}`}
        viewBox="0 0 24 24"
        width="18"
        height="18"
      >
        <path
          d="M5 3l14 8-6.5 1.5L9 19z"
          fill="white"
          stroke="rgba(0, 0, 0, 0.65)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
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
