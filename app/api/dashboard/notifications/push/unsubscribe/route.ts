import { NextRequest, NextResponse } from 'next/server'
import { getDashboardSupabase } from '@/lib/dashboard/supabase-server'

/**
 * Push-subscription verwijderen.
 *
 * Client roept dit aan na een succesvolle `subscription.unsubscribe()`.
 * RLS-policy zorgt dat user alleen z'n eigen subscriptions kan deleten,
 * dus geen extra check nodig hier.
 */
export async function POST(req: NextRequest) {
  const supabase = await getDashboardSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

  let body: { endpoint?: string }
  try {
    body = (await req.json()) as { endpoint?: string }
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 })
  }
  if (!body.endpoint) {
    return NextResponse.json({ ok: false, error: 'missing endpoint' }, { status: 400 })
  }

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', body.endpoint)
    .eq('user_id', user.id)

  if (error) {
    console.error('[push/unsubscribe] delete failed:', error)
    return NextResponse.json({ ok: false, error: 'delete failed' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
