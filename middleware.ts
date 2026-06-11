import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const DASHBOARD_HOSTS = new Set([
  'app.frontlix.com',
  'app.localhost:3000', // lokaal: voeg "127.0.0.1 app.localhost" toe aan /etc/hosts
  // LAN-IP voor real-device testing op zelfde WiFi (bv. iPhone). Pas dit
  // adres aan als het IP van de Mac wijzigt. Heeft geen effect in
  // productie, productie luistert alleen op de app.frontlix.com host.
  '192.168.1.228:3000',
])

// Paden binnen de dashboard-host die GEEN session vereisen.
// `/wachtwoord-reset` en `/uitnodiging` krijgen pas tijdens het bezoek
// een sessie via de Supabase recovery-link, ze moeten dus bereikbaar
// zijn vanuit een uitgelogde state.
const PUBLIC_DASHBOARD_PATHS = new Set([
  '/login',
  '/signup',
  '/wachtkamer',
  '/wachtwoord-vergeten',
  '/wachtwoord-reset',
  '/uitnodiging',
  '/callback',
])

function isDashboardHost(host: string | null): boolean {
  return host !== null && DASHBOARD_HOSTS.has(host)
}

// Bestanden in /public/ die door de dashboard-host als statische assets
// behandeld moeten worden (i.p.v. via auth-check te lopen).
const STATIC_ASSET_EXTENSIONS = /\.(png|jpe?g|svg|gif|webp|ico|css|js|woff2?|ttf|otf|json|txt|xml|map)$/i

function isAssetPath(pathname: string): boolean {
  return pathname.startsWith('/_next') ||
         pathname.startsWith('/api') ||
         STATIC_ASSET_EXTENSIONS.test(pathname)
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host')
  const { pathname } = request.nextUrl

  // ─────────────────────────────────────────────────────────────────────
  // MARKETING HOST (frontlix.com): block dashboard-paden, laat rest door
  // ─────────────────────────────────────────────────────────────────────
  if (!isDashboardHost(host)) {
    if (pathname.startsWith('/dashboard')) {
      return new NextResponse(null, { status: 404 })
    }
    return NextResponse.next()
  }

  // ─────────────────────────────────────────────────────────────────────
  // DASHBOARD HOST (app.frontlix.com): rewrite naar /dashboard prefix
  // ─────────────────────────────────────────────────────────────────────

  // Assets en API routes laten we ongewijzigd door, die zitten niet in /dashboard.
  if (isAssetPath(pathname)) {
    return NextResponse.next()
  }

  // Dev-only pagina's (mobile-component sandboxes onder /_dev/) zijn in
  // productie niet bereikbaar. In dev werken ze normaal door zodat we ze
  // op real-device kunnen testen.
  if (pathname.startsWith('/_dev/') && process.env.NODE_ENV === 'production') {
    return new NextResponse(null, { status: 404 })
  }

  // Als iemand expliciet /dashboard/... typed op de dashboard-host,
  // strippen we die prefix zodat de canonical URL altijd zonder is.
  if (pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone()
    url.pathname = pathname.replace(/^\/dashboard/, '') || '/'
    return NextResponse.redirect(url)
  }

  // Bouw het response-object dat we doorreiken (cookies kunnen erin landen).
  const response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL_DASHBOARD!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_DASHBOARD!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Rebrand v2 preview (/v2/*): in dev zonder login bereikbaar zodat de
  // nieuwe look snel te vergelijken is (draait op demo-data, geen PII). In
  // productie blijft 'ie achter auth. Verwijderen zodra v2 het bestaande
  // dashboard vervangt.
  const isV2Preview = pathname === '/v2' || pathname.startsWith('/v2/')
  const isPublic =
    PUBLIC_DASHBOARD_PATHS.has(pathname) ||
    (isV2Preview && process.env.NODE_ENV !== 'production')

  // Reeds ingelogd + op login/signup pagina → redirect naar het Overzicht
  if (user && (pathname === '/login' || pathname === '/signup')) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // Niet ingelogd + op een private pagina → naar /login
  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // Rewrite: app.frontlix.com/leads → intern /dashboard/leads
  const rewriteUrl = request.nextUrl.clone()
  rewriteUrl.pathname = `/dashboard${pathname === '/' ? '' : pathname}`

  const rewritten = NextResponse.rewrite(rewriteUrl, { request })
  // Kopieer de Supabase auth-cookies door:
  response.cookies.getAll().forEach((c) => {
    rewritten.cookies.set(c.name, c.value, c)
  })
  // Vangnet: geen enkele dashboard-respons (HTML/RSC) mag stale gecachet worden.
  // Authed pagina's zijn al dynamisch; dit dekt ook de RSC-payloads en voorkomt
  // dat een toekomstige pagina per ongeluk weer met s-maxage gecachet raakt
  // (→ deployment-skew/login-loop). Content-gehashte /_next-assets vallen hier
  // niet onder: die keren al via NextResponse.next() terug met hun eigen cache.
  rewritten.headers.set('Cache-Control', 'no-store, must-revalidate')
  return rewritten
}

export const config = {
  matcher: [
    /*
     * Match alle paden behalve standaard Next.js assets. De middleware
     * doet zelf nog een fijnere isAssetPath()-check intern.
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
