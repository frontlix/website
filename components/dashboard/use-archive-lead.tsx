'use client'

// Gedeelde archiveer-flow voor desktop (v2) én mobiel. Eén hook die overal
// gebruikt wordt waar een lead gearchiveerd wordt, zodat de afspraak-bevestiging
// op alle plekken identiek werkt zonder dat elke knop de afspraakdatum hoeft te
// kennen: de server-action archiveLead beslist (hij leest de afspraak) en geeft
// bij een toekomstige afspraak { needsAppointmentDecision, afspraakDatum } terug.
//
// Gebruik in een component:
//   const { requestArchive, archiveDialog } = useArchiveLead({ onArchived: () => router.refresh() })
//   ...roep requestArchive(leadId) aan i.p.v. archiveLead(leadId)...
//   ...render {archiveDialog} ergens in de JSX...

import { useCallback, useState } from 'react'
import { CalendarX2, X } from 'lucide-react'
import { archiveLead } from '@/lib/dashboard/lead-actions'

type Pending = { leadId: string; afspraakDatum: string }

export interface UseArchiveLeadOptions {
  /** Aangeroepen na een geslaagde archivering (meestal router.refresh of een
   *  lokale state-update). */
  onArchived: () => void
  /** Optioneel: eigen foutafhandeling. Zonder dit valt het terug op window.alert. */
  onError?: (message: string) => void
}

export function useArchiveLead({ onArchived, onError }: UseArchiveLeadOptions) {
  const [pending, setPending] = useState<Pending | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reportError = useCallback(
    (msg: string) => {
      if (onError) onError(msg)
      else if (typeof window !== 'undefined') window.alert(msg)
    },
    [onError],
  )

  // Stap 1: probeer te archiveren. Geen afspraak → meteen klaar. Toekomstige
  // afspraak → open de bevestiging.
  const requestArchive = useCallback(
    (leadId: string) => {
      setError(null)
      setBusy(true)
      void (async () => {
        try {
          const res = await archiveLead(leadId)
          if (res.ok) {
            onArchived()
          } else if ('needsAppointmentDecision' in res && res.needsAppointmentDecision) {
            setPending({ leadId, afspraakDatum: res.afspraakDatum })
          } else {
            reportError(('error' in res && res.error) || 'Archiveren mislukt.')
          }
        } finally {
          setBusy(false)
        }
      })()
    },
    [onArchived, reportError],
  )

  // Stap 2: de keuze uit de dialoog.
  const decide = useCallback(
    (decision: 'cancel' | 'keep') => {
      if (!pending) return
      const { leadId } = pending
      setBusy(true)
      setError(null)
      void (async () => {
        try {
          const res = await archiveLead(leadId, { appointmentDecision: decision })
          if (res.ok) {
            setPending(null)
            onArchived()
          } else {
            setError(('error' in res && res.error) || 'Archiveren mislukt.')
          }
        } finally {
          setBusy(false)
        }
      })()
    },
    [pending, onArchived],
  )

  const close = useCallback(() => {
    if (busy) return
    setPending(null)
    setError(null)
  }, [busy])

  const archiveDialog = pending ? (
    <ArchiveAppointmentDialog
      afspraakDatum={pending.afspraakDatum}
      busy={busy}
      error={error}
      onCancelAndArchive={() => decide('cancel')}
      onKeepAndArchive={() => decide('keep')}
      onClose={close}
    />
  ) : null

  return { requestArchive, archiveDialog, archiving: busy }
}

function formatAfspraak(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'de geplande datum'
  const datum = new Intl.DateTimeFormat('nl-NL', {
    timeZone: 'Europe/Amsterdam',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(d)
  const tijd = new Intl.DateTimeFormat('nl-NL', {
    timeZone: 'Europe/Amsterdam',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
  return tijd === '00:00' ? datum : `${datum} om ${tijd}`
}

interface DialogProps {
  afspraakDatum: string
  busy: boolean
  error: string | null
  onCancelAndArchive: () => void
  onKeepAndArchive: () => void
  onClose: () => void
}

function ArchiveAppointmentDialog({
  afspraakDatum,
  busy,
  error,
  onCancelAndArchive,
  onKeepAndArchive,
  onClose,
}: DialogProps) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      role="presentation"
      onClick={busy ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Lead met afspraak archiveren"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          maxWidth: 420,
          width: '100%',
          background: 'var(--rb-card, var(--color-surface, #ffffff))',
          color: 'var(--rb-ink, var(--color-text, #1a1a1a))',
          border: '1px solid var(--rb-line, var(--color-border, #e5e7eb))',
          borderRadius: 16,
          padding: '26px 22px 20px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Sluiten"
          disabled={busy}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            border: 'none',
            background: 'transparent',
            color: 'var(--rb-muted, var(--color-text-muted, #6b7280))',
            cursor: busy ? 'default' : 'pointer',
            padding: 4,
            lineHeight: 0,
          }}
        >
          <X size={16} strokeWidth={2.4} />
        </button>

        <div
          aria-hidden="true"
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(234,88,12,0.12)',
            color: '#ea580c',
            marginBottom: 12,
          }}
        >
          <CalendarX2 size={22} strokeWidth={2.2} />
        </div>

        <h2 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 6px' }}>
          Deze lead heeft nog een afspraak
        </h2>
        <p
          style={{
            fontSize: 14,
            lineHeight: 1.5,
            color: 'var(--rb-muted, var(--color-text-muted, #6b7280))',
            margin: '0 0 16px',
          }}
        >
          Er staat nog een afspraak gepland op{' '}
          <strong style={{ color: 'var(--rb-ink, var(--color-text, #1a1a1a))' }}>
            {formatAfspraak(afspraakDatum)}
          </strong>
          . Wat wil je doen?
        </p>

        {error ? (
          <p style={{ fontSize: 13, color: '#dc2626', margin: '0 0 12px' }}>{error}</p>
        ) : null}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            type="button"
            onClick={onCancelAndArchive}
            disabled={busy}
            style={{
              padding: '11px 14px',
              border: 'none',
              borderRadius: 10,
              background: 'var(--rb-accent, var(--color-primary, #002d63))',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: 14,
              cursor: busy ? 'default' : 'pointer',
              opacity: busy ? 0.7 : 1,
            }}
          >
            {busy ? 'Bezig…' : 'Afspraak annuleren én archiveren'}
          </button>
          <button
            type="button"
            onClick={onKeepAndArchive}
            disabled={busy}
            style={{
              padding: '11px 14px',
              borderRadius: 10,
              border: '1px solid var(--rb-line, var(--color-border, #d1d5db))',
              background: 'transparent',
              color: 'var(--rb-ink, var(--color-text, #1a1a1a))',
              fontWeight: 600,
              fontSize: 14,
              cursor: busy ? 'default' : 'pointer',
            }}
          >
            Archiveren, afspraak laten staan
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            style={{
              padding: '9px 14px',
              border: 'none',
              borderRadius: 10,
              background: 'transparent',
              color: 'var(--rb-muted, var(--color-text-muted, #6b7280))',
              fontWeight: 500,
              fontSize: 13,
              cursor: busy ? 'default' : 'pointer',
            }}
          >
            Annuleren
          </button>
        </div>
      </div>
    </div>
  )
}
