import { NextRequest, NextResponse } from 'next/server'
import { getDashboardAdmin } from '@/lib/dashboard/supabase-admin'
import {
  buildNotificationMail,
} from '@/lib/dashboard/notifications/mail-templates'
import { sendNotificationMail } from '@/lib/dashboard/notifications/mail-sender'
import type { NotificationEventType, NotificationKanaal } from '@/lib/dashboard/notifications/types'

/**
 * Delivery endpoint voor notification-bezorging via niet-in-app kanalen.
 *
 * Wordt aangeroepen door de DB-trigger `notification_dispatch_trigger`
 * (zie migratie 035) zodra een nieuwe notification-rij wordt ingevoegd.
 * Eén call per (notificationId, kanaal) zodat we per kanaal kunnen retryen
 * zonder andere bezorging te verstoren.
 *
 * Auth: shared secret via Authorization-header. Voorkomt dat iedereen
 * willekeurig kan POST'en — alleen onze eigen DB-trigger kent het secret.
 *
 * Fase 2: alleen `email` kanaal-implementatie. Push (3) en WhatsApp (4)
 * komen in latere fases — placeholders zijn aanwezig zodat we de DB-trigger
 * niet hoeven aan te passen.
 */

const SECRET_HEADER = 'x-notification-secret'

interface DeliverPayload {
  notificationId: string
  kanaal: NotificationKanaal
}

export async function POST(req: NextRequest) {
  // 1) Shared-secret check
  const provided = req.headers.get(SECRET_HEADER)
  const expected = process.env.NOTIFICATION_WEBHOOK_SECRET
  if (!expected) {
    console.error('[deliver] NOTIFICATION_WEBHOOK_SECRET niet gezet')
    return NextResponse.json({ ok: false, error: 'server misconfigured' }, { status: 500 })
  }
  if (provided !== expected) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  // 2) Parse payload
  let body: DeliverPayload
  try {
    body = (await req.json()) as DeliverPayload
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 })
  }
  if (!body.notificationId || !body.kanaal) {
    return NextResponse.json({ ok: false, error: 'missing fields' }, { status: 400 })
  }

  // 3) Notification-rij ophalen
  const admin = getDashboardAdmin()
  const { data: notif, error: notifErr } = await admin
    .from('notifications')
    .select('id, user_id, event_type, lead_id, titel, body, payload')
    .eq('id', body.notificationId)
    .maybeSingle()
  if (notifErr || !notif) {
    return NextResponse.json({ ok: false, error: 'notification not found' }, { status: 404 })
  }

  // 4) Per kanaal afhandelen
  try {
    switch (body.kanaal) {
      case 'email':
        await deliverEmail(notif as NotificationRowSlice)
        break
      case 'push':
      case 'whatsapp':
        // Placeholders — implementatie volgt in fase 3 / 4. We faalden
        // hier niet (200) zodat de trigger niet hoeft te retryen.
        return NextResponse.json({ ok: true, skipped: true, reason: 'kanaal nog niet live' })
      case 'in_app':
        // In-app gaat al via DB-insert (geen extra delivery nodig).
        return NextResponse.json({ ok: true, skipped: true, reason: 'in_app via db' })
      default:
        return NextResponse.json({ ok: false, error: 'unknown kanaal' }, { status: 400 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[deliver] sending failed:', err)
    return NextResponse.json({ ok: false, error: 'send failed' }, { status: 500 })
  }
}

interface NotificationRowSlice {
  id: string
  user_id: string
  event_type: NotificationEventType
  lead_id: string | null
  titel: string
  body: string
  payload: Record<string, unknown> | null
}

async function deliverEmail(notif: NotificationRowSlice): Promise<void> {
  const admin = getDashboardAdmin()

  // E-mail van de ontvanger ophalen uit auth.users via service-role.
  const { data: userRes, error: userErr } = await admin.auth.admin.getUserById(notif.user_id)
  if (userErr || !userRes?.user?.email) {
    throw new Error(`Geen email voor user ${notif.user_id}: ${userErr?.message}`)
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.frontlix.com'
  const dashboardUrl = notif.lead_id
    ? `${siteUrl}/dashboard/leads/${notif.lead_id}`
    : `${siteUrl}/dashboard`

  const mail = buildNotificationMail({
    eventType: notif.event_type,
    titel: notif.titel,
    body: notif.body,
    dashboardUrl,
    payload: notif.payload ?? undefined,
  })

  await sendNotificationMail(userRes.user.email, mail)
}
