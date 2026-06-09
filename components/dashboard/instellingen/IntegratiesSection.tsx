'use client'

import { useEffect, useState } from 'react'
import { Calendar } from 'lucide-react'
import styles from './IntegratiesSection.module.css'

export interface IntegratiesSectionProps {
  connected: boolean
  googleEmail: string | null
  calendarId: string | null
}

interface GoogleCalendar {
  id: string
  summary: string
  primary: boolean
}

export function IntegratiesSection({ connected, googleEmail, calendarId }: IntegratiesSectionProps) {
  const [busy, setBusy] = useState(false)

  const [calendars, setCalendars] = useState<GoogleCalendar[]>([])
  const [selectedId, setSelectedId] = useState<string>(calendarId ?? 'primary')
  const [loadingCalendars, setLoadingCalendars] = useState(false)
  const [calendarError, setCalendarError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!connected) return
    let cancelled = false
    setLoadingCalendars(true)
    setCalendarError(null)
    fetch('/api/integrations/google-calendar/calendars')
      .then(async (res) => {
        if (!res.ok) throw new Error('Kon agenda’s niet ophalen')
        return (await res.json()) as { calendars: GoogleCalendar[] }
      })
      .then((data) => {
        if (cancelled) return
        setCalendars(data.calendars)
      })
      .catch(() => {
        if (cancelled) return
        setCalendarError('Agenda’s ophalen mislukt. Probeer het later opnieuw.')
      })
      .finally(() => {
        if (!cancelled) setLoadingCalendars(false)
      })
    return () => {
      cancelled = true
    }
  }, [connected])

  async function disconnect() {
    setBusy(true)
    await fetch('/api/integrations/google-calendar/disconnect', { method: 'POST' })
    window.location.href = '/instellingen?section=integraties'
  }

  async function saveCalendar() {
    setSaving(true)
    setSaved(false)
    setCalendarError(null)
    try {
      const res = await fetch('/api/integrations/google-calendar/select-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calendarId: selectedId }),
      })
      if (!res.ok) throw new Error('Opslaan mislukt')
      setSaved(true)
    } catch {
      setCalendarError('Opslaan mislukt. Probeer het opnieuw.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`${styles.card} dash-card`}>
      <div className={styles.cardHead}>
        <Calendar size={18} />
        <div>
          <div className={styles.cardTitle}>Google Agenda</div>
          <div className={styles.cardSub}>
            Koppel je agenda zodat de bot je vrije tijden ziet en afspraken inplant.
          </div>
        </div>
      </div>

      <div className={styles.body}>
        {connected ? (
          <>
            <div className={styles.statusRow}>
              <span className={styles.statusLabel}>Gekoppeld account</span>
              <span>
                <strong>{googleEmail ?? 'onbekend account'}</strong> (agenda: {calendarId ?? 'primary'})
              </span>
            </div>

            <div className={styles.picker}>
              <label className={styles.statusLabel} htmlFor="gcal-calendar">
                In welke agenda mag de bot plannen?
              </label>
              {loadingCalendars ? (
                <p className={styles.pickerHint}>Agenda’s laden…</p>
              ) : (
                <div className={styles.pickerRow}>
                  <select
                    id="gcal-calendar"
                    className={styles.select}
                    value={selectedId}
                    onChange={(e) => {
                      setSelectedId(e.target.value)
                      setSaved(false)
                    }}
                    disabled={saving || calendars.length === 0}
                  >
                    {calendars.length === 0 && (
                      <option value={selectedId}>{calendarId ?? 'primary'}</option>
                    )}
                    {calendars.map((cal) => (
                      <option key={cal.id} value={cal.id}>
                        {cal.summary}
                        {cal.primary ? ' (hoofdagenda)' : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={saveCalendar}
                    disabled={saving || loadingCalendars || calendars.length === 0}
                  >
                    {saving ? 'Bezig…' : 'Opslaan'}
                  </button>
                </div>
              )}
              {saved && <p className={styles.pickerOk}>Opgeslagen.</p>}
              {calendarError && <p className={styles.pickerError}>{calendarError}</p>}
            </div>

            <div className={styles.actions}>
              <a className={styles.primaryBtn} href="/api/integrations/google-calendar/authorize">
                Opnieuw koppelen
              </a>
              <button type="button" className={styles.secondaryBtn} onClick={disconnect} disabled={busy}>
                {busy ? 'Bezig…' : 'Ontkoppelen'}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className={styles.intro}>
              Koppel je Google Agenda zodat de bot je vrije tijden ziet en afspraken inplant.
            </p>
            <div className={styles.actions}>
              <a className={styles.primaryBtn} href="/api/integrations/google-calendar/authorize">
                Koppel Google Agenda
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
