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
import { computeRules, berekenKorstmosToeslag } from './manual-offerte-rules'
import { getManualOffertePricing } from './pricing-queries'
import { saveDraft, type DraftRegelInput } from './offerte-draft-actions'
import { buildLeadFieldsFromForm, mapLeadToFormData } from './offerte-form-mapping'
import type { ManualOfferteData } from './manual-offerte-types'
import type { Lead } from './database.types'

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
    // 10% ALLEEN over de reiniging/onkruid/onderhoud-regels — via de gedeelde
    // helper berekenKorstmosToeslag(), exact dezelfde grondslag als computeTotals
    // én de bot. (Stond eerder op ALLE diensten-regels, waardoor leads.totaal_prijs
    // bij een korstmos-klus met extra diensten te hoog werd t.o.v. de klantprijs.)
    // We voegen 'm als prijsregel toe zodat saveDraft 'm in z'n eigen totaal meeneemt.
    const regelsVoorDraft = [...rules]
    const korstmosToeslag = berekenKorstmosToeslag(rules, data)
    if (korstmosToeslag > 0) {
      regelsVoorDraft.push({
        desc: 'Korstmos-toeslag (10%)',
        aantal: 1,
        eenheid: 'post',
        prijs: korstmosToeslag,
        totaal: korstmosToeslag,
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

/**
 * Bevriest de volledige editor-invoer (ManualOfferteData) in de snapshot van de
 * zojuist VERSTUURDE offerte.
 *
 * Het dossier-verstuurpad ("Offerte versturen" / "Goedkeuren") laat de externe
 * bot de offerte-rij + `regels_snapshot` schrijven; die bot-snapshot bevat
 * (nog) géén `data`-veld. Zonder dat veld kan "Terug naar verstuurde versie"
 * alleen de prijsregels terugzetten, niet de werk-invoer (m2, afstand,
 * diensten, korting). Deze action vult dat aan.
 *
 * Best-effort, idempotent: leest de lead (die op dit moment exact de verstuurde
 * invoer bevat — de editor heeft 'm net geflusht vóór approve-quote),
 * reconstrueert de invoer via mapLeadToFormData en merge't 'm in de bestaande
 * snapshot van de laatste verstuurde offerte. Doet niets (geen fout) als er nog
 * geen verstuurde versie is. AANROEPEN ná een geslaagde approve-quote.
 */
export async function freezeVerstuurdeOfferteData(leadId: string): Promise<Result> {
  try {
    await requireApprovedUser()
    if (!leadId) return { ok: false, error: 'leadId ontbreekt.' }

    const admin = getDashboardAdmin()

    // ── 1. Lead lezen → editor-invoer reconstrueren ────────────────
    const { data: lead, error: leadErr } = await admin
      .from('leads')
      .select('*')
      .eq('lead_id', leadId)
      .maybeSingle()
    if (leadErr) return { ok: false, error: `Lead lezen mislukt: ${leadErr.message}` }
    if (!lead) return { ok: true } // niets te bevriezen

    const data = mapLeadToFormData(lead as unknown as Lead)

    // ── 2. Laatste verstuurde offerte ──────────────────────────────
    const { data: verstuurd, error: vErr } = await admin
      .from('offertes')
      .select('id, regels_snapshot')
      .eq('lead_id', leadId)
      .eq('is_concept', false)
      .order('versie', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (vErr) return { ok: false, error: `Verstuurde offerte zoeken mislukt: ${vErr.message}` }
    if (!verstuurd) return { ok: true } // nog geen verstuurde versie

    // ── 3. `data` in de bestaande snapshot mergen ──────────────────
    // De bot-snapshot (pricing + regels) blijft intact; we voegen alleen het
    // `data`-veld toe en bumpen schemaVersie. Als er nog geen snapshot is,
    // start met een leeg object (revert valt dan terug op het pricing/regels-
    // gat, maar de `data` is in elk geval bewaard).
    const bestaand =
      verstuurd.regels_snapshot &&
      typeof verstuurd.regels_snapshot === 'object' &&
      !Array.isArray(verstuurd.regels_snapshot)
        ? (verstuurd.regels_snapshot as Record<string, unknown>)
        : {}
    const merged = { ...bestaand, schemaVersie: 2, data }

    const { error: updErr } = await admin
      .from('offertes')
      .update({ regels_snapshot: merged })
      .eq('id', verstuurd.id)
    if (updErr) return { ok: false, error: `Snapshot aanvullen mislukt: ${updErr.message}` }

    return { ok: true }
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err) throw err
    const msg = err instanceof Error ? err.message : 'onbekende fout'
    console.error('[freezeVerstuurdeOfferteData] failed:', err)
    return { ok: false, error: msg }
  }
}
