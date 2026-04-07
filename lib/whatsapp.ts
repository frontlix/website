/**
 * WhatsApp Cloud API helper
 * Stuurt een template-bericht via de Meta WhatsApp Business API.
 *
 * Vereiste env variabelen:
 * - WHATSAPP_PHONE_NUMBER_ID: het Phone Number ID uit Meta Business
 * - WHATSAPP_ACCESS_TOKEN: permanent access token
 * - WHATSAPP_TEMPLATE_NAME: naam van het goedgekeurde message template
 */

const GRAPH_API_VERSION = 'v22.0'

/**
 * Normaliseert een Nederlands telefoonnummer naar internationaal formaat (zonder +).
 * Voorbeelden:
 *   "06 1234 5678"  → "31612345678"
 *   "+31 6 12345678" → "31612345678"
 *   "0031612345678"  → "31612345678"
 */
export function normalizePhone(phone: string): string {
  // Strip alles behalve cijfers en +
  let cleaned = phone.replace(/[^0-9+]/g, '')

  // +31... → 31...
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.slice(1)
  }

  // 0031... → 31...
  if (cleaned.startsWith('0031')) {
    cleaned = cleaned.slice(2)
  }

  // 06... → 316...
  if (cleaned.startsWith('0')) {
    cleaned = '31' + cleaned.slice(1)
  }

  return cleaned
}

export async function sendWhatsAppMessage(telefoon: string, naam: string): Promise<void> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME

  if (!phoneNumberId || !accessToken || !templateName) {
    console.warn('WhatsApp env variabelen niet geconfigureerd — bericht overgeslagen.')
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
              parameters: [
                { type: 'text', text: naam },
              ],
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

/**
 * Stuurt de demo_start template met drie branche-knoppen (Quick Reply).
 * Dit is het eerste bericht dat wordt gestuurd als iemand de demo start.
 */
export async function sendDemoStartTemplate(telefoon: string, naam: string): Promise<void> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  const templateName = process.env.WHATSAPP_DEMO_TEMPLATE_NAME

  if (!phoneNumberId || !accessToken || !templateName) {
    console.warn('WhatsApp demo template env variabelen niet geconfigureerd — bericht overgeslagen.')
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
              parameters: [
                { type: 'text', text: naam },
              ],
            },
          ],
        },
      }),
    }
  )

  if (!res.ok) {
    const errorBody = await res.text()
    throw new Error(`WhatsApp demo template error (${res.status}): ${errorBody}`)
  }
}

/**
 * Stuurt de demo_persoonlijk template voor gepersonaliseerde demo's.
 * Bevat twee variabelen: naam en bedrijf.
 */
export async function sendPersonalizedDemoTemplate(telefoon: string, naam: string, bedrijf: string): Promise<void> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  const templateName = process.env.WHATSAPP_PERSONALIZED_DEMO_TEMPLATE_NAME

  if (!phoneNumberId || !accessToken || !templateName) {
    console.warn('WhatsApp personalized demo template env variabelen niet geconfigureerd — bericht overgeslagen.')
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
              parameters: [
                { type: 'text', text: naam },
                { type: 'text', text: bedrijf },
              ],
            },
          ],
        },
      }),
    }
  )

  if (!res.ok) {
    const errorBody = await res.text()
    throw new Error(`WhatsApp personalized demo template error (${res.status}): ${errorBody}`)
  }
}

/**
 * Haalt de gedownloade URL op voor een WhatsApp media-bericht (foto, document).
 * Meta levert eerst een tijdelijke URL die alleen met de access token op te halen is.
 *
 * Gebruikt door de webhook wanneer een klant een foto stuurt.
 */
export async function getWhatsAppMediaUrl(mediaId: string): Promise<string | null> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  if (!accessToken) {
    console.warn('WHATSAPP_ACCESS_TOKEN niet geconfigureerd — media ophalen overgeslagen.')
    return null
  }

  const res = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${mediaId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    console.error(`getWhatsAppMediaUrl failed (${res.status}):`, await res.text())
    return null
  }
  const data = (await res.json()) as { url?: string }
  return data.url ?? null
}

/**
 * Download het binaire bestand achter een Meta media URL.
 * Vereist een Bearer token, wat normale fetch op de URL zelf niet doet.
 */
export async function downloadWhatsAppMedia(url: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  if (!accessToken) return null

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    console.error(`downloadWhatsAppMedia failed (${res.status}):`, await res.text())
    return null
  }
  const arrayBuffer = await res.arrayBuffer()
  return {
    buffer: Buffer.from(arrayBuffer),
    contentType: res.headers.get('content-type') || 'application/octet-stream',
  }
}

/**
 * Stuurt een document (bv. PDF offerte) via WhatsApp.
 * De document URL moet publiek toegankelijk zijn (bv. Supabase storage public bucket).
 */
export async function sendWhatsAppDocument(
  phone: string,
  documentUrl: string,
  filename: string,
  caption?: string
): Promise<void> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN

  if (!phoneNumberId || !accessToken) {
    console.warn('WhatsApp env variabelen niet geconfigureerd — document overgeslagen.')
    return
  }

  const to = normalizePhone(phone)

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
        type: 'document',
        document: {
          link: documentUrl,
          filename,
          ...(caption ? { caption } : {}),
        },
      }),
    }
  )

  if (!res.ok) {
    const errorBody = await res.text()
    throw new Error(`WhatsApp document API error (${res.status}): ${errorBody}`)
  }
}

/**
 * Stuurt een vrije-tekst WhatsApp bericht (geen template).
 * Werkt alleen binnen het 24-uurs conversatievenster na een template of klantbericht.
 */
export async function sendWhatsAppText(phone: string, text: string): Promise<void> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN

  if (!phoneNumberId || !accessToken) {
    console.warn('WhatsApp env variabelen niet geconfigureerd — bericht overgeslagen.')
    return
  }

  const to = normalizePhone(phone)

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
        type: 'text',
        text: { body: text },
      }),
    }
  )

  if (!res.ok) {
    const errorBody = await res.text()
    throw new Error(`WhatsApp API error (${res.status}): ${errorBody}`)
  }
}
