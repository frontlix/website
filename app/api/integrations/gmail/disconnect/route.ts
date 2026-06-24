// app/api/integrations/gmail/disconnect/route.ts
import { NextResponse } from 'next/server'
import { getCurrentUserProfile } from '@/lib/dashboard/auth'
import { getTenantId, deleteGmailConnection } from '@/lib/dashboard/gmail-connection-queries'

export async function POST() {
  const profile = await getCurrentUserProfile()
  if (!profile || profile.tenant_status !== 'approved' || !profile.is_owner) {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 })
  }

  const tenantId = await getTenantId()
  await deleteGmailConnection(tenantId)
  return NextResponse.json({ ok: true })
}
