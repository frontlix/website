'use client'

// Globale vangnet-boundary: vervangt de root-layout als er een render-fout in
// de root optreedt (marketingsite, auth, demo — alles wat buiten de dashboard-
// error.tsx valt). Zonder dit bestand kreeg een bezoeker de kale Next.js
// "Application error" zonder uitleg én zonder dat wij het ooit zien. Nu loggen
// we de fout én melden 'm via de Slack-rookmelder. Moet z'n eigen <html>/<body>
// renderen omdat het de root-layout vervangt.

import { useEffect } from 'react'
import { reportClientError } from '@/lib/dashboard/report-client-error'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[global] render-fout opgevangen:', error)
    reportClientError('global', error)
  }, [error])

  return (
    <html lang="nl">
      <body
        style={{
          fontFamily: 'system-ui, -apple-system, sans-serif',
          display: 'flex',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          margin: 0,
          padding: 24,
          background: '#f8fafc',
          color: '#1a1a1a',
        }}
      >
        <div style={{ maxWidth: 440, width: '100%', textAlign: 'center' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 6px' }}>
            Er ging iets mis
          </h2>
          <p style={{ fontSize: 14, lineHeight: 1.5, color: '#6b7280', margin: '0 0 18px' }}>
            Probeer het opnieuw of ververs de pagina. Blijft het misgaan, laat het ons weten.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: '10px 18px',
              border: 'none',
              borderRadius: 10,
              background: '#002d63',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Probeer opnieuw
          </button>
          {error.digest ? (
            <div style={{ marginTop: 14, fontSize: 11, color: '#9ca3af' }}>
              Foutcode: {error.digest}
            </div>
          ) : null}
        </div>
      </body>
    </html>
  )
}
