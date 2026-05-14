import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
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
