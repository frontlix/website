'use client'

import { ChevronRight, Clock } from 'lucide-react'
import styles from './UrgentBlock.module.css'

export type UrgentItem = {
  id: string
  naam: string
  initials: string
  subline: string // bv. "€736 · korstmos" of "86 km · Utrecht · €998"
  context: string // bv. "Wacht 4u 12m op owner-review", niet getoond in preview, alleen in drilldown
  badge?: { tone: 'amber' | 'red'; label: string }
}

type Props = {
  items: UrgentItem[]
  totalCount?: number // tonen in "Alles (N)"
  onOpenAll: () => void
  onOpenItem?: (id: string) => void
}

/**
 * UrgentBlock, "Wat nu" preview (top-3 urgente items) voor mobile Overzicht.
 * Toont avatar/initials, naam + subline, optionele tone-badge. Empty-state copy
 * verschijnt als items leeg is. Klik op rij → onOpenItem(id), klik op "Alles" → onOpenAll.
 */
export function UrgentBlock({
  items,
  totalCount,
  onOpenAll,
  onOpenItem,
}: Props) {
  return (
    <section className={styles.block}>
      <div className={styles.head}>
        <h2 className={styles.title}>Wat nu</h2>
        <button
          type="button"
          onClick={onOpenAll}
          className={styles.allLink}
        >
          Alles {totalCount != null && `(${totalCount})`}{' '}
          <ChevronRight size={14} />
        </button>
      </div>
      {items.length === 0 ? (
        <p className={styles.empty}>Niks urgent, koffiepauze.</p>
      ) : (
        <ul className={styles.list}>
          {items.slice(0, 3).map((item) => (
            <li
              key={item.id}
              className={styles.row}
              onClick={() => onOpenItem?.(item.id)}
            >
              <span className={styles.avatar} aria-hidden="true">
                {item.initials}
              </span>
              <span className={styles.text}>
                <span className={styles.name}>{item.naam}</span>
                <span className={styles.sub}>{item.subline}</span>
              </span>
              {item.badge && (
                <span
                  className={styles.badge}
                  data-tone={item.badge.tone}
                >
                  <Clock size={12} />
                  {item.badge.label}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
