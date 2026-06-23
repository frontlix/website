import { getDashboardSupabase } from './supabase-server'
import type { Tag } from './database.types'

/**
 * Haalt alle bestaande tags op (voor de dropdown in LeadTagsEditor).
 * Geen tenant-filter want v1 = single-tenant.
 */
export async function getAllTags(): Promise<Tag[]> {
  const supabase = await getDashboardSupabase()
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .order('naam', { ascending: true })

  if (error) {
    console.error('[getAllTags] query failed:', error)
    return []
  }
  return (data as unknown as Tag[] | null) ?? []
}

/**
 * Haalt de tags die aan een specifieke lead gekoppeld zijn. Joint via
 * lead_tags; returnt de Tag-rijen met een tag_id-filter dat klopt.
 */
export async function getTagsForLead(leadId: string): Promise<Tag[]> {
  const supabase = await getDashboardSupabase()
  const { data, error } = await supabase
    .from('lead_tags')
    .select('tag_id, tags!inner(*)')
    .eq('lead_id', leadId)

  if (error) {
    console.error('[getTagsForLead] query failed:', error)
    return []
  }

  // Supabase joins return: { tag_id, tags: { id, naam, kleur, ... } }[]
  type LeadTagJoin = { tag_id: string; tags: Tag }
  return ((data as unknown as LeadTagJoin[] | null) ?? []).map((row) => row.tags)
}

/**
 * Haalt per lead de tag-ids op, voor client-side tag-filtering in de mobiele
 * leadlijst. Eén query over lead_tags, gefilterd op de meegegeven lead-ids.
 */
export async function getTagIdsByLeadIds(
  leadIds: string[],
): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>()
  if (leadIds.length === 0) return out

  const supabase = await getDashboardSupabase()
  const { data, error } = await supabase
    .from('lead_tags')
    .select('lead_id, tag_id')
    .in('lead_id', leadIds)

  if (error) {
    console.error('[getTagIdsByLeadIds] query failed:', error)
    return out
  }

  type Row = { lead_id: string; tag_id: string }
  for (const row of (data as unknown as Row[] | null) ?? []) {
    const arr = out.get(row.lead_id) ?? []
    arr.push(row.tag_id)
    out.set(row.lead_id, arr)
  }
  return out
}
