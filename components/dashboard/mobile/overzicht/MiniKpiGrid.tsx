'use client'

import type { ReactNode } from 'react'
import { Inbox, Percent, Clock, FileText } from 'lucide-react'
import styles from './MiniKpiGrid.module.css'

export type MiniKpiTone = 'blue' | 'green' | 'amber' | 'violet'

export type MiniKpiTile = {
  icon: ReactNode
  iconTone: MiniKpiTone
  label: string
  value: string // pre-formatted: "14", "64", "47", "7"
  unit?: string // bv. "%", "s"
  delta?: { value: string; positive: boolean }
}

type Props = {
  // Tuple van exact 4 tiles, voorkomt dat de grid stuk loopt als
  // er per ongeluk 3 of 5 tiles worden meegegeven.
  tiles: [MiniKpiTile, MiniKpiTile, MiniKpiTile, MiniKpiTile]
}

/**
 * MiniKpiGrid, 2×2 grid van mini-KPI tiles voor /dashboard mobile.
 *
 * Elke tile: icon-box top-left, optionele delta top-right, grote value
 * met optionele unit, label onderaan.
 */
export function MiniKpiGrid({ tiles }: Props) {
  return (
    <div className={styles.grid}>
      {tiles.map((tile, i) => (
        <article key={i} className={styles.tile}>
          <div className={styles.head}>
            <span className={styles.iconBox} data-tone={tile.iconTone}>
              {tile.icon}
            </span>
            {tile.delta && (
              <span
                className={styles.delta}
                data-positive={tile.delta.positive}
              >
                {tile.delta.value}
              </span>
            )}
          </div>
          <div className={styles.valueRow}>
            <span className={styles.value}>{tile.value}</span>
            {tile.unit && <span className={styles.unit}>{tile.unit}</span>}
          </div>
          <div className={styles.label}>{tile.label}</div>
        </article>
      ))}
    </div>
  )
}

// Convenience exports voor de typische 4 iconen die de Overzicht gebruikt.
export const MiniKpiIcons = { Inbox, Percent, Clock, FileText }
