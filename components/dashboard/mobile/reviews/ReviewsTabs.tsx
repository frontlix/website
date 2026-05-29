'use client'

import type { ReviewTab } from './review-helpers'
import styles from './ReviewsTabs.module.css'

type Props = {
  active: ReviewTab
  counts: { nieuw: number; beantwoord: number; aandacht: number }
  onSelect: (tab: ReviewTab) => void
}

const TABS: Array<{ k: ReviewTab; l: string }> = [
  { k: 'nieuw', l: 'Nieuw' },
  { k: 'beantwoord', l: 'Beantwoord' },
  { k: 'aandacht', l: 'Aandacht' },
]

export function ReviewsTabs({ active, counts, onSelect }: Props) {
  return (
    <div className={styles.tabs} role="tablist" aria-label="Review-filter">
      {TABS.map((tb) => {
        const on = active === tb.k
        const warn = tb.k === 'aandacht' && counts[tb.k] > 0
        return (
          <button
            key={tb.k}
            type="button"
            role="tab"
            aria-selected={on}
            className={styles.tab}
            data-active={on}
            onClick={() => onSelect(tb.k)}
          >
            {tb.l}
            <span className={styles.badge} data-active={on} data-warn={warn}>
              {counts[tb.k]}
            </span>
          </button>
        )
      })}
    </div>
  )
}
