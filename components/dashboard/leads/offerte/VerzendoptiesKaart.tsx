'use client'

import { Send } from 'lucide-react'
import type { ChangeEvent } from 'react'
import styles from './VerzendoptiesKaart.module.css'

export type VerzendOpties = {
  /** Geldigheid in dagen — vrij invulbaar (1 t/m 365). */
  geldigheidDagen: number
  /**
   * Vlaggen worden voorlopig niet getoond in de UI (de drie checkboxes
   * zijn verwijderd op verzoek). Velden blijven in het type bestaan
   * zodat downstream-code (saveDraft, send-flow) niet hoeft te wijzigen.
   */
  metGarantie: boolean
  metVoorwaarden: boolean
  metFotos: boolean
}

type Props = {
  opties: VerzendOpties
  /** Aantal beschikbare lead-foto's — niet meer getoond, maar prop blijft compatibel. */
  fotosCount: number
  onChange: (opties: VerzendOpties) => void
}

const PRESETS = [7, 14, 30, 60] as const

export function VerzendoptiesKaart({ opties, onChange }: Props) {
  function handleNumberInput(e: ChangeEvent<HTMLInputElement>) {
    const raw = Number(e.target.value)
    // Clamp 1-365; lege/ongeldige input → 1 (voorkomt 0-dagen edge case).
    const clamped = Math.max(1, Math.min(365, Number.isFinite(raw) ? raw : 1))
    onChange({ ...opties, geldigheidDagen: clamped })
  }

  function handlePreset(value: number) {
    onChange({ ...opties, geldigheidDagen: value })
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <Send size={14} aria-hidden="true" className={styles.headerIcon} />
        <span className={styles.headerLabel}>VERZENDOPTIES</span>
      </div>

      <div className={styles.geldigheidRow}>
        <label htmlFor="verzendopties-geldigheid" className={styles.geldigheidLabel}>
          Geldigheid
        </label>
        <div className={styles.geldigheidInputWrap}>
          <input
            id="verzendopties-geldigheid"
            type="number"
            min={1}
            max={365}
            step={1}
            value={opties.geldigheidDagen}
            onChange={handleNumberInput}
            className={styles.geldigheidNumber}
            aria-label="Geldigheid in dagen"
          />
          <span className={styles.geldigheidSuffix}>dagen</span>
        </div>
      </div>

      {/* Snelkeuzes — klik = direct invullen, blijft handmatig overschrijfbaar. */}
      <div className={styles.presets}>
        {PRESETS.map((d) => {
          const isActive = d === opties.geldigheidDagen
          return (
            <button
              key={d}
              type="button"
              onClick={() => handlePreset(d)}
              className={`${styles.preset} ${isActive ? styles.presetActive : ''}`}
              aria-pressed={isActive}
            >
              {d}
            </button>
          )
        })}
      </div>
    </div>
  )
}
