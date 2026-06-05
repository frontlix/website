'use client'

import { useEffect, useRef, useState } from 'react'
import posthog from 'posthog-js'
import { Check, Lock, Pause, Play, SkipBack, SkipForward, X, Zap } from 'lucide-react'
import { CHAPTERS } from './chapters'
import { createDriver, TourAbort, type CursorState, type RunToken } from './driver'
import { cumulativeStarts } from './timeline'
import styles from './DemoTour.module.css'

const DURS = CHAPTERS.map((c) => c.durSec)
const STARTS = cumulativeStarts(DURS)
const TOTAL_SEC = STARTS[STARTS.length - 1]
const TOUR_TOTAL = CHAPTERS.filter((c) => c.kind === 'tour').length

/** demo-login voor de ingesloten app (zelfde origin, zelfde localStorage) */
const DEMO_USER = JSON.stringify({
  name: 'Christiaan Tromp',
  email: 'christiaan@frontlix.com',
  bedrijf: 'Schoon Straatje',
})

type DemoTourProps = {
  /** sluiten zonder afronden (kruisje rechtsboven, "Sla over") */
  onClose: () => void
  /** afronden op het slotscherm ("Start met instellen") */
  onFinish: () => void
}

/**
 * Zelf-afspelende rondleiding die de échte demo-app bestuurt: een
 * macOS-browservenster met de volledige app erin, rechts de uitleg per
 * stap, onderaan een zwevende afspeelbalk met hoofdstukpunten. De
 * hoofdstukken navigeren echt door de app, klikken op echte knoppen en
 * bewegen een zichtbare muiscursor.
 */
export function DemoTour({ onClose, onFinish }: DemoTourProps) {
  const [chapter, setChapter] = useState(0)
  /** verstreken seconden binnen het huidige hoofdstuk */
  const [elapsed, setElapsed] = useState(0)
  const [paused, setPaused] = useState(false)
  const [ended, setEnded] = useState(false)
  /** verhoogt bij elke (her)start van een hoofdstuk, zodat de regie opnieuw draait */
  const [runSeq, setRunSeq] = useState(0)
  const [bootReady, setBootReady] = useState(false)
  const [appReady, setAppReady] = useState(false)
  const [cursor, setCursor] = useState<CursorState>({ x: 90, y: 90, visible: false, clickTick: 0 })

  const iframeRef = useRef<HTMLIFrameElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const pausedRef = useRef(false)
  const tokenRef = useRef<RunToken>({ aborted: false })

  const step = CHAPTERS[chapter]
  const isLast = chapter === CHAPTERS.length - 1

  useEffect(() => {
    pausedRef.current = paused
  }, [paused])

  // demo-login klaarzetten vóórdat de iframe-app mount (leest localStorage)
  useEffect(() => {
    try {
      localStorage.setItem('frontlix_user', DEMO_USER)
    } catch {
      /* private mode: de app toont dan zijn loginscherm, tour blijft afsluitbaar */
    }
    setBootReady(true)
  }, [])

  // wachten tot de demo-app echt gemount is (Babel compileert in de browser)
  useEffect(() => {
    if (!bootReady || appReady) return
    const timer = setInterval(() => {
      try {
        if (iframeRef.current?.contentDocument?.querySelector('.sidebar')) setAppReady(true)
      } catch {
        /* nog niet bereikbaar */
      }
    }, 300)
    return () => clearInterval(timer)
  }, [bootReady, appReady])

  // hoofdstukklok: tikt zolang er afgespeeld wordt, pauze bevriest alles
  useEffect(() => {
    if (paused || ended || !appReady) return
    const timer = setInterval(() => setElapsed((e) => e + 0.1), 100)
    return () => clearInterval(timer)
  }, [paused, ended, appReady])

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

  // regie van het huidige hoofdstuk starten; wissel breekt de vorige af
  useEffect(() => {
    if (!appReady) return
    tokenRef.current = { aborted: false }
    const token = tokenRef.current
    const api = createDriver({
      getIframe: () => iframeRef.current,
      getStage: () => stageRef.current,
      isPaused: () => pausedRef.current,
      token,
      setCursor,
    })
    setCursor((c) => ({ ...c, visible: false }))
    CHAPTERS[chapter].run?.(api).catch((err) => {
      if (!(err instanceof TourAbort)) console.error('demo-tour hoofdstuk faalde:', err)
    })
    return () => {
      token.aborted = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter, runSeq, appReady])

  useEffect(() => {
    posthog.capture('demo_tour_started')
  }, [])

  useEffect(() => {
    posthog.capture('demo_tour_step_viewed', { step: chapter + 1 })
  }, [chapter])

  const goTo = (index: number) => {
    const next = Math.max(0, Math.min(CHAPTERS.length - 1, index))
    setChapter(next)
    setElapsed(0)
    setEnded(false)
    setRunSeq((s) => s + 1)
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
  const tourIndex = CHAPTERS.slice(0, chapter + 1).filter((c) => c.kind === 'tour').length
  const stepLabel =
    step.kind === 'welcome' ? 'WELKOM' : step.kind === 'outro' ? 'KLAAR' : `STAP ${tourIndex} / ${TOUR_TOTAL}`
  const counterLabel = step.kind === 'tour' ? `${tourIndex} / ${TOUR_TOTAL}` : step.menuLabel

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" aria-label="Rondleiding door Frontlix">
      {/* dunne voortgangslijn helemaal bovenaan */}
      <div className={styles.topProgress} style={{ width: `${overall * 100}%` }} />

      <header className={styles.header}>
        <div className={styles.brand}>
          <Zap size={15} className={styles.brandIcon} />
          <span>Frontlix · Rondleiding</span>
        </div>
        <button type="button" onClick={skip} className={styles.skipBtn} aria-label="Sla over">
          <X size={16} /> Sla over
        </button>
      </header>

      <div className={styles.main}>
        {/* links: macOS-browservenster met de echte app */}
        <div className={styles.stageCol}>
          <div className={styles.browser} ref={stageRef}>
            <div className={styles.browserBar}>
              <span className={`${styles.light} ${styles.lightRed}`} />
              <span className={`${styles.light} ${styles.lightYellow}`} />
              <span className={`${styles.light} ${styles.lightGreen}`} />
              <span className={styles.urlPill}>
                <Lock size={10} /> app.frontlix.nl
              </span>
            </div>
            <div className={styles.viewport}>
              {bootReady && (
                <iframe
                  ref={iframeRef}
                  src="/demo-app/Dashboard.html"
                  title="Frontlix demo"
                  className={styles.iframe}
                />
              )}
              {!appReady && (
                <div className={styles.loading}>
                  <span className={styles.loadingDot} />
                  De demo wordt geladen…
                </div>
              )}
              {/* nepmuis over het browservenster */}
              <div
                className={`${styles.cursor} ${cursor.visible && step.kind === 'tour' ? '' : styles.cursorHidden}`}
                style={{ left: cursor.x, top: cursor.y }}
                aria-hidden="true"
              >
                {cursor.clickTick > 0 && <span key={cursor.clickTick} className={styles.clickRipple} />}
                <svg viewBox="0 0 24 24" width="18" height="18">
                  <path
                    d="M5 3l14 8-6.5 1.5L9 19z"
                    fill="white"
                    stroke="rgba(0, 0, 0, 0.65)"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              {/* welkom/slot als scherm over de app */}
              {step.kind !== 'tour' && (
                <div className={styles.intro}>
                  <div className={styles.introInner}>
                    <h2 className={styles.introTitle}>{step.title}</h2>
                    <p className={styles.introBody}>{step.body}</p>
                    {step.kind === 'outro' && (
                      <button
                        type="button"
                        onClick={finish}
                        className={`${styles.btnPrimary} ${ended ? styles.btnPulse : ''}`}
                      >
                        <Check size={14} /> Start met instellen
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* zwevende afspeelbalk */}
          <div className={styles.controls}>
            <button
              type="button"
              onClick={() => goTo(chapter - 1)}
              className={styles.ctrlBtn}
              disabled={chapter === 0}
              aria-label="Vorig hoofdstuk"
            >
              <SkipBack size={14} />
            </button>
            <button
              type="button"
              onClick={() => (ended ? goTo(0) : setPaused((p) => !p))}
              className={styles.playBtn}
              aria-label={ended ? 'Opnieuw afspelen' : paused ? 'Afspelen' : 'Pauzeren'}
            >
              {paused || ended ? <Play size={16} /> : <Pause size={16} />}
            </button>
            <button
              type="button"
              onClick={() => goTo(chapter + 1)}
              className={styles.ctrlBtn}
              disabled={isLast}
              aria-label="Volgend hoofdstuk"
            >
              <SkipForward size={14} />
            </button>

            <div className={styles.track}>
              <div className={styles.trackRail} />
              <div className={styles.trackFill} style={{ width: `${overall * 100}%` }} />
              {CHAPTERS.map((c, i) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => goTo(i)}
                  className={`${styles.dot} ${i < chapter ? styles.dotDone : ''} ${i === chapter ? styles.dotActive : ''}`}
                  style={{ left: `${(STARTS[i] / TOTAL_SEC) * 100}%` }}
                  title={c.menuLabel}
                  aria-label={`Naar hoofdstuk: ${c.menuLabel}`}
                />
              ))}
            </div>

            <span className={styles.counter}>{counterLabel}</span>
          </div>
        </div>

        {/* rechts: stap-uitleg */}
        <aside className={styles.panel}>
          <span className={styles.stepPill}>{stepLabel}</span>
          <h2 className={styles.panelTitle}>{step.title}</h2>
          <p className={styles.panelBody}>{step.body}</p>
          {step.bullets.length > 0 && (
            <ul className={styles.checks}>
              {step.bullets.map((bullet) => (
                <li key={bullet}>
                  <span className={styles.checkBox}>
                    <Check size={11} strokeWidth={3} />
                  </span>
                  {bullet}
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  )
}
