"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { AGENDA_WEEK_LABEL } from "./agenda-data";
import { AGENDA_LEGENDA, typeColorVar } from "./agenda-visuals";
import styles from "./AgendaHeader.module.css";

interface AgendaHeaderProps {
  /** Klik op "+ Afspraak". */
  onNieuw: () => void;
}

/** Kop van de Agenda: titel + weeklabel + week-navigatie links, met legenda en
 *  "+ Afspraak"-knop rechts. Full-width weekgrid-opzet (geen view-toggle). */
export function AgendaHeader({ onNieuw }: AgendaHeaderProps) {
  return (
    <div className={styles.head}>
      <div className={styles.left}>
        <h1 className={styles.title}>Agenda</h1>
        <span className={styles.weekLabel}>{AGENDA_WEEK_LABEL}</span>
        <span className={styles.nav}>
          <button type="button" className={styles.navBtn} aria-label="Vorige week">
            <ChevronLeft size={15} strokeWidth={2.4} />
          </button>
          <button type="button" className={styles.navBtn} aria-label="Volgende week">
            <ChevronRight size={15} strokeWidth={2.4} />
          </button>
        </span>
      </div>

      <div className={styles.right}>
        {AGENDA_LEGENDA.map((l) => (
          <span key={l.label} className={styles.legend}>
            <span className={styles.swatch} style={{ background: typeColorVar(l.type) }} />
            {l.label}
          </span>
        ))}
        <button type="button" className={styles.addBtn} onClick={onNieuw}>
          <Plus size={15} strokeWidth={2.6} />
          Afspraak
        </button>
      </div>
    </div>
  );
}
