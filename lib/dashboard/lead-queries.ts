import { getDashboardSupabase } from './supabase-server'
import type {
  Lead,
  Bericht,
  Foto,
  Offerte,
  Prijsregel,
  LeadNote,
  LeadStatusHistory,
} from './database.types'
import type { LeadsFilters } from './lead-filters'
import { normalizePhone } from './lead-filters'

/**
 * Subset van Lead-velden die de leads-tabel laat zien. Houd dit smal
 * zodat de query niet onnodig veel data over de lijn pompt.
 */
export type LeadListItem = Pick<
  Lead,
  | 'lead_id'
  | 'naam'
  | 'bedrijfsnaam'
  | 'telefoon'
  | 'email'
  | 'straat'
  | 'huisnummer'
  | 'postcode'
  | 'plaats'
  | 'hoofdcategorie'
  | 'sub_diensten'
  | 'm2'
  | 'totaal_prijs'
  | 'afstand_km'
  | 'status'
  | 'gesprek_fase'
  | 'dashboard_status'
  | 'bron'
  | 'afspraak_datum'
  | 'afspraak_starttijd'
  | 'aangemaakt'
  | 'bijgewerkt'
  | 'kanaal'
  // ── action-signalen voor "Eerst dit doen" — afgeleid op page-level ──
  | 'pending_eigenaar_review'
  | 'klus_geblokkeerd'
  | 'offerte_pending_sinds'
  | 'offerte_verstuurd'
  | 'offerte_verstuurd_op'
  | 'akkoord_op'
>

const LIST_COLUMNS = [
  'lead_id',
  'naam',
  'bedrijfsnaam',
  'telefoon',
  'email',
  'straat',
  'huisnummer',
  'postcode',
  'plaats',
  'hoofdcategorie',
  'sub_diensten',
  'm2',
  'totaal_prijs',
  'afstand_km',
  'status',
  'gesprek_fase',
  'dashboard_status',
  'bron',
  'afspraak_datum',
  'afspraak_starttijd',
  'aangemaakt',
  'bijgewerkt',
  'kanaal',
  'pending_eigenaar_review',
  'klus_geblokkeerd',
  'offerte_pending_sinds',
  'offerte_verstuurd',
  'offerte_verstuurd_op',
  'akkoord_op',
].join(', ')

/**
 * Haalt de leads-lijst voor `/leads`. Filtert standaard gearchiveerde
 * leads weg, sorteert op aangemaakt DESC, max 100 resultaten.
 *
 * Met `filters` kan de query verfijnd worden:
 * - q: substring-match op naam OR telefoon (genormaliseerd zonder spaties/+/-/parens)
 * - status / fase: enkele waarde
 * - tags: meerdere tag-ids; lead matcht als hij ALLE tags heeft (AND-semantic)
 * - dateField + from + to: range op aangemaakt of bijgewerkt
 *
 * Tags-AND vereist een 2-staps query: eerst de matchende lead-ids vinden,
 * dan filteren. Acceptabel binnen de .limit(100) hierboven.
 */
export async function getLeadsList(
  filters?: LeadsFilters,
  options: { archived?: boolean } = {},
): Promise<LeadListItem[]> {
  const supabase = await getDashboardSupabase()

  // Tags pre-filter: vind lead-ids die ALLE opgegeven tags hebben.
  let tagFilteredIds: string[] | null = null
  if (filters?.tags && filters.tags.length > 0) {
    const { data: rows, error } = await supabase
      .from('lead_tags')
      .select('lead_id, tag_id')
      .in('tag_id', filters.tags)

    if (error) {
      console.error('[getLeadsList] tags pre-fetch failed:', error)
      return []
    }

    type Row = { lead_id: string; tag_id: string }
    const counts = new Map<string, number>()
    for (const row of (rows as unknown as Row[] | null) ?? []) {
      counts.set(row.lead_id, (counts.get(row.lead_id) ?? 0) + 1)
    }
    tagFilteredIds = [...counts.entries()]
      .filter(([, n]) => n === filters.tags!.length)
      .map(([leadId]) => leadId)

    if (tagFilteredIds.length === 0) return []
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from('leads')
    .select(LIST_COLUMNS)
    .eq('dashboard_archived', options.archived === true)

  if (filters?.q) {
    // PostgREST `.or(...)` interpreteert komma's als clausule-scheider en
    // punten als kolom/operator-scheider. Strip die uit de gebruikersinput
    // zodat zoektermen als "jan,piet" niet de filter-syntax breken. Andere
    // exotische tekens (`%`, `_`) zijn ilike-wildcards en mag de gebruiker
    // bewust gebruiken.
    const safe = filters.q.replace(/[,.]/g, ' ').trim()
    if (safe) {
      const qTel = normalizePhone(safe)
      query = query.or(
        `naam.ilike.%${safe}%,telefoon.ilike.%${qTel}%`
      )
    }
  }

  if (filters?.status) {
    query = query.eq('dashboard_status', filters.status)
  }

  if (filters?.fase) {
    query = query.eq('gesprek_fase', filters.fase)
  }

  if (filters?.kanaal) {
    query = query.eq('kanaal', filters.kanaal)
  }

  if (filters?.from || filters?.to) {
    const col = filters?.dateField ?? 'aangemaakt'
    if (filters.from) query = query.gte(col, filters.from)
    if (filters.to) {
      const toEnd = `${filters.to}T23:59:59.999Z`
      query = query.lte(col, toEnd)
    }
  }

  if (tagFilteredIds !== null) {
    query = query.in('lead_id', tagFilteredIds)
  }

  query = query
    .order('aangemaakt', { ascending: false })
    .limit(100)

  const { data, error } = await query

  if (error) {
    console.error('[getLeadsList] query failed:', error)
    return []
  }
  return (data as unknown as LeadListItem[] | null) ?? []
}

/**
 * Telt het totaal aantal niet-gearchiveerde leads (zonder filters).
 * Gebruikt voor de "X gevonden van Y totaal"-tekst.
 */
export async function countAllLeads(): Promise<number> {
  const supabase = await getDashboardSupabase()
  const { count, error } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('dashboard_archived', false)

  if (error) {
    console.error('[countAllLeads] query failed:', error)
    return 0
  }
  return count ?? 0
}

export interface LeadDetail {
  lead: Lead
  berichten: Bericht[]
  fotos: Foto[]
  offertes: Offerte[]
  prijsregels: Prijsregel[]
  notes: LeadNote[]
  statusHistory: LeadStatusHistory[]
}

/**
 * Haalt één lead op + alle gerelateerde data voor de detail-pagina.
 * Geeft null terug als de lead niet bestaat (of RLS hem verbergt).
 *
 * Alle queries draaien parallel om de page snel te laden. Bij een
 * sub-query-error vallen we terug op een lege array zodat de page
 * gerendered kan worden i.p.v. te crashen.
 */
export async function getLeadDetail(leadId: string): Promise<LeadDetail | null> {
  const supabase = await getDashboardSupabase()

  const [
    leadRes,
    berichtenRes,
    fotosRes,
    offertesRes,
    prijsregelsRes,
    notesRes,
    historyRes,
  ] = await Promise.all([
    supabase.from('leads').select('*').eq('lead_id', leadId).maybeSingle(),
    supabase
      .from('berichten')
      .select('*')
      .eq('lead_id', leadId)
      .order('timestamp', { ascending: true }),
    supabase
      .from('fotos')
      .select('*')
      .eq('lead_id', leadId)
      .order('aangemaakt', { ascending: true }),
    supabase
      .from('offertes')
      .select('*')
      .eq('lead_id', leadId)
      .order('versie', { ascending: false }),
    supabase
      .from('prijsregels')
      .select('*')
      .eq('lead_id', leadId)
      .order('volgorde', { ascending: true }),
    supabase
      .from('lead_notes')
      .select('*')
      .eq('lead_id', leadId)
      .order('aangemaakt_op', { ascending: false }),
    supabase
      .from('lead_status_history')
      .select('*')
      .eq('lead_id', leadId)
      .order('gewijzigd_op', { ascending: false }),
  ])

  if (!leadRes.data) return null

  return {
    lead: leadRes.data as unknown as Lead,
    berichten: (berichtenRes.data as unknown as Bericht[] | null) ?? [],
    fotos: (fotosRes.data as unknown as Foto[] | null) ?? [],
    offertes: (offertesRes.data as unknown as Offerte[] | null) ?? [],
    prijsregels: (prijsregelsRes.data as unknown as Prijsregel[] | null) ?? [],
    notes: (notesRes.data as unknown as LeadNote[] | null) ?? [],
    statusHistory: (historyRes.data as unknown as LeadStatusHistory[] | null) ?? [],
  }
}

export type ActivityType =
  | 'lead_aangemaakt'
  | 'bericht_in'
  | 'bericht_uit'
  | 'foto_geupload'
  | 'offerte_verstuurd'
  | 'notitie_toegevoegd'
  | 'status_gewijzigd'
  | 'akkoord'
  | 'afspraak_geboekt'

export interface ActivityEvent {
  id: string
  type: ActivityType
  timestamp: string
  label: string
  details?: string | null
}

/**
 * Aggregeert alle activiteits-events voor een lead uit de bestaande
 * tabellen. Geen aparte event-tabel nodig — we hergebruiken de timestamps
 * die al op berichten/fotos/offertes/notes/history/audit-velden staan.
 *
 * Sorteert nieuwste eerst (DESC) zodat de UI direct chronologisch kan
 * renderen zonder verdere sortering.
 */
export function aggregateActivityTimeline(detail: LeadDetail): ActivityEvent[] {
  const events: ActivityEvent[] = []

  // Lead aangemaakt
  events.push({
    id: `lead-${detail.lead.lead_id}`,
    type: 'lead_aangemaakt',
    timestamp: detail.lead.aangemaakt ?? '',
    label: 'Lead aangemaakt',
    details: detail.lead.bron ? `Bron: ${detail.lead.bron}` : null,
  })

  // Berichten
  for (const b of detail.berichten) {
    const isIn = b.richting === 'inkomend'
    events.push({
      id: `msg-${b.id}`,
      type: isIn ? 'bericht_in' : 'bericht_uit',
      timestamp: b.timestamp ?? '',
      label: isIn ? 'Klant stuurde bericht' : 'Bot stuurde bericht',
      details: b.bericht ?? (b.type !== 'tekst' ? `[${b.type}]` : null),
    })
  }

  // Foto's
  for (const f of detail.fotos) {
    events.push({
      id: `foto-${f.id}`,
      type: 'foto_geupload',
      timestamp: f.aangemaakt ?? '',
      label: 'Foto ontvangen',
      details: f.bron === 'formulier' ? 'via formulier' : 'via WhatsApp',
    })
  }

  // Offertes
  for (const o of detail.offertes) {
    events.push({
      id: `offerte-${o.id}`,
      type: 'offerte_verstuurd',
      timestamp: o.aangemaakt_op ?? '',
      label: `Offerte v${o.versie} verstuurd`,
      details: `€ ${o.totaal_incl.toFixed(2)} incl.`,
    })
  }

  // Notities
  for (const n of detail.notes) {
    events.push({
      id: `note-${n.id}`,
      type: 'notitie_toegevoegd',
      timestamp: n.aangemaakt_op,
      label: 'Notitie toegevoegd',
      details: n.tekst,
    })
  }

  // Status-history. nieuwe_status is nullable (status leeggemaakt) — render
  // dat dan als "Geen status" zodat de timeline leesbaar blijft.
  for (const h of detail.statusHistory) {
    const nieuwLabel = h.nieuwe_status ?? 'Geen status'
    events.push({
      id: `status-${h.id}`,
      type: 'status_gewijzigd',
      timestamp: h.gewijzigd_op,
      label: `Status gewijzigd naar ${nieuwLabel}`,
      details: h.oude_status ? `was: ${h.oude_status}` : null,
    })
  }

  // Akkoord (audit-veld op leads)
  if (detail.lead.akkoord_op) {
    events.push({
      id: `akkoord-${detail.lead.lead_id}`,
      type: 'akkoord',
      timestamp: detail.lead.akkoord_op,
      label: 'Klant ging akkoord',
      details: detail.lead.akkoord_via ? `via ${detail.lead.akkoord_via}` : null,
    })
  }

  // Afspraak geboekt (audit-veld op leads)
  if (detail.lead.afspraak_geboekt_op) {
    events.push({
      id: `afspraak-${detail.lead.lead_id}`,
      type: 'afspraak_geboekt',
      timestamp: detail.lead.afspraak_geboekt_op,
      label: 'Afspraak geboekt',
      details: detail.lead.afspraak_geboekt_via ? `via ${detail.lead.afspraak_geboekt_via}` : null,
    })
  }

  // Sorteer DESC (nieuwste eerst)
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return events
}
