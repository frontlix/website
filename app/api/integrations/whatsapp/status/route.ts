// app/api/integrations/whatsapp/status/route.ts
//
// GET: geeft de niet-geheime status van de WhatsApp-koppeling terug, inclusief
// needs_reconnect zodat de UI de rode banner kan tonen (sectie 6.2, 7.2). Geeft
// NOOIT het access-token terug. De UI haalt de status bij voorkeur server-side
// via een prop op; deze route is het secundaire pad voor herladen na een actie.
import { NextResponse } from 'next/server'
import { getCurrentUserProfile } from '@/lib/dashboard/auth'
import { getWhatsAppConnectionStatus } from '@/lib/dashboard/whatsapp-connection-queries'

export async function GET() {
  const profile = await getCurrentUserProfile()
  if (!profile || profile.tenant_status !== 'approved' || !profile.is_owner) {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 })
  }
  if (!profile.tenant_id) {
    return NextResponse.json({ error: 'Geen bedrijf gekoppeld' }, { status: 403 })
  }
  const tenantId = profile.tenant_id

  const status = await getWhatsAppConnectionStatus(tenantId)
  if (!status.connected) {
    return NextResponse.json({ connected: false })
  }

  return NextResponse.json({
    connected: true,
    display_phone_number: status.displayPhoneNumber ?? null,
    needs_reconnect: status.needsReconnect ?? false,
  })
}
