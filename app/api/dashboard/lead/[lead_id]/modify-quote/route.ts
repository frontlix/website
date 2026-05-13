import { type NextRequest } from 'next/server'
import { proxyToBotApi } from '@/lib/dashboard/bot-api-proxy'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ lead_id: string }> },
) {
  const { lead_id } = await params
  return proxyToBotApi(req, lead_id, 'modify-quote')
}
