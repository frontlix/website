"use client";

import type { CSSProperties } from "react";
import { Info } from "lucide-react";
import { CHANNELS } from "../instellingen-data";
import styles from "./panels.module.css";

/**
 * Kleur-accent per kanaal (status-dot). Kleur = kanaal-identiteit: WhatsApp
 * groen, Google Reviews goud, Google Agenda cyaan, Website-formulier blauw,
 * Klusvergelijk paars. Uitsluitend --rb-*-tokens; niet-gekoppelde kanalen
 * blijven gedimd via de demo-stip. */
const CHANNEL_DOT: Record<string, string> = {
  "WhatsApp Business": "var(--rb-status-new-ink)",
  "Google Reviews": "var(--rb-star)",
  "Google Agenda": "var(--rb-metric-leads)",
  "Website-formulier": "var(--rb-data-1)",
  Klusvergelijk: "var(--rb-data-4)",
};

/**
 * Kanalen: koppelstatus per kanaal. Volledig op statische demo-waarden, nog
 * niet aan echte data of koppel-acties verbonden. De "demo"-badge per rij en
 * de note bovenaan maken duidelijk dat dit nog placeholder is. De gekleurde
 * status-dot draagt de kanaal-identiteit (kleur = kanaal); een niet-gekoppeld
 * kanaal krijgt de gedimde demo-stip.
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

      {CHANNELS.map((k) => {
        const accent = CHANNEL_DOT[k.naam] ?? null;
        return (
          <div key={k.naam} className={styles.channelRow}>
            {/* Gekleurde kanaal-stip (identiteit). Niet-gekoppeld of onbekend
                kanaal valt terug op de gedimde demo-stip. */}
            <span
              className={`${styles.dot} ${k.ok && accent ? styles.dotChannel : styles.dotDemo}`}
              style={
                k.ok && accent
                  ? ({ "--rb-channel": accent } as CSSProperties)
                  : undefined
              }
            />
            <div className={styles.rowMain}>
              <div className={styles.rowTitle}>{k.naam}</div>
              <div className={styles.rowSub}>{k.sub}</div>
            </div>
            <span className={styles.demoBadge}>Demo</span>
          </div>
        );
      })}
    </div>
  );
}
