import { type NextRequest } from 'next/server'
import { proxyToBotApi } from '@/lib/dashboard/bot-api-proxy'

/**
 * Genereert een nieuw web-chat token (oude wordt ongeldig), reset de
 * 30-dagen expiry en stuurt direct de nieuwe mail. Zeldzaam gebruikt
 *, alleen bij vermoeden van compromised token of verlopen window.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ lead_id: string }> },
) {
  const { lead_id } = await params
  return proxyToBotApi(req, lead_id, 'web-chat-link/regenereer')
}
