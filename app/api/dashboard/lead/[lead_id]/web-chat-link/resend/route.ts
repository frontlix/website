import { type NextRequest } from 'next/server'
import { proxyToBotApi } from '@/lib/dashboard/bot-api-proxy'

/**
 * Stuurt de web-chat fallback-mail opnieuw naar de klant met de huidige
 * (bestaande) magic-link. Gebruikt door owner als de klant zegt "ik heb
 * je mail niet gezien". Geen token-regeneratie, de oude link blijft geldig.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ lead_id: string }> },
) {
  const { lead_id } = await params
  return proxyToBotApi(req, lead_id, 'web-chat-link/resend')
}
