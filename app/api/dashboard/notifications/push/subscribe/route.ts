import { NextRequest, NextResponse } from 'next/server'
import { getDashboardSupabase } from '@/lib/dashboard/supabase-server'
import { getDashboardAdmin } from '@/lib/dashboard/supabase-admin'

/**
 * Push-subscription registreren.
 *
 * Client roept dit aan na een succesvolle `pushManager.subscribe()`.
 * We upserten op endpoint (uniek) zodat opnieuw subscriben — bv. na
 * her-installatie van de PWA of cleared cache — niet faalt.
 */

interface SubscribeBody {
  subscription: {
    endpoint: string
    keys: { p256dh: string; auth: string }
  }
  userAgent?: string
}

export async function POST(req: NextRequest) {
  const supabase = await getDashboardSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

  let body: SubscribeBody
  try {
    body = (await req.json()) as SubscribeBody
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 })
  }
  const sub = body.subscription
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return NextResponse.json({ ok: false, error: 'missing fields' }, { status: 400 })
  }

  const admin = getDashboardAdmin()
  const { error } = await admin
    .from('push_subscriptions')
    .upsert(
      {
        user_id: user.id,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        user_agent: body.userAgent ?? null,
        aangemaakt_op: new Date().toISOString(),
      },
      { onConflict: 'endpoint' },
    )

  if (error) {
    console.error('[push/subscribe] upsert failed:', error)
    return NextResponse.json({ ok: false, error: 'save failed' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
