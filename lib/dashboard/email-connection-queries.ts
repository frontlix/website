// lib/dashboard/email-connection-queries.ts
import { getDashboardAdmin } from './supabase-admin'
import { getTenantId } from './calendar-connection-queries'
import { decryptToken } from '@/lib/crypto/calendar-token'

// Hergebruik de bestaande single-tenant helper, niet dupliceren.
export { getTenantId }

/** Volledige rij van public.email_connections (handgeschreven, scherpe typen). */
export interface EmailConnectionRow {
  id: string
  tenant_id: string
  provider: string | null
  smtp_host: string
  smtp_port: number
  security: 'ssl' | 'starttls'
  email_adres: string
  smtp_password_encrypted: string
  sender_name: string
  reply_to: string | null
  test_passed_at: string | null
  needs_reconnect: boolean
  connected_at: string
  updated_at: string
}

/** Niet-geheime status voor UI/API. Bevat NOOIT het wachtwoord. */
export interface EmailConnectionStatus {
  connected: boolean
  email?: string
  senderName?: string
  replyTo?: string | null
  provider?: string | null
  testPassedAt?: string | null
  needsReconnect?: boolean
}

/** Leest de connectie-status (zonder geheimen) van de enige tenant. */
export async function getEmailConnectionStatus(): Promise<EmailConnectionStatus> {
  const admin = getDashboardAdmin()
  const { data } = await admin
    .from('email_connections')
    .select('email_adres, sender_name, reply_to, provider, test_passed_at, needs_reconnect')
    .limit(1)
    .maybeSingle()

  if (!data) return { connected: false }
  return {
    connected: true,
    email: data.email_adres as string,
    senderName: data.sender_name as string,
    replyTo: (data.reply_to ?? null) as string | null,
    provider: (data.provider ?? null) as string | null,
    testPassedAt: (data.test_passed_at ?? null) as string | null,
    needsReconnect: Boolean(data.needs_reconnect),
  }
}

/**
 * Leest de volledige rij incl. smtp_password_encrypted. Server-only.
 * Voor de 'bewerken zonder wachtwoord'-flow (sectie 6.5).
 */
export async function getRawEmailConnection(): Promise<EmailConnectionRow | null> {
  const admin = getDashboardAdmin()
  const { data } = await admin
    .from('email_connections')
    .select('*')
    .limit(1)
    .maybeSingle()
  return (data as EmailConnectionRow | null) ?? null
}

export interface SaveEmailConnectionInput {
  tenantId: string
  provider: string | null
  smtpHost: string
  smtpPort: number
  security: 'ssl' | 'starttls'
  email: string
  smtpPasswordEncrypted: string
  senderName: string
  replyTo: string | null
}

/**
 * Upsert op tenant_id. Behoudt connected_at (alleen gezet bij insert via de
 * DB-default), zet test_passed_at=now(), updated_at=now(), needs_reconnect=false.
 */
export async function saveEmailConnection(input: SaveEmailConnectionInput): Promise<void> {
  const admin = getDashboardAdmin()
  const now = new Date().toISOString()
  const { error } = await admin.from('email_connections').upsert(
    {
      tenant_id: input.tenantId,
      provider: input.provider,
      smtp_host: input.smtpHost,
      smtp_port: input.smtpPort,
      security: input.security,
      email_adres: input.email,
      smtp_password_encrypted: input.smtpPasswordEncrypted,
      sender_name: input.senderName,
      reply_to: input.replyTo,
      test_passed_at: now,
      needs_reconnect: false,
      updated_at: now,
    },
    { onConflict: 'tenant_id' },
  )
  if (error) throw new Error(`Opslaan e-mailkoppeling faalde: ${error.message}`)
}

/** Verwijdert de e-mailkoppeling van deze tenant. */
export async function deleteEmailConnection(tenantId: string): Promise<void> {
  const admin = getDashboardAdmin()
  const { error } = await admin.from('email_connections').delete().eq('tenant_id', tenantId)
  if (error) throw new Error(`Ontkoppelen e-mailkoppeling faalde: ${error.message}`)
}

/** Verzendklare config van de actieve koppeling. */
export interface ActiveEmailConnection {
  smtpHost: string
  smtpPort: number
  security: 'ssl' | 'starttls'
  email: string
  password: string
  senderName: string
  replyTo: string | null
}

/**
 * Leest de rij en ontsleutelt smtp_password_encrypted voor het verzendpad.
 * null als er geen rij is.
 */
export async function getActiveEmailConnectionForSend(): Promise<ActiveEmailConnection | null> {
  const admin = getDashboardAdmin()
  const { data } = await admin
    .from('email_connections')
    .select('smtp_host, smtp_port, security, email_adres, smtp_password_encrypted, sender_name, reply_to')
    .limit(1)
    .maybeSingle()

  if (!data) return null
  const row = data as Pick<
    EmailConnectionRow,
    | 'smtp_host'
    | 'smtp_port'
    | 'security'
    | 'email_adres'
    | 'smtp_password_encrypted'
    | 'sender_name'
    | 'reply_to'
  >
  return {
    smtpHost: row.smtp_host,
    smtpPort: row.smtp_port,
    security: row.security,
    email: row.email_adres,
    password: decryptToken(row.smtp_password_encrypted),
    senderName: row.sender_name,
    replyTo: row.reply_to ?? null,
  }
}

/** Zet de needs_reconnect-vlag (gebruikt op het verzendpad bij EAUTH). */
export async function setNeedsReconnect(tenantId: string, value: boolean): Promise<void> {
  const admin = getDashboardAdmin()
  const { error } = await admin
    .from('email_connections')
    .update({ needs_reconnect: value, updated_at: new Date().toISOString() })
    .eq('tenant_id', tenantId)
  if (error) throw new Error(`needs_reconnect bijwerken faalde: ${error.message}`)
}
