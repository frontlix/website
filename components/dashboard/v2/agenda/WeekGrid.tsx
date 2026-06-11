"use client";

import { Check } from "lucide-react";
import type { AgendaDag, AgendaItem } from "./agenda-data";
import { EMPTY_DUUR } from "./agenda-data";
import { itemKey } from "./agenda-derive";
import { typeColorVar } from "./agenda-visuals";
import styles from "./WeekGrid.module.css";

interface WeekGridProps {
  week: AgendaDag[];
  /** Klik op een afspraakblok, opent het detail. */
  onSelect: (dag: AgendaDag, item: AgendaItem) => void;
  /** Klik op een lege dag, opent "nieuwe afspraak". */
  onPlan: () => void;
  /** Extra class op de grid-wrapper (bv. margin-top vanuit de pagina). */
  className?: string;
}

/** Weekgrid: dagkolommen met afspraakblokken (variant A uit CAgenda). Het
 *  aantal kolommen volgt de lengte van `week` (6 bij de demo, 7 bij echte
 *  data) zodat de dagen altijd één rij vullen. */
export function WeekGrid({ week, onSelect, onPlan, className }: WeekGridProps) {
  return (
    <div
      className={`${styles.grid}${className ? ` ${className}` : ""}`}
      style={{ gridTemplateColumns: `repeat(${week.length || 1}, 1fr)` }}
    >
      {week.map((d, di) => (
        <div key={`${d.dag}-${di}`} className={`${styles.col} ${d.vandaag ? styles.colToday : ""}`}>
          <div className={styles.dayHead}>
            <span className={`${styles.dayName} ${d.vandaag ? styles.dayNameToday : ""}`}>{d.dag}</span>
            <span className={styles.dayDate}>{d.datum}</span>
            {d.vandaag ? <span className={styles.todayPill}>Vandaag</span> : null}
          </div>

          <div className={styles.items}>
            {d.items.length === 0 ? (
              <button type="button" className={styles.empty} onClick={onPlan}>
                + Plan iets in
              </button>
            ) : (
              d.items.map((it, i) => (
                <button
                  type="button"
                  key={itemKey(it, d.dag, i)}
                  className={`${styles.item} ${it.klaar ? styles.itemDone : ""}`}
                  onClick={() => onSelect(d, it)}
                >
                  <span className={styles.accent} style={{ background: typeColorVar(it.type) }} />
                  <span className={styles.itemTime}>
                    {it.tijd}
                    {it.duur !== EMPTY_DUUR ? ` · ${it.duur}` : ""}
                  </span>
                  <span className={styles.itemTitle}>
                    {it.klaar ? <Check size={12} strokeWidth={3} className={styles.doneCheck} /> : null}
                    {it.titel}
                  </span>
                  <span className={styles.itemSub}>{it.sub}</span>
                </button>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
