"use client";

import { useEffect, useRef } from "react";
import { Printer, X } from "lucide-react";
import styles from "./page.module.css";

/**
 * Schermknoppen boven de printbare afspraak-kaart (verborgen in de print zelf
 * via .noPrint). "Afdrukken" opent de browser-printdialoog; "Sluiten" sluit
 * het tabblad. Bij het openen wordt de printdialoog eenmalig automatisch
 * getriggerd, zodat de uitprint-knop in het dashboard een one-click-flow is.
 */
export function PrintControls() {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    // Korte vertraging zodat de layout/lettertypes gezet zijn voor de dialoog.
    const t = setTimeout(() => window.print(), 350);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className={`${styles.controls} noPrint`}>
      <button type="button" className={styles.printBtn} onClick={() => window.print()}>
        <Printer size={16} strokeWidth={2.2} />
        Afdrukken
      </button>
      <button type="button" className={styles.closeBtn} onClick={() => window.close()}>
        <X size={16} strokeWidth={2.2} />
        Sluiten
      </button>
    </div>
  );
}
