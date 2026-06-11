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
 * Zaterdag staat erbij als beschikbare dag.
 *
 * TODO(hoofd-agent): koppelen aan tenant_settings.beschikbaarheid +
 * saveBeschikbaarheid-action. Die DB-kolom bestaat nog niet, dus dit paneel
 * werkt nu volledig op lokale state (geen server-action die naar een
 * niet-bestaande kolom schrijft).
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
      <div className={styles.note}>
        Surface plant maximaal <strong className={styles.strong}>2 klussen en 1 plaatsbezoek per dag</strong> en
        houdt rekening met rijtijden tussen adressen.
      </div>
    </div>
  );
}
