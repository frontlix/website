import { type NextRequest } from 'next/server'
import { proxyToBotApi } from '@/lib/dashboard/bot-api-proxy'

/**
 * Pauzeert (of hervat) Surface voor deze lead. Body: { paused: boolean }.
 * Bij paused=true skipt de bot inkomende WhatsApp-berichten en mag de
 * owner handmatig antwoorden via /send-message.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ lead_id: string }> },
) {
  const { lead_id } = await params
  return proxyToBotApi(req, lead_id, 'bot-pauzeren')
}
