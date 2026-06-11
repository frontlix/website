import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Puppeteer mag NIET door webpack worden gebundeld — chromium binary
  // staat in node_modules en moet at-runtime gevonden worden. Zonder
  // deze marker faalt de prod-build met "Critical dependency: the
  // request of a dependency is an expression" of crasht puppeteer
  // bij launch met missing chromium.
  serverExternalPackages: ['puppeteer'],

  // Video's (5 tot 25 MB) gaan via uploadMediaAsset(formData) als Server
  // Action. Zonder verhoogde limiet faalt de upload met 413 Payload Too
  // Large voordat de actie wordt aangeroepen (default is 1 MB).
  experimental: {
    serverActions: {
      bodySizeLimit: '30mb',
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
