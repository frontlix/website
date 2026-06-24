/**
 * Pure data-helpers voor de Overzicht-pagina (`/dashboard`).
 *
 * Geen Supabase-calls hier, alleen transformaties op data die de page
 * al heeft opgehaald. Zo blijft de page zelf een dunne compositie-laag
 * en zijn deze functies los unit-testbaar.
 */

import type { RecentMessage } from './activity-feed'
import type { LeadListItem } from './lead-queries'
import type { Appointment } from './agenda-queries'
import { KPI_DOELEN } from '@/components/dashboard/overzicht/kpi-doelen'
import type { KpiKey, KpiMetric, ExtraMetric } from '@/components/dashboard/overzicht/kpi-types'
import type { ActivityItem } from '@/components/dashboard/overzicht/LiveActivityFeed'

export type FunnelRow = { label: string; count: number; pct: number }

/**
 * Bouwt de 5-staps trechter op basis van leads die deze week zijn binnengekomen.
 * V1 is een eenvoudige proxy via gesprek_fase + dashboard_status.
 */
export function buildFunnelRows(allLeads: LeadListItem[], weekFromISO: string): FunnelRow[] {
  const weekStart = new Date(weekFromISO).getTime()
  const weekLeads = allLeads.filter(
    (l) => l.aangemaakt && new Date(l.aangemaakt).getTime() >= weekStart,
  )
  const totalWeek = weekLeads.length || 1 // div-by-zero guard

  const rows = [
    { label: 'Lead binnen', count: weekLeads.length, pct: 100 },
    { label: 'Bot startte gesprek', count: weekLeads.length, pct: 100 },
    {
      label: 'Info compleet',
      count: weekLeads.filter(
        (l) => l.gesprek_fase !== 'info_verzamelen' && l.dashboard_status !== 'archief',
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
  ]

  return rows.map((r) => ({ ...r, pct: Math.round((r.count / totalWeek) * 100) }))
}

/**
 * Combineert leads + appointments + recente berichten tot een gesorteerde
 * stream van max 12 events. Server-rendered op page load (realtime-subscriptie
 * staat op de roadmap).
 */
export function buildActivityFeed(
  leads: LeadListItem[],
  appts: Appointment[],
  recentMessages: RecentMessage[],
): ActivityItem[] {
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

  for (const msg of recentMessages.slice(0, 8)) {
    events.push({
      leadId: msg.lead_id,
      naam: msg.naam,
      kind: 'wa',
      text: 'stuurde een bericht',
      timestamp: msg.timestamp,
    })
  }

  // Leads in 'onderhandelen' fase = wacht op owner-review. Timestamp =
  // lead.aangemaakt als proxy (we hebben geen "fase-veranderd-op" veld).
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

  return events.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 12)
}

/**
 * Bouwt het Record met 4 KPI-tegels (omzet/leads/conversie/reactietijd)
 * uit de losse query-resultaten. Doet pure aritmetiek, geen DB-calls.
 */
export function buildKpiMetrics(input: {
  omzetMaand: number
  omzetMaandPrev: number
  leadsLast7d: number
  leadsPrev7d: number
  conversiePctLast30: number
  conversiePctPrev30: number
  reactietijdLast7S: number
  reactietijdPrev7S: number
  /**
   * Ingesteld maand-omzetdoel (tenant_settings.omzet_doel_maand) in euro's.
   * null/undefined = niet ingesteld → val terug op de default-schaal.
   */
  omzetDoelMaand?: number | null
}): Record<KpiKey, KpiMetric> {
  return {
    omzet: {
      key: 'omzet',
      label: 'Omzet deze maand',
      value: Math.round(input.omzetMaand),
      prevValue: Math.round(input.omzetMaandPrev),
      unit: 'eur',
      // Gebruik het ingestelde doel; zonder instelling de v1-default.
      doel: input.omzetDoelMaand ?? KPI_DOELEN.omzet_maand,
      rangeLabel: 'Lopende maand',
      compareLabel: 'vs vorige maand',
      iconKind: 'wallet',
    },
    leads: {
      key: 'leads',
      label: 'Nieuwe leads (week)',
      value: input.leadsLast7d,
      prevValue: input.leadsPrev7d,
      unit: 'count',
      doel: KPI_DOELEN.leads_week,
      rangeLabel: 'Laatste 7 dagen',
      compareLabel: 'vs vorige week',
      iconKind: 'inbox',
    },
    conversie: {
      key: 'conversie',
      // Korter dan "Conversie offerte → klant", past op 1 regel in de
      // mobile mini-card. De "%"-suffix maakt al duidelijk dat 't een rate
      // is, en de tab heet nog steeds "Conversie".
      label: 'Lead → klant',
      value: input.conversiePctLast30,
      prevValue: input.conversiePctPrev30,
      unit: 'pct',
      doel: KPI_DOELEN.conversie_pct,
      rangeLabel: 'Lopende maand',
      compareLabel: 'vs vorige maand',
      iconKind: 'trending',
    },
    reactietijd: {
      key: 'reactietijd',
      label: 'Reactietijd (gem.)',
      value: input.reactietijdLast7S,
      prevValue: input.reactietijdPrev7S,
      unit: 's',
      doel: KPI_DOELEN.reactietijd_doel_s,
      rangeLabel: 'Laatste 7 dagen',
      compareLabel: 'vs vorige week',
      invertDelta: true,
      iconKind: 'clock',
    },
  }
}

/**
 * Mini-card "Offertes open", huidige stand (geen tab, niet klikbaar).
 * Geen meaningful prev-vergelijking voor stock-metrics: delta op 0 zodat
 * de mini "—" toont i.p.v. een misleidende ↑.
 */
export function buildOpenOffertesMetric(openOffertes: number): ExtraMetric {
  return {
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
}

/**
 * Filtert appointments naar alleen toekomstige (vanaf vandaag 00:00),
 * max N. Default 4 voor de "Komende afspraken" card.
 */
export function pickUpcomingAppointments<T extends { afspraak_geboekt_op: string | null }>(
  appts: T[],
  limit = 4,
): T[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return appts
    .filter(
      (a) =>
        a.afspraak_geboekt_op &&
        new Date(a.afspraak_geboekt_op).getTime() >= today.getTime(),
    )
    .slice(0, limit)
}
