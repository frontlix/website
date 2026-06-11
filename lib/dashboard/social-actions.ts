'use server'

import { revalidatePath } from 'next/cache'
import { requireApprovedUser } from './require-approved-user'
import { getDashboardSupabase } from './supabase-server'
import { getDashboardAdmin } from './supabase-admin'
import {
  uploadNaarPostiz,
  schedulePost,
  verplaatsPostizPost,
  trekPostizPostIn,
} from './postiz'
import type {
  ActionResult,
  SocialKanaalInstelling,
  SocialPostMetVarianten,
  SocialPostVariant,
} from './social-types'

/**
 * Server Actions voor de social-module (draaiboek sectie 6.3).
 *
 * Volgt het `lead-actions.ts`-patroon: `'use server'`, het `ActionResult`-
 * discriminated union, auth-gate via `requireApprovedUser()` als eerste
 * statement, en `revalidatePath('/social', 'layout')` (layout zodat de
 * sidebar-badge meeloopt).
 *
 * Lezen via de RLS-respecterende anon-client (`getDashboardSupabase()`),
 * schrijven via de service-role-admin (`getDashboardAdmin()`): de social-
 * tabellen hebben alleen een SELECT-policy voor authenticated users, geen
 * INSERT/UPDATE (INTEGRATIE.md, sectie "Contract met de lib-laag").
 *
 * Postiz-calls lopen via `postiz.ts` (pure service-module, gooit nooit). Deze
 * acties doen de auth en orkestratie; Postiz doet de REST-call.
 *
 * Bron: uitvoeringsdraaiboek sectie 6.3 (acties), sectie 6.4 (Postiz),
 * sectie 5.6 (UTC), en de B-bevindingen (B3, B5, B6, B9).
 */

// ── Interne helpers ────────────────────────────────────────────────────────

/** Leest één post met varianten via de RLS-client (tenant-scope via RLS). */
async function leesPostMetVarianten(
  postId: string,
): Promise<SocialPostMetVarianten | null> {
  const supabase = await getDashboardSupabase()
  const { data, error } = await supabase
    .from('social_posts')
    .select('*, social_post_varianten(*)')
    .eq('id', postId)
    .maybeSingle()
  if (error) {
    console.error('[social-actions] post lezen faalde:', error)
    return null
  }
  return (data as unknown as SocialPostMetVarianten | null) ?? null
}

/** Leest de kanaalinstellingen (Postiz-integratie per kanaal) via RLS. */
async function leesKanaalInstellingen(): Promise<SocialKanaalInstelling[]> {
  const supabase = await getDashboardSupabase()
  const { data, error } = await supabase
    .from('social_kanaal_instellingen')
    .select('*')
  if (error) {
    console.error('[social-actions] kanaalinstellingen lezen faalde:', error)
    return []
  }
  return (data as unknown as SocialKanaalInstelling[] | null) ?? []
}

/**
 * Mediatype naar Postiz-mimeType. De contentbank kent `foto`/`video`; voor
 * Postiz sturen we een concrete mime mee. We leiden 'm af uit het
 * media-type van de post (graphic = png).
 */
function mimeVoorContentType(contentType: string): string {
  if (contentType === 'video') return 'video/mp4'
  if (contentType === 'graphic') return 'image/png'
  return 'image/jpeg'
}

/**
 * Maakt een tijdelijke signed-URL voor een storage-pad in de private bucket
 * `social-media-content`, zodat `uploadNaarPostiz` (die de bytes server-side
 * ophaalt) erbij kan. Geeft null bij een fout.
 */
async function signedUrlVoorPad(storagePath: string): Promise<string | null> {
  const admin = getDashboardAdmin()
  const { data, error } = await admin.storage
    .from('social-media-content')
    .createSignedUrl(storagePath, 60 * 10)
  if (error || !data?.signedUrl) {
    console.error('[social-actions] signed-URL maken faalde:', error)
    return null
  }
  return data.signedUrl
}

// ── keurPostGoed (B5, B6) ───────────────────────────────────────────────────

/**
 * Keurt een post goed en plant 'm in op Postiz.
 *
 * 1. Leest post, varianten en kanaalinstellingen.
 * 2. Valideert de YouTube-titel als YouTube ingeschakeld is (B6).
 * 3. Upload het beeld naar Postiz via `uploadNaarPostiz` (alleen als dat nog
 *    niet gebeurd is, idempotent), zet `visual_postiz_id`/`_path` op de post.
 * 4. `schedulePost` met `type:"schedule"`, slaat `postiz_batch_id` op de post
 *    en de per-variant `postiz_post_id` op.
 * 5. Bij Postiz-fout: status `mislukt`, foutmelding bij de variant, maar het
 *    akkoord-moment (`goedgekeurd_door`/`goedgekeurd_op`) wel loggen.
 *
 * Idempotent (B5): bij een retry worden alleen varianten zonder
 * `postiz_post_id` opnieuw gestuurd; al-geslaagde kanalen blijven staan. Is een
 * post al volledig ingepland, dan is dit een no-op-succes.
 */
export async function keurPostGoed(postId: string): Promise<ActionResult> {
  const { user } = await requireApprovedUser()

  const post = await leesPostMetVarianten(postId)
  if (!post) return { ok: false, error: 'Post niet gevonden.' }

  const admin = getDashboardAdmin()
  const nu = new Date().toISOString()

  // Akkoord-moment altijd loggen, ook als publicatie straks faalt.
  await admin
    .from('social_posts')
    .update({ goedgekeurd_door: user.id, goedgekeurd_op: nu })
    .eq('id', postId)

  const alleVarianten = post.social_post_varianten ?? []
  const ingeschakeld = alleVarianten.filter((v) => v.ingeschakeld)
  if (ingeschakeld.length === 0) {
    return { ok: false, error: 'Geen ingeschakelde kanalen om in te plannen.' }
  }

  // YouTube-titel verplicht als YouTube ingeschakeld is (B6).
  const youtubeVariant = ingeschakeld.find((v) => v.platform === 'youtube')
  if (youtubeVariant && !youtubeVariant.youtube_titel) {
    return {
      ok: false,
      error: 'YouTube-titel is verplicht zolang YouTube ingeschakeld is.',
    }
  }

  // Idempotent (B5): alleen nog-niet-geslaagde varianten opnieuw sturen.
  const teVersturen = ingeschakeld.filter((v) => !v.postiz_post_id)
  if (teVersturen.length === 0) {
    // Alles is al ingepland; markeer goedgekeurd en klaar.
    await admin.from('social_posts').update({ status: 'goedgekeurd' }).eq('id', postId)
    revalidatePath('/social', 'layout')
    return { ok: true }
  }

  const kanaalInstellingen = await leesKanaalInstellingen()

  // Beeld naar Postiz uploaden als dat nog niet gebeurd is.
  let visualPostizId = post.visual_postiz_id
  let visualPostizPath = post.visual_postiz_path
  if (!visualPostizId || !visualPostizPath) {
    const bron = await beeldBronUrl(post)
    if (!bron) {
      await markeerMislukt(postId, teVersturen, 'Geen beeld-URL om te uploaden.')
      return { ok: false, error: 'Geen beeld-URL om naar Postiz te uploaden.' }
    }
    const upload = await uploadNaarPostiz(bron, mimeVoorContentType(post.content_type))
    if (!upload.ok) {
      await markeerMislukt(postId, teVersturen, upload.error)
      return { ok: false, error: upload.error }
    }
    visualPostizId = upload.id
    visualPostizPath = upload.path
    await admin
      .from('social_posts')
      .update({ visual_postiz_id: visualPostizId, visual_postiz_path: visualPostizPath })
      .eq('id', postId)
  }

  // Plan in. Geef de te-versturen varianten mee; postiz.ts filtert zelf op
  // `ingeschakeld` en mapt kanaal -> integration.id.
  const postVoorSchedule: SocialPostMetVarianten = {
    ...post,
    visual_postiz_id: visualPostizId,
    visual_postiz_path: visualPostizPath,
    social_post_varianten: teVersturen,
  }
  const plan = await schedulePost(postVoorSchedule, teVersturen, kanaalInstellingen)
  if (!plan.ok) {
    await markeerMislukt(postId, teVersturen, plan.error)
    return { ok: false, error: plan.error }
  }

  // Per-variant `postiz_post_id` terugschrijven, mappend via integration.id.
  const integratieVoorKanaal = new Map<string, string>()
  for (const inst of kanaalInstellingen) {
    if (inst.postiz_integratie_id) integratieVoorKanaal.set(inst.kanaal, inst.postiz_integratie_id)
  }
  for (const variant of teVersturen) {
    const integrationId = integratieVoorKanaal.get(variant.platform)
    const match = plan.posts.find((p) => p.integrationId === integrationId)
    await admin
      .from('social_post_varianten')
      .update({
        postiz_post_id: match?.postId ?? plan.batchId,
        postiz_status: 'QUEUE',
        postiz_error: null,
      })
      .eq('id', variant.id)
  }

  await admin
    .from('social_posts')
    .update({ status: 'goedgekeurd', postiz_batch_id: plan.batchId })
    .eq('id', postId)

  revalidatePath('/social', 'layout')
  return { ok: true }
}

/** Zet de post op `mislukt` en de foutmelding op de betrokken varianten. */
async function markeerMislukt(
  postId: string,
  varianten: SocialPostVariant[],
  fout: string,
): Promise<void> {
  const admin = getDashboardAdmin()
  await admin.from('social_posts').update({ status: 'mislukt' }).eq('id', postId)
  for (const variant of varianten) {
    await admin
      .from('social_post_varianten')
      .update({ postiz_status: 'ERROR', postiz_error: fout })
      .eq('id', variant.id)
  }
}

/**
 * Bepaalt de bron-URL voor de Postiz-upload. Heeft de post een `visual_url`
 * dat een storage-pad van de private bucket is, dan maken we een signed-URL;
 * is het al een volledige URL, dan gebruiken we die direct. Zonder
 * `visual_url` val terug op het gekoppelde content-item.
 */
async function beeldBronUrl(post: SocialPostMetVarianten): Promise<string | null> {
  if (post.visual_url) {
    if (post.visual_url.startsWith('http')) return post.visual_url
    return signedUrlVoorPad(post.visual_url)
  }
  if (post.content_item_id) {
    const supabase = await getDashboardSupabase()
    const { data } = await supabase
      .from('social_content_items')
      .select('public_url, storage_path')
      .eq('id', post.content_item_id)
      .maybeSingle()
    const item = data as { public_url: string | null; storage_path: string | null } | null
    if (item?.storage_path) return signedUrlVoorPad(item.storage_path)
    if (item?.public_url) return item.public_url
  }
  return null
}

// ── weigerPost ──────────────────────────────────────────────────────────────

/**
 * Wijst een post af: status `afgewezen`, reden opslaan, en het gekoppelde
 * content-item teruggeven aan de pool (`beschikbaar`) zodat het herbruikbaar is.
 */
export async function weigerPost(postId: string, reden: string): Promise<ActionResult> {
  await requireApprovedUser()
  const schoonReden = (reden ?? '').trim()
  if (schoonReden.length === 0) {
    return { ok: false, error: 'Geef een reden voor de afwijzing.' }
  }

  const admin = getDashboardAdmin()
  const { data: postData, error: leesErr } = await admin
    .from('social_posts')
    .select('content_item_id')
    .eq('id', postId)
    .maybeSingle()
  if (leesErr) return { ok: false, error: leesErr.message }

  const { error } = await admin
    .from('social_posts')
    .update({ status: 'afgewezen', afgewezen_reden: schoonReden })
    .eq('id', postId)
  if (error) return { ok: false, error: error.message }

  const contentItemId = (postData as { content_item_id: string | null } | null)?.content_item_id
  if (contentItemId) {
    await admin
      .from('social_content_items')
      .update({ status: 'beschikbaar' })
      .eq('id', contentItemId)
  }

  revalidatePath('/social', 'layout')
  return { ok: true }
}

// ── bewerkCaption (B3) ──────────────────────────────────────────────────────

/**
 * Werkt de caption (en optioneel de YouTube-titel) van één variant bij. Als de
 * bovenliggende post al een `postiz_batch_id` heeft, wordt ook de Postiz-post
 * geupdatet, niet alleen de DB (B3): Postiz kent geen partiele caption-update
 * via de public API, dus we plannen de hele batch opnieuw in met de nieuwe
 * caption.
 */
export async function bewerkCaption(
  variantId: string,
  caption: string,
  youtubeTitle?: string,
): Promise<ActionResult> {
  await requireApprovedUser()
  const schoonCaption = (caption ?? '').trim()
  if (schoonCaption.length === 0) {
    return { ok: false, error: 'Caption mag niet leeg zijn.' }
  }

  const admin = getDashboardAdmin()

  // Vind de variant + bijbehorende post.
  const { data: variantData, error: vErr } = await admin
    .from('social_post_varianten')
    .select('id, post_id, platform')
    .eq('id', variantId)
    .maybeSingle()
  if (vErr) return { ok: false, error: vErr.message }
  const variantRij = variantData as
    | { id: string; post_id: string; platform: string }
    | null
  if (!variantRij) return { ok: false, error: 'Variant niet gevonden.' }

  // YouTube-titel verplicht zodra het kanaal YouTube is.
  if (variantRij.platform === 'youtube' && !(youtubeTitle ?? '').trim()) {
    return { ok: false, error: 'YouTube-titel is verplicht voor het YouTube-kanaal.' }
  }

  const patch: Record<string, unknown> = { caption: schoonCaption }
  if (youtubeTitle !== undefined) {
    patch.youtube_titel = youtubeTitle.trim() === '' ? null : youtubeTitle.trim()
  }
  const { error: updErr } = await admin
    .from('social_post_varianten')
    .update(patch)
    .eq('id', variantId)
  if (updErr) return { ok: false, error: updErr.message }

  // Als de post al ingepland is bij Postiz, daar ook bijwerken (B3).
  const post = await leesPostMetVarianten(variantRij.post_id)
  if (post?.postiz_batch_id) {
    const kanaalInstellingen = await leesKanaalInstellingen()
    const verplaats = await verplaatsPostizPost(
      post.postiz_batch_id,
      post,
      post.social_post_varianten ?? [],
      kanaalInstellingen,
    )
    if (!verplaats.ok) return { ok: false, error: verplaats.error }
    await schrijfHerplanningTerug(post.id, verplaats.batchId, verplaats.posts, kanaalInstellingen)
  }

  revalidatePath('/social', 'layout')
  return { ok: true }
}

// ── verplaatsPost (B2, B3) ──────────────────────────────────────────────────

/**
 * Verplaatst een post naar een nieuwe geplande datum (ISO, UTC opgeslagen,
 * sectie 5.6 / B2). Als er al een `postiz_batch_id` is, wordt de Postiz-
 * planning bijgewerkt (intrekken plus opnieuw inplannen, B3), anders alleen
 * de DB-rij.
 */
export async function verplaatsPost(
  postId: string,
  nieuweDatum: string,
): Promise<ActionResult> {
  await requireApprovedUser()
  const datum = new Date(nieuweDatum)
  if (Number.isNaN(datum.getTime())) {
    return { ok: false, error: 'Ongeldige datum.' }
  }
  const isoUtc = datum.toISOString()

  const admin = getDashboardAdmin()
  const post = await leesPostMetVarianten(postId)
  if (!post) return { ok: false, error: 'Post niet gevonden.' }

  // DB altijd bijwerken naar de nieuwe (UTC) datum.
  const { error } = await admin
    .from('social_posts')
    .update({ geplande_datum: isoUtc })
    .eq('id', postId)
  if (error) return { ok: false, error: error.message }

  // Postiz alleen bijwerken als er al een batch is (B3).
  if (post.postiz_batch_id) {
    const kanaalInstellingen = await leesKanaalInstellingen()
    const postMetNieuweDatum: SocialPostMetVarianten = { ...post, geplande_datum: isoUtc }
    const verplaats = await verplaatsPostizPost(
      post.postiz_batch_id,
      postMetNieuweDatum,
      post.social_post_varianten ?? [],
      kanaalInstellingen,
    )
    if (!verplaats.ok) return { ok: false, error: verplaats.error }
    await schrijfHerplanningTerug(postId, verplaats.batchId, verplaats.posts, kanaalInstellingen)
  }

  revalidatePath('/social', 'layout')
  return { ok: true }
}

/**
 * Schrijft een Postiz-herplanning (nieuwe batch + per-kanaal post-id's) terug
 * naar de DB. Gedeeld door `bewerkCaption` en `verplaatsPost`.
 */
async function schrijfHerplanningTerug(
  postId: string,
  batchId: string,
  posts: { postId: string; integrationId: string }[],
  kanaalInstellingen: SocialKanaalInstelling[],
): Promise<void> {
  const admin = getDashboardAdmin()
  await admin.from('social_posts').update({ postiz_batch_id: batchId }).eq('id', postId)

  const kanaalVoorIntegratie = new Map<string, string>()
  for (const inst of kanaalInstellingen) {
    if (inst.postiz_integratie_id) kanaalVoorIntegratie.set(inst.postiz_integratie_id, inst.kanaal)
  }
  for (const p of posts) {
    const kanaal = kanaalVoorIntegratie.get(p.integrationId)
    if (!kanaal) continue
    await admin
      .from('social_post_varianten')
      .update({ postiz_post_id: p.postId, postiz_status: 'QUEUE', postiz_error: null })
      .eq('post_id', postId)
      .eq('platform', kanaal)
  }
}

// ── vervangMedia ────────────────────────────────────────────────────────────

/**
 * Vervangt het beeld onder een post door een ander contentbank-item. Reset de
 * Postiz-upload-velden (`visual_postiz_id`/`_path`) zodat `keurPostGoed` het
 * nieuwe beeld opnieuw naar Postiz upload. Het oude content-item gaat terug
 * naar `beschikbaar`, het nieuwe naar `in_gebruik`.
 */
export async function vervangMedia(postId: string, assetId: string): Promise<ActionResult> {
  await requireApprovedUser()
  if (!assetId) return { ok: false, error: 'Geen media gekozen.' }

  const admin = getDashboardAdmin()

  const { data: postData, error: pErr } = await admin
    .from('social_posts')
    .select('content_item_id')
    .eq('id', postId)
    .maybeSingle()
  if (pErr) return { ok: false, error: pErr.message }
  const oudItemId = (postData as { content_item_id: string | null } | null)?.content_item_id

  // Het nieuwe item ophalen voor public_url + media_type.
  const { data: itemData, error: iErr } = await admin
    .from('social_content_items')
    .select('public_url, media_type')
    .eq('id', assetId)
    .maybeSingle()
  if (iErr) return { ok: false, error: iErr.message }
  const item = itemData as { public_url: string | null; media_type: string | null } | null
  if (!item) return { ok: false, error: 'Gekozen media niet gevonden.' }

  const { error: updErr } = await admin
    .from('social_posts')
    .update({
      content_item_id: assetId,
      visual_url: item.public_url,
      visual_type: item.media_type === 'video' ? 'klant_video' : 'klant_foto',
      content_type: item.media_type === 'video' ? 'video' : 'foto',
      visual_postiz_id: null,
      visual_postiz_path: null,
    })
    .eq('id', postId)
  if (updErr) return { ok: false, error: updErr.message }

  // Statussen van de content-items bijwerken.
  if (oudItemId && oudItemId !== assetId) {
    await admin.from('social_content_items').update({ status: 'beschikbaar' }).eq('id', oudItemId)
  }
  await admin.from('social_content_items').update({ status: 'in_gebruik' }).eq('id', assetId)

  revalidatePath('/social', 'layout')
  return { ok: true }
}

// ── uploadMediaAsset (service-role voor Storage) ────────────────────────────

/**
 * Upload een media-bestand naar de private bucket `social-media-content` en
 * registreert het als `social_content_items`-rij (bron `dashboard_upload`).
 * Loopt via de service-role-admin (`getDashboardAdmin()`) voor Storage, want de
 * social-tabellen en de bucket hebben geen write-policy voor authenticated
 * users.
 *
 * Verwacht een `FormData` met velden `file` (Blob/File) en optioneel `context`.
 * De `bodySizeLimit` voor video staat op 30 MB in `next.config.ts`
 * (INTEGRATIE.md sectie 5).
 */
export async function uploadMediaAsset(formData: FormData): Promise<ActionResult> {
  const { user } = await requireApprovedUser()

  const bestand = formData.get('file')
  if (!(bestand instanceof File) || bestand.size === 0) {
    return { ok: false, error: 'Geen bestand ontvangen.' }
  }

  const mime = bestand.type || 'application/octet-stream'
  const isFoto = mime.startsWith('image/')
  const isVideo = mime.startsWith('video/')
  if (!isFoto && !isVideo) {
    return { ok: false, error: 'Alleen foto of video toegestaan.' }
  }

  const context = (formData.get('context') as string | null)?.trim() || null
  const ext = mime.split('/')[1]?.replace('jpeg', 'jpg') ?? 'bin'
  const pad = `${user.id}/${Date.now()}.${ext}`

  const admin = getDashboardAdmin()
  const buffer = Buffer.from(await bestand.arrayBuffer())
  const { error: uploadErr } = await admin.storage
    .from('social-media-content')
    .upload(pad, buffer, { contentType: mime, upsert: false })
  if (uploadErr) return { ok: false, error: `Upload mislukt: ${uploadErr.message}` }

  const { data: pub } = admin.storage.from('social-media-content').getPublicUrl(pad)

  const { error: insertErr } = await admin.from('social_content_items').insert({
    tenant_id: user.id,
    media_type: isVideo ? 'video' : 'foto',
    storage_path: pad,
    public_url: pub.publicUrl,
    context,
    bron: 'dashboard_upload',
    bestandsgrootte: bestand.size,
    status: 'beschikbaar',
  })
  if (insertErr) {
    // Storage-object weer opruimen zodat we geen wees-bestand achterlaten.
    await admin.storage.from('social-media-content').remove([pad])
    return { ok: false, error: `Registreren mislukt: ${insertErr.message}` }
  }

  revalidatePath('/social', 'layout')
  return { ok: true }
}

// ── toggleKanaal ────────────────────────────────────────────────────────────

/**
 * Zet één kanaal (variant) per post aan of uit. De klant kan zo een kanaal voor
 * een specifieke post overslaan. Werkt alleen de DB bij; het in-/uitschakelen
 * gebeurt vóór goedkeuring, dus er is nog geen Postiz-post om bij te werken.
 */
export async function toggleKanaal(
  variantId: string,
  ingeschakeld: boolean,
): Promise<ActionResult> {
  await requireApprovedUser()

  const admin = getDashboardAdmin()
  const { error } = await admin
    .from('social_post_varianten')
    .update({ ingeschakeld })
    .eq('id', variantId)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/social', 'layout')
  return { ok: true }
}

// ── trekPostIn (B9) ─────────────────────────────────────────────────────────

/**
 * Trekt een (gepubliceerde of ingeplande) post in (B9): roept de Postiz-delete
 * aan via `trekPostizPostIn` en zet de status op `ingetrokken`. Idempotent: een
 * al-verwijderde Postiz-post (404) wordt door `trekPostizPostIn` als succes
 * behandeld.
 */
export async function trekPostIn(postId: string): Promise<ActionResult> {
  await requireApprovedUser()

  const admin = getDashboardAdmin()
  const { data, error: leesErr } = await admin
    .from('social_posts')
    .select('postiz_batch_id')
    .eq('id', postId)
    .maybeSingle()
  if (leesErr) return { ok: false, error: leesErr.message }

  const batchId = (data as { postiz_batch_id: string | null } | null)?.postiz_batch_id
  if (batchId) {
    const trek = await trekPostizPostIn(batchId)
    if (!trek.ok) return { ok: false, error: trek.error }
  }

  const { error } = await admin
    .from('social_posts')
    .update({ status: 'ingetrokken' })
    .eq('id', postId)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/social', 'layout')
  return { ok: true }
}
