import type { Database } from './database.types'

/**
 * Gedeelde types voor de social-module. Eén plek voor de DB-afgeleide
 * Row-types, de literal-unions (kanaal, status, pijler) en het
 * ActionResult-contract dat alle social Server Actions teruggeven.
 *
 * De Row-types worden afgeleid uit `database.types.ts` (handmatig bijgehouden,
 * conform de Frontlix-conventie, géén `supabase gen types`). Voeg eerst de zes
 * social-tabellen toe aan `database.types.ts`, dan kloppen deze aliassen.
 *
 * Bron: uitvoeringsdraaiboek sectie 4 (datamodel) en sectie 6.3 (ActionResult).
 */

// ── DB-afgeleide Row-types ────────────────────────────────────────────────

export type SocialContentItem =
  Database['public']['Tables']['social_content_items']['Row']
export type SocialPost = Database['public']['Tables']['social_posts']['Row']
export type SocialPostVariant =
  Database['public']['Tables']['social_post_varianten']['Row']
export type SocialKanaalInstelling =
  Database['public']['Tables']['social_kanaal_instellingen']['Row']
export type SocialNudgeLog =
  Database['public']['Tables']['social_nudge_log']['Row']
export type SocialIntegrationState =
  Database['public']['Tables']['social_integration_state']['Row']

// ── Literal-unions (canoniek, sectie 4.0) ─────────────────────────────────

/**
 * De vijf publicatiekanalen. `google_business` (niet `gmb`) is de canonieke
 * DB-waarde; de Postiz-`__type` is wél `gmb` (zie postiz.ts PLATFORM_POSTIZ).
 */
export type SocialPlatform =
  | 'facebook'
  | 'instagram'
  | 'tiktok'
  | 'youtube'
  | 'google_business'

/**
 * De zes contentpijlers (sectie 9.2). `seizoen_lokaal` is een modifier op de
 * dragerpijler, maar wordt als eigen pijler-waarde opgeslagen.
 */
export type SocialPijler =
  | 'voor_na'
  | 'tip_educatie'
  | 'social_proof'
  | 'achter_schermen'
  | 'seizoen_lokaal'
  | 'aanbod_cta'

/**
 * De levenscyclus van een post (canoniek, één enum met `mislukt`, sectie 4.2).
 * `verlopen` = niet op tijd goedgekeurd; `ingetrokken` = na publicatie van het
 * platform gehaald (B9).
 */
export type SocialStatus =
  | 'concept'
  | 'ter_goedkeuring'
  | 'goedgekeurd'
  | 'gepubliceerd'
  | 'afgewezen'
  | 'mislukt'
  | 'ingetrokken'
  | 'verlopen'

/** Soort beeld dat onder een post hangt (sectie 4.2). */
export type SocialVisualType =
  | 'klant_foto'
  | 'klant_video'
  | 'ai_gegenereerd'
  | 'canva_template'

/** Mediatype van een contentbank-item (sectie 4.1). */
export type SocialMediaType = 'foto' | 'video'

/** Herkomst van een contentbank-item (sectie 4.1). */
export type SocialContentBron = 'whatsapp' | 'dashboard_upload' | 'handmatig'

/** Status van een contentbank-item (sectie 4.1). */
export type SocialContentStatus =
  | 'beschikbaar'
  | 'in_gebruik'
  | 'gepubliceerd'
  | 'gearchiveerd'

/** Content-type van een post (sectie 4.2). */
export type SocialContentType = 'foto' | 'video' | 'graphic'

/**
 * Postiz-zijdige publicatie-status per variant (sectie 4.3). Wordt door de
 * status-poll in de SS-bot teruggeschreven, gelezen door het dashboard.
 */
export type PostizStatus = 'QUEUE' | 'PUBLISHED' | 'ERROR' | 'DRAFT'

/** Audit-status van een kanaal (TikTok/YouTube/GMB), sectie 4.4. */
export type SocialAuditStatus = 'pending' | 'approved' | 'rejected'

/**
 * Filter-tabs op de goedkeuringspagina (sectie 6 / pagina-patroon).
 * `all` toont alles, de overige drie filteren op `SocialStatus`.
 */
export type SocialFilter =
  | 'all'
  | 'ter_goedkeuring'
  | 'goedgekeurd'
  | 'gepubliceerd'

// ── Action-contract (sectie 6.3) ──────────────────────────────────────────

/**
 * Eén uniform return-type voor alle social Server Actions. Acties gooien
 * nooit en geven nooit een kale string terug; ze geven dit discriminated
 * union terug zodat de UI altijd `ok` kan narrowen.
 */
export type ActionResult = { ok: true } | { ok: false; error: string }

// ── Samengestelde view-types ──────────────────────────────────────────────

/**
 * Een post met zijn per-kanaal-varianten erbij. Dit is de vorm die de
 * goedkeuringspagina en PostKaart consumeren, het resultaat van een
 * embedded select `social_posts, social_post_varianten(*)`.
 */
export type SocialPostMetVarianten = SocialPost & {
  social_post_varianten: SocialPostVariant[]
}

/**
 * Telling per filter-tab, server-side berekend en aan de filtercomponent
 * meegegeven (sectie 6 / pagina-patroon). `all` is het totaal van de
 * zichtbare statussen.
 */
export type SocialFilterCounts = Record<SocialFilter, number>

/** De vijf kanalen in vaste prioriteitsvolgorde (sectie 9.3). */
export const SOCIAL_PLATFORMS: readonly SocialPlatform[] = [
  'google_business',
  'facebook',
  'instagram',
  'tiktok',
  'youtube',
] as const

/** De zes pijlers, in rotatie-volgorde (sectie 9.2). */
export const SOCIAL_PIJLERS: readonly SocialPijler[] = [
  'voor_na',
  'tip_educatie',
  'achter_schermen',
  'social_proof',
  'seizoen_lokaal',
  'aanbod_cta',
] as const
