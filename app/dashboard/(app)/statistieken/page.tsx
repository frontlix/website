import { Suspense } from 'react'
import { parsePeriod, periodToRange, periodLabel } from '@/lib/dashboard/period'
import {
  countLeads,
  countConverted,
  avgOfferteWaarde,
  avgReactietijdMs,
  statusVerdeling,
  categorieVerdeling,
  leadsPerDag,
  topTags,
} from '@/lib/dashboard/stats-queries'
import { dashboardStatusLabel } from '@/lib/dashboard/format'
import { PeriodSelector } from '@/components/dashboard/stats/PeriodSelector'
import { KpiCard } from '@/components/dashboard/stats/KpiCard'
import { DistributionBars } from '@/components/dashboard/stats/DistributionBars'
import { TrendLineChart } from '@/components/dashboard/stats/TrendLineChart'
import { TopTagsList } from '@/components/dashboard/stats/TopTagsList'
import styles from './page.module.css'

function formatEuro(n: number): string {
  return `€ ${n.toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function formatDuration(ms: number): string {
  const totalMin = Math.round(ms / 60000)
  const hours = Math.floor(totalMin / 60)
  const minutes = totalMin % 60
  if (hours === 0) return `${minutes}m`
  if (minutes === 0) return `${hours}u`
  return `${hours}u ${minutes}m`
}

export default async function StatistiekenPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>
}) {
  const sp = await searchParams
  const periodKey = parsePeriod(sp)
  const range = periodToRange(periodKey)

  const [
    total,
    converted,
    avgOfferte,
    avgReactie,
    statusRows,
    categorieRows,
    perDag,
    tagRows,
  ] = await Promise.all([
    countLeads(range),
    countConverted(range),
    avgOfferteWaarde(range),
    avgReactietijdMs(range),
    statusVerdeling(range),
    categorieVerdeling(range),
    leadsPerDag(),
    topTags(range, 10),
  ])

  const conversiePct = total > 0 ? Math.round((converted / total) * 100) : 0

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1>Statistieken</h1>
          <p className={styles.subtitle}>Periode: {periodLabel(periodKey)}</p>
        </div>
        <Suspense fallback={null}>
          <PeriodSelector value={periodKey} />
        </Suspense>
      </div>

      <div className={styles.kpiGrid}>
        <KpiCard label="Totaal leads" value={String(total)} />
        <KpiCard
          label="Conversie"
          value={total > 0 ? `${conversiePct}%` : '—'}
          hint={total > 0 ? `${converted} van ${total}` : undefined}
        />
        <KpiCard
          label="⌀ Offerte"
          value={avgOfferte !== null ? formatEuro(avgOfferte) : '—'}
        />
        <KpiCard
          label="⌀ Reactietijd"
          value={avgReactie !== null ? formatDuration(avgReactie) : '—'}
        />
      </div>

      <div className={styles.twoCol}>
        <DistributionBars
          title="Verdeling per status"
          rows={statusRows.map((r) => ({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            label: dashboardStatusLabel(r.status as any),
            count: r.count,
          }))}
        />
        <DistributionBars
          title="Verdeling per categorie"
          rows={categorieRows.map((r) => ({
            label: r.categorie,
            count: r.count,
          }))}
        />
      </div>

      <div className={styles.twoCol}>
        <TrendLineChart title="Leads per dag (30d)" points={perDag} />
        <TopTagsList rows={tagRows} />
      </div>
    </div>
  )
}
