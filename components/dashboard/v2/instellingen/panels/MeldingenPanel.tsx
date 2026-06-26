"use client";

import { useState, useTransition } from "react";
import { Clock, CheckCircle2 } from "lucide-react";
import {
  togglePrefAction,
  setDailyDigestTijdAction,
} from "@/lib/dashboard/notifications/prefs-actions";
import { setKlusStatusMelden } from "@/lib/dashboard/meldingen-actions";
import { enablePush, disablePush } from "@/lib/dashboard/notifications/push-client";
import {
  EVENT_TYPES_ORDERED,
  KANALEN_ORDERED,
  EVENT_LABELS,
  KANAAL_LABELS,
  KANAAL_FASE,
  WHATSAPP_LIVE_EVENTS,
  type NotificationEventType,
  type NotificationKanaal,
  type NotificationPreferenceRow,
} from "@/lib/dashboard/notifications/types";
import type { NotificationSetting } from "../instellingen-data";
import styles from "./MeldingenPanel.module.css";

/**
 * Meldingen (volledige grid). v2-port van de werkende v1 NotificatiesEditor:
 * event-types x kanalen (in_app/email/push/whatsapp) met per-cel toggle,
 * fase-gating (isCellLive), WhatsApp partial-live, daily-digest-tijd-setter en
 * de push-permission-flow. Het paneel is zelfvoorzienend: het houdt zijn eigen
 * grid-state vast en roept de bestaande server-actions direct aan, zodat het
 * niet afhangt van een collapsed parent-toggle.
 *
 * Props:
 * - initialPrefs (voorkeur): de ruwe notification_preferences-rijen. Hiermee
 *   bouwen we de per-cel initiele staat exact op.
 * - meldingen (compat / fallback): de collapsed event-toggles die de huidige
 *   InstellingenClient doorgeeft. Zonder initialPrefs leiden we de in_app-cel
 *   hieruit af zodat het paneel ook werkt voordat de pagina de ruwe prefs
 *   doorgeeft.
 * - initialDigestTijd: HH:MM voor de daily-digest-tijd-setter (default 08:00).
 * - live: false in de demo-fallback (geen sessie) -> acties zijn no-op.
 * - onToggle: optionele callback naar de parent-state (compat), puur cosmetisch.
 */

const LIVE_FASE = 3; // toggles voor kanalen met fase > LIVE_FASE disabled (fase 4 = whatsapp)

/**
 * Events die (nog) door geen enkel systeem worden aangemaakt en dus geen
 * melding opleveren, ongeacht het kanaal. Nu: 'nieuwe_review' (er is nog geen
 * reviews-systeem dat 'm aanmaakt). Alle kanalen tonen dan "Binnenkort".
 */
const EVENT_NIET_LIVE: Set<NotificationEventType> = new Set(["nieuwe_review"]);

/**
 * Bepaalt per (event, kanaal) of de toggle live/interactief is.
 * - Events in EVENT_NIET_LIVE: nooit (er gaat nog geen melding af).
 * - WhatsApp: alleen live voor events in WHATSAPP_LIVE_EVENTS (rest "Binnenkort").
 * - Overige kanalen: live zodra hun fase <= LIVE_FASE.
 */
function isCellLive(evt: NotificationEventType, kn: NotificationKanaal): boolean {
  if (EVENT_NIET_LIVE.has(evt)) return false;
  if (kn === "whatsapp") return WHATSAPP_LIVE_EVENTS.has(evt);
  return KANAAL_FASE[kn] <= LIVE_FASE;
}

/** titel (zoals in `meldingen`) -> event_type, afgeleid uit EVENT_LABELS. */
const EVENT_BY_TITEL: Record<string, NotificationEventType> = Object.fromEntries(
  EVENT_TYPES_ORDERED.map((e) => [EVENT_LABELS[e].titel, e]),
) as Record<string, NotificationEventType>;

interface MeldingenPanelProps {
  /** Ruwe prefs-rijen (voorkeur). Hiermee wordt de grid exact opgebouwd. */
  initialPrefs?: NotificationPreferenceRow[];
  /** Collapsed event-toggles (compat-fallback als initialPrefs ontbreekt). */
  meldingen?: NotificationSetting[];
  /** HH:MM, daily-digest-tijd (default 08:00). */
  initialDigestTijd?: string;
  /** Staat de "Klus afronden"-actie aan (tenant_settings.klus_status_melden)? */
  initialKlusStatusMelden?: boolean;
  /** false in de demo-fallback: server-actions zijn dan no-op. */
  live?: boolean;
  /** Compat: optionele parent-callback bij een toggle (cosmetisch). */
  onToggle?: (titel: string, aan: boolean) => void;
}

export function MeldingenPanel({
  initialPrefs,
  meldingen,
  initialDigestTijd = "08:00",
  initialKlusStatusMelden = false,
  live = true,
  onToggle,
}: MeldingenPanelProps) {
  // Per-cel initiele staat: "event|kanaal" -> enabled.
  const [prefs, setPrefs] = useState<Map<string, boolean>>(() =>
    buildInitialMap(initialPrefs, meldingen),
  );
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleToggle(evt: NotificationEventType, kanaal: NotificationKanaal) {
    const key = `${evt}|${kanaal}`;
    const current = prefs.get(key) ?? false;
    const next = !current;

    // Optimistic update + compat-callback naar de parent.
    setPrefs((prev) => new Map(prev).set(key, next));
    setSavingKey(key);
    onToggle?.(EVENT_LABELS[evt].titel, next);

    if (!live) {
      // Demo-fallback: geen server-call, alleen lokale staat.
      setSavingKey(null);
      return;
    }

    startTransition(async () => {
      // Push heeft een extra stap: browser-permission + subscribe. Doen we VOOR
      // de pref-update, zodat een geweigerde permission niet leidt tot een
      // "aan"-staande pref zonder werkende subscription.
      if (kanaal === "push") {
        const pushResult = next ? await enablePush() : await disablePush();
        if (!pushResult.ok) {
          setPrefs((prev) => new Map(prev).set(key, current));
          setSavingKey(null);
          onToggle?.(EVENT_LABELS[evt].titel, current);
          alert(pushNiceError(pushResult.reason));
          return;
        }
      }

      const result = await togglePrefAction(evt, kanaal, next);
      setSavingKey(null);
      if (!result.ok) {
        // Revert + waarschuw de gebruiker.
        setPrefs((prev) => new Map(prev).set(key, current));
        onToggle?.(EVENT_LABELS[evt].titel, current);
        alert(result.error);
      }
    });
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.table}>
        <div className={styles.head}>
          <div className={styles.headEvent}>Melding</div>
          {KANALEN_ORDERED.map((kn) => (
            <div key={kn} className={styles.headCol}>
              {KANAAL_LABELS[kn]}
            </div>
          ))}
        </div>

        {EVENT_TYPES_ORDERED.map((evt) => (
          <div key={evt} className={styles.row}>
            <div className={styles.rowMain}>
              <div className={styles.rowTitle}>{EVENT_LABELS[evt].titel}</div>
              <div className={styles.rowSub}>{EVENT_LABELS[evt].sub}</div>
            </div>
            {KANALEN_ORDERED.map((kn) => {
              const key = `${evt}|${kn}`;
              const enabled = prefs.get(key) ?? false;
              const cellLive = isCellLive(evt, kn);
              const isSaving = savingKey === key;
              return (
                <div key={kn} className={styles.cell}>
                  {cellLive ? (
                    <button
                      type="button"
                      role="switch"
                      aria-checked={enabled}
                      aria-label={`${EVENT_LABELS[evt].titel} via ${KANAAL_LABELS[kn]}`}
                      disabled={isSaving}
                      onClick={() => handleToggle(evt, kn)}
                      className={`${styles.toggle} ${enabled ? styles.toggleOn : ""} ${
                        isSaving ? styles.toggleSaving : ""
                      }`}
                    >
                      <span className={styles.knob} />
                    </button>
                  ) : (
                    /* Kanaal nog niet beschikbaar voor dit event: net label
                       i.p.v. een verwarrende uitgegrijsde toggle. */
                    <span className={styles.binnenkort}>Binnenkort</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <KlusStatusRow initial={initialKlusStatusMelden} live={live} />
      <DigestTijdRow initial={initialDigestTijd} live={live} />
    </div>
  );
}

/**
 * Aparte toggle (los van de grid): vraag na een afspraak of de klus doorging.
 * Aan = het Overzicht toont na een voorbije afspraak een herinnering in
 * "Eerst dit doen" om de klus af te ronden of als geblokkeerd te markeren.
 * Slaat direct op via setKlusStatusMelden (optimistic + revert).
 */
function KlusStatusRow({ initial, live }: { initial: boolean; live: boolean }) {
  const [aan, setAan] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [, startTransition] = useTransition();

  function handleToggle() {
    const next = !aan;
    setAan(next); // optimistic
    if (!live) return; // demo-fallback: alleen lokale staat
    setSaving(true);
    startTransition(async () => {
      const result = await setKlusStatusMelden(next);
      setSaving(false);
      if (!result.ok) {
        setAan(!next); // revert
        alert(result.error);
      }
    });
  }

  return (
    <div className={styles.digestRow}>
      <div className={styles.digestIcon}>
        <CheckCircle2 size={18} strokeWidth={2} />
      </div>
      <div className={styles.digestMain}>
        <div className={styles.digestLabel}>
          Vraag na een afspraak of de klus doorging
        </div>
        <div className={styles.digestSub}>
          Je krijgt dan een herinnering in &quot;Eerst dit doen&quot; om de klus af te ronden
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={aan}
        aria-label="Vraag na een afspraak of de klus doorging"
        disabled={saving}
        onClick={handleToggle}
        className={`${styles.toggle} ${aan ? styles.toggleOn : ""} ${
          saving ? styles.toggleSaving : ""
        }`}
      >
        <span className={styles.knob} />
      </button>
    </div>
  );
}

/**
 * Tijd-input voor de "Dagelijkse samenvatting". Per-tenant instelbaar
 * (single-tenant nu, dus globaal). Slaat op bij blur via de bestaande
 * server-action.
 */
function DigestTijdRow({ initial, live }: { initial: string; live: boolean }) {
  const [tijd, setTijd] = useState(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "ok" | "err">("idle");
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleBlur() {
    if (tijd === initial) return;
    if (!live) {
      // Demo-fallback: doe alsof het lukte, geen server-call.
      setStatus("ok");
      window.setTimeout(() => setStatus("idle"), 1500);
      return;
    }
    setStatus("saving");
    startTransition(async () => {
      const result = await setDailyDigestTijdAction(tijd);
      if (result.ok) {
        setStatus("ok");
        window.setTimeout(() => setStatus("idle"), 1500);
      } else {
        setStatus("err");
        setErrMsg(result.error);
      }
    });
  }

  return (
    <div className={styles.digestRow}>
      <div className={styles.digestIcon}>
        <Clock size={18} strokeWidth={2} />
      </div>
      <div className={styles.digestMain}>
        <div className={styles.digestLabel}>Tijdstip dagelijkse samenvatting</div>
        <div className={styles.digestSub}>
          Wanneer de ochtend-digest binnenkomt (Europe/Amsterdam)
        </div>
      </div>
      <input
        type="time"
        value={tijd}
        onChange={(e) => setTijd(e.target.value)}
        onBlur={handleBlur}
        className={styles.digestInput}
        aria-label="Tijdstip dagelijkse samenvatting"
      />
      <div
        className={`${styles.digestStatus} ${
          status === "ok" ? styles.digestStatusOk : ""
        } ${status === "err" ? styles.digestStatusErr : ""}`}
      >
        {status === "saving" && "opslaan"}
        {status === "ok" && "opgeslagen"}
        {status === "err" && (errMsg ?? "mislukt")}
      </div>
    </div>
  );
}

/** User-vriendelijke foutmelding voor de mislukte push-permission-flow. */
function pushNiceError(reason: string | undefined): string {
  switch (reason) {
    case "unsupported":
      return "Deze browser ondersteunt geen push-notificaties.";
    case "denied":
      return "Notificatie-permissie is geweigerd. Open de browser-instellingen om dit aan te zetten.";
    case "no-vapid":
      return "Push is server-side nog niet geconfigureerd (VAPID-keys ontbreken).";
    case "save-failed":
      return "Subscription kon niet worden opgeslagen, probeer opnieuw.";
    default:
      return "Push kon niet worden ingeschakeld, probeer opnieuw.";
  }
}

/**
 * Bouwt de initiele per-cel-staat ("event|kanaal" -> enabled).
 * - Met initialPrefs: exact uit de ruwe rijen.
 * - Zonder (compat): leidt de in_app-cel af uit de collapsed `meldingen`-
 *   toggles; de overige kanalen starten uit (de echte staat komt zodra de
 *   pagina initialPrefs doorgeeft).
 */
function buildInitialMap(
  initialPrefs: NotificationPreferenceRow[] | undefined,
  meldingen: NotificationSetting[] | undefined,
): Map<string, boolean> {
  const map = new Map<string, boolean>();
  if (initialPrefs && initialPrefs.length > 0) {
    for (const p of initialPrefs) {
      map.set(`${p.event_type}|${p.kanaal}`, p.enabled);
    }
    return map;
  }
  if (meldingen) {
    for (const m of meldingen) {
      const evt = EVENT_BY_TITEL[m.titel];
      if (evt) map.set(`${evt}|in_app`, m.aan);
    }
  }
  return map;
}
