'use client'

import styles from './DossierTabs.module.css'

export interface DossierTab {
  /** Stabiele key, bv. 'info' */
  k: string
  /** Zichtbaar label, bv. 'Info' */
  l: string
}

interface DossierTabsProps {
  active: string
  tabs: DossierTab[]
  onSelect: (key: string) => void
}

/**
 * DossierTabs — sticky segmented control. Track gebruikt --color-chip-bg;
 * de actieve knop krijgt een surface-achtergrond + schaduw via data-active.
 */
export function DossierTabs({ active, tabs, onSelect }: DossierTabsProps) {
  return (
    <div className={styles.sticky}>
      <div className={styles.track} role="tablist" aria-label="Dossier-secties">
        {tabs.map((tb) => {
          const isActive = tb.k === active
          return (
            <button
              key={tb.k}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onSelect(tb.k)}
              className={styles.tab}
              data-active={isActive ? 'true' : undefined}
            >
              {tb.l}
            </button>
          )
        })}
      </div>
    </div>
  )
}
