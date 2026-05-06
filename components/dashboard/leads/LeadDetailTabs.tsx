'use client'

import { useState, type ReactNode } from 'react'
import styles from './LeadDetailTabs.module.css'

type TabKey = 'gesprek' | 'fotos' | 'timeline'

export function LeadDetailTabs({
  gesprek,
  fotos,
  timeline,
  countGesprek,
  countFotos,
}: {
  gesprek: ReactNode
  fotos: ReactNode
  timeline: ReactNode
  countGesprek: number
  countFotos: number
}) {
  const [active, setActive] = useState<TabKey>('gesprek')

  return (
    <div className={styles.tabs}>
      <div className={styles.tablist} role="tablist">
        <button
          role="tab"
          aria-selected={active === 'gesprek'}
          className={`${styles.tab} ${active === 'gesprek' ? styles.activeTab : ''}`}
          onClick={() => setActive('gesprek')}
        >
          Gesprek <span className={styles.count}>{countGesprek}</span>
        </button>
        <button
          role="tab"
          aria-selected={active === 'fotos'}
          className={`${styles.tab} ${active === 'fotos' ? styles.activeTab : ''}`}
          onClick={() => setActive('fotos')}
        >
          Foto&apos;s <span className={styles.count}>{countFotos}</span>
        </button>
        <button
          role="tab"
          aria-selected={active === 'timeline'}
          className={`${styles.tab} ${active === 'timeline' ? styles.activeTab : ''}`}
          onClick={() => setActive('timeline')}
        >
          Timeline
        </button>
      </div>

      <div className={styles.panel} role="tabpanel">
        {active === 'gesprek' && gesprek}
        {active === 'fotos' && fotos}
        {active === 'timeline' && timeline}
      </div>
    </div>
  )
}
