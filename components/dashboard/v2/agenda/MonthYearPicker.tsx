"use client";

// ─────────────────────────────────────────────────────────────────────
// MonthYearPicker — popover-kiezer voor de maandweergave (desktop v2).
// Opent onder de klikbare maandnaam in de AgendaHeader. Bevat een jaar-rij
// (‹ jaar ›), een 4-koloms grid met de 12 maand-afkortingen en onderaan
// "Deze maand". De jaar-pijlen veranderen ALLEEN het paneel-jaar; klik je
// een maand, dan navigeer je naar ?month=<paneeljaar>-<MM>&view=maand
// (zelfde navigatie als de prev/next-maand-knoppen, maand blijft behouden).
// Sluit bij klik-buiten + Escape. De huidige maand is gemarkeerd.
// ─────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState, type RefObject } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./MonthYearPicker.module.css";

const MAAND_KORT = [
  "jan", "feb", "mrt", "apr", "mei", "jun",
  "jul", "aug", "sep", "okt", "nov", "dec",
];

interface MonthYearPickerProps {
  /** Jaar van de getoonde maand (start-jaar van het paneel). */
  currentYear: number;
  /** Maand (1-12) van de getoonde maand, voor de "huidige"-markering. */
  currentMonth: number;
  /** Ref naar de trigger-knop, zodat klik daarop niet als "buiten" telt. */
  anchorRef: RefObject<HTMLElement | null>;
  /** Sluit de popover (na navigatie, klik-buiten of Escape). */
  onClose: () => void;
}

export function MonthYearPicker({
  currentYear,
  currentMonth,
  anchorRef,
  onClose,
}: MonthYearPickerProps) {
  const popRef = useRef<HTMLDivElement | null>(null);
  // Paneel-jaar: start op het getoonde jaar, schuift met de jaar-pijlen.
  const [panelYear, setPanelYear] = useState(currentYear);

  // onClose stabiel houden voor de listeners zonder rebind bij elke render.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Klik-buiten (popover + trigger uitgezonderd) en Escape sluiten de popover.
  useEffect(() => {
    const onPointer = (e: MouseEvent) => {
      const t = e.target as Node;
      if (popRef.current?.contains(t)) return;
      if (anchorRef.current?.contains(t)) return;
      onCloseRef.current();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
      }
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [anchorRef]);

  return (
    <div ref={popRef} className={styles.pop} role="dialog" aria-label="Kies maand en jaar">
      <div className={styles.yearRow}>
        <button
          type="button"
          className={styles.yearBtn}
          onClick={() => setPanelYear((y) => y - 1)}
          aria-label="Vorig jaar"
        >
          <ChevronLeft size={15} strokeWidth={2.4} />
        </button>
        <b className={styles.year}>{panelYear}</b>
        <button
          type="button"
          className={styles.yearBtn}
          onClick={() => setPanelYear((y) => y + 1)}
          aria-label="Volgend jaar"
        >
          <ChevronRight size={15} strokeWidth={2.4} />
        </button>
      </div>

      <div className={styles.grid}>
        {MAAND_KORT.map((naam, i) => {
          const maand = i + 1;
          const isCurrent = panelYear === currentYear && maand === currentMonth;
          const mm = String(maand).padStart(2, "0");
          return (
            <Link
              key={naam}
              href={`?month=${panelYear}-${mm}&view=maand`}
              scroll={false}
              className={`${styles.monthBtn} ${isCurrent ? styles.monthBtnCurrent : ""}`}
              aria-current={isCurrent ? "true" : undefined}
              onClick={onClose}
            >
              {naam}
            </Link>
          );
        })}
      </div>

      <div className={styles.foot}>
        <Link href="?view=maand" scroll={false} className={styles.todayLink} onClick={onClose}>
          Deze maand
        </Link>
      </div>
    </div>
  );
}
