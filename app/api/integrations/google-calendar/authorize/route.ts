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

  const state = crypto.randomBytes(16).toString('hex')
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
