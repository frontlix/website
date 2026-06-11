/**
 * Postiz-client (pure service-module, GEEN Server Action).
 *
 * Praat met de self-hosted Postiz public REST API. Wordt aangeroepen vanuit
 * `social-actions.ts` (Server Actions) en de wekelijkse weekplanning-route.
 * Deze module bevat zelf geen auth-gate of `'use server'`: de aanroeper
 * (een Server Action) doet de `requireApprovedUser()`-check vóór de upload of
 * schedule. Zo blijft de module testbaar en herbruikbaar.
 *
 * Alle functies geven een discriminated union terug
 * (`{ ok: true, ... } | { ok: false, error }`) en gooien NOOIT. Een caller
 * narrowt op `result.ok`.
 *
 * ── KRITIEK PAD, base-URL nog te verifiëren (draaiboek sectie 5.2, D2) ──
 * De base kan `/public/v1` of `/api/public/v1` zijn. Pas na de handmatige
 * curl-verificatie op de live Postiz-deploy is `POSTIZ_BASE_URL` definitief.
 * Zet die env-var op de geverifieerde volledige base, bijvoorbeeld
 * `https://social.frontlix.com/public/v1` (of `.../api/public/v1`).
 *
 * Auth: header `Authorization` met de KALE key, GEEN `Bearer`-prefix
 * (geverifieerd, draaiboek sectie 4 / 6.4).
 *
 * Bron: uitvoeringsdraaiboek sectie 4 (POSTIZ-API), sectie 5 en sectie 6.4.
 */

import type {
  SocialPlatform,
  PostizStatus,
  SocialPostMetVarianten,
  SocialPostVariant,
  SocialKanaalInstelling,
} from './social-types'

// ── Configuratie ──────────────────────────────────────────────────────────

/**
 * Volledige base-URL inclusief het `/public/v1`- (of `/api/public/v1`-) pad.
 * Wordt na de base-URL-verificatie (sectie 5.2) op de juiste waarde gezet.
 */
const POSTIZ_BASE_URL = process.env.POSTIZ_BASE_URL ?? ''
/** Kale API-key, GEEN Bearer. */
const POSTIZ_API_KEY = process.env.POSTIZ_API_KEY ?? ''

/** Standaard request-timeout in ms. Uploads (video) krijgen meer (zie call). */
const DEFAULT_TIMEOUT_MS = 30_000
/** Upload-timeout, ruimer wegens video tot 25 MB (sectie 5.5, B4). */
const UPLOAD_TIMEOUT_MS = 120_000

// ── Resultaat-types (discriminated unions) ────────────────────────────────

export type PostizFout = { ok: false; error: string }

/** Eén gekoppeld kanaal uit GET /integrations. */
export type PostizIntegration = {
  id: string
  name: string
  /** providerIdentifier, bv. 'facebook', 'instagram', 'tiktok', 'youtube', 'gmb'. */
  providerIdentifier: string
  disabled: boolean
  /** Ruwe rest van het object, voor velden die we nu niet expliciet mappen. */
  raw: Record<string, unknown>
}

export type GetIntegrationsResult =
  | { ok: true; integrations: PostizIntegration[] }
  | PostizFout

/** Resultaat van POST /upload. */
export type UploadResult =
  | { ok: true; id: string; path: string }
  | PostizFout

/** Eén gepubliceerde/ingeplande deel-post binnen een batch, per kanaal. */
export type PostizScheduledPost = {
  /** De losse post-id binnen de batch. */
  postId: string
  /** De Postiz-integration.id van het kanaal waarop deze post landt. */
  integrationId: string
}

export type SchedulePostResult =
  | { ok: true; batchId: string; posts: PostizScheduledPost[] }
  | PostizFout

/** Status van één post uit GET /posts. */
export type PostizPostStatus = {
  postId: string
  integrationId: string
  state: PostizStatus
  releaseURL: string | null
}

export type HaalPostStatussenResult =
  | { ok: true; posts: PostizPostStatus[] }
  | PostizFout

export type VerplaatsResult =
  | { ok: true; batchId: string; posts: PostizScheduledPost[] }
  | PostizFout

export type TrekInResult = { ok: true } | PostizFout

export type VerifyConnectionResult =
  | { ok: true; integrationCount: number }
  | PostizFout

// ── Per-platform Postiz-settings (sectie 6.4) ─────────────────────────────

/**
 * Mapt onze interne kanaal-waarde naar de Postiz `__type`. Let op:
 * `google_business` (intern) wordt `gmb` (Postiz).
 */
const PLATFORM_POSTIZ: Record<SocialPlatform, string> = {
  facebook: 'facebook',
  instagram: 'instagram',
  tiktok: 'tiktok',
  youtube: 'youtube',
  google_business: 'gmb',
}

/**
 * Bouwt het per-platform `settings`-object. YouTube krijgt de verplichte
 * titel mee (B6, gevalideerd door de aanroeper vóór schedule).
 */
function buildPlatformSettings(
  platform: SocialPlatform,
  variant: SocialPostVariant,
): Record<string, unknown> {
  switch (platform) {
    case 'facebook':
      return { __type: 'facebook' }
    case 'instagram':
      return { __type: 'instagram', post_type: 'post' }
    case 'tiktok':
      return {
        __type: 'tiktok',
        privacy_level: 'PUBLIC_TO_EVERYONE',
        duet: false,
        stitch: false,
      }
    case 'youtube':
      return {
        __type: 'youtube',
        title: variant.youtube_titel ?? '',
        type: 'public',
      }
    case 'google_business':
      return { __type: 'gmb' }
    default: {
      // Exhaustiveness-guard: nieuwe platforms forceren een compile-fout.
      const _never: never = platform
      return { __type: String(_never) }
    }
  }
}

// ── Interne fetch-helper ──────────────────────────────────────────────────

/**
 * Centrale fetch met kale-key-auth, timeout en uniforme foutafhandeling.
 * Geeft altijd een discriminated union terug, gooit nooit naar de caller.
 * `body` als FormData laat de Content-Type-boundary door fetch zetten;
 * een object wordt als JSON verstuurd.
 */
async function postizFetch(
  pad: string,
  init: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE'
    body?: Record<string, unknown> | FormData
    timeoutMs?: number
  },
): Promise<{ ok: true; data: unknown } | PostizFout> {
  if (!POSTIZ_BASE_URL || !POSTIZ_API_KEY) {
    return {
      ok: false,
      error:
        'POSTIZ_BASE_URL en POSTIZ_API_KEY moeten gezet zijn (base-URL eerst verifiëren, sectie 5.2)',
    }
  }

  const isForm = init.body instanceof FormData
  const headers: Record<string, string> = {
    // KALE key, GEEN Bearer (geverifieerd, sectie 4 / 6.4).
    Authorization: POSTIZ_API_KEY,
  }
  if (init.body && !isForm) headers['Content-Type'] = 'application/json'

  const controller = new AbortController()
  const timer = setTimeout(
    () => controller.abort(),
    init.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  )

  try {
    const res = await fetch(`${POSTIZ_BASE_URL}${pad}`, {
      method: init.method,
      headers,
      body: isForm
        ? (init.body as FormData)
        : init.body
          ? JSON.stringify(init.body)
          : undefined,
      signal: controller.signal,
      cache: 'no-store',
    })

    const tekst = await res.text()
    let data: unknown = null
    if (tekst) {
      try {
        data = JSON.parse(tekst)
      } catch {
        // Niet-JSON-antwoord; laat data null en val terug op de ruwe tekst bij fout.
        data = tekst
      }
    }

    if (!res.ok) {
      const detail =
        typeof data === 'object' && data !== null
          ? JSON.stringify(data)
          : String(data ?? '')
      return {
        ok: false,
        error: `Postiz ${init.method} ${pad} gaf ${res.status}: ${detail || res.statusText}`,
      }
    }

    return { ok: true, data }
  } catch (err) {
    const reden =
      err instanceof Error && err.name === 'AbortError'
        ? 'timeout'
        : err instanceof Error
          ? err.message
          : String(err)
    return { ok: false, error: `Postiz ${init.method} ${pad} faalde: ${reden}` }
  } finally {
    clearTimeout(timer)
  }
}

// ── Publieke API ──────────────────────────────────────────────────────────

/**
 * GET /integrations, alle gekoppelde kanalen. Wordt gebruikt om
 * `social_kanaal_instellingen.postiz_integratie_id` te vullen (B1, sectie 5.4)
 * en door `verifyConnection`.
 */
export async function getIntegrations(): Promise<GetIntegrationsResult> {
  const res = await postizFetch('/integrations', { method: 'GET' })
  if (!res.ok) return res

  if (!Array.isArray(res.data)) {
    return { ok: false, error: 'GET /integrations gaf geen array terug' }
  }

  const integrations: PostizIntegration[] = (res.data as Record<string, unknown>[]).map(
    (rij) => ({
      id: String(rij.id ?? ''),
      name: String(rij.name ?? ''),
      providerIdentifier: String(rij.providerIdentifier ?? rij.identifier ?? ''),
      disabled: Boolean(rij.disabled),
      raw: rij,
    }),
  )

  return { ok: true, integrations }
}

/**
 * POST /upload (multipart, veld `file`). Haalt de media eerst van de
 * meegegeven URL (een Supabase signed-URL uit de private bucket, sectie 3.4)
 * en stuurt de bytes door naar Postiz. Geeft `id` en `path` terug die later
 * in de schedule-payload als `image: [{ id, path }]` gaan.
 *
 * Toegestane types: jpeg/png/webp/gif/mp4 (sectie 4). De `mimeType` bepaalt de
 * bestandsnaam-extensie; de timeout is ruim wegens video (B4).
 */
export async function uploadNaarPostiz(
  publicUrl: string,
  mimeType: string,
): Promise<UploadResult> {
  if (!POSTIZ_BASE_URL || !POSTIZ_API_KEY) {
    return {
      ok: false,
      error:
        'POSTIZ_BASE_URL en POSTIZ_API_KEY moeten gezet zijn (base-URL eerst verifiëren, sectie 5.2)',
    }
  }

  // Stap 1, media van de (signed) URL halen.
  let bytes: ArrayBuffer
  try {
    const mediaController = new AbortController()
    const mediaTimer = setTimeout(() => mediaController.abort(), UPLOAD_TIMEOUT_MS)
    try {
      const mediaRes = await fetch(publicUrl, {
        signal: mediaController.signal,
        cache: 'no-store',
      })
      if (!mediaRes.ok) {
        return {
          ok: false,
          error: `Media ophalen faalde: ${mediaRes.status} ${mediaRes.statusText}`,
        }
      }
      bytes = await mediaRes.arrayBuffer()
    } finally {
      clearTimeout(mediaTimer)
    }
  } catch (err) {
    const reden = err instanceof Error ? err.message : String(err)
    return { ok: false, error: `Media ophalen faalde: ${reden}` }
  }

  // Stap 2, doorsturen naar Postiz /upload als multipart.
  const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'bin'
  const form = new FormData()
  form.append('file', new Blob([bytes], { type: mimeType }), `media.${ext}`)

  const res = await postizFetch('/upload', {
    method: 'POST',
    body: form,
    timeoutMs: UPLOAD_TIMEOUT_MS,
  })
  if (!res.ok) return res

  const data = res.data as Record<string, unknown> | null
  const id = data?.id
  const path = data?.path
  if (typeof id !== 'string' || typeof path !== 'string') {
    return { ok: false, error: 'POST /upload gaf geen id/path terug' }
  }

  return { ok: true, id, path }
}

/**
 * POST /posts, plant een post in op alle ingeschakelde kanalen in één call.
 *
 * - `type: 'schedule'`, `date` is ISO-UTC (de post heeft de geconverteerde
 *   UTC-tijd, sectie 5.6, B2).
 * - Per kanaal één object in `posts[]` met `integration.id`, een
 *   `value: [{ content, image }]` en een per-platform `settings.__type`.
 * - Top-level VERPLICHT: `shortLink: false` en `tags: []` (sectie 4 / 6.4).
 * - Alleen varianten met `ingeschakeld === true` worden meegestuurd; per
 *   variant moet `postiz_integratie_id` bekend zijn via `kanaalInstellingen`.
 *
 * Het beeld (`visual_postiz_id` / `visual_postiz_path`) zit op de post en geldt
 * voor alle kanalen. De aanroeper heeft dat eerder via `uploadNaarPostiz`
 * gevuld en op de post-rij gezet.
 */
export async function schedulePost(
  post: SocialPostMetVarianten,
  varianten: SocialPostVariant[],
  kanaalInstellingen: SocialKanaalInstelling[],
): Promise<SchedulePostResult> {
  // Map kanaal -> Postiz integration.id (B1).
  const integratieVoorKanaal = new Map<string, string>()
  for (const inst of kanaalInstellingen) {
    if (inst.postiz_integratie_id && inst.actief) {
      integratieVoorKanaal.set(inst.kanaal, inst.postiz_integratie_id)
    }
  }

  // Beeld op postniveau (geldt voor alle kanalen).
  const image =
    post.visual_postiz_id && post.visual_postiz_path
      ? [{ id: post.visual_postiz_id, path: post.visual_postiz_path }]
      : []

  const actieveVarianten = varianten.filter((v) => v.ingeschakeld)
  if (actieveVarianten.length === 0) {
    return { ok: false, error: 'Geen ingeschakelde kanalen om te plannen' }
  }

  const postsPayload: Record<string, unknown>[] = []
  for (const variant of actieveVarianten) {
    const platform = variant.platform as SocialPlatform
    const integrationId = integratieVoorKanaal.get(platform)
    if (!integrationId) {
      return {
        ok: false,
        error: `Geen Postiz-integratie gekoppeld voor kanaal ${platform} (vul social_kanaal_instellingen.postiz_integratie_id, sectie 5.4)`,
      }
    }
    // YouTube-titel is verplicht als YouTube ingeschakeld is (B6).
    if (platform === 'youtube' && !variant.youtube_titel) {
      return {
        ok: false,
        error: 'YouTube-titel is verplicht als YouTube ingeschakeld is',
      }
    }

    postsPayload.push({
      integration: { id: integrationId },
      value: [{ content: variant.caption, image }],
      settings: buildPlatformSettings(platform, variant),
    })
  }

  const body: Record<string, unknown> = {
    type: 'schedule',
    date: new Date(post.geplande_datum).toISOString(),
    // Top-level VERPLICHT (sectie 4 / 6.4).
    shortLink: false,
    tags: [],
    posts: postsPayload,
  }

  const res = await postizFetch('/posts', { method: 'POST', body })
  if (!res.ok) return res

  return parseScheduleResponse(res.data, integratieVoorKanaal, actieveVarianten)
}

/**
 * GET /posts over een tijdvenster. VEREIST `startDate` en `endDate` als
 * ISO-UTC (sectie 4). Geeft per (deel)post de `state` en `releaseURL` terug.
 * Wordt door de status-poll in de SS-bot gebruikt, maar de mapping zit hier
 * gedeeld zodat dashboard en bot dezelfde vorm zien.
 */
export async function haalPostStatussen(
  vanaf: string,
  tot: string,
): Promise<HaalPostStatussenResult> {
  const qs = new URLSearchParams({
    startDate: new Date(vanaf).toISOString(),
    endDate: new Date(tot).toISOString(),
  })
  const res = await postizFetch(`/posts?${qs.toString()}`, { method: 'GET' })
  if (!res.ok) return res

  // GET /posts kan een array of een { posts: [...] }-omhulsel teruggeven.
  const lijst = Array.isArray(res.data)
    ? res.data
    : Array.isArray((res.data as Record<string, unknown> | null)?.posts)
      ? ((res.data as Record<string, unknown>).posts as unknown[])
      : null
  if (!lijst) {
    return { ok: false, error: 'GET /posts gaf geen herkenbare lijst terug' }
  }

  const posts: PostizPostStatus[] = (lijst as Record<string, unknown>[]).map((rij) => {
    const integration = rij.integration as Record<string, unknown> | undefined
    return {
      postId: String(rij.id ?? ''),
      integrationId: String(integration?.id ?? rij.integrationId ?? ''),
      state: normaliseerState(rij.state),
      releaseURL:
        typeof rij.releaseURL === 'string'
          ? rij.releaseURL
          : typeof rij.releaseUrl === 'string'
            ? (rij.releaseUrl as string)
            : null,
    }
  })

  return { ok: true, posts }
}

/**
 * Verplaatst een al ingeplande post naar een nieuwe datum (B3). Postiz kent
 * geen atomaire reschedule via de public API, dus dit trekt de batch in en
 * plant opnieuw in. De aanroeper (`verplaatsPost`-action) past daarna
 * `geplande_datum` en de nieuwe post-id's aan in de DB.
 */
export async function verplaatsPostizPost(
  oudeBatchId: string,
  post: SocialPostMetVarianten,
  varianten: SocialPostVariant[],
  kanaalInstellingen: SocialKanaalInstelling[],
): Promise<VerplaatsResult> {
  const trekRes = await trekPostizPostIn(oudeBatchId)
  if (!trekRes.ok) return trekRes

  const opnieuw = await schedulePost(post, varianten, kanaalInstellingen)
  if (!opnieuw.ok) return opnieuw
  return { ok: true, batchId: opnieuw.batchId, posts: opnieuw.posts }
}

/**
 * Trekt een post (batch) in via DELETE /posts/{id}. Voor het intrekken van een
 * gepubliceerde of ingeplande post (B9). Idempotent vanuit de caller bekeken:
 * een 404 (post bestaat niet meer) wordt als succes behandeld.
 */
export async function trekPostizPostIn(batchId: string): Promise<TrekInResult> {
  if (!batchId) return { ok: false, error: 'Geen batch-id om in te trekken' }

  const res = await postizFetch(`/posts/${encodeURIComponent(batchId)}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    // Al weg = klaar.
    if (res.error.includes('404')) return { ok: true }
    return res
  }
  return { ok: true }
}

/**
 * Lichte gezondheidscheck: probeert GET /integrations en geeft het aantal
 * kanalen terug. Gebruikt om in de UI/ops te tonen of de Postiz-koppeling
 * leeft en of de base-URL klopt (sectie 5.2).
 */
export async function verifyConnection(): Promise<VerifyConnectionResult> {
  const res = await getIntegrations()
  if (!res.ok) return res
  return { ok: true, integrationCount: res.integrations.length }
}

// ── Interne mappers ───────────────────────────────────────────────────────

/**
 * Normaliseert het Postiz-response van POST /posts naar onze
 * `{ batchId, posts[] }`-vorm. Postiz-responses variëren tussen versies, dus
 * dit is defensief: het zoekt een groep-id en een lijst per-kanaal-post.
 */
function parseScheduleResponse(
  data: unknown,
  integratieVoorKanaal: Map<string, string>,
  actieveVarianten: SocialPostVariant[],
): SchedulePostResult {
  if (data === null || typeof data !== 'object') {
    return { ok: false, error: 'POST /posts gaf een leeg antwoord' }
  }
  const obj = data as Record<string, unknown>

  // Batch-id kan op verschillende sleutels staan.
  const batchId =
    typeof obj.id === 'string'
      ? obj.id
      : typeof obj.group === 'string'
        ? obj.group
        : typeof obj.groupId === 'string'
          ? obj.groupId
          : ''
  if (!batchId) {
    return { ok: false, error: 'POST /posts gaf geen batch-id terug' }
  }

  // Per-kanaal-posts uit het antwoord, als beschikbaar.
  const ruwePosts = Array.isArray(obj.posts) ? (obj.posts as Record<string, unknown>[]) : []
  const posts: PostizScheduledPost[] = ruwePosts
    .map((rij) => {
      const integration = rij.integration as Record<string, unknown> | undefined
      return {
        postId: String(rij.id ?? rij.postId ?? ''),
        integrationId: String(integration?.id ?? rij.integrationId ?? ''),
      }
    })
    .filter((p) => p.postId !== '')

  // Fallback: als Postiz geen per-post-id's gaf, leid de integration-id's af
  // uit de varianten zodat de caller per kanaal kan terugmappen.
  if (posts.length === 0) {
    for (const variant of actieveVarianten) {
      const integrationId = integratieVoorKanaal.get(variant.platform)
      if (integrationId) posts.push({ postId: batchId, integrationId })
    }
  }

  return { ok: true, batchId, posts }
}

/** Mapt een ruwe state-waarde naar onze `PostizStatus`-union. */
function normaliseerState(ruw: unknown): PostizStatus {
  const s = String(ruw ?? '').toUpperCase()
  if (s === 'PUBLISHED' || s === 'QUEUE' || s === 'ERROR' || s === 'DRAFT') {
    return s
  }
  // Onbekende states behandelen we als QUEUE (in behandeling), niet als fout.
  return 'QUEUE'
}

/** Exporteer de platform-mapping voor de integration.id-sync (sectie 5.4). */
export { PLATFORM_POSTIZ }
