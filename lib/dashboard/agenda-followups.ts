import { getDashboardSupabase } from './supabase-server'

export type Followup = {
  lead_id: string
  naam: string
  reden: string
}

const STALE_OFFER_DAYS = 3

/**
 * Leads die op een eigenaar-besluit wachten (`pending_eigenaar_review` is set).
 */
export async function getOwnerFollowups(limit = 5): Promise<Followup[]> {
  const supabase = await getDashboardSupabase()
  const { data, error } = await supabase
    .from('leads')
    .select('lead_id, naam, pending_eigenaar_review')
    .not('pending_eigenaar_review', 'is', null)
    .eq('dashboard_archived', false)
    .order('bijgewerkt', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[getOwnerFollowups] failed:', error)
    return []
  }
  return (data ?? []).map((r) => ({
    lead_id: r.lead_id,
    naam: r.naam,
    reden: ownerReviewReason(r.pending_eigenaar_review),
  }))
}

/**
 * Leads met een offerte verstuurd > X dagen geleden zonder akkoord.
 */
export async function getStaleOfferteFollowups(
  limit = 5,
): Promise<Followup[]> {
  const supabase = await getDashboardSupabase()
  const cutoff = new Date(
    Date.now() - STALE_OFFER_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString()

  const { data, error } = await supabase
    .from('leads')
    .select('lead_id, naam, offerte_verstuurd_op')
    .eq('offerte_verstuurd', true)
    .is('akkoord_op', null)
    .eq('dashboard_archived', false)
    .lt('offerte_verstuurd_op', cutoff)
    .order('offerte_verstuurd_op', { ascending: true })
    .limit(limit)

  if (error) {
    console.error('[getStaleOfferteFollowups] failed:', error)
    return []
  }
  return (data ?? []).map((r) => ({
    lead_id: r.lead_id,
    naam: r.naam,
    reden: staleOfferteReden(r.offerte_verstuurd_op),
  }))
}

function ownerReviewReason(json: unknown): string {
  if (!json || typeof json !== 'object') {
    return 'Wacht op owner-besluit'
  }
  const obj = json as Record<string, unknown>
  if (typeof obj.reden === 'string' && obj.reden.trim().length > 0) {
    return obj.reden
  }
  if (typeof obj.type === 'string') {
    return `Wacht op owner-besluit · ${obj.type}`
  }
  return 'Wacht op owner-besluit'
}

function staleOfferteReden(verstuurdOp: string | null): string {
  if (!verstuurdOp) return 'Offerte open, herinnering automatisch verstuurd'
  const days = Math.floor(
    (Date.now() - new Date(verstuurdOp).getTime()) / (24 * 60 * 60 * 1000),
  )
  return `Offerte ${days} dagen oud, herinnering automatisch verstuurd`
}
