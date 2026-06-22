import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Puppeteer mag NIET door webpack worden gebundeld — chromium binary
  // staat in node_modules en moet at-runtime gevonden worden. Zonder
  // deze marker faalt de prod-build met "Critical dependency: the
  // request of a dependency is an expression" of crasht puppeteer
  // bij launch met missing chromium.
  serverExternalPackages: ['puppeteer'],

  // Server Actions kappen de request-body standaard af op 1 MB (Next.js
  // framework-default, vóórdat de action zelf draait). De logo-upload
  // (uploadTenantLogo) belooft echter "max 2 MB", dus alles tussen 1 en
  // 2 MB faalde stilletjes met een generieke error. We tillen de
  // platform-limiet naar 3 MB: ruim boven de eigen 2 MB-check zodat die
  // de bindende grens blijft (met de nette melding i.p.v. een crash),
  // mét marge voor de multipart/form-data-overhead (~10-20 KB) die óók
  // in deze rauwe body meetelt.
  experimental: {
    serverActions: {
      bodySizeLimit: '3mb',
    },
  },

  // Sta dev-toegang vanaf het lokale LAN toe (telefoon op zelfde WiFi).
  // Zonder deze whitelist logt Next.js 15 een cross-origin warning en kan
  // het _next/* chunks of HMR-payload anders behandelen, wat op iPhone
  // Safari tot subtle hydration-mismatches leidt. Alleen dev — geen
  // effect op productie. Mijn Mac zit op 192.168.1.228; pas aan als je
  // IP wijzigt of dek het hele subnet af met '192.168.1.*'.
  allowedDevOrigins: ['192.168.1.228', '192.168.1.*'],

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ]
  },

  // Workaround voor Next.js 15.1 dev-mode chunk-graph corruption.
  //
  // Probleem: webpack's persistent filesystem cache (.next/cache/webpack/)
  // raakt tijdens hot-reload regelmatig out-of-sync met de chunk-graph,
  // waardoor de server `Cannot find module './XXXX.js'` errors gooit en
  // de hele dev-page leeg rendert. Cache lijkt te overleven na een
  // `rm -rf .next` op een manier die dezelfde bug snel weer triggert.
  //
  // Fix: in dev gebruiken we in-memory caching i.p.v. filesystem-cache.
  // Compiles zijn ietsje trager bij een cold start (geen disk-cache om uit
  // te lezen) maar HMR-stabiliteit is veel beter. Productie-builds zijn
  // ongewijzigd (config.cache wordt daar niet aangeraakt).
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = { type: 'memory' }
    }
    return config
  },
}

export default nextConfig
