/**
 * WhatsApp Cloud API helper — shared functions for the website.
 * Automation-specific functions (send templates, media, documents)
 * have been moved to lead-automation/services/whatsapp.py.
 */

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
 */
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
