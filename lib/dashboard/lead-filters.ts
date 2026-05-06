import type { DashboardStatus, GesprekFase } from './database.types'

export type DateField = 'aangemaakt' | 'bijgewerkt'

export interface LeadsFilters {
  q?: string
  status?: DashboardStatus
  tags?: string[]
  dateField?: DateField
  from?: string
  to?: string
  fase?: GesprekFase
}

const VALID_STATUSES: ReadonlySet<DashboardStatus> = new Set([
  'open',
  'opgevolgd',
  'afgehandeld',
  'no_show',
  'geen_interesse',
  'archief',
])

const VALID_FASES: ReadonlySet<GesprekFase> = new Set([
  'info_verzamelen',
  'offerte_besproken',
  'onderhandelen',
  'datum_kiezen',
  'afspraak_bevestigd',
])

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

type ParamSource =
  | { [k: string]: string | string[] | undefined }
  | URLSearchParams

function getParam(source: ParamSource, key: string): string | undefined {
  if (source instanceof URLSearchParams) {
    return source.get(key) ?? undefined
  }
  const v = source[key]
  if (Array.isArray(v)) return v[0]
  return v
}

/**
 * Parsest URL-search-params naar een typed LeadsFilters object.
 * Ongeldige waarden worden stilletjes genegeerd zodat een rare URL
 * de page niet crasht.
 */
export function parseLeadsFilters(source: ParamSource): LeadsFilters {
  const out: LeadsFilters = {}

  const q = getParam(source, 'q')?.trim()
  if (q) out.q = q

  const status = getParam(source, 'status')
  if (status && VALID_STATUSES.has(status as DashboardStatus)) {
    out.status = status as DashboardStatus
  }

  const tags = getParam(source, 'tags')
  if (tags) {
    const list = tags
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (list.length > 0) out.tags = list
  }

  const dateField = getParam(source, 'dateField')
  if (dateField === 'aangemaakt' || dateField === 'bijgewerkt') {
    out.dateField = dateField
  }

  const from = getParam(source, 'from')
  if (from && ISO_DATE.test(from)) out.from = from

  const to = getParam(source, 'to')
  if (to && ISO_DATE.test(to)) out.to = to

  const fase = getParam(source, 'fase')
  if (fase && VALID_FASES.has(fase as GesprekFase)) {
    out.fase = fase as GesprekFase
  }

  return out
}

/**
 * Serialiseert filters naar een query-string (zonder leading `?`).
 * Lege/ongedefinieerde velden worden weggelaten.
 */
export function serializeLeadsFilters(filters: LeadsFilters): string {
  const params = new URLSearchParams()
  if (filters.q) params.set('q', filters.q)
  if (filters.status) params.set('status', filters.status)
  if (filters.tags && filters.tags.length > 0) {
    params.set('tags', filters.tags.join(','))
  }
  if (filters.dateField) params.set('dateField', filters.dateField)
  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
  if (filters.fase) params.set('fase', filters.fase)
  return params.toString()
}

/**
 * Aantal actieve filter-categorieën (voor de "Filters (3)" badge).
 * Datum-filter (from + to) telt als 1, ook als slechts 1 van de 2 gevuld is.
 */
export function countActiveFilters(filters: LeadsFilters): number {
  let n = 0
  if (filters.q) n++
  if (filters.status) n++
  if (filters.tags && filters.tags.length > 0) n++
  if (filters.from || filters.to) n++
  if (filters.fase) n++
  return n
}

export function hasActiveFilters(filters: LeadsFilters): boolean {
  return countActiveFilters(filters) > 0
}

/**
 * Strip non-numerieke karakters uit een telefoonnummer voor zoek-matching.
 */
export function normalizePhone(value: string): string {
  return value.replace(/[\s+\-()]/g, '')
}
