'use server'

import { revalidatePath } from 'next/cache'
import { getDashboardSupabase } from './supabase-server'
import { getManualOffertePricing } from './pricing-queries'
import type { ManualOffertePricing } from './pricing-types'

export type ActionResult = { ok: true } | { ok: false; error: string }

/**
 * Server action voor de manual-offerte wizard om de actuele pricing op te
 * halen. De wizard is een client component en kan getManualOffertePricing
 * niet direct importeren (server-only via supabase-server).
 */
export async function getPricingForOffertePreview(): Promise<ManualOffertePricing> {
  return getManualOffertePricing()
}

/** Meta voor de offerte-wizard-preview: standaard-geldigheid (dagen) +
 *  bedrijfsnaam, zodat de verstuur-preview de echte afzender en geldigheid
 *  toont (i.p.v. hardcoded waarden). Valt terug op 21 dagen / "Schoon Straatje". */
export type OffertePreviewMeta = { geldigheidDagen: number; bedrijfsnaam: string }

export async function getOffertePreviewMeta(): Promise<OffertePreviewMeta> {
  const supabase = await getDashboardSupabase()
  const { data } = await supabase
    .from('tenant_settings')
    .select('offerte_geldigheid_dagen, bedrijfsnaam')
    .limit(1)
    .maybeSingle()
  return {
    geldigheidDagen: Number(data?.offerte_geldigheid_dagen) || 21,
    bedrijfsnaam: (data?.bedrijfsnaam as string | null)?.trim() || 'Schoon Straatje',
  }
}

/**
 * Werkt één prijsregel bij in `pricing_rules`. Gebruikt door de
 * PricingRuleEditor (settings → Prijzen).
 *
 * Validaties:
 *  - rule_key is een niet-lege string (basis-sanity, format-vrij zodat
 *    nieuwe rules in de DB direct werkbaar zijn zonder code-deploy)
 *  - waarde is een eindig getal >= 0
 *
 * Security: er staat een `.eq('rule_key', ruleKey)` op de UPDATE, dus
 * alleen een bestaande rij wordt aangeraakt. Er kan geen rij worden
 * geïnsert; er kan geen kolom anders dan `waarde`/`bijgewerkt_op` worden
 * beschreven. RLS in Supabase regelt wie überhaupt UPDATE mag uitvoeren.
 *
 * Bij succes: revalidatePath('/instellingen') zodat de pagina de nieuwe
 * waarde toont na navigation. De client doet ook een optimistic update
 * voor instant feedback, dit is de bevestiging vanuit de server.
 */
export async function updatePricingRule(
  ruleKey: string,
  waarde: number
): Promise<ActionResult> {
  if (typeof ruleKey !== 'string' || ruleKey.trim() === '') {
    return { ok: false, error: 'Ongeldige prijsregel' }
  }
  if (!Number.isFinite(waarde) || waarde < 0) {
    return { ok: false, error: 'Ongeldige waarde' }
  }

  const supabase = await getDashboardSupabase()
  const { data, error } = await supabase
    .from('pricing_rules')
    .update({ waarde, bijgewerkt_op: new Date().toISOString() })
    .eq('rule_key', ruleKey)
    .select('rule_key')

  if (error) {
    return { ok: false, error: error.message }
  }

  // Geen rij geraakt = de rule_key bestaat niet in de DB. Beter een
  // duidelijke melding dan stille no-op.
  if (!data || data.length === 0) {
    return { ok: false, error: 'Prijsregel niet gevonden' }
  }

  revalidatePath('/instellingen')
  return { ok: true }
}

/**
 * Werkt meerdere prijsregels tegelijk bij, gebruikt door de "Alles
 * opslaan"-knop in de Prijzen-sectie nadat de owner meerdere regels heeft
 * aangepast en eerst de impact heeft bekeken via de Wat-als simulator.
 *
 * Voert per regel een aparte UPDATE uit. Bij een fout in één regel
 * stoppen we, maar de eerder succesvolle updates blijven staan (Supabase
 * v1 ondersteunt geen multi-row UPDATE met verschillende waarden in één
 * statement zonder upsert; we kunnen later overstappen op een Postgres
 * function als de lijst groot wordt).
 */
export async function updatePricingRulesBatch(
  changes: Array<{ rule_key: string; waarde: number }>,
): Promise<ActionResult> {
  if (!Array.isArray(changes) || changes.length === 0) {
    return { ok: false, error: 'Geen wijzigingen' }
  }
  // Valideer alles vóór de eerste UPDATE, voorkomt half-doorlopen.
  for (const c of changes) {
    if (typeof c.rule_key !== 'string' || c.rule_key.trim() === '') {
      return { ok: false, error: 'Ongeldige prijsregel' }
    }
    if (!Number.isFinite(c.waarde) || c.waarde < 0) {
      return { ok: false, error: `Ongeldige waarde voor ${c.rule_key}` }
    }
  }

  const supabase = await getDashboardSupabase()
  const now = new Date().toISOString()
  for (const c of changes) {
    const { data, error } = await supabase
      .from('pricing_rules')
      .update({ waarde: c.waarde, bijgewerkt_op: now })
      .eq('rule_key', c.rule_key)
      .select('rule_key')
    if (error) return { ok: false, error: error.message }
    if (!data || data.length === 0) {
      return { ok: false, error: `Prijsregel niet gevonden: ${c.rule_key}` }
    }
  }

  revalidatePath('/instellingen')
  return { ok: true }
}
