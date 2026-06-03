import { NextResponse, type NextRequest } from 'next/server'
import { getDashboardSupabase } from '@/lib/dashboard/supabase-server'

/**
 * OAuth/PKCE callback voor Supabase auth-flows die met een `?code=...`
 * terugkomen (wachtwoord-reset mail, invite mail, etc.). De code wordt
 * server-side uitgewisseld voor een sessie zodat cookies gezet zijn
 * voordat de eindpagina rendert.
 *
 * Flow:
 *   1. Supabase mail-template stuurt user naar /callback?code=…&next=/x
 *   2. Wij wisselen de code via supabase.auth.exchangeCodeForSession
 *   3. Redirect naar `next` (default /leads), die pagina ziet nu een
 *      ingelogde user en kan z'n werk doen (bv. wachtwoord updaten).
 *
 * BELANGRIJK: redirects gebruiken `NEXT_PUBLIC_SITE_URL_DASHBOARD` als base
 * i.p.v. `req.url`. Nginx proxyt naar `http://localhost:3000`, waardoor
 * Next.js intern `req.url = http://localhost:3000/callback` ziet. Een
 * relatieve redirect zou dan absoluut worden naar `http://localhost:3000/...`,
 * waar de browser vervolgens heen probeert te gaan (en faalt). Door de
 * publieke site-URL als base te gebruiken landen redirects netjes terug
 * op de host waar de gebruiker vandaan kwam.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') || '/leads'
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL_DASHBOARD ?? 'https://app.frontlix.com'

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing-code', siteUrl))
  }

  const supabase = await getDashboardSupabase()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, siteUrl),
    )
  }

  return NextResponse.redirect(new URL(next, siteUrl))
}
