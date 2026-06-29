'use client'

// Vangnet voor render-fouten in de mobiele dashboard-tree (route-group (app)).
// Spiegelt de v2-error-boundary: zonder deze boundary valt een client-side
// render-fout terug op de kale "Application error" zonder uitleg. Toont een
// nette fallback met herstelknop EN logt de echte fout (message + digest).

import { useEffect } from 'react'
import { reportClientError } from '@/lib/dashboard/report-client-error'

export default function MobileDashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[dashboard mobiel] render-fout opgevangen:', error)
    // Rookmelder: meld de crash naar Slack (best-effort, blokkeert de UI niet).
    reportClientError('mobiel-dashboard', error)
  }, [error])

  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 440,
          width: '100%',
          textAlign: 'center',
          background: 'var(--color-surface, #ffffff)',
          border: '1px solid var(--color-border, #e5e7eb)',
          borderRadius: 14,
          padding: '28px 24px',
          color: 'var(--color-text, #1a1a1a)',
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 6px' }}>
          Er ging iets mis bij het laden
        </h2>
        <p
          style={{
            fontSize: 14,
            lineHeight: 1.5,
            color: 'var(--color-text-muted, #6b7280)',
            margin: '0 0 18px',
          }}
        >
          Probeer het opnieuw. Blijft het misgaan, ververs dan de pagina of laat het ons weten.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '10px 18px',
            border: 'none',
            borderRadius: 10,
            background: 'var(--color-primary, #002d63)',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          Probeer opnieuw
        </button>
        {error.digest ? (
          <div style={{ marginTop: 14, fontSize: 11, color: 'var(--color-text-muted, #9ca3af)' }}>
            Foutcode: {error.digest}
          </div>
        ) : null}
      </div>
    </div>
  )
}
