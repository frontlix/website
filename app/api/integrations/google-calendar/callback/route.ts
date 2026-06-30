// app/api/integrations/google-calendar/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserProfile } from '@/lib/dashboard/auth'
import { exchangeCode, fetchGoogleEmail } from '@/lib/google-oauth'
import { encryptToken } from '@/lib/crypto/calendar-token'
import { saveConnection } from '@/lib/dashboard/calendar-connection-queries'

const SETTINGS_URL = '/instellingen?section=integraties'
// Terugkeer op basis van de dashboard-host, niet request.url: achter de nginx-
// proxy is request.url intern http://localhost:3000, wat de gebruiker na het
// koppelen op localhost zou doen belanden.
const SITE_BASE = process.env.NEXT_PUBLIC_SITE_URL_DASHBOARD || 'http://localhost:3000'

export async function GET(request: NextRequest) {
  const profile = await getCurrentUserProfile()
  if (!profile || profile.tenant_status !== 'approved' || !profile.is_owner) {
    return NextResponse.redirect(new URL(`${SETTINGS_URL}&gcal=forbidden`, SITE_BASE))
  }

  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const cookieState = request.cookies.get('gcal_oauth_state')?.value

  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.redirect(new URL(`${SETTINGS_URL}&gcal=state_error`, SITE_BASE))
  }

  try {
    const { refreshToken, accessToken } = await exchangeCode(code)
    const email = await fetchGoogleEmail(accessToken)
    // Tenant uit de OAuth state (gezet in /authorize, gevalideerd via de
    // httpOnly state-cookie hierboven).
    const tenantId = state.split('.')[1] ?? ''
    if (!tenantId) {
      return NextResponse.redirect(new URL(`${SETTINGS_URL}&gcal=state_error`, SITE_BASE))
    }
    await saveConnection({
      tenantId,
      googleEmail: email,
      calendarId: 'primary',
      refreshTokenEncrypted: encryptToken(refreshToken),
    })
    const res = NextResponse.redirect(new URL(`${SETTINGS_URL}&gcal=ok`, SITE_BASE))
    res.cookies.delete('gcal_oauth_state')
    return res
  } catch (e) {
    console.error('[gcal-callback]', e)
    return NextResponse.redirect(new URL(`${SETTINGS_URL}&gcal=error`, SITE_BASE))
  }
}
