'use server'

/**
 * Server-action voor het nieuwe form-style Offerte-tab.
 *
 * saveOfferteForm() doet twee dingen in één call:
 *  1. Werkt de LEAD-velden bij (adres, diensten, voegzand, korting, etc.)
 *     via dezelfde mapping als de handmatige wizard (buildLeadFieldsFromForm).
 *  2. Berekent de prijsregels uit de form-data (computeRules) en persisteert
 *     ze via saveDraft — dat upsert't de concept-offerte, replace't de
 *     prijsregels en revalidate't de lead-detail + leads-overzicht.
 *
 * Bron-van-waarheid voor het offerte-totaal is saveDraft: dat hertelt z'n
 * eigen totaal uit de regels die we 'm aanleveren. De totaalIncl die we hier
 * berekenen is enkel voor leads.totaal_prijs en is bewust 1-op-1 gelijk aan
 * saveDraft's eigen formule (subtotaal incl. korstmos-regel × (1-korting) ×
 * BTW) zodat de twee waarden niet uit elkaar lopen.
 *
 * Auth/schrijf-model identiek aan saveDraft: requireApprovedUser() + writes
 * via service-role admin-client.
 */

import { getDashboardAdmin } from './supabase-admin'
import { requireApprovedUser } from './require-approved-user'
import { computeRules } from './manual-offerte-rules'
import { getManualOffertePricing } from './pricing-queries'
import { saveDraft, type DraftRegelInput } from './offerte-draft-actions'
import { buildLeadFieldsFromForm } from './offerte-form-mapping'
import type { ManualOfferteData } from './manual-offerte-types'

type Result = { ok: true } | { ok: false; error: string }

const BTW_FACTOR = 1.21

/** Rond af op 2 decimalen. */
function round2(x: number): number {
  return Math.round(x * 100) / 100
}

export async function saveOfferteForm(
  leadId: string,
  data: ManualOfferteData,
  geldigheidDagen: number,
): Promise<Result> {
  try {
    // ── 1. Auth ────────────────────────────────────────────────────
    await requireApprovedUser()

    // ── 2. Guard ───────────────────────────────────────────────────
    if (!leadId) return { ok: false, error: 'leadId ontbreekt.' }

    // ── 3. Pricing + regels ────────────────────────────────────────
    const pricing = await getManualOffertePricing()
    const rules = computeRules(data, pricing)

    // ── 4. Korstmos-toeslag als losse regel ────────────────────────
    // 10% over de diensten-regels (reiskosten — eenheid 'km' — tellen niet
    // mee, conform de PDF-conventie). We voegen 'm hier als prijsregel toe
    // zodat saveDraft 'm meeneemt in z'n eigen totaal-berekening.
    const regelsVoorDraft = [...rules]
    if (data.korstmos === 'ja') {
      const dienstenSub = rules
        .filter((r) => r.eenheid !== 'km')
        .reduce((s, r) => s + r.totaal, 0)
      const toeslag = round2(dienstenSub * 0.1)
      regelsVoorDraft.push({
        desc: 'Korstmos-toeslag (10%)',
        aantal: 1,
        eenheid: 'post',
        prijs: toeslag,
        totaal: toeslag,
      })
    }

    // ── 5. totaalIncl voor leads.totaal_prijs ──────────────────────
    // Exact dezelfde formule als saveDraft hanteert op de regels die we 'm
    // doorgeven (inclusief de korstmos-regel): subtotaal − korting × BTW.
    // Korting geldt nooit over reiskosten (eenheid 'km'). Zo lopen
    // leads.totaal_prijs en offertes.totaal_incl niet uit elkaar.
    // Eén unified resolutie voor beide korting-modi:
    //  - korting_bedrag > 0  ⇒ vast euro-bedrag, gecapt op de grondslag.
    //  - anders              ⇒ percentage over de grondslag.
    // De grondslag (base) = subtotaal − reiskosten (diensten + korstmos-
    // regel). We rekenen het vaste bedrag terug naar een effectief
    // percentage (effectivePct) zodat saveDraft én de PDF — die beide met
    // het percentage rekenen — exact hetzelfde euro-bedrag produceren.
    const subtotaal = regelsVoorDraft.reduce((s, r) => s + r.aantal * r.prijs, 0)
    const reiskosten = regelsVoorDraft
      .filter((r) => r.eenheid === 'km')
      .reduce((s, r) => s + r.aantal * r.prijs, 0)
    const base = Math.max(0, subtotaal - reiskosten)            // diensten + korstmos-regel
    const vast = Number(data.korting_bedrag) || 0
    const euroKorting = vast > 0
      ? Math.min(vast, base)
      : base * (Math.max(0, Math.min(100, Number(data.korting_percentage) || 0)) / 100)
    const effectivePct = base > 0 ? Math.min(100, (euroKorting / base) * 100) : 0
    const totaalIncl = round2((subtotaal - euroKorting) * BTW_FACTOR)

    // ── 6. Lead-velden bijwerken ───────────────────────────────────
    // Schrijf het GERESOLVEERDE percentage (effectivePct) plus het vaste
    // bedrag (data.korting_bedrag, via buildLeadFieldsFromForm). De PDF
    // rekent met korting_percentage, dus die moet het effectieve pct zijn.
    const leadFields = {
      ...buildLeadFieldsFromForm(
        { ...data, korting_percentage: effectivePct },
        leadId,
        totaalIncl,
      ),
      offerte_geldigheid_dagen: Number(geldigheidDagen) || null,
    }
    const admin = getDashboardAdmin()
    const { error } = await admin
      .from('leads')
      .update(leadFields)
      .eq('lead_id', leadId)
    if (error) {
      return { ok: false, error: `Lead bijwerken mislukt: ${error.message}` }
    }

    // ── 7. Prijsregels → DraftRegelInput → saveDraft ───────────────
    const regels: DraftRegelInput[] = regelsVoorDraft.map((r, i) => ({
      bron: 'auto_lead',
      omschrijving: r.desc,
      aantal: r.aantal,
      eenheid: r.eenheid,
      stukprijs: r.prijs,
      volgorde: i + 1,
    }))

    return await saveDraft(leadId, {
      regels,
      // Effectief pct (vast bedrag teruggerekend), zodat saveDraft's eigen
      // totaal-berekening en de PDF exact euroKorting reproduceren.
      kortingPct: effectivePct,
      kortingOmschrijving: data.korting_omschrijving ?? '',
    })
  } catch (err) {
    // Auth-check gooit 'NEXT_REDIRECT' bij niet-ingelogde users, laat die
    // doorvallen zodat Next 'm correct als redirect afhandelt.
    if (err && typeof err === 'object' && 'digest' in err) {
      throw err
    }
    const msg = err instanceof Error ? err.message : 'onbekende fout'
    console.error('[saveOfferteForm] failed:', err)
    return { ok: false, error: msg }
  }
}
