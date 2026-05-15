'use server'

import { getDashboardSupabase } from './supabase-server'
import { geocodeAddress } from './geocoding'
import { getTenantBase, DEFAULT_TENANT_BASE } from './tenant-base'

/**
 * Berekent de hemelsbrede afstand (km) tussen de thuisbasis van de tenant
 * en een werk-adres (postcode + huisnummer). Wordt gebruikt door de
 * handmatige-offerte wizard om het `afstand_km`-veld automatisch te vullen
 * — de user typt geen afstand meer, Surface rekent zelf.
 *
 * Returnt `null` bij ontbrekende auth/input of mislukte geocoding; caller
 * houdt dan z'n vorige waarde (of de DEFAULTS.afstand_km).
 */

export type AutoAfstandResult =
  | { ok: true; km: number }
  | { ok: false; reason: 'auth' | 'input' | 'geocode' }

// Postcode-regex: 4 cijfers + 2 letters (spatie optioneel). Voorkomt
// onnodige fetches naar postcode.tech terwijl user nog aan het typen is.
const POSTCODE_RE = /^\s*\d{4}\s*[A-Za-z]{2}\s*$/

/**
 * Haversine — afstand over de Aarde tussen twee lat/lng-punten, in km.
 * Aarde-straal 6371km. Zelfde formule als in agenda-route.
 */
function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}

export async function getAutoAfstandKm(
  postcode: string,
  huisnummer: string,
): Promise<AutoAfstandResult> {
  // Auth check — alleen ingelogde dashboard-users mogen geocoden
  const supabase = await getDashboardSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, reason: 'auth' }

  if (!POSTCODE_RE.test(postcode) || !huisnummer.trim()) {
    return { ok: false, reason: 'input' }
  }

  const geo = await geocodeAddress(postcode, huisnummer.trim())
  if (!geo) return { ok: false, reason: 'geocode' }

  const base = (await getTenantBase()) ?? DEFAULT_TENANT_BASE
  const km = Math.round(haversineKm(base, geo))
  return { ok: true, km }
}
