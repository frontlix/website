'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { InstGroupCard, InstGhostBtn } from './InstAtoms'
import { MobileToggle } from '../shared/MobileToggle'
import { INST_DIENSTEN, type Dienst } from './instellingen-mock'
import styles from './InstDiensten.module.css'

/** Diensten-detailscherm — toggle per dienst + knop voor nieuw.
 *  Lokale state seeded vanuit INST_DIENSTEN (mock v1). */
export function InstDiensten() {
  const [diensten, setDiensten] = useState<Dienst[]>(INST_DIENSTEN)

  function handleToggle(index: number, next: boolean) {
    setDiensten((prev) =>
      prev.map((d, i) => (i === index ? { ...d, on: next } : d)),
    )
  }

  return (
    <div className={styles.wrap}>
      <InstGroupCard>
        {diensten.map((d, i) => (
          <div
            key={d.l}
            className={styles.row}
            /* last row has no border */
            data-last={i === diensten.length - 1 || undefined}
          >
            <span className={styles.label}>{d.l}</span>
            <MobileToggle
              on={d.on}
              onChange={(next) => handleToggle(i, next)}
              label={d.l}
            />
          </div>
        ))}
      </InstGroupCard>

      <div className={styles.footer}>
        <InstGhostBtn>
          <Plus size={15} aria-hidden="true" />
          Dienst toevoegen
        </InstGhostBtn>
      </div>
    </div>
  )
}
