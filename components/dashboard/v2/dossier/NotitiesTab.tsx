"use client";

import { useState, useRef, useEffect } from "react";
import type { DossierNotitie } from "./dossier-data";
import styles from "./NotitiesTab.module.css";

interface NotitiesTabProps {
  notities: DossierNotitie[];
  /** Voegt een nieuwe notitie bovenaan toe. */
  onAdd: (tekst: string) => void;
  /** True wanneer de tab net is geopend (focus op het invoerveld). */
  autoFocus?: boolean;
}

/** Notities-tab: invoerveld + "Toevoegen" (Enter werkt) en de lijst gele
 *  team-notities (nieuwste bovenaan). */
export function NotitiesTab({ notities, onAdd, autoFocus }: NotitiesTabProps) {
  const [tekst, setTekst] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const voegToe = () => {
    if (!tekst.trim()) return;
    onAdd(tekst.trim());
    setTekst("");
  };

  return (
    <div className={styles.root}>
      <div className={styles.inputRow}>
        <input
          ref={inputRef}
          value={tekst}
          onChange={(e) => setTekst(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") voegToe();
          }}
          placeholder="Typ een notitie, alleen zichtbaar voor je team…"
          className={styles.input}
        />
        <button type="button" className={styles.addBtn} onClick={voegToe}>
          Toevoegen
        </button>
      </div>

      <div className={styles.list}>
        {notities.map((n, i) => (
          <div key={`${n.tijd}-${i}`} className={styles.note}>
            <div className={styles.noteText}>{n.tekst}</div>
            <div className={styles.noteMeta}>
              {n.wie} · {n.tijd}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
