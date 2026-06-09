// app/api/integrations/google-calendar/disconnect/route.ts
import { NextResponse } from 'next/server'
import { getCurrentUserProfile } from '@/lib/dashboard/auth'
import { getTenantId, deleteConnection } from '@/lib/dashboard/calendar-connection-queries'

export async function POST() {
  const profile = await getCurrentUserProfile()
  if (!profile || profile.tenant_status !== 'approved' || !profile.is_owner) {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 })
  }
  const tenantId = await getTenantId()
  await deleteConnection(tenantId)
  return NextResponse.json({ ok: true })
}
