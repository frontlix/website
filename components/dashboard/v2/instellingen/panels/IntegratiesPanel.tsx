"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Check, AlertTriangle, Info } from "lucide-react";
import { StatusPill } from "@/components/dashboard/v2/ui";
import styles from "./IntegratiesPanel.module.css";

export interface IntegratiesPanelProps {
  /** Is de Google Agenda gekoppeld? (calendar_connections-rij aanwezig) */
  connected: boolean;
  /** Het gekoppelde Google-account-adres, indien bekend. */
  googleEmail: string | null;
  /** De gekozen agenda-id waarin Surface mag plannen. */
  calendarId: string | null;
}

interface GoogleCalendar {
  id: string;
  summary: string;
  primary: boolean;
}

/**
 * Google Agenda-koppeling. Port van v1 IntegratiesSection: status (gekoppeld of
 * niet), gekoppeld account, agenda-kiezer en koppelen/opnieuw-koppelen/
 * ontkoppelen. Hergebruikt EXACT de bestaande API-routes:
 *   GET  /api/integrations/google-calendar/calendars       (agenda-lijst)
 *   POST /api/integrations/google-calendar/select-calendar (kalender kiezen)
 *   POST /api/integrations/google-calendar/disconnect      (ontkoppelen)
 *   link /api/integrations/google-calendar/authorize       (OAuth-redirect)
 * Geen nieuwe DB-logica. Koppelen werkt alleen op de live site (de
 * OAuth-callback is daar geregistreerd), net als in v1.
 */
export function IntegratiesPanel({
  connected,
  googleEmail,
  calendarId,
}: IntegratiesPanelProps) {
  const [busy, setBusy] = useState(false);

  const [calendars, setCalendars] = useState<GoogleCalendar[]>([]);
  const [selectedId, setSelectedId] = useState<string>(calendarId ?? "primary");
  const [loadingCalendars, setLoadingCalendars] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Agenda-lijst ophalen zodra gekoppeld (zelfde effect als v1).
  useEffect(() => {
    if (!connected) return;
    let cancelled = false;
    setLoadingCalendars(true);
    setCalendarError(null);
    fetch("/api/integrations/google-calendar/calendars")
      .then(async (res) => {
        if (!res.ok) throw new Error("Kon agenda's niet ophalen");
        return (await res.json()) as { calendars: GoogleCalendar[] };
      })
      .then((data) => {
        if (cancelled) return;
        setCalendars(data.calendars);
      })
      .catch(() => {
        if (cancelled) return;
        setCalendarError("Agenda's ophalen mislukt. Probeer het later opnieuw.");
      })
      .finally(() => {
        if (!cancelled) setLoadingCalendars(false);
      });
    return () => {
      cancelled = true;
    };
  }, [connected]);

  async function disconnect() {
    setBusy(true);
    await fetch("/api/integrations/google-calendar/disconnect", { method: "POST" });
    window.location.reload();
  }

  async function saveCalendar() {
    setSaving(true);
    setSaved(false);
    setCalendarError(null);
    try {
      const res = await fetch("/api/integrations/google-calendar/select-calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calendarId: selectedId }),
      });
      if (!res.ok) throw new Error("Opslaan mislukt");
      setSaved(true);
    } catch {
      setCalendarError("Opslaan mislukt. Probeer het opnieuw.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className={styles.head}>
        <span className={styles.headIcon}>
          <CalendarDays size={22} />
        </span>
        <div className={styles.headBody}>
          <div className={styles.headTitleRow}>
            <span className={styles.headTitle}>Google Agenda</span>
            {connected ? (
              <StatusPill kind="new">Gekoppeld</StatusPill>
            ) : (
              <StatusPill kind="sent">Niet gekoppeld</StatusPill>
            )}
          </div>
          <div className={styles.headSub}>
            Koppel je agenda zodat Surface je vrije tijden ziet en afspraken
            automatisch inplant.
          </div>
        </div>
      </div>

      <div className={styles.body}>
        {connected ? (
          <>
            <div className={styles.accountRow}>
              <span className={styles.accountLabel}>Gekoppeld account</span>
              <span className={styles.accountValue}>
                {googleEmail ?? "onbekend account"}
              </span>
            </div>

            <div className={styles.picker}>
              <label className={styles.pickerLabel} htmlFor="gcal-calendar">
                In welke agenda mag Surface plannen?
              </label>
              {loadingCalendars ? (
                <p className={styles.pickerHint}>Agenda&apos;s laden...</p>
              ) : (
                <div className={styles.pickerRow}>
                  <select
                    id="gcal-calendar"
                    className={styles.select}
                    value={selectedId}
                    onChange={(e) => {
                      setSelectedId(e.target.value);
                      setSaved(false);
                    }}
                    disabled={saving || calendars.length === 0}
                  >
                    {calendars.length === 0 && (
                      <option value={selectedId}>{calendarId ?? "primary"}</option>
                    )}
                    {calendars.map((cal) => (
                      <option key={cal.id} value={cal.id}>
                        {cal.summary}
                        {cal.primary ? " (hoofdagenda)" : ""}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className={`${styles.btnLink} ${styles.btnSecondary}`}
                    onClick={saveCalendar}
                    disabled={saving || loadingCalendars || calendars.length === 0}
                  >
                    {saving ? "Bezig..." : "Opslaan"}
                  </button>
                </div>
              )}
              {saved && (
                <span className={`${styles.status} ${styles.statusOk}`}>
                  <Check size={13} strokeWidth={2.5} />
                  Opgeslagen.
                </span>
              )}
              {calendarError && (
                <span className={`${styles.status} ${styles.statusErr}`}>
                  <AlertTriangle size={13} />
                  {calendarError}
                </span>
              )}
            </div>

            <div className={styles.actions}>
              <a
                className={`${styles.btnLink} ${styles.btnPrimary}`}
                href="/api/integrations/google-calendar/authorize"
              >
                Opnieuw koppelen
              </a>
              <button
                type="button"
                className={`${styles.btnLink} ${styles.btnSecondary}`}
                onClick={disconnect}
                disabled={busy}
              >
                {busy ? "Bezig..." : "Ontkoppelen"}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className={styles.intro}>
              Koppel je Google Agenda zodat Surface je vrije tijden ziet en
              afspraken voor je inplant. Je kiest daarna zelf in welke agenda er
              geboekt mag worden.
            </p>
            <div className={styles.actions}>
              <a
                className={`${styles.btnLink} ${styles.btnPrimary}`}
                href="/api/integrations/google-calendar/authorize"
              >
                Koppel Google Agenda
              </a>
            </div>
          </>
        )}

        <div className={styles.liveNote}>
          <Info size={14} className={styles.liveNoteIcon} />
          <span>
            Koppelen werkt alleen op de live site. Open je dashboard op
            frontlix.com om je agenda te verbinden.
          </span>
        </div>
      </div>
    </>
  );
}
