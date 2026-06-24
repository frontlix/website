import { getDashboardSupabase } from './supabase-server'
import type { Bericht, Lead } from './database.types'

export type ConversationPreview = {
  leadId: string
  naam: string
  telefoon: string
  dashboardStatus: Lead['dashboard_status']
  gesprekFase: Lead['gesprek_fase']
  /** Pipeline-status van de lead (bv. "handoff"). */
  status: Lead['status']
  /** True als de bot de lead heeft overgedragen aan de eigenaar. */
  eigenaarOvergenomen: boolean
  totaalPrijs: number | null
  offerteVerstuurd: boolean
  /**
   * "Actie nodig", heuristiek: onderhandelen-fase (owner-review) of
   * een ongelezen klant-bericht na een offerte. Geen DB-veld.
   */
  needsAction: boolean
  /**
   * Tot wanneer is dit gesprek door de owner gelezen (NULL = nooit geopend).
   * Wordt door de inbox gebruikt om de "Ongelezen" filter te bepalen.
   */
  inboxGelezenOp: string | null
  laatsteBericht: {
    richting: string
    tekst: string | null
    type: string
    timestamp: string
  }
}

/**
 * Lijst van actieve gesprekken, leads met minstens één bericht, gesorteerd
 * op laatste bericht-timestamp DESC. Niet-gearchiveerde leads alleen.
 *
 * Implementatie: 2-staps query. Eerst de laatste N berichten (over alle
 * leads heen) ophalen, dan in JS dedupen per lead om alleen het meest-
 * recente bericht per lead te behouden. Daarna joinen met leads-tabel.
 *
 * Supabase JS heeft geen native joins met "latest per group"; deze aanpak
 * is goedkoop genoeg voor N <= 200 conversations (één SELECT op berichten +
 * één SELECT op leads).
 */
export async function getActiveConversations(limit = 50): Promise<ConversationPreview[]> {
  const supabase = await getDashboardSupabase()

  // Stap 1, laatste 500 berichten (genoeg voor ~100 actieve leads).
  const msgQuery = supabase
    .from('berichten')
    .select('lead_id, richting, bericht, type, timestamp')
    .order('timestamp', { ascending: false })
    .limit(500)
  const { data: msgs, error: msgErr } = await msgQuery
  if (msgErr) {
    console.error('[getActiveConversations] berichten failed:', msgErr)
    return []
  }
  type MsgRow = Pick<Bericht, 'lead_id' | 'richting' | 'bericht' | 'type' | 'timestamp'>
  const messages = (msgs as MsgRow[] | null) ?? []

  // Stap 2, group by lead_id (laatste eerst, dus eerste hit per lead = laatste bericht)
  const latestPerLead = new Map<string, MsgRow>()
  for (const m of messages) {
    if (!latestPerLead.has(m.lead_id)) {
      latestPerLead.set(m.lead_id, m)
    }
  }

  const leadIds = [...latestPerLead.keys()].slice(0, limit)
  if (leadIds.length === 0) return []

  // Stap 3, enrich met lead-info (alleen niet-gearchiveerd)
  const leadQuery = supabase
    .from('leads')
    .select('lead_id, naam, telefoon, dashboard_status, dashboard_archived, gesprek_fase, status, eigenaar_overgenomen, totaal_prijs, offerte_verstuurd, inbox_gelezen_op')
    .in('lead_id', leadIds)
    .eq('dashboard_archived', false)
  const { data: leads, error: leadErr } = await leadQuery
  if (leadErr) {
    console.error('[getActiveConversations] leads failed:', leadErr)
    return []
  }
  type LeadRow = Pick<
    Lead,
    | 'lead_id'
    | 'naam'
    | 'telefoon'
    | 'dashboard_status'
    | 'gesprek_fase'
    | 'status'
    | 'eigenaar_overgenomen'
    | 'totaal_prijs'
    | 'offerte_verstuurd'
  > & { inbox_gelezen_op: string | null }
  const leadList = (leads as LeadRow[] | null) ?? []

  // Stap 4, combine + sort op laatste timestamp DESC
  const out: ConversationPreview[] = []
  for (const lead of leadList) {
    const latest = latestPerLead.get(lead.lead_id)
    if (!latest) continue
    // Heuristiek voor "actie nodig":
    //  - gesprek zit in onderhandeling (vraagt owner-review), of
    //  - laatste bericht was van de klant terwijl er al een offerte uit is.
    const inkomendNaOfferte =
      latest.richting === 'inkomend' && Boolean(lead.offerte_verstuurd)
    const needsAction = lead.gesprek_fase === 'onderhandelen' || inkomendNaOfferte

    out.push({
      leadId: lead.lead_id,
      naam: lead.naam,
      telefoon: lead.telefoon,
      dashboardStatus: lead.dashboard_status,
      gesprekFase: lead.gesprek_fase,
      status: lead.status,
      eigenaarOvergenomen: Boolean(lead.eigenaar_overgenomen),
      totaalPrijs: lead.totaal_prijs,
      offerteVerstuurd: Boolean(lead.offerte_verstuurd),
      needsAction,
      inboxGelezenOp: lead.inbox_gelezen_op,
      laatsteBericht: {
        richting: latest.richting,
        tekst: latest.bericht,
        type: latest.type ?? 'tekst',
        timestamp: latest.timestamp ?? '',
      },
    })
  }

  out.sort((a, b) =>
    b.laatsteBericht.timestamp.localeCompare(a.laatsteBericht.timestamp),
  )
  return out
}

/**
 * Haalt alle berichten van één lead op (ASC voor chronologische thread-volgorde).
 * Wordt gebruikt door de Inbox-detail pane wanneer een gesprek geselecteerd is.
 */
export async function getMessagesForLead(leadId: string): Promise<Bericht[]> {
  const supabase = await getDashboardSupabase()
  const query = supabase
    .from('berichten')
    .select('*')
    .eq('lead_id', leadId)
    .order('timestamp', { ascending: true })
  const { data, error } = await query
  if (error) {
    console.error('[getMessagesForLead] failed:', error)
    return []
  }
  return (data as Bericht[] | null) ?? []
}

export type InboxLeadContext = Pick<
  Lead,
  | 'lead_id'
  | 'naam'
  | 'telefoon'
  | 'email'
  | 'postcode'
  | 'plaats'
  | 'straat'
  | 'huisnummer'
  | 'hoofdcategorie'
  | 'sub_diensten'
  | 'm2'
  | 'totaal_prijs'
  | 'offerte_verstuurd'
  | 'offerte_verstuurd_op'
  | 'dashboard_status'
  | 'gesprek_fase'
  | 'status'
  | 'eigenaar_overgenomen'
  | 'aangemaakt'
> & {
  fotosCount: number
  botGepauzeerd: boolean
}

/**
 * Lichte lead-info voor de rechter context-pane in Inbox. Doet er een
 * tweede query bij om het aantal foto's te tellen, zo kan de pane
 * "4 stuks" tonen zonder de hele foto-lijst te laden.
 */
export async function getInboxLeadContext(leadId: string): Promise<InboxLeadContext | null> {
  const supabase = await getDashboardSupabase()
  const leadQuery = supabase
    .from('leads')
    .select(
      'lead_id, naam, telefoon, email, postcode, plaats, straat, huisnummer, hoofdcategorie, sub_diensten, m2, totaal_prijs, offerte_verstuurd, offerte_verstuurd_op, dashboard_status, gesprek_fase, status, eigenaar_overgenomen, aangemaakt, bot_gepauzeerd',
    )
    .eq('lead_id', leadId)
    .maybeSingle()
  const fotosQuery = supabase
    .from('fotos')
    .select('id', { count: 'exact', head: true })
    .eq('lead_id', leadId)

  const [{ data: leadData, error: leadErr }, { count: fotosCount }] = await Promise.all([
    leadQuery,
    fotosQuery,
  ])
  if (leadErr) {
    console.error('[getInboxLeadContext] failed:', leadErr)
    return null
  }
  if (!leadData) return null
  const raw = leadData as Omit<InboxLeadContext, 'fotosCount' | 'botGepauzeerd'> & {
    bot_gepauzeerd?: boolean | null
  }
  return {
    ...raw,
    fotosCount: fotosCount ?? 0,
    botGepauzeerd: Boolean(raw.bot_gepauzeerd),
  }
}
