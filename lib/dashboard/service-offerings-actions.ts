'use server'

import { revalidatePath } from 'next/cache'
import { getDashboardSupabase } from './supabase-server'

export type ActionResult = { ok: true } | { ok: false; error: string }

/**
 * Zet een dienst aan/uit in `service_offerings`. Gebruikt door de
 * ServiceOfferingToggle in /instellingen → Diensten aanbod.
 *
 * Net als bij `updatePricingRule`: er staat een `.eq('dienst_key', ...)`
 * op de UPDATE zodat alleen een bestaande rij wordt aangeraakt. RLS in
 * Supabase regelt wie überhaupt UPDATE mag uitvoeren, zonder policy
 * faalt deze action stil (geen rijen geraakt) en logs we de details.
 */
export async function toggleServiceOffering(
  dienstKey: string,
  actief: boolean,
): Promise<ActionResult> {
  if (typeof dienstKey !== 'string' || dienstKey.trim() === '') {
    return { ok: false, error: 'Ongeldige dienst-key' }
  }

  const supabase = await getDashboardSupabase()
  const { data, error } = await supabase
    .from('service_offerings')
    .update({ actief })
    .eq('dienst_key', dienstKey)
    .select('dienst_key')

  if (error) {
    console.error('[toggleServiceOffering] failed:', error)
    return { ok: false, error: 'Opslaan mislukt, geen rechten?' }
  }
  if (!data || data.length === 0) {
    return { ok: false, error: 'Dienst niet gevonden' }
  }

  revalidatePath('/instellingen')
  return { ok: true }
}
