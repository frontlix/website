import { NextResponse, type NextRequest } from 'next/server'
import { postErrorNotification } from '@/lib/dashboard/slack'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// De rookmelder: client-side error-boundaries POST'en hierheen, wij sturen het
// door naar Slack (#error-st). Publiek (een crash kan ook op de marketingsite
// of in een uitgelogde state gebeuren), daarom gehard tegen misbruik:
//  - body-cap 8 KB
//  - velden afgekapt
//  - in-memory rate-limit zodat een crash-loop het kanaal niet platlegt.

const WINDOW_MS = 5 * 60 * 1000
const MAX_PER_WINDOW = 20
let windowStart = 0
let countInWindow = 0

function rateLimited(now: number): boolean {
  if (now - windowStart > WINDOW_MS) {
    windowStart = now
    countInWindow = 0
  }
  countInWindow += 1
  return countInWindow > MAX_PER_WINDOW
}

function clip(v: unknown, max: number): string {
  if (typeof v !== 'string') return ''
  return v.replace(/\s+/g, ' ').trim().slice(0, max)
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text()
    if (raw.length > 8192) return new NextResponse(null, { status: 413 })

    let body: Record<string, unknown>
    try {
      body = JSON.parse(raw) as Record<string, unknown>
    } catch {
      return new NextResponse(null, { status: 400 })
    }

    const where = clip(body.where, 60) || 'onbekend'
    const message = clip(body.message, 500) || '(geen melding)'
    const digest = clip(body.digest, 80)
    const url = clip(body.url, 300)

    // Boven de limiet stil negeren (geen Slack-flood, geen error naar de client).
    if (rateLimited(Date.now())) {
      return new NextResponse(null, { status: 204 })
    }

    const tekst =
      `🚨 *Dashboard-fout* (${where})\n` +
      `> ${message}\n` +
      (url ? `Pagina: ${url}\n` : '') +
      (digest ? `Foutcode: ${digest}` : '')

    await postErrorNotification(tekst)
    return new NextResponse(null, { status: 204 })
  } catch {
    // Een rookmelder mag zelf nooit een fout opleveren.
    return new NextResponse(null, { status: 204 })
  }
}
