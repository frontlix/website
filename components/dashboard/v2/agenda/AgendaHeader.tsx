"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ChevronDown, Plus } from "lucide-react";
import { MonthYearPicker } from "./MonthYearPicker";
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
  /** Jaar van de getoonde maand (voor de maand/jaar-kiezer). */
  monthYear: number;
  /** Maand (1-12) van de getoonde maand (voor de maand/jaar-kiezer). */
  monthMonth: number;
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
  monthYear,
  monthMonth,
  onViewChange,
  onNieuw,
}: AgendaHeaderProps) {
  // Navigatie-links per weergave. In maandweergave dragen ze ?view=maand mee,
  // zodat je na vorige/volgende-maand niet terugvalt op de weekweergave.
  const prevHref = view === "maand" ? `?month=${monthPrevKey}&view=maand` : `?week=${weekPrevKey}`;
  const nextHref = view === "maand" ? `?month=${monthNextKey}&view=maand` : `?week=${weekNextKey}`;
  const prevLabel = view === "maand" ? "Vorige maand" : "Vorige week";
  const nextLabel = view === "maand" ? "Volgende maand" : "Volgende week";

  // Maand/jaar-kiezer (alleen in maandweergave): maandnaam wordt een knop die
  // de popover opent. In de weekweergave blijft het label gewone tekst.
  const [pickerOpen, setPickerOpen] = useState(false);
  const labelBtnRef = useRef<HTMLButtonElement | null>(null);

  return (
    <div className={styles.head}>
      <div className={styles.left}>
        <h1 className={styles.title}>Agenda</h1>
        {view === "maand" ? (
          <span className={styles.labelWrap}>
            <button
              ref={labelBtnRef}
              type="button"
              className={styles.labelBtn}
              onClick={() => setPickerOpen((o) => !o)}
              aria-haspopup="dialog"
              aria-expanded={pickerOpen}
            >
              {label}
              <ChevronDown size={13} strokeWidth={2.4} className={styles.labelChev} />
            </button>
            {pickerOpen && (
              <MonthYearPicker
                currentYear={monthYear}
                currentMonth={monthMonth}
                anchorRef={labelBtnRef}
                onClose={() => setPickerOpen(false)}
              />
            )}
          </span>
        ) : (
          <span className={styles.weekLabel}>{label}</span>
        )}
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
