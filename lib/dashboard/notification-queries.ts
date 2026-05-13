import { getDashboardSupabase } from './supabase-server'
import type { NotifItem } from '@/components/dashboard/NotificationPanel'

/**
 * Aggregeert de laatste paar activity-events tot een notifications-feed.
 * Voor v1: pakken we recente leads + recente WhatsApp-berichten. Reviews
 * en agenda-events kunnen erbij zodra de tabellen gevuld zijn.
 */
export async function getRecentNotifications(limit = 10): Promise<NotifItem[]> {
  const supabase = await getDashboardSupabase()
  const since = new Date(Date.now() - 7 * 24 * 3600_000).toISOString()  // laatste 7 dagen

  const [leadsRes, msgsRes] = await Promise.all([
    supabase
      .from('leads')
      .select('lead_id, naam, aangemaakt, dashboard_status')
      .gte('aangemaakt', since)
      .order('aangemaakt', { ascending: false })
      .limit(limit),
    supabase
      .from('berichten')
      .select('id, lead_id, bericht, richting, timestamp')
      .eq('richting', 'in')   // alleen klant-berichten
      .gte('timestamp', since)
      .order('timestamp', { ascending: false })
      .limit(limit),
  ])

  const leads = (leadsRes.data ?? []) as Array<{
    lead_id: string
    naam: string
    aangemaakt: string
    dashboard_status: string | null
  }>
  const msgs = (msgsRes.data ?? []) as Array<{
    id: string
    lead_id: string
    bericht: string | null
    timestamp: string
  }>

  const items: NotifItem[] = [
    ...leads.map((l) => ({
      id: `lead-${l.lead_id}`,
      kind: 'lead' as const,
      title: `Nieuwe lead: ${l.naam}`,
      sub: 'Aanvraag binnen via Surface',
      href: `/leads/${l.lead_id}`,
      ts: l.aangemaakt,
      unread: l.dashboard_status === null || l.dashboard_status === 'open',
    })),
    ...msgs.map((m) => ({
      id: `wa-${m.id}`,
      kind: 'wa' as const,
      title: 'WhatsApp-bericht',
      sub: (m.bericht ?? '').slice(0, 60) || 'Bericht ontvangen',
      href: `/leads/${m.lead_id}`,
      ts: m.timestamp,
    })),
  ]

  items.sort((a, b) => b.ts.localeCompare(a.ts))
  return items.slice(0, limit)
}
