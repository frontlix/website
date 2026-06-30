// app/api/integrations/whatsapp/disconnect/route.ts
//
// POST: verwijdert de WhatsApp-koppeling van de tenant. Daarna valt verzending
// automatisch terug op het Frontlix-env-nummer (sectie 7.3). Let op het
// bot-cache-window (tot 60s, sectie 8.1): een lopende bot kan tot een minuut na
// ontkoppelen nog vanaf het oude nummer versturen. Dit is bekend en acceptabel.
import { NextResponse } from 'next/server'
import { getCurrentUserProfile } from '@/lib/dashboard/auth'
import { deleteWhatsAppConnection } from '@/lib/dashboard/whatsapp-connection-queries'

export async function POST() {
  const profile = await getCurrentUserProfile()
  if (!profile || profile.tenant_status !== 'approved' || !profile.is_owner) {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 })
  }
  if (!profile.tenant_id) {
    return NextResponse.json({ error: 'Geen bedrijf gekoppeld' }, { status: 403 })
  }
  const tenantId = profile.tenant_id
  await deleteWhatsAppConnection(tenantId)
  return NextResponse.json({ connected: false })
}
