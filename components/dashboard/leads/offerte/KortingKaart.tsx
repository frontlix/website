'use client'

import { Sparkles } from 'lucide-react'
import type { ChangeEvent } from 'react'
import styles from './KortingKaart.module.css'

type Props = {
  /** Huidig kortingspercentage, 0-100 (UI clampt op 0-20 via slider/presets). */
  kortingPct: number
  /** Vrije tekst — bv. "Kennismakingskorting". */
  kortingOmschrijving: string
  onChange: (pct: number, omschrijving: string) => void
}

const PRESETS = [0, 5, 10, 15] as const

export function KortingKaart({ kortingPct, kortingOmschrijving, onChange }: Props) {
  function handleSlider(e: ChangeEvent<HTMLInputElement>) {
    const next = Number(e.target.value)
    onChange(Number.isFinite(next) ? next : 0, kortingOmschrijving)
  }

  function handlePreset(value: number) {
    onChange(value, kortingOmschrijving)
  }

  function handleOmschrijving(e: ChangeEvent<HTMLInputElement>) {
    onChange(kortingPct, e.target.value)
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Sparkles size={14} aria-hidden="true" className={styles.headerIcon} />
          <span className={styles.headerLabel}>KORTING</span>
        </div>
        <span className={styles.headerValue}>{kortingPct}%</span>
      </div>

      <input
        type="range"
        min={0}
        max={20}
        step={1}
        value={kortingPct}
        onChange={handleSlider}
        className={styles.slider}
        aria-label="Kortingspercentage"
      />

      <div className={styles.presets}>
        {PRESETS.map((p) => {
          const isActive = p === kortingPct
          return (
            <button
              key={p}
              type="button"
              onClick={() => handlePreset(p)}
              className={`${styles.preset} ${isActive ? styles.presetActive : ''}`}
              aria-pressed={isActive}
            >
              {p}%
            </button>
          )
        })}
      </div>

      <input
        type="text"
        value={kortingOmschrijving}
        onChange={handleOmschrijving}
        placeholder="Omschrijving (bv. Kennismakingskorting)"
        className={styles.omschrijving}
        aria-label="Korting-omschrijving"
      />
    </div>
  )
}
