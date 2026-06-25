import { isHandover } from './lead-status-meta'
import { getDashboardSupabase } from './supabase-server'
import { WORK_RADIUS_DEFAULT } from '@/components/dashboard/v2/instellingen/instellingen-data'

export interface HandoverGrenzen {
  radiusMaxKm: number
  minM2BuitenStraal: number
}

export interface HandoverReason {
  /** Rode regel onder de Adres-rij (afstand), of null. */
  adresSub: string | null
  /** Rode regel onder de Oppervlakte-rij, of null. */
  oppervlakteSub: string | null
}

/**
 * Leidt de hand-over-reden af uit afstand + m2 tegen de werkgebied-grenzen.
 * Lege regels bij een niet-hand-over-lead. Toont alleen een specifieke reden
 * als de grens echt overschreden is; anders een neutrale fallback.
 */
export function handoverReason(
  lead: {
    eigenaar_overgenomen?: boolean | null
    status?: string | null
    afstand_km?: number | null
    m2?: number | null
  },
  grenzen: HandoverGrenzen,
): HandoverReason {
  if (!isHandover(lead)) return { adresSub: null, oppervlakteSub: null }
  const teVer = lead.afstand_km != null && lead.afstand_km > grenzen.radiusMaxKm
  const teKlein = lead.m2 != null && lead.m2 < grenzen.minM2BuitenStraal
  const oppervlakteSub = teKlein ? `Te klein, onder ${grenzen.minM2BuitenStraal} m²` : null
  let adresSub: string | null
  if (teVer) adresSub = `Te ver, buiten je werkstraal (${grenzen.radiusMaxKm} km)`
  else if (teKlein) adresSub = null // de reden staat al op de Oppervlakte-rij
  else adresSub = 'Bot heeft dit gesprek overgedragen' // neutrale fallback
  return { adresSub, oppervlakteSub }
}

const MIN_M2_DEFAULT = 200

export const DEFAULT_GRENZEN: HandoverGrenzen = {
  radiusMaxKm: WORK_RADIUS_DEFAULT,
  minM2BuitenStraal: MIN_M2_DEFAULT,
}

/** Haalt de werkgebied-grenzen uit tenant_settings (met defaults). */
export async function getWerkgebiedGrenzen(): Promise<HandoverGrenzen> {
  const supabase = await getDashboardSupabase()
  const { data } = await supabase
    .from('tenant_settings')
    .select('radius_max_km, radius_min_m2_buiten_straal')
    .limit(1)
    .maybeSingle()
  const row = data as { radius_max_km?: number | null; radius_min_m2_buiten_straal?: number | null } | null
  return {
    radiusMaxKm: row?.radius_max_km != null ? Number(row.radius_max_km) : DEFAULT_GRENZEN.radiusMaxKm,
    minM2BuitenStraal:
      row?.radius_min_m2_buiten_straal != null ? Number(row.radius_min_m2_buiten_straal) : DEFAULT_GRENZEN.minM2BuitenStraal,
  }
}
