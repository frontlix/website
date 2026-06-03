'use server'

import { revalidatePath } from 'next/cache'
import { getDashboardSupabase } from '../supabase-server'
import { getDashboardAdmin } from '../supabase-admin'
import type {
  NotificationEventType,
  NotificationKanaal,
} from './types'

/**
 * Server actions voor de notification-toggles in /instellingen?section=notificaties.
 *
 * Write-paden gaan via service-role (RLS-policies staan UPDATE op
 * notification_preferences toe voor approved users, maar via service-role
 * is consistenter met de rest van het project + omzeilt timing-edge-cases
 * waarbij de UPDATE-policy niet matched op een nog-niet-bestaande rij).
 */

export type PrefActionResult =
  | { ok: true }
  | { ok: false; error: string }

/**
 * Eén toggle aan/uit zetten. Validates dat de user approved is voor
 * de mutatie wordt gedaan; service-role bypassed RLS dus dat moeten we
 * zelf checken.
 */
export async function togglePrefAction(
  eventType: NotificationEventType,
  kanaal: NotificationKanaal,
  enabled: boolean,
): Promise<PrefActionResult> {
  // 1) Auth-check via user-scoped client (respecteert RLS).
  const userSupabase = await getDashboardSupabase()
  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) return { ok: false, error: 'Niet ingelogd.' }

  const { data: profile } = await userSupabase
    .from('dashboard_user_profiles')
    .select('approved_op')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!profile?.approved_op) return { ok: false, error: 'Account nog niet goedgekeurd.' }

  // 2) Update via admin client, bypasst RLS, schrijft direct.
  // Upsert ipv update zodat een ontbrekende rij (zou niet moeten, maar veilig
  // is veilig) alsnog wordt aangemaakt i.p.v. silent-mislukt.
  const admin = getDashboardAdmin()
  const { error } = await admin
    .from('notification_preferences')
    .upsert(
      {
        event_type: eventType,
        kanaal,
        enabled,
        bijgewerkt_op: new Date().toISOString(),
        bijgewerkt_door: user.id,
      },
      { onConflict: 'event_type,kanaal' },
    )

  if (error) {
    console.error('[togglePrefAction] failed:', error)
    return { ok: false, error: 'Kon de instelling niet opslaan.' }
  }

  // Revalidate de settings-pagina zodat server-rendered prefs vers worden.
  revalidatePath('/dashboard/instellingen')
  return { ok: true }
}

/**
 * Stelt de daily-digest tijd in (HH:MM, Europe/Amsterdam). De cron-job
 * (later) leest deze waarde om te bepalen wanneer de samenvatting afgaat.
 */
export async function setDailyDigestTijdAction(
  tijd: string,
): Promise<PrefActionResult> {
  if (!/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(tijd)) {
    return { ok: false, error: 'Tijd-formaat moet HH:MM zijn (bv. 08:00).' }
  }

  const userSupabase = await getDashboardSupabase()
  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) return { ok: false, error: 'Niet ingelogd.' }

  const admin = getDashboardAdmin()
  // Single-tenant: één rij in tenant_settings, geen WHERE nodig.
  const { error } = await admin
    .from('tenant_settings')
    .update({ daily_digest_tijd: tijd, bijgewerkt_op: new Date().toISOString() })
    .gte('id', '00000000-0000-0000-0000-000000000000') // match alle rijen (= de enige)

  if (error) {
    console.error('[setDailyDigestTijdAction] failed:', error)
    return { ok: false, error: 'Kon de digest-tijd niet opslaan.' }
  }

  revalidatePath('/dashboard/instellingen')
  return { ok: true }
}
