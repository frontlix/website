import { parsePeriod, periodToRange, rangeToDays } from '@/lib/dashboard/period'
import {
  countLeads,
  countConverted,
  countOffertesVerstuurd,
  avgOfferteWaarde,
  avgReactietijdMs,
  statusVerdeling,
  categorieVerdeling,
  leadsPerDag,
  topTags,
  omzetTotaal,
  omzetPerCategorie,
  omzetTrendVoorPeriode,
  getOmzetDoelMaand,
} from '@/lib/dashboard/stats-queries'
import { MobileAnalyses } from '@/components/dashboard/mobile/analyses/MobileAnalyses'
import styles from './page.module.css'

export default async function StatistiekenPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>
}) {
  const sp = await searchParams
  const periodKey = parsePeriod(sp)
  const range = periodToRange(periodKey)
  // De leads-per-dag-grafiek volgt de gekozen periode i.p.v. een vaste 30d.
  const trendDays = rangeToDays(range)

  const [
    total,
    converted,
    offertesVerstuurd,
    avgOfferte,
    avgReactie,
    ,
    ,
    ,
    ,
    omzet,
    omzetDoelMaand,
    omzetTrend,
    omzetDiensten,
  ] = await Promise.all([
    countLeads(range),
    countConverted(range),
    countOffertesVerstuurd(range),
    avgOfferteWaarde(range),
    avgReactietijdMs(range),
    statusVerdeling(range),
    categorieVerdeling(range),
    leadsPerDag(new Date(), trendDays),
    topTags(range, 10),
    omzetTotaal(range),
    getOmzetDoelMaand(),
    omzetTrendVoorPeriode(periodKey),
    omzetPerCategorie(range),
  ])

  return (
    <>
      <div className={styles.mobileTree}>
        <MobileAnalyses
          data={{
            periodKey,
            omzet,
            omzetDoelMaand,
            trend: omzetTrend,
            leadsTotaal: total,
            offertesVerstuurd,
            converted,
            avgOfferte,
            avgReactieMs: avgReactie,
            diensten: omzetDiensten,
          }}
        />
      </div>
    </>
  )
}
