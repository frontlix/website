import { getDashboardSupabase } from './supabase-server'
import type { NotifItem } from '@/components/dashboard/NotificationPanel'
import {
  EVENT_KIND,
  type NotificationRow,
} from './notifications/types'

/**
 * Bel-feed in de topbar.
 *
 * V2 (huidig): leest uit de `notifications`-tabel die door notify() wordt
 * gevuld bij events. RLS filtert al op user_id = auth.uid().
 *
 * Mapped van NotificationRow naar NotifItem (UI-shape) hier zodat de
 * client component (NotificationPanel) typed blijft op haar bestaande
 * interface. Voorheen aggregeerden we hier rechtstreeks uit leads/berichten
 * (V1, fake notificaties), die logica is vervangen door echte event-driven
 * notificaties (fase 1).
 */
export async function getRecentNotifications(limit = 10): Promise<NotifItem[]> {
  const supabase = await getDashboardSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('notifications')
    .select('id, event_type, lead_id, titel, body, aangemaakt_op, gelezen_op')
    .eq('user_id', user.id)
    .order('gelezen_op', { ascending: true, nullsFirst: true })
    .order('aangemaakt_op', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[getRecentNotifications] failed:', error)
    return []
  }

  const rows = (data as Pick<
    NotificationRow,
    'id' | 'event_type' | 'lead_id' | 'titel' | 'body' | 'aangemaakt_op' | 'gelezen_op'
  >[] | null) ?? []

  return rows.map((r) => ({
    id: r.id,
    kind: EVENT_KIND[r.event_type],
    title: r.titel,
    sub: r.body,
    href: hrefForNotification(r),
    ts: r.aangemaakt_op,
    unread: r.gelezen_op === null,
  }))
}

/**
 * Bepaalt waar een notificatie heen linkt.
 * - dagelijkse_samenvatting → opent direct de dagrapport-drawer op het
 *   overzicht via de `?dagrapport=1` searchParam (i.p.v. enkel /dashboard).
 * - met lead-context → de lead-detailpagina.
 * - anders → het overzicht.
 */
function hrefForNotification(
  r: Pick<NotificationRow, 'event_type' | 'lead_id'>,
): string {
  if (r.event_type === 'dagelijkse_samenvatting') return '/dashboard?dagrapport=1'
  return r.lead_id ? `/dashboard/leads/${r.lead_id}` : '/dashboard'
}

/**
 * Aantal ongelezen notificaties voor de huidige user, voor de badge
 * in de bel-button. Aparte head-only count-query (geen rij-payload).
 */
export async function getUnreadNotificationCount(): Promise<number> {
  const supabase = await getDashboardSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('gelezen_op', null)

  if (error) {
    console.error('[getUnreadNotificationCount] failed:', error)
    return 0
  }
  return count ?? 0
}
