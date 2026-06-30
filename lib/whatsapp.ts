/**
 * WhatsApp Cloud API helper, shared functions for the website.
 * Automation-specific functions (send templates, media, documents)
 * have been moved to lead-automation/services/whatsapp.py.
 */

import { getDashboardAdmin } from './dashboard/supabase-admin'
import { decryptToken } from './crypto/calendar-token'

const GRAPH_API_VERSION = 'v22.0'

/**
 * Normaliseert een Nederlands telefoonnummer naar internationaal formaat (zonder +).
 */
export function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/[^0-9+]/g, '')
  if (cleaned.startsWith('+')) cleaned = cleaned.slice(1)
  if (cleaned.startsWith('0031')) cleaned = cleaned.slice(2)
  if (cleaned.startsWith('0')) cleaned = '31' + cleaned.slice(1)
  return cleaned
}

/**
 * Stuurt een template-bericht via de Meta WhatsApp Business API.
 * Gebruikt door contact en project formulieren.
 *
 * LET OP: dit is Frontlix' EIGEN marketing-intake op globale env
 * (WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN / WHATSAPP_TEMPLATE_NAME).
 * Ongemoeid laten; per-tenant verzending loopt via sendTenantWhatsAppTemplate().
 */
export async function sendWhatsAppMessage(telefoon: string, naam: string): Promise<void> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME

  if (!phoneNumberId || !accessToken || !templateName) {
    console.warn('WhatsApp env variabelen niet geconfigureerd, bericht overgeslagen.')
    return
  }

  const to = normalizePhone(telefoon)

  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'nl' },
          components: [
            {
              type: 'body',
              parameters: [{ type: 'text', text: naam }],
            },
          ],
        },
      }),
    }
  )

  if (!res.ok) {
    const errorBody = await res.text()
    throw new Error(`WhatsApp API error (${res.status}): ${errorBody}`)
  }
}

// ---------------------------------------------------------------------------
// Per-tenant WhatsApp (multitenant). Leest credentials uit whatsapp_connections
// per tenant; valt terug op globale env zolang de tenant (bv. SS) nog niet
// (her)gekoppeld is. De Frontlix-marketing-functie hierboven blijft op env.
// ---------------------------------------------------------------------------

interface TenantWaCreds {
  phoneNumberId: string
  accessToken: string
}

/** Leest per-tenant WhatsApp-creds; valt terug op globale env (bootstrap SS). */
async function getTenantWhatsAppCreds(tenantId: string): Promise<TenantWaCreds | null> {
  const { data } = await getDashboardAdmin()
    .from('whatsapp_connections')
    .select('phone_number_id, access_token_encrypted, needs_reconnect')
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (data && !data.needs_reconnect && data.access_token_encrypted) {
    return {
      phoneNumberId: data.phone_number_id as string,
      accessToken: decryptToken(data.access_token_encrypted as string),
    }
  }

  // Bootstrap-fallback: globale env zolang de tenant nog niet (her)gekoppeld is.
  const pid = process.env.WHATSAPP_PHONE_NUMBER_ID
  const tok = process.env.WHATSAPP_ACCESS_TOKEN
  if (pid && tok) return { phoneNumberId: pid, accessToken: tok }
  return null
}

/** Stuurt een WhatsApp-template namens een specifieke tenant. */
export async function sendTenantWhatsAppTemplate(input: {
  tenantId: string
  telefoon: string
  naam: string
  templateName: string
  languageCode?: string
}): Promise<void> {
  const creds = await getTenantWhatsAppCreds(input.tenantId)
  if (!creds) {
    console.warn('[whatsapp] geen tenant-creds, bericht overgeslagen.')
    return
  }

  const to = normalizePhone(input.telefoon)
  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${creds.phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: input.templateName,
          language: { code: input.languageCode ?? 'nl' },
          components: [{ type: 'body', parameters: [{ type: 'text', text: input.naam }] }],
        },
      }),
    }
  )

  if (!res.ok) {
    const errorBody = await res.text()
    throw new Error(`WhatsApp API error (${res.status}): ${errorBody}`)
  }
}
