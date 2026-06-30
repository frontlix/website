// app/api/integrations/google-calendar/calendars/route.ts
import { NextResponse } from 'next/server'
import { getCurrentUserProfile } from '@/lib/dashboard/auth'
import { refreshAccessToken, listCalendars } from '@/lib/google-oauth'
import { decryptToken } from '@/lib/crypto/calendar-token'
import { getEncryptedRefreshToken } from '@/lib/dashboard/calendar-connection-queries'

export async function GET() {
  const profile = await getCurrentUserProfile()
  if (!profile || profile.tenant_status !== 'approved' || !profile.is_owner) {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 })
  }
  if (!profile.tenant_id) {
    return NextResponse.json({ error: 'Geen bedrijf gekoppeld' }, { status: 403 })
  }
  const tenantId = profile.tenant_id

  const encrypted = await getEncryptedRefreshToken(tenantId)
  if (!encrypted) {
    return NextResponse.json({ error: 'Geen agenda gekoppeld' }, { status: 404 })
  }

  try {
    const refreshToken = decryptToken(encrypted)
    const accessToken = await refreshAccessToken(refreshToken)
    const calendars = await listCalendars(accessToken)
    return NextResponse.json({ calendars })
  } catch (e) {
    console.error('[gcal-calendars]', e)
    return NextResponse.json({ error: 'Kalenders ophalen mislukt' }, { status: 502 })
  }
}
