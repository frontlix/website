'use client'

import { useMemo } from 'react'
import { mapAnalyse, toneColor, type AnalyseServerData } from './analyse-mappers'
import { PeriodToggle } from './PeriodToggle'
import { OmzetHeroCard } from './OmzetHeroCard'
import { AnalyseKpiGrid } from './AnalyseKpiGrid'
import { AnalyseSectionCard } from './AnalyseSectionCard'
import { BarRow } from '../shared/charts/BarRow'
import styles from './MobileAnalyses.module.css'

export function MobileAnalyses({ data }: { data: AnalyseServerData }) {
  const v = useMemo(() => mapAnalyse(data), [data])
  const akkoordPct = v.funnel[v.funnel.length - 1]?.pct ?? 0

  return (
    <div className={styles.root}>
      <PeriodToggle value={data.periodKey} />

      <OmzetHeroCard
        omzetLabel={v.hero.omzetLabel}
        goalPct={v.hero.goalPct}
        periodLabel={v.hero.periodLabel}
        trend={v.trendSeries}
        monthLabels={v.monthLabels}
      />

      <AnalyseKpiGrid kpis={v.kpis} />

      <AnalyseSectionCard title="Conversie-trechter" badge={`${akkoordPct}% akkoord`}>
        {v.funnel.map((f) => (
          <BarRow key={f.label} label={f.label} value={f.value} pct={f.pct} color={toneColor(f.tone)} thickness={10} />
        ))}
      </AnalyseSectionCard>

      <AnalyseSectionCard title="Omzet per dienst">
        {v.diensten.length === 0 ? (
          <p className={styles.empty}>Nog geen omzet in deze periode.</p>
        ) : (
          v.diensten.map((d) => (
            <BarRow key={d.label} label={d.label} value={d.value} pct={d.pct} color={toneColor(d.tone)} thickness={8} />
          ))
        )}
      </AnalyseSectionCard>
    </div>
  )
}
