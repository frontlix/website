import { getDashboardSupabase } from './supabase-server'

/**
 * Extra data-bronnen voor de Live Activity feed op de overzicht-pagina.
 *
 * 'new' (lead-aangemaakt) en 'appt' (afspraak) events worden in page.tsx
 * gebouwd uit de al-aanwezige `allLeads` en `upcomingAppts`. Voor 'wa'
 * (klant-berichten) hebben we een aparte query nodig — die zit hier.
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

export async function getRecentInboundMessages(): Promise<RecentMessage[]> {
  const supabase = await getDashboardSupabase()
  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 3600_000).toISOString()

  // Join naar leads voor de naam; alleen klant-berichten (richting='inkomend').
  const { data, error } = await supabase
    .from('berichten')
    .select('id, lead_id, timestamp, leads:lead_id(naam)')
    .eq('richting', 'inkomend')
    .gte('timestamp', since)
    .order('timestamp', { ascending: false })
    .limit(FETCH_LIMIT)

  if (error) {
    console.error('[getRecentInboundMessages] failed:', error)
    return []
  }

  type Row = {
    id: string
    lead_id: string
    timestamp: string | null
    leads: { naam: string | null } | { naam: string | null }[] | null
  }

  return ((data ?? []) as Row[])
    .map((r) => {
      // Supabase typegen levert de relation soms als array, soms als object.
      const leadObj = Array.isArray(r.leads) ? r.leads[0] : r.leads
      return {
        id: r.id,
        lead_id: r.lead_id,
        naam: leadObj?.naam ?? 'Onbekend',
        timestamp: r.timestamp ?? '',
      }
    })
    .filter((m) => m.timestamp !== '')
}
