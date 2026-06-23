// lib/dashboard/gmail-connection-queries.ts
import { getDashboardAdmin } from './supabase-admin'
import { getTenantId } from './calendar-connection-queries'

export { getTenantId }

export interface GmailConnectionStatus {
  connected: boolean
  googleEmail: string | null
  labelName: string | null
}

/** Leest de connectie-status (zonder token) van de enige tenant. */
export async function getGmailConnectionStatus(): Promise<GmailConnectionStatus> {
  const admin = getDashboardAdmin()
  const { data } = await admin
    .from('gmail_connections')
    .select('google_email, label_name')
    .limit(1)
    .maybeSingle()
  if (!data) return { connected: false, googleEmail: null, labelName: null }
  return {
    connected: true,
    googleEmail: data.google_email ?? null,
    labelName: data.label_name ?? null,
  }
}

export interface SaveGmailConnectionInput {
  tenantId: string
  googleEmail: string | null
  refreshTokenEncrypted: string
  labelName: string
  labelId: string
  filterId: string
}

export async function saveGmailConnection(input: SaveGmailConnectionInput): Promise<void> {
  const admin = getDashboardAdmin()
  const { error } = await admin.from('gmail_connections').upsert(
    {
      tenant_id: input.tenantId,
      google_email: input.googleEmail,
      refresh_token_encrypted: input.refreshTokenEncrypted,
      label_name: input.labelName,
      label_id: input.labelId,
      filter_id: input.filterId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'tenant_id' },
  )
  if (error) throw new Error(`Opslaan Gmail-connectie faalde: ${error.message}`)
}

export async function deleteGmailConnection(tenantId: string): Promise<void> {
  const admin = getDashboardAdmin()
  const { error } = await admin.from('gmail_connections').delete().eq('tenant_id', tenantId)
  if (error) throw new Error(`Ontkoppelen Gmail faalde: ${error.message}`)
}

/** Leest het versleutelde token + filter-id (voor opruimen bij ontkoppelen). */
export async function getGmailConnectionSecrets(): Promise<{
  refreshTokenEncrypted: string
  filterId: string | null
} | null> {
  const admin = getDashboardAdmin()
  const { data } = await admin
    .from('gmail_connections')
    .select('refresh_token_encrypted, filter_id')
    .limit(1)
    .maybeSingle()
  if (!data) return null
  return { refreshTokenEncrypted: data.refresh_token_encrypted, filterId: data.filter_id ?? null }
}
