import type { getDashboardSupabase } from './supabase-server'
import type {
  SocialPost,
  SocialPostMetVarianten,
  SocialContentItem,
  SocialFilter,
  SocialFilterCounts,
  SocialKanaalInstelling,
} from './social-types'

// Re-export van het lokaal geimporteerde binding zodat consumenten (page.tsx,
// PostKaart) `SocialPostMetVarianten` ook uit social-queries kunnen halen, zoals
// ze nu importeren (review H3). Re-export van de lokale naam, geen export-from,
// dus geen dubbele-identifier-conflict met de import hierboven.
export type { SocialPostMetVarianten }

/**
 * Datalaag voor de social-module. Alle functies krijgen de Supabase-client als
 * eerste parameter mee (zelfde conventie als `tags-queries.ts`, zodat layout en
 * pagina binnen één request dezelfde `cache()`-client delen). Deze module doet
 * GEEN auth-gate: de RSC-pagina roept `requireApprovedUser()` vóór de queries,
 * en RLS (`tenant_id = auth.uid()` plus `is_approved_dashboard_user()`) filtert
 * automatisch op de juiste tenant. Geen expliciete where-clause op tenant nodig.
 *
 * Alle reads gaan via de anon-client (RLS-gerespecteerd). Schrijven gebeurt in
 * `social-actions.ts` via de service-role-client.
 *
 * Bron: uitvoeringsdraaiboek sectie 4 (datamodel) en sectie 6 (dashboard).
 */

/** De anon-server-client zoals `getDashboardSupabase()` hem teruggeeft. */
type DashboardClient = Awaited<ReturnType<typeof getDashboardSupabase>>

/**
 * De statussen die elke filter-tab toont. `all` is de unie van de drie
 * werkstatussen (geen afgewezen/mislukt/ingetrokken/verlopen ruis in de
 * hoofdweergave).
 */
const FILTER_STATUSSEN: Record<Exclude<SocialFilter, 'all'>, string> = {
  ter_goedkeuring: 'ter_goedkeuring',
  goedgekeurd: 'goedgekeurd',
  gepubliceerd: 'gepubliceerd',
}

const ZICHTBARE_STATUSSEN = [
  'ter_goedkeuring',
  'goedgekeurd',
  'gepubliceerd',
] as const

/**
 * Haalt posts (met hun per-kanaal-varianten) voor de goedkeuringspagina,
 * gefilterd op de gekozen tab. `all` toont de drie werkstatussen, anders één
 * specifieke status. Gesorteerd op geplande datum oplopend (eerstvolgende
 * bovenaan), max 60 rijen.
 */
export async function getSocialPosts(
  supabase: DashboardClient,
  filter: SocialFilter,
): Promise<SocialPostMetVarianten[]> {
  let query = supabase
    .from('social_posts')
    .select('*, social_post_varianten(*)')
    .order('geplande_datum', { ascending: true })
    .limit(60)

  if (filter === 'all') {
    query = query.in('status', [...ZICHTBARE_STATUSSEN])
  } else {
    query = query.eq('status', FILTER_STATUSSEN[filter])
  }

  const { data, error } = await query
  if (error) {
    console.error('[getSocialPosts] failed:', error)
    return []
  }
  return (data as unknown as SocialPostMetVarianten[] | null) ?? []
}

/**
 * Posts die op akkoord wachten, met varianten, voor de goedkeurings-stack en
 * de WhatsApp-notificatie-context. Oplopend op geplande datum.
 */
export async function getPostsTerGoedkeuring(
  supabase: DashboardClient,
): Promise<SocialPostMetVarianten[]> {
  const { data, error } = await supabase
    .from('social_posts')
    .select('*, social_post_varianten(*)')
    .eq('status', 'ter_goedkeuring')
    .order('geplande_datum', { ascending: true })

  if (error) {
    console.error('[getPostsTerGoedkeuring] failed:', error)
    return []
  }
  return (data as unknown as SocialPostMetVarianten[] | null) ?? []
}

/**
 * Eén post met varianten op id. Voor de detail-/bewerk-weergave. Geeft null
 * als de post niet bestaat of RLS hem wegfiltert.
 */
export async function getSocialPostById(
  supabase: DashboardClient,
  postId: string,
): Promise<SocialPostMetVarianten | null> {
  const { data, error } = await supabase
    .from('social_posts')
    .select('*, social_post_varianten(*)')
    .eq('id', postId)
    .maybeSingle()

  if (error) {
    console.error('[getSocialPostById] failed:', error)
    return null
  }
  return (data as unknown as SocialPostMetVarianten | null) ?? null
}

/**
 * De weekkalender: posts waarvan `jaar` + `weeknummer` overeenkomen, met
 * varianten. Geordend op geplande datum zodat de kalender de slots chronologisch
 * kan plaatsen (sectie 9.4: dinsdag/donderdag/zaterdag/zondag).
 */
export async function getWeekKalender(
  supabase: DashboardClient,
  jaar: number,
  weeknummer: number,
): Promise<SocialPostMetVarianten[]> {
  const { data, error } = await supabase
    .from('social_posts')
    .select('*, social_post_varianten(*)')
    .eq('jaar', jaar)
    .eq('weeknummer', weeknummer)
    .order('geplande_datum', { ascending: true })

  if (error) {
    console.error('[getWeekKalender] failed:', error)
    return []
  }
  return (data as unknown as SocialPostMetVarianten[] | null) ?? []
}

/**
 * Telt per filter-tab het aantal posts. Server-side berekend en aan de
 * filtercomponent meegegeven als `Record<SocialFilter, number>` (sectie 6
 * pagina-patroon). Eén SELECT op de zichtbare statussen, JS-groepering, zodat
 * we niet vier losse count-queries hoeven te doen.
 */
export async function countSocialByStatus(
  supabase: DashboardClient,
): Promise<SocialFilterCounts> {
  const leeg: SocialFilterCounts = {
    all: 0,
    ter_goedkeuring: 0,
    goedgekeurd: 0,
    gepubliceerd: 0,
  }

  const { data, error } = await supabase
    .from('social_posts')
    .select('status')
    .in('status', [...ZICHTBARE_STATUSSEN])

  if (error) {
    console.error('[countSocialByStatus] failed:', error)
    return leeg
  }

  const counts = { ...leeg }
  for (const rij of (data as { status: string }[] | null) ?? []) {
    counts.all += 1
    if (rij.status === 'ter_goedkeuring') counts.ter_goedkeuring += 1
    else if (rij.status === 'goedgekeurd') counts.goedgekeurd += 1
    else if (rij.status === 'gepubliceerd') counts.gepubliceerd += 1
  }
  return counts
}

/**
 * Telt enkel de posts die op akkoord wachten. Voor de sidebar-badge in de
 * layout (sectie 4.5 van het patroon-document). `head: true` + `count: exact`
 * haalt geen rijen op, alleen het getal.
 */
export async function countPostsTerGoedkeuring(
  supabase: DashboardClient,
): Promise<number> {
  const { count, error } = await supabase
    .from('social_posts')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'ter_goedkeuring')

  if (error) {
    console.error('[countPostsTerGoedkeuring] failed:', error)
    return 0
  }
  return count ?? 0
}

/**
 * De contentbank: media-items die nog ingezet kunnen worden. Standaard alleen
 * `beschikbaar` (de pool waaruit de weekplanning trekt), maar de caller kan
 * andere statussen opvragen voor de volledige bank-weergave. Nieuwste eerst.
 */
export async function getContentBank(
  supabase: DashboardClient,
  statussen: string[] = ['beschikbaar'],
): Promise<SocialContentItem[]> {
  const { data, error } = await supabase
    .from('social_content_items')
    .select('*')
    .in('status', statussen)
    .order('aangemaakt_op', { ascending: false })
    .limit(200)

  if (error) {
    console.error('[getContentBank] failed:', error)
    return []
  }
  return (data as unknown as SocialContentItem[] | null) ?? []
}

/**
 * Telt de beschikbare contentbank-items. Voedt de voorraad-nudge-beslissing
 * (sectie 8.4 / 10.1: nudge bij minder dan 4) en kan in de UI de
 * voorraad-indicator tonen.
 */
export async function countBeschikbareContent(
  supabase: DashboardClient,
): Promise<number> {
  const { count, error } = await supabase
    .from('social_content_items')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'beschikbaar')

  if (error) {
    console.error('[countBeschikbareContent] failed:', error)
    return 0
  }
  return count ?? 0
}

/**
 * De gekoppelde kanaalinstellingen (Postiz-integratie per kanaal). Nodig bij
 * het inplannen (B1, mapt kanaal -> integration.id) en voor de UI die toont
 * welke kanalen actief/in-audit zijn.
 */
export async function getKanaalInstellingen(
  supabase: DashboardClient,
): Promise<SocialKanaalInstelling[]> {
  const { data, error } = await supabase
    .from('social_kanaal_instellingen')
    .select('*')
    .order('kanaal', { ascending: true })

  if (error) {
    console.error('[getKanaalInstellingen] failed:', error)
    return []
  }
  return (data as unknown as SocialKanaalInstelling[] | null) ?? []
}

/**
 * Laatste 4 weken aan posts, voor de pijler-rotatie-controle in de
 * weekplanning-job (sectie 7.2: geen pijler twee posts achter elkaar, min/max
 * per venster). Alleen de velden die de rotatielogica nodig heeft, nieuwste
 * geplande datum eerst.
 */
export async function getRecentePijlers(
  supabase: DashboardClient,
  sindsISO: string,
): Promise<Pick<SocialPost, 'pijler' | 'geplande_datum'>[]> {
  const { data, error } = await supabase
    .from('social_posts')
    .select('pijler, geplande_datum')
    .gte('geplande_datum', sindsISO)
    .order('geplande_datum', { ascending: false })

  if (error) {
    console.error('[getRecentePijlers] failed:', error)
    return []
  }
  return (data as Pick<SocialPost, 'pijler' | 'geplande_datum'>[] | null) ?? []
}
