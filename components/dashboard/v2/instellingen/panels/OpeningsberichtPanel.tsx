"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { VariableChips } from "../VariableChips";
import { WaPreview } from "../WaPreview";
import {
  OPENING_VARS,
  OPENING_DEFAULTS,
  OPENING_TEMPLATES,
} from "../instellingen-data";
import { requestTemplateChange } from "@/lib/dashboard/template-actions";
import type { TemplateAanvraag } from "@/lib/dashboard/template-queries";
import { AanvraagRow } from "./AanvraagRow";
import { TemplateSubmitBanner, type SubmitStatus } from "./TemplateSubmitBanner";
import styles from "./panels.module.css";

/** template_naam → leesbaar label (alleen de openingsbericht-templates). */
const OPENING_LABEL: Record<string, string> = Object.fromEntries(
  OPENING_TEMPLATES.map((t) => [t.key, t.label]),
);
const OPENING_KEYS = new Set(OPENING_TEMPLATES.map((t) => t.key));

interface OpeningsberichtPanelProps {
  templates: Record<string, string>;
  activeTab: string;
  onTab: (tab: string) => void;
  onChange: (tab: string, tekst: string) => void;
  /** Template-aanvragen (incl. reminders); we tonen alleen de openingsbericht-rijen. */
  aanvragen: TemplateAanvraag[];
  /** false in de demo-fallback (geen sessie): er wordt dan niets ingediend. */
  live: boolean;
  /**
   * Registreert de indien-functie bij de parent (InstellingenClient), zodat de
   * globale "Opslaan"-knop de wijziging(en) indient. null = deregistreren.
   */
  onRegisterSubmit?: (handle: (() => Promise<void>) | null) => void;
}

/**
 * Openingsbericht: Meta-template per dienst, bewerkbaar met variabelen en
 * WhatsApp-preview. Een wijziging is geen "opslaan" maar een AANVRAAG: bij
 * indienen loopt requestTemplateChange (Slack-melding naar Frontlix + audit),
 * waarna Meta de tekst handmatig goedkeurt. De globale Opslaan-knop roept de
 * hier geregistreerde indien-functie aan; de statusmelding hieronder bevestigt
 * dat het is ingediend.
 */
export function OpeningsberichtPanel({
  templates,
  activeTab,
  onTab,
  onChange,
  aanvragen,
  live,
  onRegisterSubmit,
}: OpeningsberichtPanelProps) {
  const tekst = templates[activeTab] ?? "";
  const [status, setStatus] = useState<SubmitStatus>({ kind: "idle" });
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // Alleen de openingsbericht-aanvragen (reminders horen bij het Reminders-paneel).
  const eigenAanvragen = aanvragen.filter((a) => OPENING_KEYS.has(a.template_naam));

  // "Bewerken": laad de voorgestelde tekst terug in de editor, switch naar de
  // juiste tab, scroll naar de editor en focus 'm zodat zichtbaar is dat de
  // tekst is geladen. Aanpassen + Opslaan dient de bewerkte versie opnieuw in
  // (dat stuurt opnieuw een Slack-melding via requestTemplateChange).
  const bewerk = (a: TemplateAanvraag) => {
    onTab(a.template_naam);
    onChange(a.template_naam, a.voorgestelde_tekst);
    setStatus({ kind: "loaded" });
    requestAnimationFrame(() => {
      const ta = editorRef.current;
      if (!ta) return;
      ta.scrollIntoView({ behavior: "smooth", block: "center" });
      ta.focus();
      const end = ta.value.length;
      ta.setSelectionRange(end, end);
    });
  };

  // Refs zodat de geregistreerde indien-functie altijd de actuele tekst/live ziet
  // zonder bij elke toetsaanslag opnieuw te (de)registreren.
  const templatesRef = useRef(templates);
  templatesRef.current = templates;
  const liveRef = useRef(live);
  liveRef.current = live;

  // Tekst aanpassen wist een eerdere statusmelding (de aanvraag is dan stale).
  const handleChange = (tab: string, next: string) => {
    onChange(tab, next);
    setStatus((s) => (s.kind === "idle" ? s : { kind: "idle" }));
  };

  const submit = useCallback(async () => {
    const tpls = templatesRef.current;
    // Alleen indienen wat afwijkt van de standaardtekst (zelfde model als v1).
    const changed = OPENING_TEMPLATES.filter(
      (t) => (tpls[t.key] ?? "").trim() !== t.default.trim(),
    );
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
      for (const t of changed) {
        const res = await requestTemplateChange(t.key, tpls[t.key] ?? "");
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

      <div className={styles.metaWarn}>
        <strong>Let op:</strong> Meta keurt elke wijziging handmatig goed (24 tot 48 uur). Tot die tijd blijft de
        oude versie actief. Variabelen moeten exact overeenkomen met de template-parameters bij Meta.
      </div>

      <div className={styles.tabs}>
        {OPENING_TEMPLATES.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => onTab(t.key)}
            className={`${styles.tab} ${t.key === activeTab ? styles.tabActive : ""}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={styles.tplGrid}>
        <div>
          <div className={styles.fieldLabel}>Template-tekst</div>
          <textarea
            ref={editorRef}
            className={styles.textarea}
            value={tekst}
            onChange={(e) => handleChange(activeTab, e.target.value)}
            rows={8}
          />
          <div className={styles.tplFoot}>
            <span className={styles.charCount}>{tekst.length}/1024 tekens</span>
            <button
              type="button"
              className={styles.resetLink}
              onClick={() => handleChange(activeTab, OPENING_DEFAULTS[activeTab] ?? "")}
            >
              Herstel naar standaard
            </button>
          </div>
          <VariableChips vars={OPENING_VARS} onInsert={(v) => handleChange(activeTab, `${tekst} ${v}`)} />
        </div>
        <div>
          <div className={styles.previewLabel}>Voorbeeld bij de klant</div>
          <WaPreview tekst={tekst} />
        </div>
      </div>

      {eigenAanvragen.length > 0 && (
        <div className={styles.aanvraagBox}>
          <div className={styles.aanvraagTitle}>Jouw aanvragen</div>
          <div className={styles.aanvraagList}>
            {eigenAanvragen.map((a) => (
              <AanvraagRow
                key={a.id}
                aanvraag={a}
                label={OPENING_LABEL[a.template_naam] ?? a.template_naam}
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
