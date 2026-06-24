"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Toggle } from "@/components/dashboard/v2/ui";
import type { RegelOpmerking } from "@/lib/dashboard/manual-offerte-types";
import styles from "./OpmerkingVeld.module.css";

interface OpmerkingVeldProps {
  /** Huidige opmerking (tekst + schakelaar-stand), of undefined = nog geen. */
  waarde: RegelOpmerking | undefined;
  /** Schrijf de nieuwe opmerking terug. */
  zet: (next: RegelOpmerking) => void;
  disabled?: boolean;
}

/**
 * Opmerking-container voor één offerte-onderdeel: een tekstveld + een
 * schakelaar (default AAN). Staat de schakelaar aan én is de tekst niet leeg,
 * dan verschijnt de opmerking in de offerte direct onder dat onderdeel. Uit =
 * alleen intern, geen tekst in de offerte (en nooit een lege witregel).
 *
 * Gedeeld door de wizard (StapWerk) en de lead-editor (OfferteEditor), zodat
 * het gedrag overal gelijk is.
 */
export function OpmerkingVeld({ waarde, zet, disabled }: OpmerkingVeldProps) {
  const tekst = waarde?.tekst ?? "";
  // Default AAN: een nieuwe of nog niet-bestaande opmerking staat aan.
  const zichtbaar = waarde?.zichtbaar !== false;
  // Ingeklapt tot een knop zolang er geen tekst is, zodat de editor rustig oogt;
  // klik (of bestaande tekst) toont het veld + de schakelaar.
  const [open, setOpen] = useState(() => tekst.trim() !== "");

  if (!open) {
    return (
      <button
        type="button"
        className={styles.addBtn}
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        <Plus size={13} strokeWidth={2.4} />
        Opmerking voor de offerte
      </button>
    );
  }

  return (
    <div className={styles.veld} data-uit={!zichtbaar || undefined}>
      <textarea
        className={styles.input}
        value={tekst}
        onChange={(e) => zet({ tekst: e.target.value, zichtbaar })}
        onBlur={() => {
          if (tekst.trim() === "") setOpen(false);
        }}
        placeholder="Waarom deze keuze? Komt onder dit onderdeel in de offerte."
        rows={2}
        disabled={disabled}
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus={tekst.trim() === ""}
      />
      <span className={styles.toggle}>
        <Toggle
          value={zichtbaar}
          onChange={(v) => zet({ tekst, zichtbaar: v })}
          aria-label="Opmerking in de offerte tonen"
        />
        <span className={styles.toggleLabel}>{zichtbaar ? "In offerte" : "Verborgen"}</span>
      </span>
    </div>
  );
}
