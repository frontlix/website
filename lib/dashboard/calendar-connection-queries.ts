// lib/dashboard/calendar-connection-queries.ts
import { getDashboardAdmin } from './supabase-admin'

// getTenantId is verhuisd naar tenant-context (per-user lookup i.p.v. .limit(1)).
// Her-geexporteerd onder de oude naam zodat bestaande imports (OAuth-routes,
// e-mail/gmail/whatsapp-queries) blijven werken; de waarde komt nu uit het
// profiel van de INGELOGDE user (gooit voor de superadmin zonder eigen tenant).
export { getCurrentTenantId as getTenantId } from './tenant-context'

export interface ConnectionStatus {
  connected: boolean
  googleEmail: string | null
  calendarId: string | null
  connectedAt: string | null
}

/** Leest de connectie-status (zonder token) voor EEN tenant. */
export async function getConnectionStatus(tenantId: string): Promise<ConnectionStatus> {
  const admin = getDashboardAdmin()
  const { data } = await admin
    .from('calendar_connections')
    .select('google_email, calendar_id, connected_at')
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!data) return { connected: false, googleEmail: null, calendarId: null, connectedAt: null }
  return {
    connected: true,
    googleEmail: data.google_email ?? null,
    calendarId: data.calendar_id ?? null,
    connectedAt: data.connected_at ?? null,
  }
}

export interface SaveConnectionInput {
  tenantId: string
  googleEmail: string | null
  calendarId: string
  refreshTokenEncrypted: string
}

export async function saveConnection(input: SaveConnectionInput): Promise<void> {
  const admin = getDashboardAdmin()
  const { error } = await admin.from('calendar_connections').upsert(
    {
      tenant_id: input.tenantId,
      google_email: input.googleEmail,
      calendar_id: input.calendarId,
      refresh_token_encrypted: input.refreshTokenEncrypted,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'tenant_id' },
  )
  if (error) throw new Error(`Opslaan connectie faalde: ${error.message}`)
}

export async function deleteConnection(tenantId: string): Promise<void> {
  const admin = getDashboardAdmin()
  const { error } = await admin.from('calendar_connections').delete().eq('tenant_id', tenantId)
  if (error) throw new Error(`Ontkoppelen faalde: ${error.message}`)
}

/** Leest het versleutelde refresh-token van de connectie-rij van EEN tenant. */
export async function getEncryptedRefreshToken(tenantId: string): Promise<string | null> {
  const admin = getDashboardAdmin()
  const { data } = await admin
    .from('calendar_connections')
    .select('refresh_token_encrypted')
    .eq('tenant_id', tenantId)
    .maybeSingle()
  return data?.refresh_token_encrypted ?? null
}

/** Werkt de gekozen calendar_id bij op de connectie-rij van deze tenant. */
export async function updateCalendarId(tenantId: string, calendarId: string): Promise<void> {
  const admin = getDashboardAdmin()
  const { error } = await admin
    .from('calendar_connections')
    .update({ calendar_id: calendarId, updated_at: new Date().toISOString() })
    .eq('tenant_id', tenantId)
  if (error) throw new Error(`Agenda-keuze opslaan faalde: ${error.message}`)
}
