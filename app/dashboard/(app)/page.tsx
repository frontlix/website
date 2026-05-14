import Link from 'next/link'
import { FileText, Plus } from 'lucide-react'
import { requireApprovedUser } from '@/lib/dashboard/require-approved-user'
import { getDashboardSupabase } from '@/lib/dashboard/supabase-server'
import { periodToRange } from '@/lib/dashboard/period'
import {
  countLeads,
  countConverted,
  avgOfferteWaarde,
  avgReactietijdMs,
  leadsPerDag,
} from '@/lib/dashboard/stats-queries'
import { getAppointmentsForMonth } from '@/lib/dashboard/agenda-queries'
import { getLeadsList } from '@/lib/dashboard/lead-queries'
import { KpiCard } from '@/components/dashboard/ui/KpiCard'
import { AreaChart } from '@/components/dashboard/ui/AreaChart'
import { LiveDot } from '@/components/dashboard/ui/LiveDot'
import { Pill } from '@/components/dashboard/ui/Pill'
import { Trechter } from '@/components/dashboard/overzicht/Trechter'
import { OwnerActies } from '@/components/dashboard/overzicht/OwnerActies'
import {
  LiveActivityFeed,
  type ActivityItem,
} from '@/components/dashboard/overzicht/LiveActivityFeed'
import { TrendRangeToggle } from '@/components/dashboard/overzicht/TrendRangeToggle'
import { GreetingTitle } from '@/components/dashboard/overzicht/GreetingTitle'
import { getGreeting, getVoornaam } from '@/lib/dashboard/greeting'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

type TrendRange = '7d' | '28d' | '90d'
const RANGE_DAYS: Record<TrendRange, number> = { '7d': 7, '28d': 28, '90d': 90 }

export default async function OverzichtPage({
  searchParams,
}: {
  searchParams: Promise<{ trend?: string }>
}) {
  const { user } = await requireApprovedUser()
  const supabase = await getDashboardSupabase()

  const greeting = getGreeting()
  const voornaam = getVoornaam(user)

  const sp = await searchParams
  const trendRange: TrendRange = sp.trend === '7d' || sp.trend === '90d' ? sp.trend : '28d'
  const trendDays = RANGE_DAYS[trendRange]

  const now = new Date()
  const week = periodToRange('deze-week', now)
  const maand = periodToRange('deze-maand', now)

  const [
    nieuweLeadsWeek,
    leadsMaand,
    convertedMaand,
    avgWaarde,
    reactietijdMs,
    trend,
    appts,
    allLeads,
    tenantRaw,
  ] = await Promise.all([
    countLeads(week),
    countLeads(maand),
    countConverted(maand),
    avgOfferteWaarde(maand),
    avgReactietijdMs(week),
    leadsPerDag(now, trendDays),
    getAppointmentsForMonth(now.getUTCFullYear(), now.getUTCMonth() + 1),
    getLeadsList(),
    supabase
      .from('tenant_settings')
      .select('chatbot_naam')
      .limit(1)
      .maybeSingle(),
  ])

  const tenant = tenantRaw.data as { chatbot_naam: string | null } | null
  const chatbotName = tenant?.chatbot_naam ?? 'Surface'

  const conversiePct =
    leadsMaand > 0 ? Math.round((convertedMaand / leadsMaand) * 100) : 0

  const omzetMaand = avgWaarde !== null ? convertedMaand * avgWaarde : 0
  const reactietijdS =
    reactietijdMs !== null ? Math.round(reactietijdMs / 1000) : 0

  const trendData = trend.map((d) => d.count)
  const trendLast7 = trendData.slice(-7)
  const totaal30d = trendData.reduce((sum, n) => sum + n, 0)
  const gemTicket = avgWaarde ?? 0

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

  // Owner-acties — leads in 'onderhandelen' fase (= wacht op owner-besluit)
  const ownerActieLeads = allLeads
    .filter((l) => l.gesprek_fase === 'onderhandelen')
    .slice(0, 10)

  // Activity feed — V1 statische demo uit recente leads/appointments.
  // Realtime stream komt in een opvolg-batch.
  const activityItems = buildActivityFeed(allLeads, upcomingAppts)

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

      <div className="dash-kpi-grid" style={{ marginBottom: 20 }}>
        <KpiCard
          label="Nieuwe leads (week)"
          value={nieuweLeadsWeek}
          trend={trendLast7}
        />
        <KpiCard
          label="Conversie offerte→klant"
          value={conversiePct}
          suffix="%"
        />
        <KpiCard
          label="Reactietijd (gem.)"
          value={reactietijdS}
          suffix="s"
          invertDelta
        />
        <KpiCard
          label="Omzet deze maand"
          value={Math.round(omzetMaand)}
          prefix="€"
        />
      </div>

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
                value={String(ownerActieLeads.length)}
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

          {/* Sub-rij: trechter + owner-acties naast elkaar */}
          <div className={styles.subRow}>
            <Trechter rows={funnelRows} />
            <OwnerActies leads={ownerActieLeads} />
          </div>
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
): ActivityItem[] {
  // V1 — laatste 10 events afgeleid uit lead-aanmaak + komende afspraken.
  // Realtime-stream komt in een opvolgfase.
  const events: ActivityItem[] = []

  for (const lead of leads.slice(0, 6)) {
    events.push({
      leadId: lead.lead_id,
      naam: lead.naam,
      kind: 'new',
      text: 'kwam binnen via formulier',
      timestamp: lead.aangemaakt ?? '',
    })
  }
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

  return events
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 9)
}
