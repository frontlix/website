// lib/dashboard/whatsapp-connection-queries.ts
import { getDashboardAdmin } from './supabase-admin'
import { getTenantId } from './calendar-connection-queries'
import { decryptToken } from '@/lib/crypto/calendar-token'

// Hergebruik de bestaande single-tenant helper, niet dupliceren.
export { getTenantId }

/** Volledige rij van public.whatsapp_connections (handgeschreven, scherpe typen). */
export interface WhatsAppConnectionRow {
  id: string
  tenant_id: string
  waba_id: string
  phone_number_id: string
  display_phone_number: string | null
  access_token_encrypted: string
  registration_pin_encrypted: string | null
  needs_reconnect: boolean
  connected_at: string
  updated_at: string
}

/** Niet-geheime status voor UI/API. Bevat NOOIT het access-token. */
export interface WhatsAppConnectionStatus {
  connected: boolean
  displayPhoneNumber?: string | null
  needsReconnect?: boolean
}

/** Leest de connectie-status (zonder geheimen) van EEN tenant. */
export async function getWhatsAppConnectionStatus(tenantId: string): Promise<WhatsAppConnectionStatus> {
  const admin = getDashboardAdmin()
  const { data } = await admin
    .from('whatsapp_connections')
    .select('display_phone_number, needs_reconnect')
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!data) return { connected: false }
  return {
    connected: true,
    displayPhoneNumber: (data.display_phone_number ?? null) as string | null,
    needsReconnect: Boolean(data.needs_reconnect),
  }
}

/**
 * Leest de volledige rij incl. access_token_encrypted. Server-only.
 * NOOIT het token naar de client lekken.
 */
export async function getRawWhatsAppConnection(tenantId: string): Promise<WhatsAppConnectionRow | null> {
  const admin = getDashboardAdmin()
  const { data } = await admin
    .from('whatsapp_connections')
    .select('*')
    .eq('tenant_id', tenantId)
    .maybeSingle()
  return (data as WhatsAppConnectionRow | null) ?? null
}

/**
 * Haalt de registratie-PIN op en ontsleutelt hem. Server-only en alleen nodig
 * als een nummer opnieuw geregistreerd moet worden. Geeft null terug als er geen
 * PIN is opgeslagen. NOOIT de PIN naar de client lekken of loggen.
 */
export async function getDecryptedRegistrationPin(tenantId: string): Promise<string | null> {
  const row = await getRawWhatsAppConnection(tenantId)
  if (!row || !row.registration_pin_encrypted) return null
  return decryptToken(row.registration_pin_encrypted)
}

export interface SaveWhatsAppConnectionInput {
  tenantId: string
  wabaId: string
  phoneNumberId: string
  displayPhoneNumber: string | null
  accessTokenEncrypted: string
  registrationPinEncrypted?: string | null
}

/**
 * Upsert op tenant_id. Behoudt connected_at (alleen gezet bij insert via de
 * DB-default), zet updated_at=now(), needs_reconnect=false.
 */
export async function saveWhatsAppConnection(input: SaveWhatsAppConnectionInput): Promise<void> {
  const admin = getDashboardAdmin()
  const now = new Date().toISOString()
  const { error } = await admin.from('whatsapp_connections').upsert(
    {
      tenant_id: input.tenantId,
      waba_id: input.wabaId,
      phone_number_id: input.phoneNumberId,
      display_phone_number: input.displayPhoneNumber,
      access_token_encrypted: input.accessTokenEncrypted,
      registration_pin_encrypted: input.registrationPinEncrypted ?? null,
      needs_reconnect: false,
      updated_at: now,
    },
    { onConflict: 'tenant_id' },
  )
  if (error) throw new Error(`Opslaan WhatsApp-koppeling faalde: ${error.message}`)
}

/** Verwijdert de WhatsApp-koppeling van deze tenant. */
export async function deleteWhatsAppConnection(tenantId: string): Promise<void> {
  const admin = getDashboardAdmin()
  const { error } = await admin.from('whatsapp_connections').delete().eq('tenant_id', tenantId)
  if (error) throw new Error(`Ontkoppelen WhatsApp-koppeling faalde: ${error.message}`)
}

/** Zet de needs_reconnect-vlag (gebruikt op het verzendpad bij een token-fout). */
export async function setWhatsAppNeedsReconnect(tenantId: string, value: boolean): Promise<void> {
  const admin = getDashboardAdmin()
  const { error } = await admin
    .from('whatsapp_connections')
    .update({ needs_reconnect: value, updated_at: new Date().toISOString() })
    .eq('tenant_id', tenantId)
  if (error) throw new Error(`needs_reconnect bijwerken faalde: ${error.message}`)
}
