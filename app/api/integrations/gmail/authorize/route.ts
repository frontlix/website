// app/api/integrations/gmail/authorize/route.ts
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getCurrentUserProfile } from '@/lib/dashboard/auth'
import { buildGmailConsentUrl } from '@/lib/gmail-oauth'

const DEFAULT_LABEL = 'Offertes ter goedkeuring'
const MAX_LABEL_LEN = 100

export async function GET(request: NextRequest) {
  const profile = await getCurrentUserProfile()
  if (!profile || profile.tenant_status !== 'approved' || !profile.is_owner) {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 })
  }

  const raw = new URL(request.url).searchParams.get('label')?.trim()
  const labelName = (raw && raw.length > 0 ? raw : DEFAULT_LABEL).slice(0, MAX_LABEL_LEN)

  if (!profile.tenant_id) {
    return NextResponse.json({ error: 'Geen bedrijf gekoppeld' }, { status: 403 })
  }
  // Tenant in de OAuth state meesturen (na de CSRF-nonce); de callback leest 'm hieruit.
  const state = `${crypto.randomBytes(16).toString('hex')}.${profile.tenant_id}`
  const res = NextResponse.redirect(buildGmailConsentUrl(state))
  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 600,
  }
  res.cookies.set('gmail_oauth_state', state, cookieOpts)
  res.cookies.set('gmail_label_name', labelName, cookieOpts)
  return res
}
