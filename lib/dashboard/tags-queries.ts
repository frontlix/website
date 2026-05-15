import { getDashboardSupabase } from './supabase-server'
import { SYSTEM_TAG_DEFAULTS } from './tag-presets'

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
  icon: string | null
  aangemaakt_op: string
  count: number
  isSystem: boolean
}

/**
 * Namen die Surface automatisch toekent. Niet via DB-vlag maar via hardcoded
 * lijst (synced met SYSTEM_TAG_DEFAULTS in tag-presets.ts).
 */
const SYSTEM_TAG_NAMES = new Set(SYSTEM_TAG_DEFAULTS.map((d) => d.naam))

/**
 * Self-healing: zorgt dat alle systeem-tags als rij in `tags` staan met
 * default kleur + icoon. Idempotent — als ze al bestaan, no-op. Bestaande
 * systeem-tags met NULL kleur/icon worden ge-upgrade met defaults (zonder
 * user-customizations te overschrijven).
 *
 * Race condition: 2 gelijktijdige page-loads kunnen beide proberen te
 * inserten. Aangezien er geen UNIQUE constraint op `tags.naam` is, kan dat
 * in theorie duplicates geven — same trade-off als `createTag` al accepteert.
 */
async function ensureSystemTagsExist(
  supabase: Awaited<ReturnType<typeof getDashboardSupabase>>,
): Promise<void> {
  const seedNames = SYSTEM_TAG_DEFAULTS.map((d) => d.naam)

  const { data: existing, error: selErr } = await supabase
    .from('tags')
    .select('id, naam, kleur, icon')
    .in('naam', seedNames)

  if (selErr) {
    console.error('[ensureSystemTagsExist] select failed:', selErr)
    return
  }

  type ExistingRow = { id: string; naam: string; kleur: string | null; icon: string | null }
  const existingRows = (existing ?? []) as ExistingRow[]
  const existingByName = new Map(existingRows.map((r) => [r.naam, r]))

  // Stap 1 — insert ontbrekende systeem-tags met defaults.
  const missing = SYSTEM_TAG_DEFAULTS.filter((d) => !existingByName.has(d.naam))
  if (missing.length > 0) {
    const { error: insErr } = await supabase
      .from('tags')
      .insert(missing.map((d) => ({ naam: d.naam, kleur: d.kleur, icon: d.icon })))
    if (insErr) {
      console.error('[ensureSystemTagsExist] insert failed:', insErr)
      // Niet hard falen — door naar update-stap.
    }
  }

  // Stap 2 — upgrade bestaande systeem-tags die nog NULL kleur of icon hebben.
  // Eén UPDATE per tag; lijst is max 5 dus prima qua perf.
  for (const def of SYSTEM_TAG_DEFAULTS) {
    const row = existingByName.get(def.naam)
    if (!row) continue
    const patch: { kleur?: string; icon?: string } = {}
    if (row.kleur === null) patch.kleur = def.kleur
    if (row.icon === null) patch.icon = def.icon
    if (Object.keys(patch).length === 0) continue

    const { error: updErr } = await supabase
      .from('tags')
      .update(patch)
      .eq('id', row.id)
    if (updErr) {
      console.error(`[ensureSystemTagsExist] update ${def.naam} failed:`, updErr)
    }
  }
}

export async function getTagsWithCounts(): Promise<TagWithCount[]> {
  const supabase = await getDashboardSupabase()
  await ensureSystemTagsExist(supabase)

  const [tagsRes, linksRes] = await Promise.all([
    supabase
      .from('tags')
      .select('id, naam, kleur, icon, aangemaakt_op')
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

  type TagRow = {
    id: string
    naam: string
    kleur: string | null
    icon: string | null
    aangemaakt_op: string
  }

  const enriched: TagWithCount[] = (tags as TagRow[]).map((t) => ({
    id: t.id,
    naam: t.naam,
    kleur: t.kleur,
    icon: t.icon,
    aangemaakt_op: t.aangemaakt_op,
    count: countByTag.get(t.id) ?? 0,
    isSystem: SYSTEM_TAG_NAMES.has(t.naam),
  }))

  // System-tags eerst (in vaste design-volgorde), dan user-tags alfabetisch.
  const sysOrder = SYSTEM_TAG_DEFAULTS.map((d) => d.naam)
  return [...enriched].sort((a, b) => {
    const aIdx = sysOrder.indexOf(a.naam)
    const bIdx = sysOrder.indexOf(b.naam)
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx
    if (aIdx !== -1) return -1
    if (bIdx !== -1) return 1
    return a.naam.localeCompare(b.naam, 'nl')
  })
}
