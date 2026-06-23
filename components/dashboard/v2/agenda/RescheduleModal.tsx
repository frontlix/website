"use client";

import { useEffect, useState } from "react";
import { Modal, Button, Toggle } from "@/components/dashboard/v2/ui";
import styles from "./NewAppointmentModal.module.css";

interface RescheduleModalProps {
  /** Open-state (gestuurd door AgendaView). */
  open: boolean;
  /** Klantnaam voor de bevestigingstekst. */
  klantNaam: string;
  /** Bezig met verzetten (knoppen uitschakelen). */
  bezig: boolean;
  /** Foutmelding van het verzetten. */
  error: string | null;
  onClose: () => void;
  /** Bevestigen met het nieuwe ISO-tijdstip en de notify-vlaggen. */
  onBevestig: (
    iso: string,
    opts: { notifyWhatsapp: boolean; notifyEmail: boolean },
  ) => void;
}

/** Lokale datum (YYYY-MM-DD) van vandaag, voor de default in de datumkiezer. */
function vandaagISO(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Een afspraak verzetten: nieuwe datum + tijd kiezen, met de keuze of de klant
 *  via WhatsApp/e-mail een bevestiging krijgt (default beide aan). De bot verzet
 *  het Google-event en werkt Supabase bij. De gekozen datum/tijd wordt als
 *  Amsterdam-lokaal naar een ISO-instant omgezet. */
export function RescheduleModal({
  open,
  klantNaam,
  bezig,
  error,
  onClose,
  onBevestig,
}: RescheduleModalProps) {
  const [datum, setDatum] = useState("");
  const [tijd, setTijd] = useState("10:00");
  const [notifyWhatsapp, setNotifyWhatsapp] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(true);

  // Verse velden telkens als de modal opent.
  useEffect(() => {
    if (open) {
      setDatum(vandaagISO());
      setTijd("10:00");
      setNotifyWhatsapp(true);
      setNotifyEmail(true);
    }
  }, [open]);

  const kanOpslaan =
    /^\d{4}-\d{2}-\d{2}$/.test(datum) && /^\d{2}:\d{2}$/.test(tijd);

  function bevestig() {
    if (!kanOpslaan) return;
    // Lokale (Amsterdam) datum+tijd -> ISO/UTC. De gebruiker zit in NL, dus
    // new Date('YYYY-MM-DDTHH:MM:00') interpreteert correct als Amsterdam-tijd.
    const iso = new Date(`${datum}T${tijd}:00`).toISOString();
    onBevestig(iso, { notifyWhatsapp, notifyEmail });
  }

  return (
    <Modal open={open} onClose={onClose} width={480} label="Afspraak verzetten">
      <div className={styles.body}>
        <h2 className={styles.title}>Afspraak verzetten</h2>
        <p className={styles.hint} style={{ marginTop: 8 }}>
          Kies een nieuw moment voor de afspraak met {klantNaam}.
        </p>
        <div className={styles.grid}>
          <div>
            <label className={styles.label} htmlFor="rs-datum">
              Datum
            </label>
            <input
              id="rs-datum"
              type="date"
              className={styles.input}
              value={datum}
              onChange={(e) => setDatum(e.target.value)}
            />
          </div>
          <div>
            <label className={styles.label} htmlFor="rs-tijd">
              Tijd
            </label>
            <input
              id="rs-tijd"
              type="time"
              className={styles.input}
              value={tijd}
              onChange={(e) => setTijd(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.notifies}>
          <div className={styles.notifyRow}>
            <span className={styles.notifyLabel}>WhatsApp-bevestiging naar klant</span>
            <Toggle
              value={notifyWhatsapp}
              onChange={setNotifyWhatsapp}
              aria-label="WhatsApp-bevestiging naar klant"
            />
          </div>
          <div className={styles.notifyRow}>
            <span className={styles.notifyLabel}>E-mailbevestiging naar klant</span>
            <Toggle
              value={notifyEmail}
              onChange={setNotifyEmail}
              aria-label="E-mailbevestiging naar klant"
            />
          </div>
        </div>

        {error ? <div className={styles.error}>{error}</div> : null}

        <div className={styles.actions}>
          <Button
            variant="primary"
            className={styles.flex}
            onClick={bevestig}
            disabled={!kanOpslaan || bezig}
          >
            {bezig ? "Bezig…" : "Verzetten"}
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
