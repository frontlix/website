"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import styles from "./AgendaHeader.module.css";

export type AgendaView = "week" | "maand";

interface AgendaHeaderProps {
  /** Actieve weergave (week of maand). */
  view: AgendaView;
  /** Periodelabel rechts van de titel (weeklabel of maandnaam). */
  label: string;
  /** Maandag-key (YYYY-MM-DD) van de vorige week (navigatieknop links). */
  weekPrevKey: string;
  /** Maandag-key (YYYY-MM-DD) van de volgende week (navigatieknop rechts). */
  weekNextKey: string;
  /** Schakelt tussen week- en maandweergave. */
  onViewChange: (view: AgendaView) => void;
  /** Klik op "+ Afspraak". */
  onNieuw: () => void;
}

/** Kop van de Agenda: titel + periodelabel links (met week-navigatie in de
 *  weekweergave), en rechts de Week/Maand-schakelaar en "+ Afspraak". */
export function AgendaHeader({
  view,
  label,
  weekPrevKey,
  weekNextKey,
  onViewChange,
  onNieuw,
}: AgendaHeaderProps) {
  return (
    <div className={styles.head}>
      <div className={styles.left}>
        <h1 className={styles.title}>Agenda</h1>
        <span className={styles.weekLabel}>{label}</span>
        {view === "week" ? (
          <span className={styles.nav}>
            <Link
              href={`?week=${weekPrevKey}`}
              scroll={false}
              className={styles.navBtn}
              aria-label="Vorige week"
            >
              <ChevronLeft size={15} strokeWidth={2.4} />
            </Link>
            <Link
              href={`?week=${weekNextKey}`}
              scroll={false}
              className={styles.navBtn}
              aria-label="Volgende week"
            >
              <ChevronRight size={15} strokeWidth={2.4} />
            </Link>
          </span>
        ) : null}
      </div>

      <div className={styles.right}>
        <span className={styles.viewToggle}>
          {([
            ["week", "Week"],
            ["maand", "Maand"],
          ] as const).map(([v, lab]) => (
            <button
              key={v}
              type="button"
              className={`${styles.viewSeg} ${view === v ? styles.viewSegActive : ""}`}
              onClick={() => onViewChange(v)}
            >
              {lab}
            </button>
          ))}
        </span>

        <button type="button" className={styles.addBtn} onClick={onNieuw}>
          <Plus size={15} strokeWidth={2.6} />
          Afspraak
        </button>
      </div>
    </div>
  );
}
