'use client'

import { Sparkline } from '../shared/charts/Sparkline'
import { toneColor, type AnalyseKpi } from './analyse-mappers'
import styles from './AnalyseKpiGrid.module.css'

export function AnalyseKpiGrid({ kpis }: { kpis: AnalyseKpi[] }) {
  return (
    <div className={styles.grid}>
      {kpis.map((k) => (
        <div key={k.label} className={styles.tile}>
          <p className={styles.value}>{k.value}</p>
          <div className={styles.bottom}>
            <span className={styles.label}>{k.label}</span>
            <Sparkline data={k.spark} color={toneColor(k.tone)} />
          </div>
        </div>
      ))}
    </div>
  )
}
