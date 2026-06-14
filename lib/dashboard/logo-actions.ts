'use server'

import { revalidatePath } from 'next/cache'
import { getDashboardAdmin } from './supabase-admin'
import { requireApprovedUser } from './require-approved-user'

/**
 * Server action voor het uploaden van het bedrijfslogo. Het bestand gaat via de
 * service-role admin-client naar de publieke storage-bucket `tenant-logos` (vast
 * pad per tenant, zodat een nieuw logo het oude overschrijft) en de publieke URL
 * wordt opgeslagen op tenant_settings.logo_url. Het v2 Bedrijfsprofiel-panel
 * toont daarna het echte logo i.p.v. de initiaal-fallback.
 *
 * Auth + write-patroon identiek aan updateBedrijfsprofiel: requireApprovedUser
 * blokkeert niet-approved users; schrijven via service-role omdat
 * tenant_settings + Storage geen UPDATE-policy voor dashboard-users hebben.
 */
export type UploadLogoResult =
  | { ok: true; url: string }
  | { ok: false; error: string }

const MAX_BYTES = 2 * 1024 * 1024 // 2 MB
const ALLOWED_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}

export async function uploadTenantLogo(
  formData: FormData,
): Promise<UploadLogoResult> {
  await requireApprovedUser()

  const file = formData.get('logo')
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: 'Geen bestand ontvangen.' }
  }
  const ext = ALLOWED_EXT[file.type]
  if (!ext) {
    return { ok: false, error: 'Alleen PNG, JPG of WebP toegestaan.' }
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: 'Bestand is te groot (max 2 MB).' }
  }

  const admin = getDashboardAdmin()

  // tenant_settings rij (single-tenant setup), zelfde patroon als de andere
  // bedrijfsprofiel-actions.
  const { data: existing, error: fetchErr } = await admin
    .from('tenant_settings')
    .select('id')
    .limit(1)
    .maybeSingle()
  if (fetchErr || !existing) {
    return { ok: false, error: 'Geen tenant_settings rij gevonden om te updaten.' }
  }

  const path = `${existing.id}/logo.${ext}`
  const bytes = new Uint8Array(await file.arrayBuffer())

  const { error: upErr } = await admin.storage
    .from('tenant-logos')
    .upload(path, bytes, { contentType: file.type, upsert: true })
  if (upErr) {
    console.error('[uploadTenantLogo] upload failed:', upErr)
    return { ok: false, error: `Upload mislukt: ${upErr.message}` }
  }

  const { data: pub } = admin.storage.from('tenant-logos').getPublicUrl(path)
  // Cache-buster: het pad is vast, dus zonder query-param zou de browser de
  // oude (gecachte) afbeelding blijven tonen na een nieuwe upload.
  const url = `${pub.publicUrl}?v=${Date.now()}`

  const { error: updErr } = await admin
    .from('tenant_settings')
    .update({ logo_url: url, bijgewerkt_op: new Date().toISOString() })
    .eq('id', existing.id)
  if (updErr) {
    console.error('[uploadTenantLogo] db update failed:', updErr)
    return { ok: false, error: `Opslaan mislukt: ${updErr.message}` }
  }

  revalidatePath('/dashboard/instellingen')
  revalidatePath('/dashboard/v2/instellingen')
  return { ok: true, url }
}
