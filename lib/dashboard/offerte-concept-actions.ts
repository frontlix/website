'use server'

import { revalidatePath } from 'next/cache'
import { getDashboardAdmin } from './supabase-admin'
import { requireApprovedUser } from './require-approved-user'
import type { ManualOfferteData } from './manual-offerte-types'

const MAX_CONCEPTEN = 30

export type Concept = {
  id: string
  data: ManualOfferteData
  v2State: unknown | null
  label: string
  totaal: number
  bijgewerktOp: number
}

type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string }

function isRedirect(err: unknown): boolean {
  return !!err && typeof err === 'object' && 'digest' in err
}

/** Alle concepten, nieuwste eerst. Gedeeld per account. */
export async function listConcepten(): Promise<Result<Concept[]>> {
  try {
    await requireApprovedUser()
    const admin = getDashboardAdmin()
    const { data, error } = await admin
      .from('offerte_concepten')
      .select('id, data, v2_state, label, totaal, bijgewerkt_op')
      .order('bijgewerkt_op', { ascending: false })
      .limit(MAX_CONCEPTEN)
    if (error) return { ok: false, error: error.message }
    const concepten: Concept[] = (data ?? []).map((r: Record<string, unknown>) => ({
      id: r.id as string,
      data: r.data as ManualOfferteData,
      v2State: (r.v2_state ?? null) as unknown,
      label: (r.label as string) ?? '',
      totaal: Number(r.totaal ?? 0),
      bijgewerktOp: new Date(r.bijgewerkt_op as string).getTime(),
    }))
    return { ok: true, data: concepten }
  } catch (err) {
    if (isRedirect(err)) throw err
    return { ok: false, error: err instanceof Error ? err.message : 'onbekende fout' }
  }
}

/** Insert of update op id; trimt daarna tot de 30 nieuwste. */
export async function upsertConcept(input: {
  id: string
  data: ManualOfferteData
  v2State: unknown | null
  label: string
  totaal: number
}): Promise<Result> {
  try {
    await requireApprovedUser()
    if (!input.id) return { ok: false, error: 'concept-id ontbreekt.' }
    const admin = getDashboardAdmin()

    const { error } = await admin.from('offerte_concepten').upsert(
      {
        id: input.id,
        data: input.data,
        v2_state: input.v2State ?? null,
        label: input.label,
        totaal: input.totaal,
        bijgewerkt_op: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )
    if (error) return { ok: false, error: error.message }

    // Opschoning: alles voorbij de 30 nieuwste verwijderen.
    const { data: overflow, error: selErr } = await admin
      .from('offerte_concepten')
      .select('id')
      .order('bijgewerkt_op', { ascending: false })
      .range(MAX_CONCEPTEN, MAX_CONCEPTEN + 1000)
    if (!selErr && overflow && overflow.length > 0) {
      const ids = (overflow as { id: string }[]).map((r) => r.id)
      await admin.from('offerte_concepten').delete().in('id', ids)
    }

    revalidatePath('/leads')
    return { ok: true }
  } catch (err) {
    if (isRedirect(err)) throw err
    return { ok: false, error: err instanceof Error ? err.message : 'onbekende fout' }
  }
}

/** Verwijder één concept (handmatig of na versturen). */
export async function removeConcept(id: string): Promise<Result> {
  try {
    await requireApprovedUser()
    if (!id) return { ok: false, error: 'concept-id ontbreekt.' }
    const admin = getDashboardAdmin()
    const { error } = await admin.from('offerte_concepten').delete().eq('id', id)
    if (error) return { ok: false, error: error.message }
    revalidatePath('/leads')
    return { ok: true }
  } catch (err) {
    if (isRedirect(err)) throw err
    return { ok: false, error: err instanceof Error ? err.message : 'onbekende fout' }
  }
}
