'use client'

import { useState, useEffect, useRef } from 'react'
import { HelpCircle, X } from 'lucide-react'
import type { SurfaceSummaryStats } from './SurfaceDailySummary'
import styles from './HoeWeetSurfaceDit.module.css'

/**
 * Ghost link "Hoe weet {chatbot} dit?" — opent popover die uitlegt
 * waar de cijfers vandaan komen. Bewust geen modal: de info is licht,
 * een popover voelt sneller en blokkeert de pagina niet.
 */
export function HoeWeetSurfaceDit({
  chatbotName,
  stats,
}: {
  chatbotName: string
  stats: SurfaceSummaryStats
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement | null>(null)

  // Buitenklik / Escape sluit popover
  useEffect(() => {
    if (!open) return

    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <HelpCircle size={13} />
        <span>Hoe weet {chatbotName} dit?</span>
      </button>

      {open && (
        <div className={styles.popover} role="dialog">
          <div className={styles.popHead}>
            <div className={styles.popTitle}>Waar komen deze cijfers vandaan?</div>
            <button
              type="button"
              className={styles.popClose}
              onClick={() => setOpen(false)}
              aria-label="Sluiten"
            >
              <X size={13} />
            </button>
          </div>
          <ul className={styles.popList}>
            <li>
              <strong>{stats.leadsVandaag} leads vandaag</strong> — tel van
              binnenkomende leads sinds vannacht 00:00 (Europe/Amsterdam).
            </li>
            <li>
              <strong>{stats.offertesWeek} offertes deze week</strong> —
              leads waar deze week een offerte voor verstuurd is.
            </li>
            <li>
              <strong>{stats.akkoordWeek} akkoord</strong> — leads die deze
              week akkoord hebben gegeven op een offerte.
            </li>
            <li>
              <strong>Omzet maand-tot-nu</strong> — som van offerte-bedragen
              van geconverteerde leads sinds de 1e van deze maand.
            </li>
            <li>
              <strong>Gem. ticket</strong> — gemiddelde offerte-waarde over
              alle leads van deze maand.
            </li>
          </ul>
          <div className={styles.popFoot}>
            Cijfers verversen automatisch elke keer dat je deze pagina opent.
          </div>
        </div>
      )}
    </div>
  )
}
