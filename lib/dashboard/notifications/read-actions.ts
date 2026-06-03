'use server'

import { revalidatePath } from 'next/cache'
import { getDashboardSupabase } from '../supabase-server'

/**
 * Server actions voor lees-status van notificaties.
 * UPDATE-policy op `notifications` staat alleen eigen rijen toe; daarom
 * gebruiken we de user-scoped client (geen service-role nodig).
 */

export type ReadActionResult =
  | { ok: true }
  | { ok: false; error: string }

/**
 * Markeer één notificatie als gelezen. Idempotent, als 'ie al gelezen
 * is doen we niets (geen overschrijven van eerdere gelezen_op timestamp).
 */
export async function markNotificationReadAction(
  notificationId: string,
): Promise<ReadActionResult> {
  const supabase = await getDashboardSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Niet ingelogd.' }

  const { error } = await supabase
    .from('notifications')
    .update({ gelezen_op: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('user_id', user.id)
    .is('gelezen_op', null)

  if (error) {
    console.error('[markNotificationReadAction] failed:', error)
    return { ok: false, error: 'Kon notificatie niet markeren.' }
  }

  // Geen revalidatePath, de bel update zichzelf optimistisch. Een
  // revalidate zou alle dashboard-routes flushen, dat is overkill.
  return { ok: true }
}

/**
 * Markeer alle ongelezen notificaties van de huidige user als gelezen.
 * Gebruikt door de "Alles gelezen"-knop in de bel-dropdown.
 */
export async function markAllReadAction(): Promise<ReadActionResult> {
  const supabase = await getDashboardSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Niet ingelogd.' }

  const { error } = await supabase
    .from('notifications')
    .update({ gelezen_op: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('gelezen_op', null)

  if (error) {
    console.error('[markAllReadAction] failed:', error)
    return { ok: false, error: 'Kon notificaties niet markeren.' }
  }

  revalidatePath('/dashboard')
  return { ok: true }
}
