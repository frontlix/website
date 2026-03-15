'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Globe, Bot, Database, MessageCircle, Clock } from 'lucide-react'
import styles from './OfferteGenPanel.module.css'

interface OfferteGenPanelProps {
  isActive: boolean
}

const QUOTE_ROWS = [
  { desc: 'Lead automatisering', price: '€149/maand', icon: Globe, included: false },
  { desc: 'AI Lead opvolging', price: 'Inbegrepen', icon: Bot, included: true },
  { desc: 'Opzet integratie kosten', price: 'Inbegrepen', icon: Database, included: true },
  { desc: 'WhatsApp automatisering', price: 'Inbegrepen', icon: MessageCircle, included: true },
]

export default function OfferteGenPanel({ isActive }: OfferteGenPanelProps) {
  const [progress, setProgress] = useState(0)
  const [sections, setSections] = useState<Set<number>>(new Set())
  const [done, setDone] = useState(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (!isActive) {
      setProgress(0)
      setSections(new Set())
      setDone(false)
      return
    }

    const duration = 3000 // 3 seconds for the bar
    const startTime = Date.now()

    /* Animate progress bar with requestAnimationFrame */
    const tick = () => {
      const elapsed = Date.now() - startTime
      const pct = Math.min((elapsed / duration) * 100, 100)
      setProgress(pct)

      if (pct < 100) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }
    rafRef.current = requestAnimationFrame(tick)

    /* Reveal sections at thresholds */
    timers.current.push(setTimeout(() => setSections((s) => new Set([...s, 1])), 750))   // 25%
    timers.current.push(setTimeout(() => setSections((s) => new Set([...s, 2])), 1500))  // 50%
    timers.current.push(setTimeout(() => setSections((s) => new Set([...s, 3])), 2400))  // 80%
    timers.current.push(setTimeout(() => setSections((s) => new Set([...s, 4])), 3000))  // 100%
    timers.current.push(setTimeout(() => setDone(true), 3200))

    return () => {
      timers.current.forEach(clearTimeout)
      timers.current = []
      cancelAnimationFrame(rafRef.current)
    }
  }, [isActive])

  return (
    <div className={`${styles.panel} ${isActive ? styles.panelActive : ''}`}>
      <div className={styles.container}>
        {/* Progress label */}
        <div className={`${styles.progressLabel} ${done ? styles.progressLabelDone : ''}`}>
          {done ? (
            <Check size={14} />
          ) : (
            <span className={styles.spinner} />
          )}
          {done ? 'Offerte gereed' : 'Offerte wordt opgesteld...'}
        </div>

        {/* Progress bar */}
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>

        {/* Document */}
        <div className={styles.document}>
          {/* Section 1: Header (25%) */}
          <div className={`${styles.docSection} ${sections.has(1) ? styles.docSectionVisible : ''}`}>
            <div className={styles.docHeader}>
              <span className={styles.docTitle}>OFFERTE</span>
              <span className={styles.docNumber}>Offertenummer:<br />OFF-2026-0147</span>
            </div>
          </div>

          {/* Section 2: Client info (50%) */}
          <div className={`${styles.docSection} ${sections.has(2) ? styles.docSectionVisible : ''}`}>
            <span className={styles.docClientLabel}>Opgesteld voor:</span>
            <span className={styles.docClientName}>Marco Visser</span>
            <span className={styles.docClientDetail}>
              marco@visseradvies.nl<br />
              Amsterdam
            </span>
          </div>

          {/* Section 3: Quote table (80%) */}
          <div className={`${styles.docSection} ${sections.has(3) ? styles.docSectionVisible : ''}`}>
            <table className={styles.docTable}>
              <thead>
                <tr>
                  <th>Omschrijving</th>
                  <th>Prijs</th>
                </tr>
              </thead>
              <tbody>
                {QUOTE_ROWS.map((row) => (
                  <tr key={row.desc}>
                    <td>
                      <span className={styles.rowWithIcon}>
                        <row.icon size={14} className={styles.rowIcon} />
                        {row.desc}
                      </span>
                    </td>
                    <td>
                      {row.included ? (
                        <span className={styles.includedBadge}>
                          <Check size={10} />
                          Inbegrepen
                        </span>
                      ) : (
                        row.price
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Section 4: Total + footer (100%) */}
          <div className={`${styles.docSection} ${sections.has(4) ? styles.docSectionVisible : ''}`}>
            <div className={styles.docTotal}>
              <span className={styles.docTotalLabel}>Totaal maandelijks:</span>
              <span className={styles.docTotalValue}>€149/maand</span>
            </div>
            <span className={styles.validBadge}>
              <Clock size={10} />
              Geldig tot: 14 april 2026
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
