import { getDashboardSupabase } from './supabase-server'
import type {
  Lead,
  Bericht,
  Foto,
  Offerte,
  Prijsregel,
  LeadNote,
  Tag,
  LeadStatusHistory,
} from './database.types'

/**
 * Subset van Lead-velden die de leads-tabel laat zien. Houd dit smal
 * zodat de query niet onnodig veel data over de lijn pompt.
 */
export type LeadListItem = Pick<
  Lead,
  | 'lead_id'
  | 'naam'
  | 'telefoon'
  | 'hoofdcategorie'
  | 'm2'
  | 'totaal_prijs'
  | 'status'
  | 'gesprek_fase'
  | 'dashboard_status'
  | 'aangemaakt'
  | 'bijgewerkt'
>

const LIST_COLUMNS = [
  'lead_id',
  'naam',
  'telefoon',
  'hoofdcategorie',
  'm2',
  'totaal_prijs',
  'status',
  'gesprek_fase',
  'dashboard_status',
  'aangemaakt',
  'bijgewerkt',
].join(', ')

/**
 * Haalt de leads-lijst voor `/leads`. Filtert standaard gearchiveerde
 * leads weg, sorteert op aangemaakt DESC, max 100 resultaten (paginatie
 * komt in Plan 5).
 */
export async function getLeadsList(): Promise<LeadListItem[]> {
  const supabase = await getDashboardSupabase()
  const { data, error } = await supabase
    .from('leads')
    .select(LIST_COLUMNS)
    .eq('dashboard_archived', false)
    .order('aangemaakt', { ascending: false })

  if (error) {
    console.error('[getLeadsList] query failed:', error)
    return []
  }
  return (data as unknown as LeadListItem[] | null) ?? []
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
