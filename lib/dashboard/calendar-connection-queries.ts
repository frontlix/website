// lib/dashboard/calendar-connection-queries.ts
import { getDashboardAdmin } from './supabase-admin'

export interface ConnectionStatus {
  connected: boolean
  googleEmail: string | null
  calendarId: string | null
  connectedAt: string | null
}

/** Leest de connectie-status (zonder het token) van de enige tenant. */
export async function getConnectionStatus(): Promise<ConnectionStatus> {
  const admin = getDashboardAdmin()
  const { data } = await admin
    .from('calendar_connections')
    .select('google_email, calendar_id, connected_at')
    .limit(1)
    .maybeSingle()

  if (!data) return { connected: false, googleEmail: null, calendarId: null, connectedAt: null }
  return {
    connected: true,
    googleEmail: data.google_email ?? null,
    calendarId: data.calendar_id ?? null,
    connectedAt: data.connected_at ?? null,
  }
}

/** Haalt de id van de enige tenant_settings-rij (single-tenant). */
export async function getTenantId(): Promise<string> {
  const admin = getDashboardAdmin()
  const { data, error } = await admin.from('tenant_settings').select('id').limit(1).maybeSingle()
  if (error || !data) throw new Error('Geen tenant_settings-rij gevonden')
  return data.id as string
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

/** Leest het versleutelde refresh-token van de (enige) connectie-rij. */
export async function getEncryptedRefreshToken(): Promise<string | null> {
  const admin = getDashboardAdmin()
  const { data } = await admin
    .from('calendar_connections')
    .select('refresh_token_encrypted')
    .limit(1)
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
