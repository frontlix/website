import webpush from 'web-push'
import { getDashboardAdmin } from '../supabase-admin'

/**
 * Push-sender — verstuurt een notification-payload naar alle subscriptions
 * van een user. Dead subscriptions (HTTP 410 Gone of 404) worden uit de DB
 * verwijderd zodat we ze niet blijven proberen.
 *
 * VAPID-keys komen uit env-vars; geen lazy hot-config-reload nodig — de
 * keys veranderen niet over de levensduur van het proces.
 */

let _configured = false

function configureVapid(): void {
  if (_configured) return
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT
  if (!publicKey || !privateKey || !subject) {
    throw new Error('VAPID env-vars ontbreken (NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT)')
  }
  webpush.setVapidDetails(subject, publicKey, privateKey)
  _configured = true
}

export interface PushPayload {
  titel: string
  body: string
  url?: string
  eventType?: string
}

export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<{ sent: number; pruned: number }> {
  configureVapid()
  const admin = getDashboardAdmin()

  // Alle subscriptions voor deze user ophalen.
  const { data: subs, error } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId)

  if (error) {
    console.error('[push] subs lookup failed:', error)
    return { sent: 0, pruned: 0 }
  }

  type SubRow = { id: string; endpoint: string; p256dh: string; auth: string }
  const rows = (subs as SubRow[] | null) ?? []
  if (rows.length === 0) return { sent: 0, pruned: 0 }

  const body = JSON.stringify(payload)
  let sent = 0
  const deadIds: string[] = []

  // Parallel versturen — web-push zelf is async fetch onder de motorkap.
  await Promise.all(
    rows.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body,
          { TTL: 60 * 60 * 24 }, // 24u — daarna laat browser 'm vallen
        )
        sent += 1
      } catch (err: unknown) {
        // 410 Gone of 404 = subscription is dood, browser heeft 'm ingetrokken.
        // Andere errors logken we maar pruner doen we niet (transient issues).
        const statusCode = (err as { statusCode?: number })?.statusCode
        if (statusCode === 410 || statusCode === 404) {
          deadIds.push(sub.id)
        } else {
          console.error('[push] send failed for', sub.endpoint, err)
        }
      }
    }),
  )

  // Dode subscriptions opruimen.
  if (deadIds.length > 0) {
    await admin.from('push_subscriptions').delete().in('id', deadIds)
  }

  // Laatst-gebruikt timestamp voor de overlevenden (best-effort).
  if (sent > 0) {
    const aliveIds = rows.filter((r) => !deadIds.includes(r.id)).map((r) => r.id)
    if (aliveIds.length > 0) {
      await admin
        .from('push_subscriptions')
        .update({ laatst_gebruikt_op: new Date().toISOString() })
        .in('id', aliveIds)
    }
  }

  return { sent, pruned: deadIds.length }
}
