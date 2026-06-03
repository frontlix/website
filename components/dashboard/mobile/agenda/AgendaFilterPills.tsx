'use client'

import styles from './AgendaFilterPills.module.css'

export interface AgendaFilterItem {
  /** Filter-sleutel (vandaag | week | next | eigen) */
  k: string
  /** Zichtbaar label */
  l: string
}

interface AgendaFilterPillsProps {
  active: string
  items: AgendaFilterItem[]
  onPick: (key: string) => void
}

/**
 * AgendaFilterPills, segmented pill-rij boven de week-lijst.
 *
 * Port van ABMain/ABShared `ABFilterPills`.
 * Actief: --fg achtergrond, --bg tekst (data-active). Inactief: chip-bg + --fg.
 * Spec: min-height 32px, radius 9999px, 7px 14px padding, 13px/600, horizontaal scrollbaar.
 */
export function AgendaFilterPills({ active, items, onPick }: AgendaFilterPillsProps) {
  return (
    <div className={styles.row} role="tablist" aria-label="Agenda-filter">
      {items.map((f) => {
        const isActive = f.k === active
        return (
          <button
            key={f.k}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={styles.pill}
            data-active={isActive ? 'true' : undefined}
            onClick={() => onPick(f.k)}
          >
            {f.l}
          </button>
        )
      })}
    </div>
  )
}
