"use client";

import { Info } from "lucide-react";
import { CHANNELS } from "../instellingen-data";
import styles from "./panels.module.css";

/**
 * Kanalen: koppelstatus per kanaal. Volledig op statische demo-waarden, nog
 * niet aan echte data of koppel-acties verbonden. De "demo"-badge per rij en
 * de note bovenaan maken duidelijk dat dit nog placeholder is.
 */
export function KanalenPanel() {
  return (
    <div className={styles.list}>
      <div className={styles.demoNote}>
        <Info size={15} className={styles.demoNoteIcon} />
        <span>
          Dit is een voorbeeldweergave. Het koppelen van kanalen werken we
          binnenkort uit, de statussen hieronder zijn nog placeholder.
        </span>
      </div>

      {CHANNELS.map((k) => (
        <div key={k.naam} className={styles.channelRow}>
          {/* Grijs bolletje: demo-modus, dus geen echte gekoppeld-status. */}
          <span className={`${styles.dot} ${styles.dotDemo}`} />
          <div className={styles.rowMain}>
            <div className={styles.rowTitle}>{k.naam}</div>
            <div className={styles.rowSub}>{k.sub}</div>
          </div>
          <span className={styles.demoBadge}>Demo</span>
        </div>
      ))}
    </div>
  );
}
