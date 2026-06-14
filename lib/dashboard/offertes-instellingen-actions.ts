'use server'

import { revalidatePath } from 'next/cache'
import { getDashboardAdmin } from './supabase-admin'
import { requireApprovedUser } from './require-approved-user'

/**
 * Slaat de bewerkbare Offertes-instellingen op tenant_settings op:
 *  - offerte_geldigheid_dagen (geldigheid)
 *  - offerte_btw_tarief (BTW-percentage)
 *  - offerte_betaaltermijn_dagen (betaaltermijn)
 *  - offerte_nummer_prefix (voorvoegsel voor het doorlopende offertenummer)
 *
 * Zowel het dashboard (PDF/mail) als de Surface-bot lezen deze velden bij het
 * opbouwen van een offerte. Auth + write-patroon: gelijk aan updateBedrijfsprofiel
 * (requireApprovedUser + service-role admin-write, omdat tenant_settings geen
 * UPDATE-policy heeft voor dashboard-users).
 */
export type SaveOffertesResult = { ok: true } | { ok: false; error: string }

export interface OffertesInstellingenInput {
  geldigheid: number
  /** BTW-percentage als string (komma toegestaan), bv "21" of "9". */
  btw: string
  /** Betaaltermijn in dagen als string. */
  betaaltermijn: string
  /** Offertenummer-voorvoegsel, bv "SS". */
  prefix: string
}

/** "21" / "21,5" → 21.5; ongeldig → null. */
function parseNum(raw: string): number | null {
  const cleaned = String(raw ?? '').trim().replace(',', '.')
  if (cleaned === '') return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

export async function saveOffertesInstellingen(
  input: OffertesInstellingenInput,
): Promise<SaveOffertesResult> {
  await requireApprovedUser()

  // ── Validatie ──────────────────────────────────────────────────────
  const geldigheid = Math.round(Number(input.geldigheid))
  if (!Number.isInteger(geldigheid) || geldigheid < 1 || geldigheid > 365) {
    return { ok: false, error: 'Geldigheid moet tussen 1 en 365 dagen zijn.' }
  }

  const btw = parseNum(input.btw)
  if (btw === null || btw < 0 || btw > 100) {
    return { ok: false, error: 'BTW-tarief moet tussen 0 en 100% zijn.' }
  }

  const betaaltermijn = parseNum(input.betaaltermijn)
  if (betaaltermijn === null || !Number.isInteger(betaaltermijn) || betaaltermijn < 1 || betaaltermijn > 365) {
    return { ok: false, error: 'Betaaltermijn moet een heel getal tussen 1 en 365 dagen zijn.' }
  }

  // Voorvoegsel: letters/cijfers/streepje, kort, hoofdletters. Leeg → fout
  // (anders zou het offertenummer geen herkenbaar voorvoegsel hebben).
  const prefix = String(input.prefix ?? '').trim().toUpperCase()
  if (prefix.length === 0) {
    return { ok: false, error: 'Voorvoegsel mag niet leeg zijn.' }
  }
  if (!/^[A-Z0-9-]{1,10}$/.test(prefix)) {
    return { ok: false, error: 'Voorvoegsel: max 10 tekens, alleen letters, cijfers en streepje.' }
  }

  // ── Wegschrijven (single-tenant: pak de enige rij) ─────────────────
  const admin = getDashboardAdmin()
  const { data: existing, error: fetchErr } = await admin
    .from('tenant_settings')
    .select('id')
    .limit(1)
    .maybeSingle()
  if (fetchErr || !existing) {
    return { ok: false, error: 'Geen tenant_settings rij gevonden om te updaten.' }
  }

  const { error: updErr } = await admin
    .from('tenant_settings')
    .update({
      offerte_geldigheid_dagen: geldigheid,
      offerte_btw_tarief: btw,
      offerte_betaaltermijn_dagen: betaaltermijn,
      offerte_nummer_prefix: prefix,
    })
    .eq('id', existing.id)

  if (updErr) {
    console.error('[saveOffertesInstellingen] failed:', updErr)
    return { ok: false, error: `Opslaan mislukt: ${updErr.message}` }
  }

  revalidatePath('/dashboard/instellingen')
  revalidatePath('/dashboard/v2/instellingen')
  return { ok: true }
}
