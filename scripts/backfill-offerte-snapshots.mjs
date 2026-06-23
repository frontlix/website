#!/usr/bin/env node
/**
 * Best-effort backfill: vult offertes.regels_snapshot voor BESTAANDE verstuurde
 * offertes die nog geen snapshot hebben, zodat het dashboard-concept hun
 * verzonden prijzen seedt i.p.v. live te herberekenen.
 *
 * De reconstructie spiegelt lib/dashboard/offerte-snapshot.ts
 * (reconstructSnapshotFromRegels + buildPricingFromRuleKeys), die door
 * offerte-snapshot.test.ts gedekt is. Houd ze in sync.
 *
 * VEILIGHEID:
 *  - Dry-run is DEFAULT. Voeg `--apply` toe om echt te schrijven.
 *  - Eligibility (om verkeerde prijzen te vermijden):
 *      • alleen de LAATSTE verstuurde offerte per lead (hoogste versie,
 *        is_concept=false) — oudere versies hebben niet meer de huidige
 *        prijsregels;
 *      • alleen als die offerte regels_snapshot IS NULL;
 *      • alleen leads ZONDER concept-rij (is_concept=true) — een concept kan de
 *        prijsregels al overschreven hebben, dan reconstrueren we verkeerd.
 *    Niet-eligibele offertes worden overgeslagen + gelogd.
 *
 * Draaien:
 *   Dry-run:  node --env-file=.env.local scripts/backfill-offerte-snapshots.mjs
 *   Echt:     node --env-file=.env.local scripts/backfill-offerte-snapshots.mjs --apply
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL_DASHBOARD
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY_DASHBOARD
const APPLY = process.argv.includes('--apply')

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    '[backfill-snap] NEXT_PUBLIC_SUPABASE_URL_DASHBOARD of SUPABASE_SERVICE_ROLE_KEY_DASHBOARD ontbreekt.\n' +
      'Run: node --env-file=.env.local scripts/backfill-offerte-snapshots.mjs [--apply]',
  )
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
})

// ── Spiegel van lib/dashboard/pricing-types.ts → FALLBACK_PRICING ──────────
const FALLBACK_PRICING = {
  reiniging_per_m2: 3.95,
  reinigen_dagprijs_onder_100m2: 395,
  arbeid_invegen_normaal_per_m2: 0.9,
  arbeid_invegen_onkruidwerend_per_m2: 1.6,
  voegzand_normaal_per_zak: 2.9,
  voegzand_onkruidwerend_per_zak: 20.9,
  voegzand_m2_per_zak: 5,
  preventieve_onkruid_per_m2: 4.5,
  beschermlaag_per_m2: 1.6,
  plan_4w_per_m2: 1.25,
  plan_8w_per_m2: 1.75,
  plan_12w_per_m2: 2.9,
  plan_16w_per_m2: 4.5,
  reiskosten_per_km: 0.23,
  reiskosten_drempel_km: 50,
  extra_arbeid_per_min: 1.2,
  plantenafscherming_per_rol: 8.5,
}

// ── Spiegel van buildPricingFromRuleKeys (offerte-snapshot.ts) ─────────────
function buildPricingFromRuleKeys(map) {
  const g = (k) => map.get(k)
  return {
    reiniging_per_m2: g('reinigen_per_m2') ?? FALLBACK_PRICING.reiniging_per_m2,
    reinigen_dagprijs_onder_100m2: g('reinigen_dagprijs_onder_100m2') ?? FALLBACK_PRICING.reinigen_dagprijs_onder_100m2,
    arbeid_invegen_normaal_per_m2: g('invegen_arbeid_normaal_per_m2') ?? FALLBACK_PRICING.arbeid_invegen_normaal_per_m2,
    arbeid_invegen_onkruidwerend_per_m2: g('invegen_arbeid_onkruidwerend_per_m2') ?? FALLBACK_PRICING.arbeid_invegen_onkruidwerend_per_m2,
    voegzand_normaal_per_zak: g('voegzand_normaal_per_zak') ?? FALLBACK_PRICING.voegzand_normaal_per_zak,
    voegzand_onkruidwerend_per_zak: g('voegzand_onkruidwerend_per_zak') ?? FALLBACK_PRICING.voegzand_onkruidwerend_per_zak,
    voegzand_m2_per_zak: g('voegzand_m2_per_zak') ?? FALLBACK_PRICING.voegzand_m2_per_zak,
    preventieve_onkruid_per_m2: g('onkruid_per_m2_langer') ?? FALLBACK_PRICING.preventieve_onkruid_per_m2,
    beschermlaag_per_m2: g('beschermlaag_per_m2') ?? FALLBACK_PRICING.beschermlaag_per_m2,
    plan_4w_per_m2: g('onkruid_per_m2_4_weken') ?? FALLBACK_PRICING.plan_4w_per_m2,
    plan_8w_per_m2: g('onkruid_per_m2_8_weken') ?? FALLBACK_PRICING.plan_8w_per_m2,
    plan_12w_per_m2: g('onkruid_per_m2_12_weken') ?? FALLBACK_PRICING.plan_12w_per_m2,
    plan_16w_per_m2: g('onkruid_per_m2_langer') ?? FALLBACK_PRICING.plan_16w_per_m2,
    reiskosten_per_km: g('reiskosten_per_km') ?? FALLBACK_PRICING.reiskosten_per_km,
    reiskosten_drempel_km: g('reiskosten_gratis_tot_km') ?? FALLBACK_PRICING.reiskosten_drempel_km,
    extra_arbeid_per_min: g('extra_arbeid_per_minuut') ?? FALLBACK_PRICING.extra_arbeid_per_min,
    plantenafscherming_per_rol: g('planten_afschermen_folie_per_rol') ?? FALLBACK_PRICING.plantenafscherming_per_rol,
  }
}

// ── Spiegel van reconstructSnapshotFromRegels (offerte-snapshot.ts) ────────
const BACKFILL_HERKENNING = [
  [/reiniging oppervlak \(dagprijs\)/i, 'reinigen_dagprijs_onder_100m2'],
  [/reiniging oppervlak/i, 'reiniging_per_m2'],
  [/invegen onkruidwerend/i, 'arbeid_invegen_onkruidwerend_per_m2'],
  [/invegen normaal/i, 'arbeid_invegen_normaal_per_m2'],
  [/voegzand onkruidwerend/i, 'voegzand_onkruidwerend_per_zak'],
  [/voegzand normaal/i, 'voegzand_normaal_per_zak'],
  [/preventieve onkruid/i, 'preventieve_onkruid_per_m2'],
  [/beschermlaag/i, 'beschermlaag_per_m2'],
  [/afdekfolie/i, 'plantenafscherming_per_rol'],
  [/reiskosten/i, 'reiskosten_per_km'],
]

function reconstructSnapshot(regels, livePricing, kortingPct) {
  const pricing = { ...livePricing }
  for (const r of regels) {
    const stuk = r.stukprijs
    if (stuk == null || !Number.isFinite(Number(stuk))) continue
    const oms = r.omschrijving ?? ''
    const hit = BACKFILL_HERKENNING.find(([re]) => re.test(oms))
    if (hit) pricing[hit[1]] = Number(stuk)
  }
  return {
    schemaVersie: 1,
    pricing,
    kortingPct: kortingPct ?? 0,
    regels: regels.map((r, idx) => ({
      omschrijving: r.omschrijving ?? 'Regel',
      aantal: r.aantal ?? null,
      eenheid: r.eenheid ?? null,
      stukprijs: Number(r.stukprijs ?? 0),
      totaal: Number(r.totaal ?? 0),
      bron: r.bron === 'manual' ? 'manual' : 'auto_lead',
      volgorde: r.volgorde ?? idx + 1,
    })),
  }
}

async function main() {
  console.log(`[backfill-snap] start — modus: ${APPLY ? 'APPLY (schrijven)' : 'DRY-RUN'}`)

  // 1. Live prijslijst voor de fallback-keys.
  const { data: prRows, error: prErr } = await supabase.from('pricing_rules').select('rule_key, waarde')
  if (prErr) {
    console.error('[backfill-snap] pricing_rules ophalen mislukt:', prErr.message)
    process.exit(1)
  }
  const priceMap = new Map((prRows ?? []).map((r) => [r.rule_key, Number(r.waarde)]))
  const livePricing = buildPricingFromRuleKeys(priceMap)

  // 2. Alle offertes ophalen (per lead groeperen).
  const { data: offertes, error: offErr } = await supabase
    .from('offertes')
    .select('id, lead_id, versie, is_concept, korting_pct, regels_snapshot')
    .order('versie', { ascending: false })
  if (offErr) {
    console.error('[backfill-snap] offertes ophalen mislukt:', offErr.message)
    process.exit(1)
  }

  const perLead = new Map()
  for (const o of offertes ?? []) {
    if (!perLead.has(o.lead_id)) perLead.set(o.lead_id, [])
    perLead.get(o.lead_id).push(o)
  }

  let eligible = 0
  let skipConcept = 0
  let skipHasSnapshot = 0
  let skipNoSent = 0
  let written = 0
  let failed = 0

  for (const [leadId, rows] of perLead) {
    if (rows.some((o) => o.is_concept === true)) {
      skipConcept++
      continue
    }
    const sent = rows.filter((o) => o.is_concept === false).sort((a, b) => b.versie - a.versie)
    const latest = sent[0]
    if (!latest) {
      skipNoSent++
      continue
    }
    if (latest.regels_snapshot != null) {
      skipHasSnapshot++
      continue
    }

    // Prijsregels van deze lead (= de regels van de laatste verzending).
    const { data: regels, error: regErr } = await supabase
      .from('prijsregels')
      .select('omschrijving, aantal, eenheid, stukprijs, totaal, bron, volgorde')
      .eq('lead_id', leadId)
      .order('volgorde', { ascending: true })
    if (regErr) {
      console.warn(`  ✗ ${leadId} prijsregels ophalen mislukt: ${regErr.message}`)
      failed++
      continue
    }
    if (!regels || regels.length === 0) {
      console.warn(`  ⊘ ${leadId} v${latest.versie}: geen prijsregels, overgeslagen`)
      skipNoSent++
      continue
    }

    eligible++
    const snapshot = reconstructSnapshot(regels, livePricing, Number(latest.korting_pct ?? 0))
    const herkend = regels.filter((r) => BACKFILL_HERKENNING.some(([re]) => re.test(r.omschrijving ?? ''))).length

    console.log(
      `  • ${leadId} v${latest.versie}: ${regels.length} regels (${herkend} herkend) → snapshot ` +
        `(preventieve_onkruid=${snapshot.pricing.preventieve_onkruid_per_m2}, reiniging=${snapshot.pricing.reiniging_per_m2})`,
    )

    if (APPLY) {
      const { error: updErr } = await supabase
        .from('offertes')
        .update({ regels_snapshot: snapshot })
        .eq('id', latest.id)
      if (updErr) {
        console.warn(`    ✗ schrijven mislukt: ${updErr.message}`)
        failed++
      } else {
        written++
      }
    }
  }

  console.log('[backfill-snap] klaar')
  console.log(
    `  eligible: ${eligible} · geschreven: ${written} · ` +
      `skip(concept): ${skipConcept} · skip(heeft-snapshot): ${skipHasSnapshot} · ` +
      `skip(geen-verzending): ${skipNoSent} · fail: ${failed}`,
  )
  if (!APPLY) console.log('  (dry-run — niets geschreven; draai met --apply om door te voeren)')
}

main().catch((e) => {
  console.error('[backfill-snap] fatale fout:', e)
  process.exit(1)
})
