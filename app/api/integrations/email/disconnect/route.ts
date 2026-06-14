// app/api/integrations/email/disconnect/route.ts
//
// POST: verwijdert de e-mailkoppeling van de tenant. Daarna valt verzending
// automatisch terug op de gedeelde Frontlix-mailbox (sectie 6.3). Let op het
// bot-cache-window (tot 60s, sectie 9): een lopende bot kan tot een minuut na
// ontkoppelen nog vanaf het oude adres versturen. Dit is bekend en acceptabel.
import { NextResponse } from 'next/server'
import { getCurrentUserProfile } from '@/lib/dashboard/auth'
import { getTenantId, deleteEmailConnection } from '@/lib/dashboard/email-connection-queries'

export async function POST() {
  const profile = await getCurrentUserProfile()
  if (!profile || profile.tenant_status !== 'approved' || !profile.is_owner) {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 })
  }

  const tenantId = await getTenantId()
  await deleteEmailConnection(tenantId)
  return NextResponse.json({ connected: false })
}
