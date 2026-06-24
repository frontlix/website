// app/api/integrations/gmail/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserProfile } from '@/lib/dashboard/auth'
import { exchangeGmailCode, ensureLabel, ensureApprovalFilter } from '@/lib/gmail-oauth'
import { fetchGoogleEmail } from '@/lib/google-oauth'
import { encryptToken } from '@/lib/crypto/calendar-token'
import { getTenantId, saveGmailConnection } from '@/lib/dashboard/gmail-connection-queries'

const SETTINGS_URL = '/dashboard/v2/instellingen'
// Terugkeer-URL op basis van de dashboard-host, niet request.url: achter de
// nginx-proxy is request.url intern http://localhost:3000, wat de gebruiker
// na het koppelen op localhost zou doen belanden.
const SITE_BASE = process.env.NEXT_PUBLIC_SITE_URL_DASHBOARD || 'http://localhost:3000'

export async function GET(request: NextRequest) {
  const profile = await getCurrentUserProfile()
  if (!profile || profile.tenant_status !== 'approved' || !profile.is_owner) {
    return NextResponse.redirect(new URL(`${SETTINGS_URL}?gmail=forbidden`, SITE_BASE))
  }

  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const cookieState = request.cookies.get('gmail_oauth_state')?.value
  const labelName = request.cookies.get('gmail_label_name')?.value || 'Offertes ter goedkeuring'

  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.redirect(new URL(`${SETTINGS_URL}?gmail=state_error`, SITE_BASE))
  }

  try {
    const { refreshToken, accessToken } = await exchangeGmailCode(code)
    const email = await fetchGoogleEmail(accessToken)
    const labelId = await ensureLabel(accessToken, labelName)
    const filterId = await ensureApprovalFilter(accessToken, labelId)
    const tenantId = await getTenantId()
    await saveGmailConnection({
      tenantId,
      googleEmail: email,
      refreshTokenEncrypted: encryptToken(refreshToken),
      labelName,
      labelId,
      filterId,
    })
    const res = NextResponse.redirect(new URL(`${SETTINGS_URL}?gmail=ok`, SITE_BASE))
    res.cookies.delete('gmail_oauth_state')
    res.cookies.delete('gmail_label_name')
    return res
  } catch (e) {
    console.error('[gmail-callback]', e)
    return NextResponse.redirect(new URL(`${SETTINGS_URL}?gmail=error`, SITE_BASE))
  }
}
