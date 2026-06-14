"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, AlertTriangle } from "lucide-react";
import { VariableChips } from "../VariableChips";
import { WaPreview } from "../WaPreview";
import { REMINDER_VARS, REMINDERS_DEFAULT } from "../instellingen-data";
import type { Reminder } from "../instellingen-data";
import { requestTemplateChange } from "@/lib/dashboard/template-actions";
import { updateReminderDays } from "@/lib/dashboard/reminder-actions";
import type { TemplateAanvraag } from "@/lib/dashboard/template-queries";
import { AanvraagRow } from "./AanvraagRow";
import { TemplateSubmitBanner, type SubmitStatus } from "./TemplateSubmitBanner";
import styles from "./panels.module.css";

const BADGE_CLASS = [styles.badge1, styles.badge2, styles.badge3];

/** reminder_N → leesbaar label (uit REMINDERS_DEFAULT). */
const REMINDER_LABEL: Record<string, string> = Object.fromEntries(
  REMINDERS_DEFAULT.map((r, i) => [`reminder_${i + 1}`, r.label]),
);
const REMINDER_KEYS = new Set(REMINDERS_DEFAULT.map((_, i) => `reminder_${i + 1}`));

interface RemindersPanelProps {
  reminders: Reminder[];
  onDag: (index: number, dag: string) => void;
  onTekst: (index: number, tekst: string) => void;
  /** Template-aanvragen (incl. openingsbericht); we tonen alleen de reminder-rijen. */
  aanvragen: TemplateAanvraag[];
  /** false in de demo-fallback (geen sessie): er wordt niets opgeslagen/ingediend. */
  live: boolean;
  /** Registreert de indien-functie (template-tekst) bij de globale Opslaan-knop. */
  onRegisterSubmit?: (handle: (() => Promise<void>) | null) => void;
}

/**
 * Reminders: per opvolg-bericht het aantal dagen en de tekst. Twee soorten
 * opslag, net als v1:
 *  - DAGEN: scheduling zonder Meta-approval, slaat DIRECT op bij verlaten van
 *    het veld (updateReminderDays → tenant_settings.reminder_dag_N).
 *  - TEKST: loopt via de aanvraag-flow (requestTemplateChange → Slack + Meta).
 *    De globale Opslaan-knop dient de gewijzigde teksten in; de aanvragenlijst
 *    eronder toont de status met bewerken/annuleren (zelfde als openingsbericht).
 */
export function RemindersPanel({
  reminders,
  onDag,
  onTekst,
  aanvragen,
  live,
  onRegisterSubmit,
}: RemindersPanelProps) {
  const router = useRouter();
  const [status, setStatus] = useState<SubmitStatus>({ kind: "idle" });
  const [, startTransition] = useTransition();
  // Welke reminder sloeg net z'n dag-waarde op (voor de "Opgeslagen"-flash).
  const [dagFlash, setDagFlash] = useState<number | null>(null);
  const [dagError, setDagError] = useState<{ idx: number; msg: string } | null>(null);

  const textareaRefs = useRef<(HTMLTextAreaElement | null)[]>([]);
  // Laatst bekende geldige dag-waarden, om bij ongeldige invoer terug te zetten.
  const lastGoodDag = useRef<string[]>(reminders.map((r) => r.dag));

  // Refs zodat de geregistreerde indien-functie de actuele tekst/live ziet.
  const remindersRef = useRef(reminders);
  remindersRef.current = reminders;
  const liveRef = useRef(live);
  liveRef.current = live;

  useEffect(() => {
    if (dagFlash === null) return;
    const t = setTimeout(() => setDagFlash(null), 1800);
    return () => clearTimeout(t);
  }, [dagFlash]);

  // Auto-grow: elke reminder-textarea volgt de hoogte van z'n inhoud, zodat de
  // hele tekst zichtbaar is zonder interne scrollbalk (de pagina scrollt).
  useEffect(() => {
    for (const ta of textareaRefs.current) {
      if (!ta) continue;
      ta.style.height = "auto";
      ta.style.height = `${ta.scrollHeight}px`;
    }
  }, [reminders]);

  const reminderAanvragen = aanvragen.filter((a) => REMINDER_KEYS.has(a.template_naam));

  // Tekst aanpassen wist een eerdere indien-status.
  const handleTekst = (i: number, next: string) => {
    onTekst(i, next);
    setStatus((s) => (s.kind === "idle" ? s : { kind: "idle" }));
  };

  // Aantal dagen opslaan bij verlaten van het veld (direct, geen Meta-approval).
  const saveDag = (i: number) => {
    if (!live) return;
    const n = parseInt((reminders[i]?.dag ?? "").trim(), 10);
    if (!Number.isInteger(n) || n < 1 || n > 90) {
      onDag(i, lastGoodDag.current[i] ?? "");
      setDagError({ idx: i, msg: "Vul 1 tot 90 dagen in." });
      return;
    }
    if (String(n) === lastGoodDag.current[i]) return; // niets veranderd
    setDagError(null);
    startTransition(async () => {
      const res = await updateReminderDays((i + 1) as 1 | 2 | 3, n);
      if (res.ok) {
        lastGoodDag.current[i] = String(n);
        setDagFlash(i);
        router.refresh();
      } else {
        setDagError({ idx: i, msg: res.error });
        onDag(i, lastGoodDag.current[i] ?? "");
      }
    });
  };

  // "Bewerken": laad de aanvraag-tekst terug in de juiste reminder + scroll/focus.
  const bewerk = (a: TemplateAanvraag) => {
    const i = reminderIndex(a.template_naam);
    if (i < 0) return;
    onTekst(i, a.voorgestelde_tekst);
    setStatus({ kind: "loaded" });
    requestAnimationFrame(() => {
      const ta = textareaRefs.current[i];
      if (!ta) return;
      ta.scrollIntoView({ behavior: "smooth", block: "center" });
      ta.focus();
      const end = ta.value.length;
      ta.setSelectionRange(end, end);
    });
  };

  // Alle gewijzigde reminder-teksten indienen (via de globale Opslaan-knop).
  const submit = useCallback(async () => {
    const rs = remindersRef.current;
    const changed = rs
      .map((r, i) => ({
        key: `reminder_${i + 1}`,
        tekst: r.tekst ?? "",
        def: REMINDERS_DEFAULT[i]?.tekst ?? "",
      }))
      .filter((c) => c.tekst.trim() !== c.def.trim());
    if (changed.length === 0) {
      setStatus({ kind: "nochange" });
      return;
    }
    if (!liveRef.current) {
      setStatus({ kind: "demo" });
      return;
    }
    setStatus({ kind: "pending" });
    try {
      let ok = 0;
      for (const c of changed) {
        const res = await requestTemplateChange(c.key, c.tekst);
        if (!res.ok) {
          setStatus({ kind: "error", message: res.error });
          return;
        }
        ok++;
      }
      setStatus({ kind: "success", count: ok });
    } catch {
      setStatus({ kind: "error", message: "Indienen mislukt, probeer het opnieuw." });
    }
  }, []);

  useEffect(() => {
    onRegisterSubmit?.(submit);
    return () => onRegisterSubmit?.(null);
  }, [onRegisterSubmit, submit]);

  return (
    <>
      <TemplateSubmitBanner status={status} />

      <div className={styles.note}>
        Surface stuurt deze berichten automatisch als een klant niet op de offerte reageert. Het{" "}
        <strong className={styles.strong}>aantal dagen</strong> wordt direct opgeslagen; de{" "}
        <strong className={styles.strong}>tekst</strong> loopt via Meta-goedkeuring (klik Opslaan om in te dienen).
      </div>

      {reminders.map((r, i) => {
        const isChanged = (r.tekst ?? "").trim() !== (REMINDERS_DEFAULT[i]?.tekst ?? "").trim();
        return (
          <div key={r.label} className={styles.reminderCard}>
            <div className={styles.reminderHead}>
              <span className={`${styles.reminderBadge} ${BADGE_CLASS[i] ?? styles.badge3}`}>{i + 1}</span>
              <div className={styles.rowMain}>
                <div className={styles.reminderLabel}>{r.label}</div>
                <div className={styles.reminderSub}>{r.sub}</div>
              </div>
              <span className={styles.reminderTiming}>versturen na</span>
              <input
                className={styles.dayInput}
                value={r.dag}
                inputMode="numeric"
                onChange={(e) => onDag(i, e.target.value.replace(/[^0-9]/g, ""))}
                onBlur={() => saveDag(i)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
                aria-label={`Dagen voor ${r.label}`}
              />
              <span className={styles.reminderTiming}>dagen</span>
              {dagFlash === i && (
                <span className={styles.dayFlash}>
                  <Check size={12} strokeWidth={2.5} />
                  Opgeslagen
                </span>
              )}
              {dagError?.idx === i && (
                <span className={styles.dayErr}>
                  <AlertTriangle size={12} />
                  {dagError.msg}
                </span>
              )}
            </div>
            <div className={styles.reminderBody}>
              <div>
                <textarea
                  ref={(el) => {
                    textareaRefs.current[i] = el;
                  }}
                  className={styles.reminderTextarea}
                  value={r.tekst}
                  onChange={(e) => handleTekst(i, e.target.value)}
                  rows={5}
                />
                <div className={styles.tplFoot}>
                  <span className={styles.charCount}>{(r.tekst ?? "").length}/1024 tekens</span>
                  {isChanged && (
                    <button
                      type="button"
                      className={styles.resetLink}
                      onClick={() => handleTekst(i, REMINDERS_DEFAULT[i]?.tekst ?? "")}
                    >
                      Herstel naar standaard
                    </button>
                  )}
                </div>
                <VariableChips
                  vars={REMINDER_VARS}
                  onInsert={(v) => handleTekst(i, `${r.tekst} ${v}`)}
                  compact
                />
              </div>
              <WaPreview tekst={r.tekst} />
            </div>
          </div>
        );
      })}

      {reminderAanvragen.length > 0 && (
        <div className={styles.aanvraagBox}>
          <div className={styles.aanvraagTitle}>Jouw aanvragen</div>
          <div className={styles.aanvraagList}>
            {reminderAanvragen.map((a) => (
              <AanvraagRow
                key={a.id}
                aanvraag={a}
                label={REMINDER_LABEL[a.template_naam] ?? a.template_naam}
                onBewerk={bewerk}
                live={live}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

/** reminder_N → array-index (N-1), of -1 als de key niet past. */
function reminderIndex(key: string): number {
  const m = /^reminder_(\d+)$/.exec(key);
  if (!m) return -1;
  return parseInt(m[1], 10) - 1;
}
