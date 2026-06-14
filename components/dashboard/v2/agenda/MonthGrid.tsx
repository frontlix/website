"use client";

// ─────────────────────────────────────────────────────────────────────
// Maandweergave van de v2 Agenda: 7 kolommen (Ma..Zo) × 5-6 rijen. Per cel
// het dag-getal, een "Vrij"-label op zondag, en de afspraken als kleurblokken
// (type-kleur). Vandaag krijgt een blauwe markering; voor-/naloop-dagen van
// aangrenzende maanden staan gedimd. Klik op een blok opent dezelfde detail-
// modal als de weekweergave; klik op een lege dag opent "nieuwe afspraak".
// ─────────────────────────────────────────────────────────────────────

import type { CSSProperties } from "react";
import { Check, Plus } from "lucide-react";
import type { AgendaMaandCel, AgendaItem } from "./agenda-data";
import { typeColorVar, typeBgVar } from "./agenda-visuals";
import styles from "./MonthGrid.module.css";

const WEEKDAGEN = ["MA", "DI", "WO", "DO", "VR", "ZA", "ZO"];

interface MonthGridProps {
  cells: AgendaMaandCel[];
  /** Klik op een afspraakblok in een cel, opent het detail. */
  onSelect: (cel: AgendaMaandCel, item: AgendaItem) => void;
  /** Klik op een lege (in-maand) cel, opent "nieuwe afspraak". */
  onPlan: () => void;
  /** Extra class op de wrapper (bv. margin-top vanuit de pagina). */
  className?: string;
}

export function MonthGrid({ cells, onSelect, onPlan, className }: MonthGridProps) {
  return (
    <div className={`${styles.month}${className ? ` ${className}` : ""}`}>
      <div className={styles.weekdays}>
        {WEEKDAGEN.map((d) => (
          <span key={d} className={styles.weekday}>
            {d}
          </span>
        ))}
      </div>

      <div className={styles.cells}>
        {cells.map((c) => (
          <div
            key={c.dateKey}
            className={`${styles.cell} ${c.inMaand ? "" : styles.cellOut} ${c.verleden && c.inMaand ? styles.cellPast : ""} ${c.vandaag ? styles.cellToday : ""}`}
          >
            <div className={styles.cellHead}>
              <span className={`${styles.dayNum} ${c.vandaag ? styles.dayNumToday : ""}`}>
                {c.dag}
              </span>
              {c.inMaand && c.vrij ? <span className={styles.vrij}>Vrij</span> : null}
            </div>

            {c.items.length === 0 ? (
              c.inMaand ? (
                <button
                  type="button"
                  className={styles.add}
                  onClick={onPlan}
                  aria-label="Afspraak inplannen"
                >
                  <Plus size={16} strokeWidth={2.4} />
                </button>
              ) : null
            ) : (
              <div className={styles.blocks}>
                {c.items.map((it, i) => (
                  <button
                    type="button"
                    key={`${c.dateKey}-${it.tijd}-${i}`}
                    className={`${styles.block} ${it.klaar ? styles.blockDone : ""}`}
                    style={
                      {
                        "--cell-accent": typeColorVar(it.type),
                        "--cell-bg": typeBgVar(it.type),
                      } as CSSProperties
                    }
                    onClick={() => onSelect(c, it)}
                  >
                    <span className={styles.blockTime}>{it.tijd}</span>
                    <span className={styles.blockTitle}>
                      {it.klaar ? (
                        <Check size={11} strokeWidth={3} className={styles.blockCheck} />
                      ) : null}
                      {it.titel}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
