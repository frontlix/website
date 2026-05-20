import Link from 'next/link'
import { FileText, Plus, Eye } from 'lucide-react'
import { requireApprovedUser } from '@/lib/dashboard/require-approved-user'
import { getDashboardSupabase } from '@/lib/dashboard/supabase-server'
import {
  periodToRange,
  thisWeekRolling,
  prevWeekRange,
  prevMonthSamePeriodRange,
  last30DaysRange,
  prev30DaysRange,
} from '@/lib/dashboard/period'
import {
  countLeads,
  countConverted,
  countOffertesVerstuurd,
  countOpenOffertes,
  countAkkoordIn,
  avgOfferteWaarde,
  avgReactietijdMs,
  leadsPerDag,
} from '@/lib/dashboard/stats-queries'
import { getAppointmentsForMonth } from '@/lib/dashboard/agenda-queries'
import { getLeadsList } from '@/lib/dashboard/lead-queries'
import { getRecentInboundMessages } from '@/lib/dashboard/activity-feed'
import {
  buildFunnelRows,
  buildActivityFeed,
  buildKpiMetrics,
  buildOpenOffertesMetric,
  pickUpcomingAppointments,
} from '@/lib/dashboard/overzicht-data'
import { getGreeting, getVoornaam } from '@/lib/dashboard/greeting'
import { getDagrapport } from '@/lib/dashboard/dagrapport-queries'

import { AreaChart } from '@/components/dashboard/ui/AreaChart'
import { LiveDot } from '@/components/dashboard/ui/LiveDot'
import { Pill } from '@/components/dashboard/ui/Pill'
import { Trechter } from '@/components/dashboard/overzicht/Trechter'
import { EerstDitDoen } from '@/components/dashboard/overzicht/EerstDitDoen'
import { deriveActions, countByTone } from '@/lib/dashboard/eerst-dit-doen'
import { DagrapportDrawer } from '@/components/dashboard/overzicht/DagrapportDrawer'
import { LiveActivityFeed } from '@/components/dashboard/overzicht/LiveActivityFeed'
import { TrendRangeToggle } from '@/components/dashboard/overzicht/TrendRangeToggle'
import { GreetingTitle } from '@/components/dashboard/overzicht/GreetingTitle'
import { SurfaceDailySummary } from '@/components/dashboard/overzicht/SurfaceDailySummary'
import { KpiModule, parseKpiKey } from '@/components/dashboard/overzicht/KpiModule'
import { type KpiKey } from '@/components/dashboard/overzicht/kpi-types'
import { LiveActivityFocus } from '@/components/dashboard/overzicht/LiveActivityFocus'
import { TrendStat } from '@/components/dashboard/overzicht/TrendStat'

import styles from './page.module.css'

export const dynamic = 'force-dynamic'

type TrendRange = '7d' | '28d' | '90d'
const RANGE_DAYS: Record<TrendRange, number> = { '7d': 7, '28d': 28, '90d': 90 }

export default async function OverzichtPage({
  searchParams,
}: {
  searchParams: Promise<{
    trend?: string
    kpi?: string
    focus?: string
    dagrapport?: string
  }>
}) {
  const { user } = await requireApprovedUser()
  const supabase = await getDashboardSupabase()

  const greeting = getGreeting()
  const voornaam = getVoornaam(user)

  const sp = await searchParams
  const trendRange: TrendRange = sp.trend === '7d' || sp.trend === '90d' ? sp.trend : '28d'
  const trendDays = RANGE_DAYS[trendRange]
  const activeKpi: KpiKey = parseKpiKey(sp.kpi)
  const focusMode = sp.focus === 'live'
  const dagrapportOpen = sp.dagrapport === '1'

  // ── Tijdvensters ──────────────────────────────────────
  const now = new Date()
  const week = periodToRange('deze-week', now)
  const maand = periodToRange('deze-maand', now)
  const week7d = thisWeekRolling(now)
  const prevWeek7d = prevWeekRange(now)
  const prevMaand = prevMonthSamePeriodRange(now)
  const last30 = last30DaysRange(now)
  const prev30 = prev30DaysRange(now)
  // "Vandaag" = sinds middernacht Europe/Amsterdam — handmatig omdat
  // periodToRange geen 'vandaag' kent.
  const vandaagStart = (() => {
    const y = now.getUTCFullYear()
    const m = now.getUTCMonth()
    const d = now.getUTCDate()
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  })()
  const vandaag = { from: vandaagStart, to: now.toISOString() }

  // ── Parallel-fetch: alles wat het overzicht nodig heeft ──
  const [
    leadsMaand,
    convertedMaand,
    avgWaarde,
    trend,
    appts,
    allLeads,
    tenantRaw,
    leadsVandaag,
    offertesWeek,
    akkoordWeek,
    recentMessages,
    leadsLast7d,
    leadsPrev7d,
    convertedMaandPrev,
    avgWaardePrev,
    leadsLast30d,
    convertedLast30d,
    leadsPrev30d,
    convertedPrev30d,
    reactietijdLast7Ms,
    reactietijdPrev7Ms,
    openOffertes,
  ] = await Promise.all([
    countLeads(maand),
    countConverted(maand),
    avgOfferteWaarde(maand),
    leadsPerDag(now, trendDays),
    getAppointmentsForMonth(now.getUTCFullYear(), now.getUTCMonth() + 1),
    getLeadsList(),
    supabase.from('tenant_settings').select('chatbot_naam').limit(1).maybeSingle(),
    countLeads(vandaag),
    countOffertesVerstuurd(week),
    countAkkoordIn(week),
    getRecentInboundMessages(),
    countLeads(week7d),
    countLeads(prevWeek7d),
    countConverted(prevMaand),
    avgOfferteWaarde(prevMaand),
    countLeads(last30),
    countConverted(last30),
    countLeads(prev30),
    countConverted(prev30),
    avgReactietijdMs(week7d),
    avgReactietijdMs(prevWeek7d),
    countOpenOffertes(),
  ])

  const tenant = tenantRaw.data as { chatbot_naam: string | null } | null
  const chatbotName = tenant?.chatbot_naam ?? 'Surface'

  // ── Afgeleide cijfers ─────────────────────────────────
  const conversiePct =
    leadsMaand > 0 ? Math.round((convertedMaand / leadsMaand) * 100) : 0
  const omzetMaand = avgWaarde !== null ? convertedMaand * avgWaarde : 0
  const gemTicket = avgWaarde ?? 0

  const trendData = trend.map((d) => d.count)
  const totaal30d = trendData.reduce((sum, n) => sum + n, 0)

  const conversiePctLast30 =
    leadsLast30d > 0 ? Math.round((convertedLast30d / leadsLast30d) * 100) : 0
  const conversiePctPrev30 =
    leadsPrev30d > 0 ? Math.round((convertedPrev30d / leadsPrev30d) * 100) : 0
  const omzetMaandPrev = (avgWaardePrev ?? 0) * convertedMaandPrev
  const reactietijdLast7S =
    reactietijdLast7Ms !== null ? Math.round(reactietijdLast7Ms / 1000) : 0
  const reactietijdPrev7S =
    reactietijdPrev7Ms !== null ? Math.round(reactietijdPrev7Ms / 1000) : 0

  const kpiMetrics = buildKpiMetrics({
    omzetMaand,
    omzetMaandPrev,
    leadsLast7d,
    leadsPrev7d,
    conversiePctLast30,
    conversiePctPrev30,
    reactietijdLast7S,
    reactietijdPrev7S,
  })
  const extraOffertesOpen = buildOpenOffertesMetric(openOffertes)

  const upcomingAppts = pickUpcomingAppointments(appts, 4)
  const funnelRows = buildFunnelRows(allLeads, week.from!)
  const eerstDitDoenActies = deriveActions(allLeads, 5)
  const eerstDitDoenCounts = countByTone(eerstDitDoenActies)
  const ownerActieCount = allLeads.filter(
    (l) => l.gesprek_fase === 'onderhandelen',
  ).length
  const activityItems = buildActivityFeed(allLeads, upcomingAppts, recentMessages)

  // Dagrapport-data alleen ophalen als de drawer open is — voorkomt extra
  // queries op elke pageload. URL-param `?dagrapport=1` triggert het.
  const dagrapportData = dagrapportOpen ? await getDagrapport(now) : null

  // Focus-modus: alleen Live activiteit in beeld (via "?focus=live").
  // Standalone view zodat de rest van het dashboard niet rendert.
  if (focusMode) {
    return <LiveActivityFocus chatbotName={chatbotName} items={activityItems} />
  }

  return (
    <>
      <div className="dash-section-head">
        <div>
          <div className="dash-section-title">
            <GreetingTitle initialGreeting={greeting} voornaam={voornaam} />
          </div>
          <div className="dash-section-sub">
            <LiveDot />
            <span style={{ marginLeft: 8, verticalAlign: 'middle' }}>
              {chatbotName} is live · {upcomingAppts.length} komende afspra
              {upcomingAppts.length === 1 ? 'ak' : 'ken'}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link
            href="/dashboard?focus=live"
            className="dash-btn dash-btn-secondary"
            scroll={false}
            title="Focus-modus: alleen Live activiteit"
            aria-label="Focus-modus openen"
          >
            <Eye size={14} />
          </Link>
          <a
            href="/api/dashboard/export/leads-csv"
            className="dash-btn dash-btn-secondary"
          >
            <FileText size={13} />
            Export
          </a>
          <Link href="/?nieuwe-offerte=1" className="dash-btn dash-btn-primary" scroll={false}>
            <Plus size={14} />
            Nieuwe offerte
          </Link>
        </div>
      </div>

      <SurfaceDailySummary
        greeting={greeting}
        voornaam={voornaam}
        chatbotName={chatbotName}
        stats={{
          leadsVandaag,
          offertesWeek,
          akkoordWeek,
          omzetMaand: Math.round(omzetMaand),
          gemTicket: Math.round(gemTicket),
        }}
      />

      {/* "Eerst dit doen" — alleen renderen als er daadwerkelijk acties zijn,
          anders verdwijnt de hele sectie zodat we geen leeg blok tonen. */}
      {eerstDitDoenActies.length > 0 && (
        <EerstDitDoen
          actions={eerstDitDoenActies}
          counts={eerstDitDoenCounts}
        />
      )}

      <KpiModule
        metrics={kpiMetrics}
        active={activeKpi}
        hrefBase="/dashboard"
        extraMetric={extraOffertesOpen}
      />

      <div className={styles.mainGrid}>
        {/* LINKERKOLOM — trend chart + funnel */}
        <div className={styles.colLeft}>
          <div className="dash-card">
            <div className="dash-card-head">
              <div>
                <div className="dash-card-title">
                  Lead-instroom — laatste {trendDays} dagen
                </div>
                <div className="dash-card-sub">Aantal nieuwe leads per dag</div>
              </div>
              <TrendRangeToggle active={trendRange} />
            </div>
            <div style={{ padding: '8px 12px 12px' }}>
              <AreaChart data={trendData} height={170} />
            </div>
            <div className={styles.trendStats}>
              <TrendStat label="Totaal leads" value={String(totaal30d)} sub={`in ${trendDays}d`} />
              <TrendStat label="Conversie" value={`${conversiePct}%`} sub="deze maand" />
              <TrendStat label="Owner-acties" value={String(ownerActieCount)} sub="nog open" />
              <TrendStat
                label="Gem. ticket"
                value={
                  gemTicket > 0
                    ? `€ ${Math.round(gemTicket).toLocaleString('nl-NL')}`
                    : '—'
                }
                sub="per offerte"
              />
            </div>
          </div>

          <Trechter rows={funnelRows} />
        </div>

        {/* RECHTERKOLOM — live activity feed + komende afspraken */}
        <div className={styles.colRight}>
          <LiveActivityFeed items={activityItems} />

          <div className="dash-card">
            <div className="dash-card-head">
              <div className="dash-card-title">Komende afspraken</div>
              <a href="/agenda" className="dash-btn dash-btn-ghost dash-btn-sm">
                Agenda →
              </a>
            </div>
            <div className={styles.apptList}>
              {upcomingAppts.length === 0 && (
                <div className={styles.apptEmpty}>
                  Geen geplande afspraken.{' '}
                  <a href="/agenda" style={{ color: 'var(--primary)' }}>
                    Open agenda
                  </a>
                </div>
              )}
              {upcomingAppts.map((appt) => {
                const date = new Date(appt.afspraak_geboekt_op!)
                return (
                  <a
                    key={appt.lead_id}
                    href={`/leads/${appt.lead_id}`}
                    className={styles.apptRow}
                  >
                    <div className={styles.apptDate}>
                      <div className={styles.apptMonth}>
                        {date
                          .toLocaleDateString('nl-NL', { month: 'short' })
                          .toUpperCase()}
                      </div>
                      <div className={styles.apptDay}>{date.getDate()}</div>
                    </div>
                    <div className={styles.apptBody}>
                      <div className={styles.apptName}>{appt.naam}</div>
                      <div className={styles.apptMeta}>
                        {date.toLocaleTimeString('nl-NL', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        · {appt.telefoon}
                      </div>
                    </div>
                    <Pill
                      tone={
                        appt.dashboard_status === 'afgehandeld' ? 'green' : 'blue'
                      }
                    >
                      {appt.dashboard_status ?? 'open'}
                    </Pill>
                  </a>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {dagrapportData && <DagrapportDrawer data={dagrapportData} />}
    </>
  )
}
