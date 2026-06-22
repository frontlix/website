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
import { formatDuration } from '@/lib/dashboard/format'
import { getAppointmentsForMonth } from '@/lib/dashboard/agenda-queries'
import { getLeadsList, leadsArrivedTodayAndTomorrow } from '@/lib/dashboard/lead-queries'
import { getRecentInboundMessages } from '@/lib/dashboard/activity-feed'
import {
  getRecentNotifications,
  getUnreadNotificationCount,
} from '@/lib/dashboard/notification-queries'
import {
  buildActivityFeed,
  pickUpcomingAppointments,
} from '@/lib/dashboard/overzicht-data'
import { getGreeting, getVoornaam } from '@/lib/dashboard/greeting'
import { getDagrapport } from '@/lib/dashboard/dagrapport-queries'
import { buildSurfaceSummary } from '@/lib/dashboard/surface-summary'

import { deriveActions, type DashboardAction } from '@/lib/dashboard/eerst-dit-doen'
import { DagrapportDrawer } from '@/components/dashboard/overzicht/DagrapportDrawer'
import { type ActivityItem as LiveActivityItem } from '@/components/dashboard/overzicht/LiveActivityFeed'
import { LiveActivityFocus } from '@/components/dashboard/overzicht/LiveActivityFocus'
import { shortTimeAgo } from '@/lib/dashboard/relative-time'

import { MobileOverzicht, type MobileOverzichtData } from '@/components/dashboard/mobile/overzicht/MobileOverzicht'
import type { UrgentItem } from '@/components/dashboard/mobile/overzicht/UrgentBlock'
import type { VandaagItem } from '@/components/dashboard/mobile/overzicht/VandaagBlock'
import type { ActivityItem as MobileActivityItem, ActivityType as MobileActivityType } from '@/components/dashboard/mobile/overzicht/ActivityFeedBlock'
import type { Appointment } from '@/lib/dashboard/agenda-queries'

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
  // "Vandaag" = sinds middernacht Europe/Amsterdam, handmatig omdat
  // periodToRange geen 'vandaag' kent.
  const vandaagStart = (() => {
    const y = now.getUTCFullYear()
    const m = now.getUTCMonth()
    const d = now.getUTCDate()
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  })()
  const vandaag = { from: vandaagStart, to: now.toISOString() }

  // ── Parallel-fetch: alles wat het overzicht nodig heeft ──
  //
  // tenant-fetch breed uitgebreid: ook `omzet_doel_maand` voor de mobile
  // HeroKpiCard. Kolom is via migratie 045 toegevoegd en is mogelijk nog
  // niet toegepast, defensieve cast onderaan vangt dat op (`?? null`).
  //
  // `leadsTodayTomorrow` is nieuw voor de mobile-header-subline
  // ("14 leads vandaag · 4 morgen").
  const [
    ,
    convertedMaand,
    avgWaarde,
    ,
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
    leadsTodayTomorrow,
    mobileNotifications,
    mobileUnreadCount,
  ] = await Promise.all([
    countLeads(maand),
    countConverted(maand),
    avgOfferteWaarde(maand),
    leadsPerDag(now, trendDays),
    getAppointmentsForMonth(now.getUTCFullYear(), now.getUTCMonth() + 1),
    getLeadsList(),
    supabase
      .from('tenant_settings')
      .select('chatbot_naam, omzet_doel_maand')
      .limit(1)
      .maybeSingle(),
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
    leadsArrivedTodayAndTomorrow(),
    // Bel-feed + ongelezen-badge voor de mobiele Overzicht-header.
    getRecentNotifications(15),
    getUnreadNotificationCount(),
  ])

  // Tenant: chatbot_naam altijd aanwezig, omzet_doel_maand is nieuwe
  // kolom (migratie 045). Defensief casten zodat de build niet breekt
  // als de kolom nog niet in productie staat.
  const tenant = tenantRaw.data as
    | { chatbot_naam: string | null; omzet_doel_maand?: number | null }
    | null
  const chatbotName = tenant?.chatbot_naam ?? 'Surface'
  const omzetDoelMaand: number | null =
    (tenant?.omzet_doel_maand as number | null | undefined) ?? null

  // ── Afgeleide cijfers ─────────────────────────────────
  const omzetMaand = avgWaarde !== null ? convertedMaand * avgWaarde : 0
  const gemTicket = avgWaarde ?? 0

  const conversiePctLast30 =
    leadsLast30d > 0 ? Math.round((convertedLast30d / leadsLast30d) * 100) : 0
  const conversiePctPrev30 =
    leadsPrev30d > 0 ? Math.round((convertedPrev30d / leadsPrev30d) * 100) : 0
  const omzetMaandPrev = (avgWaardePrev ?? 0) * convertedMaandPrev
  const reactietijdLast7S =
    reactietijdLast7Ms !== null ? Math.round(reactietijdLast7Ms / 1000) : 0
  const reactietijdPrev7S =
    reactietijdPrev7Ms !== null ? Math.round(reactietijdPrev7Ms / 1000) : 0

  const upcomingAppts = pickUpcomingAppointments(appts, 4)
  const eerstDitDoenActies = deriveActions(allLeads, 5)
  const activityItems = buildActivityFeed(allLeads, upcomingAppts, recentMessages)

  // Dagrapport-data alleen ophalen als de drawer open is, voorkomt extra
  // queries op elke pageload. URL-param `?dagrapport=1` triggert het.
  const dagrapportData = dagrapportOpen ? await getDagrapport(now) : null

  // Focus-modus: alleen Live activiteit in beeld (via "?focus=live").
  // Standalone view zodat de rest van het dashboard niet rendert.
  if (focusMode) {
    return <LiveActivityFocus chatbotName={chatbotName} items={activityItems} />
  }

  // ── Mobile-Overzicht data-mapping ─────────────────────
  // Bouwt één MobileOverzichtData blob uit de bestaande server-data.
  // Hergebruikt alle queries hierboven, geen extra DB-calls hier.
  const mobileData: MobileOverzichtData = {
    greeting,
    voornaam: voornaam ?? undefined,
    leadsToday: leadsTodayTomorrow.today,
    leadsTomorrow: leadsTodayTomorrow.tomorrow,
    aiBrief: {
      title: 'Drie dingen voor de koffie',
      summary: buildSurfaceSummary({
        leadsVandaag,
        offertesWeek,
        akkoordWeek,
        omzetMaand: Math.round(omzetMaand),
        gemTicket: Math.round(gemTicket),
      }),
      ctaLabel:
        openOffertes > 0
          ? `Open de ${openOffertes} wachtenden`
          : undefined,
    },
    omzet: Math.round(omzetMaand),
    omzetDoel: omzetDoelMaand,
    // Week-delta op omzet, als er prev-data is. Gebruikt vorige-maand-
    // same-periode (zelfde noemer als desktop KpiModule).
    omzetDelta:
      omzetMaandPrev > 0
        ? {
            value: Math.round(omzetMaand - omzetMaandPrev),
            label: 'vs vorige week',
          }
        : undefined,
    werkdagenLeft: werkdagenTotEindeMaand(now),
    miniKpis: {
      nieuweLeads: {
        value: leadsLast7d,
        delta: deltaPercent(leadsLast7d, leadsPrev7d),
      },
      conversie: {
        value: conversiePctLast30,
        delta: deltaPercentagePoints(conversiePctLast30, conversiePctPrev30),
      },
      reactietijd: {
        value: reactietijdLast7S,
        // Reactietijd: lager is beter, dus we inverteren de positive-flag.
        delta: deltaSeconds(reactietijdLast7S, reactietijdPrev7S),
      },
      offertesOpen: {
        value: openOffertes,
        // Stand-metric, geen historische vergelijking beschikbaar.
        delta: undefined,
      },
    },
    urgent: {
      items: mapEerstDitDoenToUrgentItems(eerstDitDoenActies, allLeads),
      totalCount: eerstDitDoenActies.length,
    },
    vandaag: {
      items: pickAppointmentsForToday(upcomingAppts, now),
      // Totale km/duur niet (eenvoudig) afleidbaar uit appts zonder
      // route-optimalisatie, laat undefined. Komt later via dagrapport.
      totalKm: undefined,
      totalDuur: undefined,
    },
    activity: mapLiveActivityToMobile(activityItems),
    // Bel-feed + ongelezen-badge voor de Overzicht-header (echte notifications-tabel).
    notifications: mobileNotifications,
    unreadCount: mobileUnreadCount,
  }

  return (
    <>
      {/* Mobile-tree: zelfde server-data, andere widget-composition.
          Op desktops verbergt de @media-query in page.module.css 'm. */}
      <div className={styles.mobileTree}>
        <MobileOverzicht data={mobileData} />
      </div>

      {/* Dagrapport-drawer staat buiten beide trees: het is een fixed
          overlay die zowel op desktop als mobile moet kunnen openen. Binnen
          de desktopTree (display:none op mobile) zou 'ie op mobiel nooit
          renderen. URL-param `?dagrapport=1` blijft de single source of truth. */}
      {dagrapportData && <DagrapportDrawer data={dagrapportData} />}
    </>
  )
}

// ────────────────────────────────────────────────────────────
// Mobile data-mapping helpers
// ────────────────────────────────────────────────────────────

/**
 * Aantal werkdagen (ma-vr) tussen vandaag en de laatste dag van de
 * huidige maand, inclusief vandaag. Gebruikt voor de "nog X werkdagen"-
 * subline op de HeroKpiCard.
 */
function werkdagenTotEindeMaand(now: Date): number {
  const year = now.getFullYear()
  const month = now.getMonth()
  const lastDay = new Date(year, month + 1, 0).getDate()
  let count = 0
  for (let d = now.getDate(); d <= lastDay; d++) {
    const dow = new Date(year, month, d).getDay()
    // 0 = zondag, 6 = zaterdag, beide overslaan
    if (dow !== 0 && dow !== 6) count++
  }
  return count
}

/**
 * Percentage-delta voor count-metrics (leads). Geeft "+12%" of "−5%"
 * met `positive` flag. Bij prev=0 of geen verandering → undefined zodat
 * de MiniKpiGrid geen delta-pill toont.
 */
function deltaPercent(curr: number, prev: number): { value: string; positive: boolean } | undefined {
  if (prev <= 0 || curr === prev) return undefined
  const diff = curr - prev
  const pct = Math.round((diff / prev) * 100)
  const sign = diff > 0 ? '+' : '−'
  return { value: `${sign}${Math.abs(pct)}%`, positive: diff > 0 }
}

/**
 * Percentage-PUNT delta voor pct-metrics (conversie). 64% vs 60% → +4pt,
 * niet +6.6%. Bij geen prev / geen verschil → undefined.
 */
function deltaPercentagePoints(curr: number, prev: number): { value: string; positive: boolean } | undefined {
  if (curr === prev) return undefined
  const diff = curr - prev
  const sign = diff > 0 ? '+' : '−'
  return { value: `${sign}${Math.abs(diff)}pt`, positive: diff > 0 }
}

/**
 * Seconden-delta voor reactietijd. LAGER is beter, dus `positive` flipt:
 * een afname betekent goed nieuws (positive=true). Bij gelijk → undefined.
 */
function deltaSeconds(curr: number, prev: number): { value: string; positive: boolean } | undefined {
  if (prev <= 0 || curr === prev) return undefined
  const diff = curr - prev
  const sign = diff > 0 ? '+' : '−'
  // Mensvriendelijke duur ("+2u 6m") i.p.v. rauwe seconden ("+153894s").
  return { value: `${sign}${formatDuration(Math.abs(diff))}`, positive: diff < 0 }
}

/**
 * Initials uit een naam. "Jan de Vries" → "JV", "Mariska" → "MA".
 * Fallback "?" als naam leeg is.
 */
function getInitials(naam: string | null): string {
  if (!naam) return '?'
  const parts = naam.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * Mapt deriveActions-output naar UrgentItem-shape voor de mobile UrgentBlock.
 *
 * - subline: subtitle uit deriveActions (al "korstmos · €736"-vorm)
 * - context: title (de "waarom"-tekst, getoond in drilldown later)
 * - badge: hot → red, warm → amber; label = waitLabel ("4u 12m")
 */
function mapEerstDitDoenToUrgentItems(
  actions: DashboardAction[],
  leads: { lead_id: string; naam: string | null }[],
): UrgentItem[] {
  const naamById = new Map<string, string>()
  for (const l of leads) {
    if (l.naam) naamById.set(l.lead_id, l.naam)
  }
  return actions.slice(0, 3).map((a) => {
    const naam = naamById.get(a.leadId) ?? 'Onbekend'
    return {
      id: a.leadId,
      naam,
      initials: getInitials(naam),
      subline: a.subtitle || '—',
      context: a.title,
      badge: {
        tone: a.tone === 'hot' ? 'red' : 'amber',
        label: a.waitLabel,
      },
    }
  })
}

/**
 * Filtert appointments naar alleen vandaag (Europe/Amsterdam) en mapt
 * naar VandaagItem-shape. Status afgeleid uit (afspraak-tijd vs huidige tijd):
 *   - afspraak nog niet begonnen + binnen 30 min → NU
 *   - eerstvolgende afspraak (na NU)              → VOLGENDE
 *   - rest                                        → LATER
 */
function pickAppointmentsForToday(appts: Appointment[], now: Date): VandaagItem[] {
  const todayKey = (() => {
    const fmt = new Intl.DateTimeFormat('nl-NL', {
      timeZone: 'Europe/Amsterdam',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    const parts = fmt.formatToParts(now)
    const y = parts.find((p) => p.type === 'year')?.value ?? '0000'
    const m = parts.find((p) => p.type === 'month')?.value ?? '01'
    const d = parts.find((p) => p.type === 'day')?.value ?? '01'
    return `${y}-${m}-${d}`
  })()

  const todays = appts.filter((a) => {
    if (!a.afspraak_geboekt_op) return false
    const fmt = new Intl.DateTimeFormat('nl-NL', {
      timeZone: 'Europe/Amsterdam',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    const parts = fmt.formatToParts(new Date(a.afspraak_geboekt_op))
    const y = parts.find((p) => p.type === 'year')?.value ?? '0000'
    const m = parts.find((p) => p.type === 'month')?.value ?? '01'
    const d = parts.find((p) => p.type === 'day')?.value ?? '01'
    return `${y}-${m}-${d}` === todayKey
  })

  const nowMs = now.getTime()
  const THIRTY_MIN = 30 * 60 * 1000

  // Index van eerste appt die nog komt, die wordt VOLGENDE of NU
  let firstFutureIdx = -1
  for (let i = 0; i < todays.length; i++) {
    const t = todays[i].afspraak_geboekt_op
    if (t && new Date(t).getTime() >= nowMs) {
      firstFutureIdx = i
      break
    }
  }

  return todays.map((a, idx) => {
    const start = new Date(a.afspraak_geboekt_op!)
    const tijd = start.toLocaleTimeString('nl-NL', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Amsterdam',
    })
    let status: VandaagItem['status'] = 'LATER'
    if (idx === firstFutureIdx) {
      const minsUntil = (start.getTime() - nowMs) / 60000
      status = Math.abs(minsUntil) <= THIRTY_MIN / 60000 ? 'NU' : 'VOLGENDE'
    }
    const adresParts: string[] = []
    if (a.straat && a.huisnummer) adresParts.push(`${a.straat} ${a.huisnummer}`)
    else if (a.straat) adresParts.push(a.straat)
    if (a.plaats) adresParts.push(a.plaats)
    const adres = adresParts.length > 0 ? adresParts.join(' · ') : '—'

    return {
      id: a.lead_id,
      tijd,
      // Default 1u, we hebben geen aparte duur-kolom in DB. Stub.
      duur: '1u',
      type: 'AFSPRAAK',
      naam: a.naam ?? 'Onbekend',
      adres,
      status,
    }
  })
}

/**
 * Mapt LiveActivityFeed-items naar de mobile ActivityFeedBlock-shape.
 *
 * - kind 'wa' → WHATSAPP, 'new' → NIEUWE_LEAD, 'appt' → AFSPRAAK, 'quote' → OFFERTE
 * - timeAgo: korte vorm "2m", "3u", "1d", afgeleid uit timestamp
 */
function mapLiveActivityToMobile(items: LiveActivityItem[]): MobileActivityItem[] {
  const KIND_TO_TYPE: Record<LiveActivityItem['kind'], MobileActivityType> = {
    wa: 'WHATSAPP',
    new: 'NIEUWE_LEAD',
    appt: 'AFSPRAAK',
    quote: 'OFFERTE',
  }
  return items.slice(0, 6).map((item) => ({
    id: `${item.kind}-${item.leadId}-${item.timestamp}`,
    leadId: item.leadId, // doorgeven voor navigatie naar /leads/<leadId>
    type: KIND_TO_TYPE[item.kind],
    naam: item.naam,
    description: item.text,
    timeAgo: shortTimeAgo(item.timestamp),
  }))
}
