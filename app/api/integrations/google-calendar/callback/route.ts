// app/api/integrations/google-calendar/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserProfile } from '@/lib/dashboard/auth'
import { exchangeCode, fetchGoogleEmail } from '@/lib/google-oauth'
import { encryptToken } from '@/lib/crypto/calendar-token'
import { getTenantId, saveConnection } from '@/lib/dashboard/calendar-connection-queries'

const SETTINGS_URL = '/instellingen?section=integraties'

export async function GET(request: NextRequest) {
  const profile = await getCurrentUserProfile()
  if (!profile || profile.tenant_status !== 'approved' || !profile.is_owner) {
    return NextResponse.redirect(new URL(`${SETTINGS_URL}&gcal=forbidden`, request.url))
  }

  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const cookieState = request.cookies.get('gcal_oauth_state')?.value

  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.redirect(new URL(`${SETTINGS_URL}&gcal=state_error`, request.url))
  }

  try {
    const { refreshToken, accessToken } = await exchangeCode(code)
    const email = await fetchGoogleEmail(accessToken)
    const tenantId = await getTenantId()
    await saveConnection({
      tenantId,
      googleEmail: email,
      calendarId: 'primary',
      refreshTokenEncrypted: encryptToken(refreshToken),
    })
    const res = NextResponse.redirect(new URL(`${SETTINGS_URL}&gcal=ok`, request.url))
    res.cookies.delete('gcal_oauth_state')
    return res
  } catch (e) {
    console.error('[gcal-callback]', e)
    return NextResponse.redirect(new URL(`${SETTINGS_URL}&gcal=error`, request.url))
  }
}
