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
import { KpiCard } from '@/components/dashboard/ui/KpiCard'
import { AreaChart } from '@/components/dashboard/ui/AreaChart'
import { LiveDot } from '@/components/dashboard/ui/LiveDot'
import { Pill } from '@/components/dashboard/ui/Pill'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

export default async function OverzichtPage() {
  // Layout heeft auth al gechecked, maar we lezen het profile hier opnieuw
  // voor de tenant_settings.chatbot_naam (Topbar heeft alleen bedrijfsnaam).
  await requireApprovedUser()
  const supabase = await getDashboardSupabase()

  const now = new Date()
  const week = periodToRange('deze-week', now)
  const maand = periodToRange('deze-maand', now)

  // Parallelle queries — alles serverside, één render geen waterval.
  const [
    nieuweLeadsWeek,
    leadsMaand,
    convertedMaand,
    avgWaarde,
    reactietijdMs,
    trend,
    appts,
    tenantRaw,
  ] = await Promise.all([
    countLeads(week),
    countLeads(maand),
    countConverted(maand),
    avgOfferteWaarde(maand),
    avgReactietijdMs(week),
    leadsPerDag(now),
    getAppointmentsForMonth(now.getUTCFullYear(), now.getUTCMonth() + 1),
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

  // Geschatte maand-omzet: aantal converted × gemiddelde offerte-waarde.
  // Approximatief (we hebben geen "betaald"-veld); voor V1 prima.
  const omzetMaand = avgWaarde !== null ? convertedMaand * avgWaarde : 0

  const reactietijdS =
    reactietijdMs !== null ? Math.round(reactietijdMs / 1000) : 0

  const trendData = trend.map((d) => d.count)
  // Laatste 7 dagen sparkline voor de "Nieuwe leads"-KPI.
  const trendLast7 = trendData.slice(-7)

  // Stats onder het trend-chart (4 vakjes).
  const totaal30d = trendData.reduce((sum, n) => sum + n, 0)
  const gemTicket = avgWaarde ?? 0

  // Komende afspraken — alleen toekomstige, top 4.
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const upcomingAppts = appts
    .filter(
      (a) =>
        a.afspraak_geboekt_op &&
        new Date(a.afspraak_geboekt_op).getTime() >= today.getTime(),
    )
    .slice(0, 4)

  return (
    <>
      {/* ── Header — page-level ────────────────────────────── */}
      <div className="dash-section-head">
        <div>
          <div className="dash-section-title">Overzicht</div>
          <div className="dash-section-sub">
            <LiveDot />
            <span style={{ marginLeft: 8, verticalAlign: 'middle' }}>
              {chatbotName} is live · {upcomingAppts.length} komende afspra{upcomingAppts.length === 1 ? 'ak' : 'ken'}
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
          <a href="/leads" className="dash-btn dash-btn-primary">
            <Plus size={14} />
            Nieuwe lead
          </a>
        </div>
      </div>

      {/* ── KPI-grid ───────────────────────────────────────── */}
      <div className="dash-kpi-grid" style={{ marginBottom: 20 }}>
        <KpiCard
          label="Nieuwe leads (week)"
          value={nieuweLeadsWeek}
          trend={trendLast7}
        />
        <KpiCard
          label="Conversie deze maand"
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

      {/* ── Main grid: trend (links) + komende afspraken (rechts) ── */}
      <div className={styles.mainGrid}>
        {/* Trend chart card */}
        <div className="dash-card">
          <div className="dash-card-head">
            <div>
              <div className="dash-card-title">Lead-instroom — laatste 30 dagen</div>
              <div className="dash-card-sub">Aantal nieuwe leads per dag</div>
            </div>
          </div>
          <div style={{ padding: '8px 12px 12px' }}>
            <AreaChart data={trendData} height={170} />
          </div>
          <div className={styles.trendStats}>
            <TrendStat label="Totaal leads" value={String(totaal30d)} sub="in 30d" />
            <TrendStat
              label="Conversie"
              value={`${conversiePct}%`}
              sub="deze maand"
            />
            <TrendStat
              label="Owner-acties"
              value={String(Math.max(0, leadsMaand - convertedMaand))}
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

        {/* Komende afspraken */}
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
                      {date.toLocaleDateString('nl-NL', { month: 'short' })}
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
                  <Pill tone={appt.dashboard_status === 'afgehandeld' ? 'green' : 'blue'}>
                    {appt.dashboard_status ?? 'open'}
                  </Pill>
                </a>
              )
            })}
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

