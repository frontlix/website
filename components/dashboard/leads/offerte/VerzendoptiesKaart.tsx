'use client'

import { Send } from 'lucide-react'
import type { ChangeEvent } from 'react'
import styles from './VerzendoptiesKaart.module.css'

export type VerzendOpties = {
  /** Geldigheid in dagen. Default-keuzes in UI: 7 / 14 / 30 / 60. */
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

const GELDIGHEID_OPTIES = [7, 14, 30, 60] as const

export function VerzendoptiesKaart({ opties, onChange }: Props) {
  function handleGeldigheid(e: ChangeEvent<HTMLSelectElement>) {
    onChange({ ...opties, geldigheidDagen: Number(e.target.value) })
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
        <select
          id="verzendopties-geldigheid"
          value={opties.geldigheidDagen}
          onChange={handleGeldigheid}
          className={styles.select}
        >
          {GELDIGHEID_OPTIES.map((d) => (
            <option key={d} value={d}>
              {d} dagen
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
