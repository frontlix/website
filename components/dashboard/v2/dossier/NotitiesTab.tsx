"use client";

import { useState, useRef, useEffect } from "react";
import { Pencil, Trash2, Check, X } from "lucide-react";
import type { DossierNotitie } from "./dossier-data";
import styles from "./NotitiesTab.module.css";

interface NotitiesTabProps {
  notities: DossierNotitie[];
  /** Voegt een nieuwe notitie bovenaan toe. */
  onAdd: (tekst: string) => void;
  /** Verwijdert een notitie op id. */
  onDelete: (id: string) => void;
  /** Werkt de tekst van een bestaande notitie bij. */
  onUpdate: (id: string, tekst: string) => void;
  /** Zet de vinkjes (afspraak-print / opdrachtbon) van een notitie. */
  onSetTargets: (id: string, targets: { opAfspraak: boolean; opOpdrachtbon: boolean }) => void;
  /** True wanneer de tab net is geopend (focus op het invoerveld). */
  autoFocus?: boolean;
}

/** Notities-tab: invoerveld + "Toevoegen" (Enter werkt) en de lijst gele
 *  team-notities (nieuwste bovenaan). Elke notitie is te bewerken (potlood,
 *  inline veld) of te verwijderen (prullenbak, met bevestiging). */
export function NotitiesTab({
  notities,
  onAdd,
  onDelete,
  onUpdate,
  onSetTargets,
  autoFocus,
}: NotitiesTabProps) {
  const [tekst, setTekst] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editTekst, setEditTekst] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (editId) editRef.current?.focus();
  }, [editId]);

  const voegToe = () => {
    if (!tekst.trim()) return;
    onAdd(tekst.trim());
    setTekst("");
  };

  const startBewerken = (n: DossierNotitie) => {
    setEditId(n.id);
    setEditTekst(n.tekst);
  };

  const annuleerBewerken = () => {
    setEditId(null);
    setEditTekst("");
  };

  const bewaarBewerken = () => {
    const trimmed = editTekst.trim();
    if (!editId || !trimmed) return;
    onUpdate(editId, trimmed);
    annuleerBewerken();
  };

  const verwijder = (id: string) => {
    if (window.confirm("Deze notitie verwijderen?")) onDelete(id);
  };

  const zetAfspraak = (n: DossierNotitie, value: boolean) =>
    onSetTargets(n.id, { opAfspraak: value, opOpdrachtbon: n.opOpdrachtbon });
  const zetOpdrachtbon = (n: DossierNotitie, value: boolean) =>
    onSetTargets(n.id, { opAfspraak: n.opAfspraak, opOpdrachtbon: value });

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
          placeholder="Typ een notitie, komt standaard op de afspraak en opdrachtbon…"
          className={styles.input}
        />
        <button type="button" className={styles.addBtn} onClick={voegToe}>
          Toevoegen
        </button>
      </div>

      <div className={styles.list}>
        {notities.map((n) => (
          <div key={n.id} className={styles.note}>
            {editId === n.id ? (
              <div className={styles.editRow}>
                <input
                  ref={editRef}
                  value={editTekst}
                  onChange={(e) => setEditTekst(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") bewaarBewerken();
                    if (e.key === "Escape") annuleerBewerken();
                  }}
                  className={styles.editInput}
                />
                <button
                  type="button"
                  className={styles.iconBtn}
                  onClick={bewaarBewerken}
                  title="Opslaan"
                  aria-label="Opslaan"
                >
                  <Check size={15} strokeWidth={2.4} />
                </button>
                <button
                  type="button"
                  className={styles.iconBtn}
                  onClick={annuleerBewerken}
                  title="Annuleren"
                  aria-label="Annuleren"
                >
                  <X size={15} strokeWidth={2.4} />
                </button>
              </div>
            ) : (
              <>
                <div className={styles.noteHead}>
                  <div className={styles.noteText}>{n.tekst}</div>
                  <div className={styles.noteActions}>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      onClick={() => startBewerken(n)}
                      title="Bewerken"
                      aria-label="Notitie bewerken"
                    >
                      <Pencil size={14} strokeWidth={2.2} />
                    </button>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      onClick={() => verwijder(n.id)}
                      title="Verwijderen"
                      aria-label="Notitie verwijderen"
                    >
                      <Trash2 size={14} strokeWidth={2.2} />
                    </button>
                  </div>
                </div>
                <div className={styles.noteMeta}>
                  {n.wie} · {n.tijd}
                </div>
                <div className={styles.targets}>
                  <span className={styles.targetsLabel}>Tonen op:</span>
                  <label className={styles.targetBox}>
                    <input
                      type="checkbox"
                      checked={n.opAfspraak}
                      onChange={(e) => zetAfspraak(n, e.target.checked)}
                    />
                    Afspraak
                  </label>
                  <label className={styles.targetBox}>
                    <input
                      type="checkbox"
                      checked={n.opOpdrachtbon}
                      onChange={(e) => zetOpdrachtbon(n, e.target.checked)}
                    />
                    Opdrachtbon
                  </label>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
