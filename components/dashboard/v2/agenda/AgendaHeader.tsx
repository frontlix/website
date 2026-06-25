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
  /** Maand-key (YYYY-MM) van de vorige maand (navigatieknop in maandweergave). */
  monthPrevKey: string;
  /** Maand-key (YYYY-MM) van de volgende maand (navigatieknop in maandweergave). */
  monthNextKey: string;
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
  monthPrevKey,
  monthNextKey,
  onViewChange,
  onNieuw,
}: AgendaHeaderProps) {
  // Navigatie-links per weergave. In maandweergave dragen ze ?view=maand mee,
  // zodat je na vorige/volgende-maand niet terugvalt op de weekweergave.
  const prevHref = view === "maand" ? `?month=${monthPrevKey}&view=maand` : `?week=${weekPrevKey}`;
  const nextHref = view === "maand" ? `?month=${monthNextKey}&view=maand` : `?week=${weekNextKey}`;
  const prevLabel = view === "maand" ? "Vorige maand" : "Vorige week";
  const nextLabel = view === "maand" ? "Volgende maand" : "Volgende week";

  return (
    <div className={styles.head}>
      <div className={styles.left}>
        <h1 className={styles.title}>Agenda</h1>
        <span className={styles.weekLabel}>{label}</span>
        <span className={styles.nav}>
          <Link href={prevHref} scroll={false} className={styles.navBtn} aria-label={prevLabel}>
            <ChevronLeft size={15} strokeWidth={2.4} />
          </Link>
          <Link href={nextHref} scroll={false} className={styles.navBtn} aria-label={nextLabel}>
            <ChevronRight size={15} strokeWidth={2.4} />
          </Link>
        </span>
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
