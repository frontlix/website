/**
 * Export-service: haalt data op (Supabase, RLS-authenticated) voor de
 * "Data exporteren"-modal en zet die om naar een generieke tabel die de
 * pure builders (export-builders.ts) naar CSV/Excel/PDF renderen.
 *
 * Server-only (Supabase + puppeteer/exceljs via builders).
 */

import { getDashboardSupabase } from '../supabase-server'
import { getLeadsList } from '../lead-queries'
import type { LeadsFilters } from '../lead-filters'
import {
  formatEuro,
  formatDateNL,
  formatDateTimeNL,
  dashboardStatusLabel,
  gesprekFaseLabel,
} from '../format'
import {
  buildArtifact,
  type ExportArtifact,
  type ExportFormat,
  type ExportTable,
} from './export-builders'

export type ExportType = 'leads' | 'offertes'
export type ExportPeriod = '7d' | '30d' | '90d' | 'all'

export const EXPORT_TYPES: ReadonlySet<string> = new Set(['leads', 'offertes'])
export const EXPORT_FORMATS: ReadonlySet<string> = new Set(['csv', 'xlsx', 'pdf'])
export const EXPORT_PERIODS: ReadonlySet<string> = new Set(['7d', '30d', '90d', 'all'])

const PERIOD_DAYS: Record<Exclude<ExportPeriod, 'all'>, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
}

// Ruime cap zodat een export niet stilletjes bij 100 rijen afkapt zoals de
// lijst-view, maar ook niet eindeloos veel data over de lijn pompt.
const EXPORT_ROW_CAP = 5000

/** Zet een periode-keuze om naar een ISO-datum (YYYY-MM-DD) als ondergrens. */
export function periodToFrom(period: ExportPeriod): string | undefined {
  if (period === 'all') return undefined
  const days = PERIOD_DAYS[period]
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10)
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

// ── Leads ────────────────────────────────────────────────────────────
const LEADS_COLUMNS = [
  'Lead-ID',
  'Naam',
  'Bedrijf',
  'Telefoon',
  'E-mail',
  'Adres',
  'Categorie',
  'm²',
  'Totaalprijs',
  'Afstand (km)',
  'Bot-status',
  'Gesprek-fase',
  'Dashboard-status',
  'Bron',
  'Kanaal',
  'Afspraak',
  'Offerte verstuurd',
  'Aangemaakt',
  'Bijgewerkt',
]

async function buildLeadsTable(period: ExportPeriod): Promise<ExportTable> {
  const from = periodToFrom(period)
  const filters: LeadsFilters = from
    ? { from, dateField: 'aangemaakt' }
    : {}
  const leads = await getLeadsList(filters, { limit: EXPORT_ROW_CAP })

  const rows = leads.map((l) => {
    const adres = [l.straat, l.huisnummer, l.postcode, l.plaats]
      .filter(Boolean)
      .join(' ')
    const afspraak = l.afspraak_datum
      ? `${formatDateNL(l.afspraak_datum)}${l.afspraak_starttijd ? ` ${l.afspraak_starttijd}` : ''}`
      : ''
    return [
      l.lead_id,
      l.naam,
      l.bedrijfsnaam,
      l.telefoon,
      l.email,
      adres,
      l.hoofdcategorie,
      l.m2,
      l.totaal_prijs !== null ? formatEuro(l.totaal_prijs) : '',
      l.afstand_km,
      l.status,
      l.gesprek_fase ? gesprekFaseLabel(l.gesprek_fase) : '',
      dashboardStatusLabel(l.dashboard_status),
      l.bron,
      l.kanaal,
      afspraak,
      l.offerte_verstuurd ? formatDateTimeNL(l.offerte_verstuurd_op) : 'Nee',
      formatDateTimeNL(l.aangemaakt),
      formatDateTimeNL(l.bijgewerkt),
    ] as (string | number | null)[]
  })

  return {
    title: 'Leads',
    filenameBase: `leads-${today()}`,
    columns: LEADS_COLUMNS,
    rows,
  }
}

// ── Offertes ─────────────────────────────────────────────────────────
const OFFERTES_COLUMNS = [
  'Offerte-ID',
  'Lead',
  'Lead-ID',
  'Versie',
  'Status',
  'Korting %',
  'Totaal incl. BTW',
  'Aantal regels',
  'Prijsregels',
  'Aangemaakt',
]

type OfferteRow = {
  id: string
  lead_id: string
  versie: number
  aangemaakt_op: string | null
  is_concept: boolean
  korting_pct: number | null
  totaal_incl: number
  regels_snapshot: unknown
}

function summarizeRegels(regels: unknown): { count: number; summary: string } {
  if (!Array.isArray(regels)) return { count: 0, summary: '' }
  const parts: string[] = []
  for (const r of regels) {
    if (r && typeof r === 'object') {
      const o = r as Record<string, unknown>
      const oms = typeof o.omschrijving === 'string' ? o.omschrijving : ''
      const aantal =
        typeof o.aantal === 'number' || typeof o.aantal === 'string'
          ? String(o.aantal)
          : ''
      const eenheid = typeof o.eenheid === 'string' ? o.eenheid : ''
      const stuk = typeof o.stukprijs === 'number' ? formatEuro(o.stukprijs) : ''
      const qty = aantal ? `${aantal}${eenheid ? ` ${eenheid}` : ''}` : ''
      const detail = qty || stuk ? ` (${qty}${qty && stuk ? ' × ' : ''}${stuk})` : ''
      const line = `${oms}${detail}`.trim()
      if (line) parts.push(line)
    }
  }
  return { count: regels.length, summary: parts.join('; ') }
}

async function buildOffertesTable(period: ExportPeriod): Promise<ExportTable> {
  const supabase = await getDashboardSupabase()
  const from = periodToFrom(period)

  let query = supabase
    .from('offertes')
    .select(
      'id, lead_id, versie, aangemaakt_op, is_concept, korting_pct, totaal_incl, regels_snapshot',
    )
    .order('aangemaakt_op', { ascending: false })
    .limit(EXPORT_ROW_CAP)

  if (from) query = query.gte('aangemaakt_op', from)

  const { data, error } = await query
  if (error) {
    console.error('[export] offertes query failed:', error)
    return { title: 'Offertes', filenameBase: `offertes-${today()}`, columns: OFFERTES_COLUMNS, rows: [] }
  }

  const offertes = (data as unknown as OfferteRow[] | null) ?? []

  // Lead-namen ophalen voor de gekoppelde leads (één extra query i.p.v.
  // een onzekere PostgREST-embed).
  const leadIds = [...new Set(offertes.map((o) => o.lead_id))]
  const nameById = new Map<string, string | null>()
  if (leadIds.length > 0) {
    const { data: leadsData } = await supabase
      .from('leads')
      .select('lead_id, naam')
      .in('lead_id', leadIds)
    for (const l of (leadsData as unknown as { lead_id: string; naam: string | null }[] | null) ?? []) {
      nameById.set(l.lead_id, l.naam)
    }
  }

  // De daadwerkelijke offerte-regels staan in de aparte `prijsregels`-tabel
  // (gekoppeld via lead_id); `regels_snapshot` op de offerte is in de praktijk
  // leeg. We gebruiken dus prijsregels als bron, met snapshot als fallback.
  const regelsByLead = new Map<string, unknown[]>()
  if (leadIds.length > 0) {
    const { data: prData } = await supabase
      .from('prijsregels')
      .select('lead_id, omschrijving, aantal, eenheid, stukprijs, totaal, volgorde')
      .in('lead_id', leadIds)
      .order('volgorde', { ascending: true })
    for (const r of (prData as unknown as { lead_id: string }[] | null) ?? []) {
      const arr = regelsByLead.get(r.lead_id) ?? []
      arr.push(r)
      regelsByLead.set(r.lead_id, arr)
    }
  }

  const rows = offertes.map((o) => {
    const snap = Array.isArray(o.regels_snapshot) ? o.regels_snapshot : null
    const { count, summary } = summarizeRegels(
      snap ?? regelsByLead.get(o.lead_id) ?? [],
    )
    return [
      o.id,
      nameById.get(o.lead_id) ?? '',
      o.lead_id,
      o.versie,
      o.is_concept ? 'Concept' : 'Definitief',
      o.korting_pct !== null ? `${o.korting_pct}%` : '',
      formatEuro(o.totaal_incl),
      count,
      summary,
      formatDateTimeNL(o.aangemaakt_op),
    ] as (string | number | null)[]
  })

  return {
    title: 'Offertes',
    filenameBase: `offertes-${today()}`,
    columns: OFFERTES_COLUMNS,
    rows,
  }
}

/**
 * Bouwt het downloadbare export-artefact voor de gekozen type/format/periode.
 * Auth moet door de aanroepende route al gecontroleerd zijn.
 */
export async function generateExport(
  type: ExportType,
  format: ExportFormat,
  period: ExportPeriod,
): Promise<ExportArtifact> {
  const table =
    type === 'offertes'
      ? await buildOffertesTable(period)
      : await buildLeadsTable(period)
  return buildArtifact(table, format)
}
