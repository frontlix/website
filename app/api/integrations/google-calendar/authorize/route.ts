// app/api/integrations/google-calendar/authorize/route.ts
import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { getCurrentUserProfile } from '@/lib/dashboard/auth'
import { buildConsentUrl } from '@/lib/google-oauth'

export async function GET() {
  const profile = await getCurrentUserProfile()
  if (!profile || profile.tenant_status !== 'approved' || !profile.is_owner) {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 })
  }

  if (!profile.tenant_id) {
    return NextResponse.json({ error: 'Geen bedrijf gekoppeld' }, { status: 403 })
  }
  // Tenant in de OAuth state meesturen (na de CSRF-nonce). De callback leest de
  // tenant hieruit i.p.v. een single-tenant .limit(1)/sessie-aanname.
  const state = `${crypto.randomBytes(16).toString('hex')}.${profile.tenant_id}`
  const res = NextResponse.redirect(buildConsentUrl(state))
  res.cookies.set('gcal_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  })
  return res
}
