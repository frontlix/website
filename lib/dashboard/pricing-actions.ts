'use server'

import { revalidatePath } from 'next/cache'
import { getDashboardSupabase } from './supabase-server'

export type ActionResult = { ok: true } | { ok: false; error: string }

// Bekende rule_keys — alleen deze mogen via de UI worden aangepast.
// Voorkomt dat een gemanipuleerde request willekeurige rijen kan
// overschrijven of nieuwe (onbekende) keys kan injecteren.
const ALLOWED_RULE_KEYS: ReadonlySet<string> = new Set([
  'reiniging_per_m2',
  'reinigen_dagprijs_onder_100m2',
  'arbeid_invegen_normaal_per_m2',
  'arbeid_invegen_onkruidwerend_per_m2',
  'invegen_arbeid_normaal_per_m2',
  'invegen_arbeid_onkruidwerend_per_m2',
  'voegzand_normaal_per_zak',
  'voegzand_onkruidwerend_per_zak',
  'voegzand_m2_per_zak',
  'onkruid_per_m2_4_weken',
  'onkruid_per_m2_8_weken',
  'onkruid_per_m2_12_weken',
  'onkruid_per_m2_langer',
  'preventieve_onkruid_per_m2',
  'beschermlaag_per_m2',
  'plan_4w_per_m2',
  'plan_8w_per_m2',
  'plan_12w_per_m2',
  'plan_16w_per_m2',
  'reiskosten_per_km',
  'reiskosten_gratis_tot_km',
  'reiskosten_drempel_km',
  'extra_arbeid_per_min',
  'extra_arbeid_per_minuut',
  'plantenafscherming_per_rol',
  'planten_afschermen_folie_per_rol',
])

/**
 * Werkt één prijsregel bij in `pricing_rules`. Gebruikt door de
 * PricingRuleEditor (settings → Prijzen).
 *
 * Validaties:
 *  - rule_key moet in ALLOWED_RULE_KEYS staan (whitelist)
 *  - waarde moet een eindig getal >= 0 zijn
 *
 * Bij succes: revalidatePath('/instellingen') zodat de pagina de nieuwe
 * waarde toont na navigation. De client doet ook een optimistic update
 * voor instant feedback, dit is de bevestiging vanuit de server.
 */
export async function updatePricingRule(
  ruleKey: string,
  waarde: number
): Promise<ActionResult> {
  if (!ALLOWED_RULE_KEYS.has(ruleKey)) {
    return { ok: false, error: 'Onbekende prijsregel' }
  }
  if (!Number.isFinite(waarde) || waarde < 0) {
    return { ok: false, error: 'Ongeldige waarde' }
  }

  const supabase = await getDashboardSupabase()
  const { error } = await supabase
    .from('pricing_rules')
    .update({ waarde, bijgewerkt_op: new Date().toISOString() })
    .eq('rule_key', ruleKey)

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath('/instellingen')
  return { ok: true }
}
