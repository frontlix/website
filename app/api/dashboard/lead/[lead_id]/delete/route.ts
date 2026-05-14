import { type NextRequest } from 'next/server'
import { proxyToBotApi } from '@/lib/dashboard/bot-api-proxy'

/**
 * AVG-cascade-delete: bot ruimt leads + berichten + foto's + storage +
 * offertes op. Wordt vanaf de lead-detail Gevaarlijke-zone aangeroepen.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ lead_id: string }> },
) {
  const { lead_id } = await params
  return proxyToBotApi(req, lead_id, 'delete')
}
