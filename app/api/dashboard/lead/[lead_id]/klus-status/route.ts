import { type NextRequest } from 'next/server'
import { proxyToBotApi } from '@/lib/dashboard/bot-api-proxy'

/**
 * Zet of unset `klus_geblokkeerd` op de lead. Wanneer true wordt gezet
 * voordat de review-cron z'n verzoek heeft verstuurd, slaat de cron deze
 * lead over.
 *
 * Body: { "klus_geblokkeerd": boolean }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ lead_id: string }> },
) {
  const { lead_id } = await params
  return proxyToBotApi(req, lead_id, 'klus-status')
}
