'use client'

import styles from './LeadsSegmentedChips.module.css'

export interface SegmentedChip {
  key: string
  label: string
  count: number
  /** Tone string gebruikt door data-tone CSS attribute, bepaalt dot-kleur */
  tone?: string
}

interface LeadsSegmentedChipsProps {
  active: string
  chips: SegmentedChip[]
  onSelect: (key: string) => void
}

/**
 * LeadsSegmentedChips, sticky horizontale scroll-rij van stage-filter pills.
 *
 * Actief: --fg achtergrond, --bg tekst.
 * Inactief: chip-bg achtergrond + 6px gekleurde dot voor stage-tone.
 *
 * Spec: height 34px, border-radius 9999, padding 8px 13px, 13px/600.
 */
export function LeadsSegmentedChips({ active, chips, onSelect }: LeadsSegmentedChipsProps) {
  return (
    <div className={styles.row} role="tablist" aria-label="Fase-filter">
      {chips.map((chip) => {
        const isActive = chip.key === active
        return (
          <button
            key={chip.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(chip.key)}
            className={styles.chip}
            data-active={isActive ? 'true' : undefined}
          >
            {/* Tone-dot: alleen bij inactieve chips die een tone hebben */}
            {chip.tone && !isActive && (
              <span className={styles.dot} data-tone={chip.tone} aria-hidden="true" />
            )}
            <span className={styles.label}>{chip.label}</span>
            <span className={styles.count}>{chip.count}</span>
          </button>
        )
      })}
    </div>
  )
}
