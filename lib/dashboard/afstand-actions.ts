'use server'

import { getDashboardSupabase } from './supabase-server'
import { geocodeAddress } from './geocoding'
import { getTenantBase, DEFAULT_TENANT_BASE } from './tenant-base'

/**
 * Geocodet postcode + huisnummer naar (a) hemelsbrede afstand in km tot
 * de tenant-basis en (b) de bijbehorende straat + plaats. De handmatige-
 * offerte wizard gebruikt 'm om Afstand, Straat en Plaats automatisch
 * te vullen zodra postcode + huisnummer geldig zijn.
 *
 * Returnt `ok: false` bij ontbrekende auth/input of mislukte geocoding;
 * caller houdt dan z'n vorige waardes (DEFAULTS.afstand_km, lege strings).
 */

export type AutoAfstandResult =
  | { ok: true; km: number; street: string | null; city: string | null }
  | { ok: false; reason: 'auth' | 'input' | 'geocode' }

// Postcode-regex: 4 cijfers + 2 letters (spatie optioneel). Voorkomt
// onnodige fetches naar postcode.tech terwijl user nog aan het typen is.
const POSTCODE_RE = /^\s*\d{4}\s*[A-Za-z]{2}\s*$/

/**
 * Haversine, afstand over de Aarde tussen twee lat/lng-punten, in km.
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
  // Auth check, alleen ingelogde dashboard-users mogen geocoden
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
  return { ok: true, km, street: geo.street, city: geo.city }
}
