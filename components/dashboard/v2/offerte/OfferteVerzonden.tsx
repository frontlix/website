"use client";

import { Check } from "lucide-react";
import { fmtEuro } from "./offerte-utils";
import type { Kanaal, OfferteKlant } from "./types";
import styles from "./OfferteVerzonden.module.css";

interface OfferteVerzondenProps {
  totaal: number;
  klant: OfferteKlant | null;
  kanaal: Kanaal;
  onClose: () => void;
  onNaarLeads?: () => void;
}

/** Verzonden-staat: groene check, titel per kanaal, samenvatting en knoppen. */
export function OfferteVerzonden({
  totaal,
  klant,
  kanaal,
  onClose,
  onNaarLeads,
}: OfferteVerzondenProps) {
  const naam = klant ? klant.naam : "de klant";
  const titel =
    kanaal === "pdf"
      ? "Offerte gedownload als PDF"
      : kanaal === "email"
        ? "Offerte verstuurd via e-mail"
        : "Offerte verstuurd via WhatsApp";
  const sub =
    kanaal === "pdf"
      ? "De PDF staat in je downloads, print of verstuur 'm zelf."
      : "Surface geeft een seintje zodra de offerte wordt geopend.";

  return (
    <div className={styles.wrap}>
      <div className={styles.check} aria-hidden="true">
        <Check size={38} strokeWidth={3} />
      </div>
      <div className={styles.titel}>{titel}</div>
      <div className={styles.sub}>
        {naam} · <strong>{fmtEuro(totaal)} incl. BTW</strong> · geldig t/m 24 juni.
        <br />
        {sub}
      </div>
      <div className={styles.knoppen}>
        <button type="button" className={styles.prim} onClick={onNaarLeads ?? onClose}>
          Naar het lead-dossier ›
        </button>
        <button type="button" className={styles.ghost} onClick={onClose}>
          Sluiten
        </button>
      </div>
    </div>
  );
}
