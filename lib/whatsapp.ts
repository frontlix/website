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
function normalizePhone(phone: string): string {
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
