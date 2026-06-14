"use client";

import { Check, AlertTriangle, Loader2, Pencil } from "lucide-react";
import styles from "./panels.module.css";

/** Status van het indienen van een template-wijziging (openingsbericht/reminder). */
export type SubmitStatus =
  | { kind: "idle" }
  | { kind: "pending" }
  | { kind: "success"; count: number }
  | { kind: "nochange" }
  | { kind: "demo" }
  | { kind: "loaded" }
  | { kind: "error"; message: string };

/**
 * Statusbanner boven in een template-paneel, direct onder de Opslaan-knop.
 * Gedeeld door het Openingsbericht- en het Reminders-paneel.
 */
export function TemplateSubmitBanner({ status }: { status: SubmitStatus }) {
  if (status.kind === "idle") return null;
  if (status.kind === "pending") {
    return (
      <div className={`${styles.tplStatus} ${styles.tplStatusInfo}`}>
        <Loader2 size={14} className={styles.spin} />
        Bezig met indienen…
      </div>
    );
  }
  if (status.kind === "success") {
    return (
      <div className={`${styles.tplStatus} ${styles.tplStatusOk}`}>
        <Check size={14} strokeWidth={2.5} />
        {status.count === 1 ? "Wijziging ingediend" : `${status.count} wijzigingen ingediend`}. Meta keurt
        {status.count === 1 ? " de tekst" : " ze"} binnen 24 tot 48 uur goed.
      </div>
    );
  }
  if (status.kind === "error") {
    return (
      <div className={`${styles.tplStatus} ${styles.tplStatusErr}`}>
        <AlertTriangle size={14} />
        {status.message}
      </div>
    );
  }
  if (status.kind === "demo") {
    return (
      <div className={`${styles.tplStatus} ${styles.tplStatusInfo}`}>
        In de demo wordt er niets ingediend.
      </div>
    );
  }
  if (status.kind === "loaded") {
    return (
      <div className={`${styles.tplStatus} ${styles.tplStatusInfo}`}>
        <Pencil size={14} />
        Tekst geladen in de editor. Pas aan en klik Opslaan om de bewerkte versie opnieuw in te dienen.
      </div>
    );
  }
  // nochange
  return (
    <div className={`${styles.tplStatus} ${styles.tplStatusInfo}`}>
      Geen wijziging om in te dienen, pas eerst de tekst aan.
    </div>
  );
}
