import { type NextRequest } from 'next/server'
import { proxyToBotApi } from '@/lib/dashboard/bot-api-proxy'

/**
 * Stuurt een handmatig WhatsApp-bericht namens de owner. Body: { bericht: string }.
 * Vereist dat de lead bot_gepauzeerd=true heeft staan.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ lead_id: string }> },
) {
  const { lead_id } = await params
  return proxyToBotApi(req, lead_id, 'send-message')
}
