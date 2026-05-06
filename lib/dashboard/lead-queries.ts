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
