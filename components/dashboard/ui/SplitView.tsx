'use client'

import { ChevronLeft } from 'lucide-react'
import styles from './SplitView.module.css'

export interface SplitViewProps {
  list: React.ReactNode
  detail: React.ReactNode
  /** Op mobile: of de detail-pane zichtbaar is. Op desktop genegeerd. */
  detailVisible: boolean
  onBack: () => void
  backLabel?: string
}

export function SplitView({
  list,
  detail,
  detailVisible,
  onBack,
  backLabel = 'Terug naar lijst',
}: SplitViewProps) {
  return (
    <div className={`${styles.split} ${detailVisible ? styles.detailVisible : ''}`}>
      <div className={styles.list}>{list}</div>
      <div className={styles.detail}>
        <button type="button" onClick={onBack} className={styles.backButton}>
          <ChevronLeft size={16} />
          <span>{backLabel}</span>
        </button>
        {detail}
      </div>
    </div>
  )
}
