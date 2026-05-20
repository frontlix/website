'use client'

import { Check, Send } from 'lucide-react'
import type { ChangeEvent } from 'react'
import styles from './VerzendoptiesKaart.module.css'

export type VerzendOpties = {
  /** Geldigheid in dagen. Default-keuzes in UI: 7 / 14 / 30 / 60. */
  geldigheidDagen: number
  metGarantie: boolean
  metVoorwaarden: boolean
  metFotos: boolean
}

type Props = {
  opties: VerzendOpties
  /** Aantal beschikbare lead-foto's — getoond in checkbox-label. */
  fotosCount: number
  onChange: (opties: VerzendOpties) => void
}

const GELDIGHEID_OPTIES = [7, 14, 30, 60] as const

export function VerzendoptiesKaart({ opties, fotosCount, onChange }: Props) {
  function handleGeldigheid(e: ChangeEvent<HTMLSelectElement>) {
    onChange({ ...opties, geldigheidDagen: Number(e.target.value) })
  }

  function toggle(key: keyof Omit<VerzendOpties, 'geldigheidDagen'>) {
    onChange({ ...opties, [key]: !opties[key] })
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

      <div className={styles.checkboxList}>
        <CheckboxRow
          checked={opties.metGarantie}
          onToggle={() => toggle('metGarantie')}
          label="Met garantievoorwaarden (12 mnd)"
        />
        <CheckboxRow
          checked={opties.metVoorwaarden}
          onToggle={() => toggle('metVoorwaarden')}
          label="Met algemene voorwaarden"
        />
        <CheckboxRow
          checked={opties.metFotos}
          onToggle={() => toggle('metFotos')}
          label={`Foto's meesturen (${fotosCount})`}
        />
      </div>
    </div>
  )
}

/* Custom-styled checkbox-rij. De native checkbox is visueel verborgen
   (sr-only via .nativeCheckbox), de zichtbare box is een <span> die
   reageert op de :checked-state via CSS sibling selectors. */
function CheckboxRow({
  checked,
  onToggle,
  label,
}: {
  checked: boolean
  onToggle: () => void
  label: string
}) {
  return (
    <label className={styles.checkRow}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className={styles.nativeCheckbox}
      />
      <span className={styles.box} aria-hidden="true">
        {checked ? <Check size={12} strokeWidth={3} className={styles.checkIcon} /> : null}
      </span>
      <span className={styles.checkLabel}>{label}</span>
    </label>
  )
}
