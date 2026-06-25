import { getDashboardSupabase } from './supabase-server'
import { geocodeAddress } from './geocoding'

/**
 * Thuisbasis-locatie van de tenant, bron voor alle dag-routes in de
 * routekaart.
 *
 * Drie wegen om aan een locatie te komen, in volgorde van voorkeur:
 *   1) `tenant_settings.base_lat`/`base_lng` (gezet via /instellingen UI)
 *   2) `tenant_settings.postcode` + huisnummer geëxtraheerd uit `adres`,
 *      on-the-fly gegeocodeerd via postcode.tech (Next-fetch caches 30d)
 *   3) `null` → caller valt terug op `DEFAULT_TENANT_BASE` (Biervliet)
 *
 * Pad 2 zorgt dat de routekaart al werkt zónder dat de tenant iets hoeft
 * in te stellen, zolang z'n adres in tenant_settings staat (postcode +
 * adres met huisnummer aan het eind). Pad 1 wint omdat de UI een
 * gecontroleerd huisnummer-veld heeft (niet afhankelijk van adres-parse).
 */

export type TenantBase = {
  lat: number
  lng: number
  label: string
}

/**
 * Match een huisnummer aan het eind van een adres-string. Voorbeelden:
 *   "Hoofdstraat 12"      → "12"
 *   "Industriestraat 12A" → "12A"
 *   "Lange laan 12-14"    → "12" (eerste hit)
 * Geeft null als 'ie niets kan extraheren.
 */
function extractHuisnummer(adres: string): string | null {
  const trimmed = adres.trim()
  // Probeer eerst aan het eind: "Straat 12A"
  const tail = trimmed.match(/(\d+\s*[A-Za-z]?)\s*$/)
  if (tail) return tail[1].replace(/\s+/g, '')
  // Anders eerste nummer ergens: "12 Hoofdstraat"
  const any = trimmed.match(/\b(\d+\s*[A-Za-z]?)\b/)
  return any ? any[1].replace(/\s+/g, '') : null
}

export async function getTenantBase(): Promise<TenantBase | null> {
  const supabase = await getDashboardSupabase()
  // `select('*')` voorkomt een failure als migratie 028 nog niet is
  // toegepast, dan zijn `base_*` kolommen er simpelweg niet, maar de
  // andere bestaande kolommen werken nog wel.
  const { data, error } = await supabase
    .from('tenant_settings')
    .select('*')
    .limit(1)
    .maybeSingle()

  if (error || !data) return null

  // Pad 1: expliciet ingesteld via /instellingen (migratie 028 toegepast)
  const row = data as Record<string, unknown>
  const baseLat = typeof row.base_lat === 'number' ? row.base_lat : null
  const baseLng = typeof row.base_lng === 'number' ? row.base_lng : null
  const baseLabel = typeof row.base_label === 'string' ? row.base_label : null
  if (baseLat !== null && baseLng !== null) {
    return {
      lat: baseLat,
      lng: baseLng,
      label:
        baseLabel?.trim() ||
        (typeof row.plaats === 'string' ? row.plaats.trim() : '') ||
        'BASIS',
    }
  }

  // Pad 2: bestaande postcode + huisnummer-uit-adres
  const postcode = typeof row.postcode === 'string' ? row.postcode.trim() : ''
  const adres = typeof row.adres === 'string' ? row.adres.trim() : ''
  const plaats = typeof row.plaats === 'string' ? row.plaats.trim() : ''
  if (postcode && adres) {
    const huisnummer = extractHuisnummer(adres)
    if (huisnummer) {
      const result = await geocodeAddress(postcode, huisnummer)
      if (result) {
        return {
          lat: result.lat,
          lng: result.lng,
          label: plaats || 'BASIS',
        }
      }
    }
  }

  return null
}

/** Default fallback: Biervliet centrum, gebruikt als alle paths falen. */
export const DEFAULT_TENANT_BASE: TenantBase = {
  lat: 51.3057,
  lng: 3.6515,
  label: 'BASIS',
}

/** Default werkstraal (km) als er geen radius_max_km in tenant_settings staat. */
export const DEFAULT_RADIUS_MAX_KM = 200

/**
 * De ingestelde werkstraal (tenant_settings.radius_max_km, instelbaar via
 * /instellingen). Bepaalt o.a. wanneer een lead "buiten radius" valt in het
 * "Eerst dit doen"-blok. Valt terug op DEFAULT_RADIUS_MAX_KM (200) als de
 * waarde ontbreekt/ongeldig is.
 */
export async function getRadiusMaxKm(): Promise<number> {
  const supabase = await getDashboardSupabase()
  const { data, error } = await supabase
    .from('tenant_settings')
    .select('*')
    .limit(1)
    .maybeSingle()
  if (error || !data) return DEFAULT_RADIUS_MAX_KM
  const r = (data as Record<string, unknown>).radius_max_km
  return typeof r === 'number' && r > 0 ? r : DEFAULT_RADIUS_MAX_KM
}
