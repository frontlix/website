"use client";

import { VariableChips } from "../VariableChips";
import { WaPreview } from "../WaPreview";
import { REMINDER_VARS } from "../instellingen-data";
import type { Reminder } from "../instellingen-data";
import styles from "./panels.module.css";

interface RemindersPanelProps {
  reminders: Reminder[];
  onDag: (index: number, dag: string) => void;
  onTekst: (index: number, tekst: string) => void;
}

const BADGE_CLASS = [styles.badge1, styles.badge2, styles.badge3];

/** Reminders: per opvolg-bericht het aantal dagen en de tekst, met preview. */
export function RemindersPanel({ reminders, onDag, onTekst }: RemindersPanelProps) {
  return (
    <>
      <div className={styles.note}>
        Surface stuurt deze berichten automatisch als een klant niet op de offerte reageert. Stel per reminder in{" "}
        <strong className={styles.strong}>na hoeveel dagen</strong> hij gaat en{" "}
        <strong className={styles.strong}>wat er staat</strong>.
      </div>

      {reminders.map((r, i) => (
        <div key={r.label} className={styles.reminderCard}>
          <div className={styles.reminderHead}>
            <span className={`${styles.reminderBadge} ${BADGE_CLASS[i] ?? styles.badge3}`}>{i + 1}</span>
            <div className={styles.rowMain}>
              <div className={styles.reminderLabel}>{r.label}</div>
              <div className={styles.reminderSub}>{r.sub}</div>
            </div>
            <span className={styles.reminderTiming}>versturen na</span>
            <input
              className={styles.dayInput}
              value={r.dag}
              onChange={(e) => onDag(i, e.target.value)}
              aria-label={`Dagen voor ${r.label}`}
            />
            <span className={styles.reminderTiming}>dagen</span>
          </div>
          <div className={styles.reminderBody}>
            <div>
              <textarea
                className={styles.reminderTextarea}
                value={r.tekst}
                onChange={(e) => onTekst(i, e.target.value)}
                rows={5}
              />
              <VariableChips
                vars={REMINDER_VARS}
                onInsert={(v) => onTekst(i, `${r.tekst} ${v}`)}
                compact
              />
            </div>
            <WaPreview tekst={r.tekst} />
          </div>
        </div>
      ))}
    </>
  );
}
