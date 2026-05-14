'use server'

import { revalidatePath } from 'next/cache'
import { getDashboardSupabase } from './supabase-server'
import { getDashboardAdmin } from './supabase-admin'
import { geocodeAddress } from './geocoding'

export type SaveTenantBaseResult =
  | {
      ok: true
      lat: number
      lng: number
      label: string
      street: string | null
      city: string | null
    }
  | { ok: false; error: string }

/**
 * Sla de thuisbasis-locatie van de tenant op. Geocodet postcode+huisnummer
 * via postcode.tech en bewaart lat/lng + label op `tenant_settings`. De
 * routekaart gebruikt dit als vertrekpunt voor alle dag-routes.
 *
 * Auth: alleen approved dashboard-users. Schrijven gebeurt via service-role
 * omdat `tenant_settings` geen UPDATE-policy heeft voor dashboard-users.
 */
export async function saveTenantBase(input: {
  postcode: string
  huisnummer: string
  label: string
}): Promise<SaveTenantBaseResult> {
  const supabase = await getDashboardSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Niet ingelogd.' }

  const postcode = input.postcode.trim()
  const huisnummer = input.huisnummer.trim()
  const label = input.label.trim() || 'BASIS'

  if (!postcode) return { ok: false, error: 'Postcode is verplicht.' }
  if (!huisnummer) return { ok: false, error: 'Huisnummer is verplicht.' }

  const geo = await geocodeAddress(postcode, huisnummer)
  if (!geo) {
    return {
      ok: false,
      error: 'Geocoding faalde — controleer postcode + huisnummer.',
    }
  }

  const admin = getDashboardAdmin()

  // Pak de eerste (en enige) tenant_settings rij.
  const { data: existing, error: fetchErr } = await admin
    .from('tenant_settings')
    .select('id')
    .limit(1)
    .maybeSingle()

  if (fetchErr || !existing) {
    return {
      ok: false,
      error: 'Geen tenant_settings rij gevonden om te updaten.',
    }
  }

  const { error: updErr } = await admin
    .from('tenant_settings')
    .update({
      postcode,
      base_huisnummer: huisnummer,
      base_lat: geo.lat,
      base_lng: geo.lng,
      base_label: label,
    })
    .eq('id', existing.id)

  if (updErr) {
    return { ok: false, error: `Opslaan mislukt: ${updErr.message}` }
  }

  revalidatePath('/instellingen')
  revalidatePath('/agenda')

  return {
    ok: true,
    lat: geo.lat,
    lng: geo.lng,
    label,
    street: geo.street,
    city: geo.city,
  }
}
