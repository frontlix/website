"use client";

// Gedeeld bevestigingsdialoog voor het DEFINITIEF verwijderen van een lead
// (tweede trap van de prullenbak). Gebruikt op desktop (archief-lijst + dossier)
// en mobiel (uitklap-paneel + dossier-beheer). Zelfstandig: roept zelf de
// server-action deleteLeadPermanently aan en meldt succes via onDeleted.
//
// Tegen per ongeluk: de rode knop wordt pas actief als je het woord "verwijder"
// typt (case-insensitive). Styling via de --rb-*-tokens, dus licht + donker.

import { useState } from "react";
import { Trash2, TriangleAlert, X } from "lucide-react";
import { deleteLeadPermanently } from "@/lib/dashboard/lead-actions";
import styles from "./ConfirmDeleteLeadDialog.module.css";

const BEVESTIG_WOORD = "verwijder";

interface ConfirmDeleteLeadDialogProps {
  open: boolean;
  leadId: string;
  leadNaam: string;
  onClose: () => void;
  /** Aangeroepen na een geslaagde verwijdering (meestal router.refresh). */
  onDeleted: () => void;
}

export function ConfirmDeleteLeadDialog({
  open,
  leadId,
  leadNaam,
  onClose,
  onDeleted,
}: ConfirmDeleteLeadDialogProps) {
  const [woord, setWoord] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const bevestigd = woord.trim().toLowerCase() === BEVESTIG_WOORD;

  function sluit() {
    if (busy) return;
    setWoord("");
    setError(null);
    onClose();
  }

  async function verwijder() {
    if (!bevestigd || busy) return;
    setBusy(true);
    setError(null);
    const res = await deleteLeadPermanently(leadId);
    if (!res.ok) {
      setError(res.error || "Verwijderen mislukt. Probeer het opnieuw.");
      setBusy(false);
      return;
    }
    setBusy(false);
    setWoord("");
    onDeleted();
  }

  return (
    <div className={styles.overlay} onClick={sluit} role="presentation">
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={`Definitief verwijderen: ${leadNaam}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className={styles.close}
          onClick={sluit}
          aria-label="Sluiten"
          disabled={busy}
        >
          <X size={16} strokeWidth={2.4} />
        </button>

        <div className={styles.iconWrap} aria-hidden="true">
          <TriangleAlert size={22} strokeWidth={2.2} />
        </div>

        <h2 className={styles.titel}>Definitief verwijderen?</h2>
        <p className={styles.tekst}>
          Dit verwijdert <strong>{leadNaam}</strong> en alles wat erbij hoort
          (gesprek, offertes, afspraken, notities, foto&apos;s){" "}
          <strong>voorgoed</strong>. Dit kan niet ongedaan worden gemaakt.
        </p>

        <label className={styles.label} htmlFor="bevestig-verwijder">
          Typ <strong>verwijder</strong> om te bevestigen
        </label>
        <input
          id="bevestig-verwijder"
          type="text"
          className={styles.input}
          value={woord}
          onChange={(e) => setWoord(e.target.value)}
          placeholder="verwijder"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          autoFocus
          disabled={busy}
          onKeyDown={(e) => {
            if (e.key === "Enter") verwijder();
          }}
        />

        {error ? <p className={styles.error}>{error}</p> : null}

        <div className={styles.acties}>
          <button
            type="button"
            className={styles.annuleer}
            onClick={sluit}
            disabled={busy}
          >
            Annuleren
          </button>
          <button
            type="button"
            className={styles.verwijderBtn}
            onClick={verwijder}
            disabled={!bevestigd || busy}
          >
            <Trash2 size={15} strokeWidth={2.3} />
            {busy ? "Verwijderen…" : "Definitief verwijderen"}
          </button>
        </div>
      </div>
    </div>
  );
}
