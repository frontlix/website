"use client";

import { useEffect, useState } from "react";
import { Modal, Button, Toggle } from "@/components/dashboard/v2/ui";
import styles from "./CancelAppointmentModal.module.css";

interface CancelAppointmentModalProps {
  /** Open-state (gestuurd door AgendaView). */
  open: boolean;
  /** Klantnaam voor de bevestigingstekst. */
  klantNaam: string;
  /** Bezig met annuleren (knoppen uitschakelen). */
  bezig: boolean;
  /** Foutmelding van het annuleren. */
  error: string | null;
  onClose: () => void;
  /** Bevestigen met de gekozen notify-vlaggen. */
  onBevestig: (opts: { notifyWhatsapp: boolean; notifyEmail: boolean }) => void;
}

/** Bevestiging om een afspraak te annuleren, met de keuze of de klant via
 *  WhatsApp/e-mail een annuleringsbericht krijgt (default beide aan). De bot
 *  verwijdert het Google-event en maakt de afspraak-velden leeg. */
export function CancelAppointmentModal({
  open,
  klantNaam,
  bezig,
  error,
  onClose,
  onBevestig,
}: CancelAppointmentModalProps) {
  const [notifyWhatsapp, setNotifyWhatsapp] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(true);

  // Verse toggle-state telkens als de modal opent.
  useEffect(() => {
    if (open) {
      setNotifyWhatsapp(true);
      setNotifyEmail(true);
    }
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} width={480} label="Afspraak annuleren">
      <div className={styles.body}>
        <h2 className={styles.title}>Afspraak annuleren</h2>
        <p className={styles.text}>
          Weet je zeker dat je de afspraak met {klantNaam} wilt annuleren? De afspraak
          verdwijnt uit je agenda.
        </p>

        <div className={styles.notifies}>
          <div className={styles.notifyRow}>
            <span className={styles.notifyLabel}>WhatsApp-bericht naar klant</span>
            <Toggle
              value={notifyWhatsapp}
              onChange={setNotifyWhatsapp}
              aria-label="WhatsApp-bericht naar klant"
            />
          </div>
          <div className={styles.notifyRow}>
            <span className={styles.notifyLabel}>E-mailbericht naar klant</span>
            <Toggle
              value={notifyEmail}
              onChange={setNotifyEmail}
              aria-label="E-mailbericht naar klant"
            />
          </div>
        </div>

        {error ? <div className={styles.error}>{error}</div> : null}

        <div className={styles.actions}>
          <Button
            variant="primary"
            className={`${styles.flex} ${styles.danger}`}
            onClick={() => onBevestig({ notifyWhatsapp, notifyEmail })}
            disabled={bezig}
          >
            {bezig ? "Bezig…" : "Afspraak annuleren"}
          </Button>
          <Button
            variant="secondary"
            className={styles.flex}
            onClick={onClose}
            disabled={bezig}
          >
            Terug
          </Button>
        </div>
      </div>
    </Modal>
  );
}
