/**
 * Geocoding-wrapper rond postcode.tech (gratis NL-postcode API).
 *
 * - 10k requests/maand gratis met een API-key (via dashboard.postcode.tech)
 * - Endpoint: `GET /api/v1/postcode?postcode=1234AB&number=5`
 * - Geeft o.a. lat/lng terug per postcode+huisnummer combinatie
 *
 * Caching: deze module geocodet ALLEEN — de caller (lead-create / backfill
 * / edit) bewaart de uitkomst in `leads.lat`/`lng`/`coords_geocoded_op` zodat
 * we elke postcode max 1× hoeven op te zoeken.
 */

// `/postcode/full` geeft geo-coordinaten terug; `/postcode` geeft alleen
// straat+plaats. We willen geo, dus `/full`.
const POSTCODE_TECH_BASE = 'https://postcode.tech/api/v1/postcode/full'

export type Geocoded = {
  lat: number
  lng: number
  street: string | null
  city: string | null
}

type PostcodeTechResponse = {
  street?: string
  city?: string
  geo?: { lat?: number; lon?: number }
}

function normalizePostcode(raw: string): string {
  return raw.replace(/\s+/g, '').toUpperCase()
}

/**
 * Geocodet een postcode+huisnummer via postcode.tech. Returnt `null` bij
 * onvolledige input, ontbrekende API-key, of niet-2xx response.
 *
 * Errors worden gelogd, niet geworpen — de caller besluit zelf hoe te
 * reageren (de routekaart-view skipt leads zonder coords).
 */
export async function geocodeAddress(
  postcode: string | null | undefined,
  huisnummer: string | null | undefined,
): Promise<Geocoded | null> {
  const apiKey = process.env.POSTCODE_TECH_API_KEY
  if (!apiKey) {
    console.warn('[geocoding] POSTCODE_TECH_API_KEY niet gezet — skip')
    return null
  }
  if (!postcode || !huisnummer) return null

  const normalized = normalizePostcode(postcode)
  // postcode.tech verwacht "1234AB" zonder spatie
  const url = `${POSTCODE_TECH_BASE}?postcode=${encodeURIComponent(normalized)}&number=${encodeURIComponent(huisnummer)}`

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
      // Geocoding-resultaat verandert zelden — caching is OK.
      next: { revalidate: 60 * 60 * 24 * 30 }, // 30 dagen
    })
    if (!res.ok) {
      console.warn(
        `[geocoding] ${normalized}/${huisnummer} → HTTP ${res.status}`,
      )
      return null
    }
    const data = (await res.json()) as PostcodeTechResponse
    const lat = data.geo?.lat
    const lng = data.geo?.lon
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return null
    }
    return {
      lat,
      lng,
      street: data.street ?? null,
      city: data.city ?? null,
    }
  } catch (e) {
    console.error('[geocoding] fetch error:', e)
    return null
  }
}

/**
 * Korte sleep — voor rate-limit-vriendelijke batch-geocoding in scripts.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}
