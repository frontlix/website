import { getDashboardAdmin } from '../supabase-admin'
import type {
  NotificationEventType,
  NotificationKanaal,
} from './types'

/**
 * Centrale notify-helper. Schrijft één notification-rij voor elke
 * approved dashboard-user, mits de tenant-pref voor (event_type, kanaal)
 * op `true` staat.
 *
 * Fase 1: alleen `in_app` kanaal. Fase 2/3/4 (e-mail/push/whatsapp) breiden
 * deze functie uit zónder de call-sites te wijzigen — de event-triggers in
 * de bot/dashboard code blijven gewoon `notify(...)` aanroepen.
 *
 * Gebruikt de service-role client omdat `notifications` geen INSERT-policy
 * heeft voor dashboard-credentials (anti-injection — alleen server mag
 * notificaties aanmaken).
 */
export interface NotifyArgs {
  eventType: NotificationEventType
  titel: string
  body: string
  /** Optionele lead-ref — bij klik op de notificatie navigeren we hierheen. */
  leadId?: string
  /** Vrije payload, beschikbaar in de UI voor extra context (bv. bedrag). */
  payload?: Record<string, unknown>
}

export async function notify(args: NotifyArgs): Promise<void> {
  const supabase = getDashboardAdmin()

  // 1) Welke kanalen staan aan voor dit event-type?
  const { data: prefRows, error: prefErr } = await supabase
    .from('notification_preferences')
    .select('kanaal, enabled')
    .eq('event_type', args.eventType)

  if (prefErr) {
    console.error('[notify] prefs lookup failed:', prefErr)
    return
  }

  const enabledKanalen = new Set<NotificationKanaal>(
    ((prefRows as { kanaal: NotificationKanaal; enabled: boolean }[] | null) ?? [])
      .filter((r) => r.enabled)
      .map((r) => r.kanaal),
  )

  // Geen enkel kanaal aan → niets te doen (geen storage, geen werk).
  if (enabledKanalen.size === 0) return

  // 2) Bezorg-laag — Fase 1: in-app via DB-feed.
  if (enabledKanalen.has('in_app')) {
    await deliverInApp(args)
  }

  // Fase 2/3/4 placeholders — uitcommentariëren tot die fase live is,
  // niet leeg laten staan zodat het nooit per ongeluk live gaat.
  // if (enabledKanalen.has('email'))    await deliverEmail(args)
  // if (enabledKanalen.has('push'))     await deliverPush(args)
  // if (enabledKanalen.has('whatsapp')) await deliverWhatsApp(args)
}

/**
 * Schrijft één rij in `notifications` per approved dashboard-user.
 * Single-tenant: "alle approved users" = "de hele tenant".
 */
async function deliverInApp(args: NotifyArgs): Promise<void> {
  const supabase = getDashboardAdmin()

  // Approved users ophalen — die krijgen de notificatie in hun bel-feed.
  const { data: profiles, error: profErr } = await supabase
    .from('dashboard_user_profiles')
    .select('user_id')
    .not('approved_op', 'is', null)

  if (profErr) {
    console.error('[notify] profiles lookup failed:', profErr)
    return
  }

  const userIds = ((profiles as { user_id: string }[] | null) ?? []).map((p) => p.user_id)
  if (userIds.length === 0) return

  const rows = userIds.map((user_id) => ({
    user_id,
    event_type: args.eventType,
    lead_id: args.leadId ?? null,
    titel: args.titel,
    body: args.body,
    payload: args.payload ?? {},
  }))

  const { error: insErr } = await supabase.from('notifications').insert(rows)
  if (insErr) {
    console.error('[notify] insert failed:', insErr)
  }
}
