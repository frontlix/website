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
 *   3. Redirect naar `next` (default /leads) — die pagina ziet nu een
 *      ingelogde user en kan z'n werk doen (bv. wachtwoord updaten).
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') || '/leads'

  if (!code) {
    // Geen code = directe hit zonder mail-link. Sturen naar login.
    return NextResponse.redirect(new URL('/login?error=missing-code', req.url))
  }

  const supabase = await getDashboardSupabase()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, req.url),
    )
  }

  return NextResponse.redirect(new URL(next, req.url))
}
