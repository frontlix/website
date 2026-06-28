"use client";

import { Toggle } from "@/components/dashboard/v2/ui";
import type { DaySlot } from "../instellingen-data";
import styles from "./panels.module.css";

interface BeschikbaarheidPanelProps {
  dagen: DaySlot[];
  onToggle: (dag: string, aan: boolean) => void;
  /** Past begin- of eindtijd van een dag aan (lokale state). */
  onTime: (dag: string, veld: "van" | "tot", waarde: string) => void;
}

/**
 * Beschikbaarheid: per dag aan/uit met bewerkbare werktijden (begin + eind).
 *
 * Gekoppeld aan tenant_settings.beschikbaarheid: de globale "Opslaan"-knop
 * schrijft de 7 dagen (Ma..Zo) weg via saveBeschikbaarheid. De Surface-bot leest
 * dezelfde kolom (lead-automation/services/google_calendar.py, _load_availability)
 * en slaat dagen met aan=false over bij het voorstellen van afspraak-slots.
 */
export function BeschikbaarheidPanel({
  dagen,
  onToggle,
  onTime,
}: BeschikbaarheidPanelProps) {
  return (
    <div className={styles.list}>
      {dagen.map((d) => (
        <div key={d.dag} className={styles.row}>
          <Toggle
            value={d.aan}
            onChange={(v) => onToggle(d.dag, v)}
            aria-label={`${d.dag} aan of uit`}
          />
          <span className={`${styles.dayName} ${d.aan ? "" : styles.dim}`}>{d.dag}</span>
          {d.aan ? (
            <div className={styles.dayTimes}>
              <input
                type="time"
                value={d.van}
                onChange={(e) => onTime(d.dag, "van", e.target.value)}
                className={styles.timeInput}
                aria-label={`${d.dag} begintijd`}
              />
              <span className={styles.timeSep}>tot</span>
              <input
                type="time"
                value={d.tot}
                onChange={(e) => onTime(d.dag, "tot", e.target.value)}
                className={styles.timeInput}
                aria-label={`${d.dag} eindtijd`}
              />
            </div>
          ) : (
            <span className={`${styles.dayTime} ${styles.dayTimeOff}`}>Vrij</span>
          )}
        </div>
      ))}
    </div>
  );
}
