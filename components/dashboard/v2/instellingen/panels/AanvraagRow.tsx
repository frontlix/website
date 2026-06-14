"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Pencil,
  Trash2,
  MessageSquare,
} from "lucide-react";
import { cancelTemplateAanvraag } from "@/lib/dashboard/template-actions";
import type { TemplateAanvraag } from "@/lib/dashboard/template-queries";
import styles from "./panels.module.css";

/**
 * Eén template-aanvraag-rij met status, voorgestelde tekst, eventuele notitie
 * van Frontlix en (alleen bij 'pending') bewerken + annuleren. Gedeeld door het
 * Openingsbericht- en het Reminders-paneel; `label` is de leesbare naam en
 * `onBewerk` laadt de tekst terug in de bijbehorende editor.
 */
export function AanvraagRow({
  aanvraag,
  label,
  onBewerk,
  live,
}: {
  aanvraag: TemplateAanvraag;
  label: string;
  onBewerk: (a: TemplateAanvraag) => void;
  live: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const tone = statusTone(aanvraag.status);
  const isPending = aanvraag.status === "pending";
  const heeftNotitie = !!aanvraag.notitie && aanvraag.notitie.trim().length > 0;
  const datum = new Date(aanvraag.aangemaakt_op).toLocaleString("nl-NL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  const annuleer = () => {
    if (!live) return;
    setError(null);
    startTransition(async () => {
      const res = await cancelTemplateAanvraag(aanvraag.id);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  };

  return (
    <div className={styles.aanvraagRow}>
      <div className={styles.aanvraagTop}>
        <div className={styles.aanvraagBody}>
          <div className={styles.aanvraagNaam}>{label}</div>
          <div className={styles.aanvraagDate}>{datum}</div>
        </div>
        <span className={`${styles.statusPill} ${styles[`status_${tone}`]}`}>
          {statusIcon(aanvraag.status)}
          {statusLabel(aanvraag.status)}
        </span>
      </div>

      <div className={styles.aanvraagTekst}>{aanvraag.voorgestelde_tekst}</div>

      {heeftNotitie && (
        <div className={styles.aanvraagNotitie}>
          <MessageSquare size={12} className={styles.aanvraagNotitieIcon} />
          <div>
            <span className={styles.aanvraagNotitieLabel}>Notitie van Frontlix</span>
            {aanvraag.notitie}
          </div>
        </div>
      )}

      {isPending && (
        <div className={styles.aanvraagActions}>
          <button
            type="button"
            className={styles.aanvraagBtn}
            onClick={() => onBewerk(aanvraag)}
            disabled={pending}
          >
            <Pencil size={13} />
            Bewerken
          </button>
          <button
            type="button"
            className={`${styles.aanvraagBtn} ${styles.aanvraagBtnDanger}`}
            onClick={annuleer}
            disabled={pending || !live}
          >
            <Trash2 size={13} />
            {pending ? "Annuleren…" : "Annuleren"}
          </button>
          {error && <span className={styles.aanvraagError}>{error}</span>}
        </div>
      )}
    </div>
  );
}

function statusLabel(s: TemplateAanvraag["status"]): string {
  switch (s) {
    case "pending":
      return "In behandeling";
    case "forwarded":
      return "Verzonden naar Meta";
    case "approved":
      return "Goedgekeurd";
    case "applied":
      return "Live";
    case "rejected":
      return "Afgewezen";
  }
}

function statusIcon(s: TemplateAanvraag["status"]) {
  if (s === "pending" || s === "forwarded") return <Clock size={11} />;
  if (s === "approved" || s === "applied") return <CheckCircle2 size={11} />;
  return <XCircle size={11} />;
}

function statusTone(s: TemplateAanvraag["status"]): "amber" | "blue" | "green" | "red" {
  if (s === "pending") return "amber";
  if (s === "forwarded") return "blue";
  if (s === "approved" || s === "applied") return "green";
  return "red";
}
