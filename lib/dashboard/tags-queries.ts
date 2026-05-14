import { getDashboardSupabase } from './supabase-server'

/**
 * Tags + lead-usage-count voor /instellingen → Tags.
 *
 * Twee aparte queries (geen embedded join) zodat dit ook werkt als de
 * RLS-policies op `tags` en `lead_tags` los van elkaar zijn geconfigureerd.
 * Counts worden in JS gegroepeerd — `tags` blijft typisch < 50 rijen dus
 * geen performance-zorgen.
 */

export type TagWithCount = {
  id: string
  naam: string
  kleur: string | null
  aangemaakt_op: string
  count: number
  isSystem: boolean
}

/**
 * Namen die Surface automatisch toekent — die mag de owner niet verwijderen,
 * alleen hernoemen / kleur veranderen. Niet via DB-vlag maar via hardcoded
 * lijst omdat de tags-tabel geen `is_system` kolom heeft (Phase 1).
 */
const SYSTEM_TAG_NAMES = new Set([
  'Particulier',
  'Zakelijk',
  'Korting',
  'Buiten radius',
  'Review',
])

export async function getTagsWithCounts(): Promise<TagWithCount[]> {
  const supabase = await getDashboardSupabase()
  const [tagsRes, linksRes] = await Promise.all([
    supabase
      .from('tags')
      .select('id, naam, kleur, aangemaakt_op')
      .order('naam', { ascending: true }),
    supabase.from('lead_tags').select('tag_id'),
  ])

  if (tagsRes.error) {
    console.error('[getTagsWithCounts] tags failed:', tagsRes.error)
    return []
  }
  const tags = tagsRes.data ?? []
  const links = linksRes.data ?? []

  const countByTag = new Map<string, number>()
  for (const link of links) {
    countByTag.set(link.tag_id, (countByTag.get(link.tag_id) ?? 0) + 1)
  }

  const enriched: TagWithCount[] = tags.map((t) => ({
    id: t.id,
    naam: t.naam,
    kleur: t.kleur,
    aangemaakt_op: t.aangemaakt_op,
    count: countByTag.get(t.id) ?? 0,
    isSystem: SYSTEM_TAG_NAMES.has(t.naam),
  }))

  // System-tags eerst (in vaste design-volgorde), dan user-tags alfabetisch.
  const sysOrder = ['Particulier', 'Zakelijk', 'Repeat', 'Korting', 'Buiten radius', 'Review']
  return [...enriched].sort((a, b) => {
    const aIdx = sysOrder.indexOf(a.naam)
    const bIdx = sysOrder.indexOf(b.naam)
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx
    if (aIdx !== -1) return -1
    if (bIdx !== -1) return 1
    return a.naam.localeCompare(b.naam, 'nl')
  })
}
