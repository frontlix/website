'use client'

// Vangnet voor render-fouten in het v2-dashboard. Zonder deze boundary valt elke
// client-side render-fout terug op de kale "Application error: a client-side
// exception has occurred" zonder uitleg. Deze boundary toont een nette fallback
// met een herstelknop EN logt de echte fout (message + digest), zodat de oorzaak
// van een eventuele crash zichtbaar wordt i.p.v. verborgen.

import { useEffect } from 'react'
import { reportClientError } from '@/lib/dashboard/report-client-error'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Echte fout naar de console, zodat hij in de browser + logs terug te vinden is.
    console.error('[dashboard] render-fout opgevangen:', error)
    // Rookmelder: meld de crash naar Slack (best-effort, blokkeert de UI niet).
    reportClientError('v2-dashboard', error)
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
          background: 'var(--rb-card, #ffffff)',
          border: '1px solid var(--rb-line, #e5e7eb)',
          borderRadius: 14,
          padding: '28px 24px',
          color: 'var(--rb-ink, #1a1a1a)',
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 6px' }}>
          Er ging iets mis bij het laden
        </h2>
        <p
          style={{
            fontSize: 14,
            lineHeight: 1.5,
            color: 'var(--rb-muted, #6b7280)',
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
            background: 'var(--rb-accent, #002d63)',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          Probeer opnieuw
        </button>
        {error.digest ? (
          <div style={{ marginTop: 14, fontSize: 11, color: 'var(--rb-muted, #9ca3af)' }}>
            Foutcode: {error.digest}
          </div>
        ) : null}
      </div>
    </div>
  )
}
