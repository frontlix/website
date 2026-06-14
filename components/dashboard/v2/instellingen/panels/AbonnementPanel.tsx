"use client";

import { Info } from "lucide-react";
import styles from "./panels.module.css";

/**
 * Abonnement: nog niet aan echte abonnements-/factuurdata gekoppeld. We tonen
 * bewust geen (nep) pakket/prijs/facturen, alleen een duidelijke placeholder,
 * dit werken we later uit.
 */
export function AbonnementPanel() {
  return (
    <>
      <div className={styles.demoNote}>
        <Info size={15} className={styles.demoNoteIcon} />
        <span>
          Abonnement en facturen werken we later uit. Hier komen straks je
          pakket, betaalgegevens en facturen te staan.
        </span>
      </div>

      <div className={styles.placeholderCard}>Abonnementsbeheer is binnenkort beschikbaar.</div>
    </>
  );
}
