import { getDashboardSupabase } from '../supabase-server'
import type {
  NotificationPreferenceRow,
  NotificationRow,
} from './types'

/**
 * Lees-queries voor het notificatie-systeem.
 * Schrijven via prefs-actions.ts (toggles) of notify.ts (events).
 */

/**
 * Haalt alle 32 tenant-preferences op, gesorteerd voor stabiele UI-render.
 * RLS filtert al op approved-user, dus geen extra check nodig.
 */
export async function getAllPrefs(): Promise<NotificationPreferenceRow[]> {
  const supabase = await getDashboardSupabase()
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .order('event_type')
    .order('kanaal')

  if (error) {
    console.error('[getAllPrefs] failed:', error)
    return []
  }
  return (data as NotificationPreferenceRow[] | null) ?? []
}

/** Aantal ongelezen notificaties voor de ingelogde user (de bel-badge). */
export async function getUnreadCount(): Promise<number> {
  const supabase = await getDashboardSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('gelezen_op', null)

  if (error) {
    console.error('[getUnreadCount] failed:', error)
    return 0
  }
  return count ?? 0
}

/**
 * Laatste N notificaties voor de ingelogde user (default 15).
 * Ongelezen eerst (NULL gelezen_op door index-sortering), dan op
 * aangemaakt_op desc.
 */
export async function getRecentNotifications(limit = 15): Promise<NotificationRow[]> {
  const supabase = await getDashboardSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('gelezen_op', { ascending: true, nullsFirst: true })
    .order('aangemaakt_op', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[getRecentNotifications] failed:', error)
    return []
  }
  return (data as NotificationRow[] | null) ?? []
}
