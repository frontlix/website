'use server'

/**
 * Offerte draft server-actions (Fase 2a van de Offerte-tab redesign).
 *
 * Twee server-actions:
 *  - saveDraft(leadId, payload)     → debounced auto-save vanuit LeadOfferte
 *  - revertConcept(leadId)          → "Terug naar verzonden versie"
 *
 * Concept-model:
 *  - Per lead bestaat er MAXIMAAL ÉÉN concept-rij (`offertes.is_concept=true`).
 *  - Verstuurde versies zijn immutable; bij een edit op een verstuurde versie
 *    maken we automatisch een concept-kopie met versie = max(versie)+1.
 *  - Prijsregels hangen aan de LEAD (geen offerte_id-kolom), dus de "draft"
 *    REPLACE't telkens de hele set. Snapshot van verzonden regels staat
 *    bewaard in `offertes.regels_snapshot` (jsonb).
 *
 * BTW: hardcoded 21% (zie ook `btw-calc.ts`). Wijziging vereist bewuste
 * codeaanpassing — geen runtime-config.
 *
 * Auth: alle actions vereisen een ingelogde, approved dashboard-user.
 * Schrijven gebeurt via service-role (admin-client) omdat de tabellen
 * leads/offertes/prijsregels geen INSERT/UPDATE policies hebben voor
 * dashboard-users (alleen SELECT). Zie ook manual-offerte-actions.ts.
 */

import { revalidatePath } from 'next/cache'
import { getDashboardAdmin } from './supabase-admin'
import { requireApprovedUser } from './require-approved-user'

const BTW_FACTOR = 1.21

/** Input voor één regel in de draft-payload. */
export type DraftRegelInput = {
  /** Optioneel — wordt niet gebruikt voor INSERT (we REPLACE alle regels). */
  id?: string
  bron: 'auto_lead' | 'manual'
  omschrijving: string
  aantal: number | null
  eenheid: string | null
  /** Stukprijs EXCL BTW. */
  stukprijs: number
  /** Optionele volgorde-hint; anders wordt 'm bepaald door array-index. */
  volgorde?: number
}

/** Volledige draft-payload zoals LeadOfferte 'm bij elke auto-save stuurt. */
export type DraftSavePayload = {
  regels: DraftRegelInput[]
  kortingPct: number
  kortingOmschrijving: string
}

/** Universele result-shape: success of error-string. */
type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string }

/**
 * Format van de regels-snapshot die we in offertes.regels_snapshot schrijven
 * bij het versturen (Fase 2.5) én lezen bij revertConcept hieronder.
 *
 * Bewust GEEN id of uid — dit is een momentopname, geen referentie.
 */
type RegelsSnapshot = Array<{
  omschrijving: string
  aantal: number | null
  eenheid: string | null
  stukprijs: number
  totaal: number
  bron: 'auto_lead' | 'manual'
  volgorde: number
}>

/** Bereken totaal-incl-BTW uit een lijst regels + kortingspercentage. */
function computeTotaalIncl(
  regels: DraftRegelInput[],
  kortingPct: number,
): number {
  // Subtotaal EXCL — som van (aantal * stukprijs), waarbij null-aantal → 1
  // (consistent met OfferteRegelsTable die ook met 0/null werkt; we vangen
  // hier null op als 0 zodat de berekening niet exploded).
  const subtotaal = regels.reduce((acc, r) => {
    const aantal = r.aantal ?? 0
    return acc + aantal * (r.stukprijs ?? 0)
  }, 0)
  // Korting clampen [0, 100]: bewust defensief — UI hoort 'm te clampen,
  // maar we vertrouwen geen client-input.
  const pct = Math.max(0, Math.min(100, kortingPct))
  const naKorting = subtotaal * (1 - pct / 100)
  return Math.round(naKorting * BTW_FACTOR * 100) / 100
}

/** Bereken regel-totaal (excl BTW). null-aantal → 0. */
function computeRegelTotaal(regel: DraftRegelInput): number {
  const aantal = regel.aantal ?? 0
  const totaal = aantal * (regel.stukprijs ?? 0)
  return Math.round(totaal * 100) / 100
}

/**
 * Slaat een draft op:
 *  1. Auth-check (requireApprovedUser)
 *  2. Zoek concept-rij; maak aan als 'ie nog niet bestaat.
 *     - Heeft de lead al verzonden versies? Dan concept.versie = max+1.
 *     - Geen verzonden versies? Dan concept.versie = 1.
 *  3. REPLACE alle prijsregels van deze lead met de payload-regels.
 *  4. Update lead.korting_percentage + lead.korting_omschrijving.
 *  5. Update offertes.totaal_incl + offertes.korting_pct op de concept-rij.
 *  6. revalidatePath voor lead-detail (& leads-overzicht).
 *
 * Alle DB-writes via admin-client; auth-check zit ervoor.
 */
export async function saveDraft(
  leadId: string,
  payload: DraftSavePayload,
): Promise<Result> {
  try {
    // ── 1. Auth ────────────────────────────────────────────────────
    await requireApprovedUser()

    if (!leadId) return { ok: false, error: 'leadId ontbreekt.' }

    const admin = getDashboardAdmin()

    // ── 2. Concept-rij ophalen of aanmaken ─────────────────────────
    const { data: bestaandConcept, error: conceptErr } = await admin
      .from('offertes')
      .select('id, versie')
      .eq('lead_id', leadId)
      .eq('is_concept', true)
      .maybeSingle()

    if (conceptErr) {
      return { ok: false, error: `Concept opzoeken mislukt: ${conceptErr.message}` }
    }

    const totaalIncl = computeTotaalIncl(payload.regels, payload.kortingPct)
    const kortingPctClamped = Math.max(0, Math.min(100, payload.kortingPct))

    let conceptId: string
    if (bestaandConcept) {
      // Update bestaande concept-rij met nieuwe totalen + korting.
      conceptId = bestaandConcept.id as string
      const { error: updErr } = await admin
        .from('offertes')
        .update({
          totaal_incl: totaalIncl,
          korting_pct: kortingPctClamped,
        })
        .eq('id', conceptId)
      if (updErr) {
        return { ok: false, error: `Concept bijwerken mislukt: ${updErr.message}` }
      }
    } else {
      // Geen concept aanwezig → maak er een.
      // Volgnummer: max(versie) van alle bestaande rijen voor deze lead + 1,
      // óf 1 als er nog geen offerte-rij is.
      const { data: lastOff } = await admin
        .from('offertes')
        .select('versie')
        .eq('lead_id', leadId)
        .order('versie', { ascending: false })
        .limit(1)
        .maybeSingle()

      const nextVersie =
        ((lastOff?.versie as number | undefined) ?? 0) + 1 || 1

      const { data: insRow, error: insErr } = await admin
        .from('offertes')
        .insert({
          lead_id: leadId,
          versie: nextVersie,
          is_concept: true,
          totaal_incl: totaalIncl,
          korting_pct: kortingPctClamped,
          pdf_path: '', // concept heeft (nog) geen PDF
          pdf_url: '',
        })
        .select('id')
        .single()

      if (insErr || !insRow) {
        return {
          ok: false,
          error: `Concept aanmaken mislukt: ${insErr?.message ?? 'onbekend'}`,
        }
      }
      conceptId = insRow.id as string
    }

    // ── 3. REPLACE alle prijsregels van deze lead ──────────────────
    // Prijsregels hangen aan de lead (geen offerte_id-kolom), dus we
    // wissen ALLE regels en zetten de payload-set ervoor in de plaats.
    // De verzonden versie heeft z'n eigen regels-snapshot in JSON.
    const { error: delErr } = await admin
      .from('prijsregels')
      .delete()
      .eq('lead_id', leadId)
    if (delErr) {
      return { ok: false, error: `Oude regels verwijderen mislukt: ${delErr.message}` }
    }

    if (payload.regels.length > 0) {
      const rows = payload.regels.map((r, idx) => ({
        lead_id: leadId,
        bron: r.bron,
        omschrijving: r.omschrijving,
        aantal: r.aantal,
        eenheid: r.eenheid,
        stukprijs: r.stukprijs,
        totaal: computeRegelTotaal(r),
        volgorde: r.volgorde ?? idx + 1,
      }))
      const { error: insRegelsErr } = await admin.from('prijsregels').insert(rows)
      if (insRegelsErr) {
        return {
          ok: false,
          error: `Regels opslaan mislukt: ${insRegelsErr.message}`,
        }
      }
    }

    // ── 4. Lead korting-velden bijwerken ───────────────────────────
    const { error: leadErr } = await admin
      .from('leads')
      .update({
        korting_percentage: kortingPctClamped,
        korting_omschrijving: payload.kortingOmschrijving.trim() || null,
      })
      .eq('lead_id', leadId)
    if (leadErr) {
      return { ok: false, error: `Lead bijwerken mislukt: ${leadErr.message}` }
    }

    // ── 5. Revalidate ──────────────────────────────────────────────
    revalidatePath(`/leads/${leadId}`)
    revalidatePath('/leads')

    return { ok: true }
  } catch (err) {
    // Auth-check gooit 'NEXT_REDIRECT' bij niet-ingelogde users — laat die
    // doorvallen zodat Next 'm correct als redirect afhandelt.
    if (err && typeof err === 'object' && 'digest' in err) {
      throw err
    }
    const msg = err instanceof Error ? err.message : 'onbekende fout'
    console.error('[saveDraft] failed:', err)
    return { ok: false, error: msg }
  }
}

/**
 * "Terug naar verzonden versie": verwijdert de concept-rij en zet de
 * prijsregels terug naar de snapshot van de laatste verzonden offerte.
 *
 *  1. Auth-check
 *  2. Concept-rij ophalen — geen concept? error.
 *  3. Laatste verzonden versie (is_concept=false) ophalen — geen? error.
 *  4. regels_snapshot uit de verzonden versie lezen.
 *  5. REPLACE prijsregels met snapshot-inhoud.
 *  6. Korting-velden op de lead terugzetten naar de waarden van de
 *     verzonden offerte (uit offertes.korting_pct).
 *  7. DELETE concept-rij.
 *  8. revalidatePath.
 */
export async function revertConcept(leadId: string): Promise<Result> {
  try {
    await requireApprovedUser()
    if (!leadId) return { ok: false, error: 'leadId ontbreekt.' }

    const admin = getDashboardAdmin()

    // ── 1. Concept ─────────────────────────────────────────────────
    const { data: concept, error: conceptErr } = await admin
      .from('offertes')
      .select('id')
      .eq('lead_id', leadId)
      .eq('is_concept', true)
      .maybeSingle()
    if (conceptErr) {
      return { ok: false, error: `Concept opzoeken mislukt: ${conceptErr.message}` }
    }
    if (!concept) {
      return { ok: false, error: 'Geen concept-versie om terug te draaien.' }
    }

    // ── 2. Laatste verzonden versie ────────────────────────────────
    const { data: verstuurd, error: vErr } = await admin
      .from('offertes')
      .select('id, versie, korting_pct, regels_snapshot')
      .eq('lead_id', leadId)
      .eq('is_concept', false)
      .order('versie', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (vErr) {
      return { ok: false, error: `Verzonden versie ophalen mislukt: ${vErr.message}` }
    }
    if (!verstuurd) {
      return { ok: false, error: 'Geen verzonden versie om naar terug te keren.' }
    }

    // Snapshot kan null zijn voor oude verstuurde versies (van vóór deze
    // feature). In dat geval kunnen we niet veilig herstellen.
    const snapshotRaw = verstuurd.regels_snapshot as unknown
    if (!snapshotRaw || !Array.isArray(snapshotRaw)) {
      return {
        ok: false,
        error:
          'Verzonden versie heeft geen regels-snapshot — terugdraaien niet mogelijk.',
      }
    }
    const snapshot = snapshotRaw as RegelsSnapshot

    // ── 3. REPLACE prijsregels ─────────────────────────────────────
    const { error: delErr } = await admin
      .from('prijsregels')
      .delete()
      .eq('lead_id', leadId)
    if (delErr) {
      return { ok: false, error: `Oude regels verwijderen mislukt: ${delErr.message}` }
    }

    if (snapshot.length > 0) {
      const rows = snapshot.map((r, idx) => ({
        lead_id: leadId,
        bron: r.bron,
        omschrijving: r.omschrijving,
        aantal: r.aantal,
        eenheid: r.eenheid,
        stukprijs: r.stukprijs,
        totaal: r.totaal,
        volgorde: r.volgorde ?? idx + 1,
      }))
      const { error: insErr } = await admin.from('prijsregels').insert(rows)
      if (insErr) {
        return {
          ok: false,
          error: `Snapshot terugzetten mislukt: ${insErr.message}`,
        }
      }
    }

    // ── 4. Korting-velden op lead resetten naar verzonden waarde ──
    // De omschrijving zit niet in offertes.korting_pct — alleen pct.
    // We laten de omschrijving zoals 'ie nu op lead staat, want die wordt
    // ook tijdens "verstuur" naar de lead geschreven. Bij twijfel reset
    // alleen het percentage; omschrijving raken we niet aan.
    const verstuurdPct = Number(verstuurd.korting_pct ?? 0)
    const { error: leadErr } = await admin
      .from('leads')
      .update({ korting_percentage: verstuurdPct })
      .eq('lead_id', leadId)
    if (leadErr) {
      return { ok: false, error: `Lead bijwerken mislukt: ${leadErr.message}` }
    }

    // ── 5. Concept-rij verwijderen ─────────────────────────────────
    const { error: rmErr } = await admin
      .from('offertes')
      .delete()
      .eq('id', concept.id)
    if (rmErr) {
      return { ok: false, error: `Concept verwijderen mislukt: ${rmErr.message}` }
    }

    revalidatePath(`/leads/${leadId}`)
    revalidatePath('/leads')

    return { ok: true }
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err) {
      throw err
    }
    const msg = err instanceof Error ? err.message : 'onbekende fout'
    console.error('[revertConcept] failed:', err)
    return { ok: false, error: msg }
  }
}
