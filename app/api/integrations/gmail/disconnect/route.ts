// app/api/integrations/gmail/disconnect/route.ts
import { NextResponse } from 'next/server'
import { getCurrentUserProfile } from '@/lib/dashboard/auth'
import {
  getGmailConnectionSecrets,
  deleteGmailConnection,
} from '@/lib/dashboard/gmail-connection-queries'
import { decryptToken } from '@/lib/crypto/calendar-token'
import { refreshAccessToken } from '@/lib/google-oauth'
import { deleteFilter } from '@/lib/gmail-oauth'

export async function POST() {
  const profile = await getCurrentUserProfile()
  if (!profile || profile.tenant_status !== 'approved' || !profile.is_owner) {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 })
  }
  if (!profile.tenant_id) {
    return NextResponse.json({ error: 'Geen bedrijf gekoppeld' }, { status: 403 })
  }
  const tenantId = profile.tenant_id

  // Probeer het Gmail-filter op te ruimen; het label en bestaande gelabelde
  // mail laten we staan (geen data van de gebruiker weggooien).
  try {
    const secrets = await getGmailConnectionSecrets(tenantId)
    if (secrets?.filterId) {
      const accessToken = await refreshAccessToken(decryptToken(secrets.refreshTokenEncrypted))
      await deleteFilter(accessToken, secrets.filterId)
    }
  } catch (e) {
    console.error('[gmail-disconnect] filter opruimen faalde, ga door met ontkoppelen', e)
  }

  await deleteGmailConnection(tenantId)
  return NextResponse.json({ ok: true })
}
