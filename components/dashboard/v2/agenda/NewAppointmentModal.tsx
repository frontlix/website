"use client";

import { Modal, Button } from "@/components/dashboard/v2/ui";
import styles from "./NewAppointmentModal.module.css";

interface NewAppointmentModalProps {
  open: boolean;
  onClose: () => void;
  /** Opslaan, voegt de demo-afspraak toe aan zaterdag. */
  onOpslaan: () => void;
}

const VELDEN: { label: string; value: string; full?: boolean }[] = [
  { label: "Titel", value: "Klus · Oprit Anna Smit", full: true },
  { label: "Dag", value: "Zaterdag 13 juni" },
  { label: "Tijd", value: "10:00" },
  { label: "Duur", value: "2 uur" },
];

/** Nieuwe afspraak inplannen (port van PAgenda). Velden zijn demo-statisch. */
export function NewAppointmentModal({ open, onClose, onOpslaan }: NewAppointmentModalProps) {
  return (
    <Modal open={open} onClose={onClose} width={480} label="Nieuwe afspraak">
      <div className={styles.body}>
        <h2 className={styles.title}>Nieuwe afspraak</h2>
        <div className={styles.grid}>
          {VELDEN.map((v) => (
            <div key={v.label} className={v.full ? styles.full : ""}>
              <div className={styles.label}>{v.label}</div>
              <div className={styles.field}>{v.value}</div>
            </div>
          ))}
        </div>
        <div className={styles.actions}>
          <Button variant="primary" className={styles.flex} onClick={onOpslaan}>
            Opslaan
          </Button>
          <Button variant="secondary" className={styles.flex} onClick={onClose}>
            Annuleren
          </Button>
        </div>
      </div>
    </Modal>
  );
}
