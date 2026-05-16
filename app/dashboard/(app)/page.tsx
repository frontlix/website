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
import { getRecentInboundMessages, type RecentMessage } from '@/lib/dashboard/activity-feed'
import { AreaChart } from '@/components/dashboard/ui/AreaChart'
import { LiveDot } from '@/components/dashboard/ui/LiveDot'
import { Pill } from '@/components/dashboard/ui/Pill'
import { Trechter } from '@/components/dashboard/overzicht/Trechter'
import { EerstDitDoen } from '@/components/dashboard/overzicht/EerstDitDoen'
import { deriveActions, countByTone } from '@/lib/dashboard/eerst-dit-doen'
import { DagrapportDrawer } from '@/components/dashboard/overzicht/DagrapportDrawer'
import { getDagrapport } from '@/lib/dashboard/dagrapport-queries'
import {
  LiveActivityFeed,
  type ActivityItem,
} from '@/components/dashboard/overzicht/LiveActivityFeed'
import { TrendRangeToggle } from '@/components/dashboard/overzicht/TrendRangeToggle'
import { GreetingTitle } from '@/components/dashboard/overzicht/GreetingTitle'
import { SurfaceDailySummary } from '@/components/dashboard/overzicht/SurfaceDailySummary'
import { KpiModule, parseKpiKey } from '@/components/dashboard/overzicht/KpiModule'
import {
  KPI_DOELEN,
  type KpiKey,
  type KpiMetric,
  type ExtraMetric,
} from '@/components/dashboard/overzicht/kpi-types'
import { LiveActivityFocus } from '@/components/dashboard/overzicht/LiveActivityFocus'
import { getGreeting, getVoornaam } from '@/lib/dashboard/greeting'
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

  const now = new Date()
  const week = periodToRange('deze-week', now)
  const maand = periodToRange('deze-maand', now)
  // Rolling-7d en 30d-windows voor de KPI-vergelijkingen (current vs prev).
  const week7d = thisWeekRolling(now)
  const prevWeek7d = prevWeekRange(now)
  const prevMaand = prevMonthSamePeriodRange(now)
  const last30 = last30DaysRange(now)
  const prev30 = prev30DaysRange(now)
  // "Vandaag" = sinds middernacht Europe/Amsterdam — handgemaakt omdat
  // periodToRange geen 'vandaag' kent.
  const vandaagStart = (() => {
    const y = now.getUTCFullYear()
    const m = now.getUTCMonth()
    const d = now.getUTCDate()
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  })()
  const vandaag = { from: vandaagStart, to: now.toISOString() }

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
    // ── KPI-module: huidige + vorige periode ───────────────────────
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
    supabase
      .from('tenant_settings')
      .select('chatbot_naam')
      .limit(1)
      .maybeSingle(),
    countLeads(vandaag),
    countOffertesVerstuurd(week),
    countAkkoordIn(week),
    getRecentInboundMessages(),
    // KPI prev-period queries
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

  const conversiePct =
    leadsMaand > 0 ? Math.round((convertedMaand / leadsMaand) * 100) : 0

  const omzetMaand = avgWaarde !== null ? convertedMaand * avgWaarde : 0

  const trendData = trend.map((d) => d.count)
  const totaal30d = trendData.reduce((sum, n) => sum + n, 0)
  const gemTicket = avgWaarde ?? 0

  // ── KPI-module: bouw metric-record voor 4 tegels ─────────────────
  // Conversie = converted / leads in dezelfde periode * 100.
  const conversiePctLast30 =
    leadsLast30d > 0 ? Math.round((convertedLast30d / leadsLast30d) * 100) : 0
  const conversiePctPrev30 =
    leadsPrev30d > 0 ? Math.round((convertedPrev30d / leadsPrev30d) * 100) : 0
  // Omzet prev = vorige maand t/m dezelfde dag-van-maand.
  const omzetMaandPrev = (avgWaardePrev ?? 0) * convertedMaandPrev
  const reactietijdLast7S =
    reactietijdLast7Ms !== null ? Math.round(reactietijdLast7Ms / 1000) : 0
  const reactietijdPrev7S =
    reactietijdPrev7Ms !== null ? Math.round(reactietijdPrev7Ms / 1000) : 0

  const kpiMetrics: Record<KpiKey, KpiMetric> = {
    omzet: {
      key: 'omzet',
      label: 'Omzet deze maand',
      value: Math.round(omzetMaand),
      prevValue: Math.round(omzetMaandPrev),
      unit: 'eur',
      doel: KPI_DOELEN.omzet_maand,
      rangeLabel: 'Lopende maand',
      compareLabel: 'vs vorige week',
      iconKind: 'wallet',
    },
    leads: {
      key: 'leads',
      label: 'Nieuwe leads (week)',
      value: leadsLast7d,
      prevValue: leadsPrev7d,
      unit: 'count',
      doel: KPI_DOELEN.leads_week,
      rangeLabel: 'Laatste 7 dagen',
      compareLabel: 'vs vorige week',
      iconKind: 'inbox',
    },
    conversie: {
      key: 'conversie',
      label: 'Conversie offerte → klant',
      value: conversiePctLast30,
      prevValue: conversiePctPrev30,
      unit: 'pct',
      doel: KPI_DOELEN.conversie_pct,
      rangeLabel: 'Laatste 30 dagen',
      compareLabel: 'vs vorige week',
      iconKind: 'trending',
    },
    reactietijd: {
      key: 'reactietijd',
      label: 'Reactietijd (gem.)',
      value: reactietijdLast7S,
      prevValue: reactietijdPrev7S,
      unit: 's',
      doel: KPI_DOELEN.reactietijd_doel_s,
      rangeLabel: 'Laatste 7 dagen',
      compareLabel: 'vs vorige week',
      invertDelta: true,
      iconKind: 'clock',
    },
  }

  // Extra mini-card: huidige stand "Offertes open" (geen tab, niet
  // klikbaar). Geen meaningful prev-vergelijking voor stock-metrics —
  // delta laten we op 0 zodat de mini "—" toont i.p.v. een misleidende ↑.
  const extraOffertesOpen: ExtraMetric = {
    key: 'offertes_open',
    label: 'Offertes open',
    value: openOffertes,
    prevValue: openOffertes,
    unit: 'count',
    doel: 0,
    rangeLabel: 'Nu open',
    compareLabel: '',
    iconKind: 'file',
  }

  // Komende afspraken — toekomstige, top 4.
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const upcomingAppts = appts
    .filter(
      (a) =>
        a.afspraak_geboekt_op &&
        new Date(a.afspraak_geboekt_op).getTime() >= today.getTime(),
    )
    .slice(0, 4)

  // Trechter — gebruikt deze-week metrics. Counts uit gesprek_fase
  // verdeling van leads die deze week zijn binnengekomen.
  // Voor V1 een eenvoudige proxy: tellen alle leads van deze week
  // per gesprek_fase + dashboard_status.
  const weekLeads = allLeads.filter(
    (l) => l.aangemaakt && new Date(l.aangemaakt).getTime() >= new Date(week.from!).getTime(),
  )
  const totalWeek = weekLeads.length || 1 // voorkom div-by-zero
  const funnelRows = [
    { label: 'Lead binnen', count: weekLeads.length, pct: 100 },
    {
      label: 'Bot startte gesprek',
      count: weekLeads.length,
      pct: 100,
    },
    {
      label: 'Info compleet',
      count: weekLeads.filter(
        (l) =>
          l.gesprek_fase !== 'info_verzamelen' &&
          l.dashboard_status !== 'archief',
      ).length,
      pct: 0,
    },
    {
      label: 'Offerte verstuurd',
      count: weekLeads.filter(
        (l) =>
          l.gesprek_fase === 'offerte_besproken' ||
          l.gesprek_fase === 'onderhandelen' ||
          l.gesprek_fase === 'datum_kiezen' ||
          l.gesprek_fase === 'afspraak_bevestigd',
      ).length,
      pct: 0,
    },
    {
      label: 'Akkoord',
      count: weekLeads.filter(
        (l) =>
          l.gesprek_fase === 'datum_kiezen' ||
          l.gesprek_fase === 'afspraak_bevestigd' ||
          l.dashboard_status === 'afgehandeld',
      ).length,
      pct: 0,
    },
  ].map((r) => ({ ...r, pct: Math.round((r.count / totalWeek) * 100) }))

  // "Eerst dit doen" — gederiveerde prioriteits-acties uit de leads-lijst.
  // Max 5 zodat het lijstje overzichtelijk blijft; rest moet de owner via
  // de leads-tab benaderen.
  const eerstDitDoenActies = deriveActions(allLeads, 5)
  const eerstDitDoenCounts = countByTone(eerstDitDoenActies)

  // Owner-acties trend-stat = aantal leads in 'onderhandelen' fase.
  // Niet hetzelfde als eerstDitDoenActies (die is breder gederiveerd).
  const ownerActieCount = allLeads.filter(
    (l) => l.gesprek_fase === 'onderhandelen',
  ).length

  // Activity feed — gecombineerde stream over 4 event-types (new/wa/appt/quote).
  // V1 server-rendered op page load; realtime-subscriptie staat op de roadmap.
  const activityItems = buildActivityFeed(allLeads, upcomingAppts, recentMessages)

  // Dagrapport-data alleen ophalen als de drawer open is — voorkomt extra
  // queries op elke pageload. URL-param `?dagrapport=1` triggert het.
  const dagrapportData = dagrapportOpen ? await getDagrapport(now) : null

  // ── Focus-modus: alleen Live activiteit in beeld ────────────────
  // Wordt geactiveerd via "?focus=live" (oog-knop rechtsboven). Geeft een
  // standalone view terug zodat de rest van het dashboard niet rendert.
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

      {/* "Eerst dit doen" — alleen renderen als er daadwerkelijk acties zijn.
          Bij 0 acties verdwijnt de hele sectie zodat het dashboard niet
          gepollueerd wordt door een leeg blok. */}
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
        {/* LINKERKOLOM — trend chart + onder daaronder funnel + owner-acties */}
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
              <TrendStat
                label="Conversie"
                value={`${conversiePct}%`}
                sub="deze maand"
              />
              <TrendStat
                label="Owner-acties"
                value={String(ownerActieCount)}
                sub="nog open"
              />
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

          {/* Trechter — staat nu alleen op deze rij; de actie-lijst is
              verhuisd naar "Eerst dit doen" bovenaan. */}
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

      {/* Dagrapport-drawer — alleen gemount als ?dagrapport=1 in de URL
          staat. Server-pre-fetched data wordt meegegeven, het paneel zelf
          is een client-component voor de sluit-flow (router.replace). */}
      {dagrapportData && <DagrapportDrawer data={dagrapportData} />}
    </>
  )
}

function TrendStat({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub: string
}) {
  return (
    <div className={styles.trendStat}>
      <div className={styles.trendStatLabel}>{label}</div>
      <div className={styles.trendStatValue}>{value}</div>
      <div className={styles.trendStatSub}>{sub}</div>
    </div>
  )
}

type LeadForFeed = import('@/lib/dashboard/lead-queries').LeadListItem
type ApptForFeed = import('@/lib/dashboard/agenda-queries').Appointment

function buildActivityFeed(
  leads: LeadForFeed[],
  appts: ApptForFeed[],
  recentMessages: RecentMessage[],
): ActivityItem[] {
  const events: ActivityItem[] = []

  // ── 'new' events — recent aangemaakte leads
  for (const lead of leads.slice(0, 6)) {
    events.push({
      leadId: lead.lead_id,
      naam: lead.naam,
      kind: 'new',
      text: 'kwam binnen via formulier',
      timestamp: lead.aangemaakt ?? '',
    })
  }

  // ── 'appt' events — recent geboekte afspraken
  for (const appt of appts.slice(0, 4)) {
    if (!appt.afspraak_geboekt_op) continue
    events.push({
      leadId: appt.lead_id,
      naam: appt.naam,
      kind: 'appt',
      text: `bevestigde afspraak voor ${new Date(appt.afspraak_geboekt_op).toLocaleDateString(
        'nl-NL',
        { weekday: 'short', day: 'numeric', month: 'short' },
      )}`,
      timestamp: appt.afspraak_geboekt_op,
    })
  }

  // ── 'wa' events — recente klant-berichten (uit berichten-tabel)
  for (const msg of recentMessages.slice(0, 8)) {
    events.push({
      leadId: msg.lead_id,
      naam: msg.naam,
      kind: 'wa',
      text: 'stuurde een bericht',
      timestamp: msg.timestamp,
    })
  }

  // ── 'quote' events — leads in 'onderhandelen' fase (wacht op owner-review).
  // Timestamp = lead.aangemaakt als proxy (we hebben geen "fase-veranderd-op"
  // veld). Voor V1 is dit goed genoeg: het laat zien wélke offertes nu owner-
  // actie nodig hebben in de feed.
  const ownerReviewLeads = leads.filter((l) => l.gesprek_fase === 'onderhandelen')
  for (const lead of ownerReviewLeads.slice(0, 6)) {
    events.push({
      leadId: lead.lead_id,
      naam: lead.naam,
      kind: 'quote',
      text: 'wacht op owner-review',
      timestamp: lead.aangemaakt ?? '',
    })
  }

  return events
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 12)
}
