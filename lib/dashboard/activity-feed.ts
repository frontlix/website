import { getDashboardSupabase } from './supabase-server'

/**
 * Extra data-bronnen voor de Live Activity feed op de overzicht-pagina.
 *
 * 'new' (lead-aangemaakt) en 'appt' (afspraak) events worden in page.tsx
 * gebouwd uit de al-aanwezige `allLeads` en `upcomingAppts`. Voor 'wa'
 * (klant-berichten) hebben we een aparte query nodig, die zit hier.
 *
 * 'quote' events (leads in 'onderhandelen' fase = wacht op owner-review)
 * worden ook uit `allLeads` afgeleid; geen extra query nodig.
 */

export type RecentMessage = {
  id: string
  lead_id: string
  naam: string
  timestamp: string
}

const LOOKBACK_DAYS = 7
const FETCH_LIMIT = 20

/**
 * Implementatie: 2-staps query (zelfde pattern als `inbox-queries.ts`):
 *  1. Laatste N inkomende berichten ophalen
 *  2. Lead-namen voor die lead_ids erbij ophalen
 *  3. Samenstellen
 *
 * Reden voor 2 stappen i.p.v. een PostgREST relation-join: nergens anders
 * in deze codebase wordt zo'n join op `berichten` gedaan, dus we vertrouwen
 * niet op de relation-resolution om verrassingen te voorkomen.
 */
export async function getRecentInboundMessages(): Promise<RecentMessage[]> {
  const supabase = await getDashboardSupabase()
  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 3600_000).toISOString()

  const { data: msgs, error: msgErr } = await supabase
    .from('berichten')
    .select('id, lead_id, timestamp')
    .eq('richting', 'inkomend')
    .gte('timestamp', since)
    .order('timestamp', { ascending: false })
    .limit(FETCH_LIMIT)

  if (msgErr) {
    console.error('[getRecentInboundMessages] berichten failed:', msgErr)
    return []
  }

  type Msg = { id: string; lead_id: string; timestamp: string | null }
  const messages = (msgs as Msg[] | null) ?? []
  if (messages.length === 0) return []

  const leadIds = Array.from(new Set(messages.map((m) => m.lead_id)))
  const { data: leadsData, error: leadErr } = await supabase
    .from('leads')
    .select('lead_id, naam')
    .in('lead_id', leadIds)

  if (leadErr) {
    console.error('[getRecentInboundMessages] leads failed:', leadErr)
    return []
  }

  type LeadRow = { lead_id: string; naam: string | null }
  const naamByLead = new Map<string, string>()
  for (const l of (leadsData as LeadRow[] | null) ?? []) {
    naamByLead.set(l.lead_id, l.naam ?? 'Onbekend')
  }

  return messages
    .filter((m) => m.timestamp !== null)
    .map((m) => ({
      id: m.id,
      lead_id: m.lead_id,
      naam: naamByLead.get(m.lead_id) ?? 'Onbekend',
      timestamp: m.timestamp as string,
    }))
}
