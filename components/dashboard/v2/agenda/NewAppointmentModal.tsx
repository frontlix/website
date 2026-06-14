"use client";

import { useEffect, useState } from "react";
import { Modal, Button, Toggle } from "@/components/dashboard/v2/ui";
import { KlantSelect, type KlantOptie } from "./KlantSelect";
import styles from "./NewAppointmentModal.module.css";

export interface NieuweAfspraak {
  titel: string;
  /** Gekoppelde klantnaam (optioneel). */
  klant: string;
  /** Lead-context bij een echte koppeling (optioneel). */
  leadId?: string;
  telefoon?: string;
  adres?: string;
  afstandKm?: number;
  /** Datum YYYY-MM-DD. */
  datum: string;
  /** "HH:MM" */
  tijd: string;
  /** Duur-label, bv. "2u". */
  duur: string;
  /** Klant een WhatsApp-bevestiging sturen bij het boeken (live). */
  notifyWhatsapp: boolean;
  /** Klant een e-mailbevestiging sturen bij het boeken (live). */
  notifyEmail: boolean;
}

interface NewAppointmentModalProps {
  open: boolean;
  onClose: () => void;
  /** Bestaande leads om aan te koppelen. */
  klanten: KlantOptie[];
  /** Live: een klant koppelen is verplicht (er wordt voor een lead geboekt). */
  klantVerplicht?: boolean;
  /** Bezig met opslaan/boeken (knoppen uitschakelen). */
  bezig?: boolean;
  /** Foutmelding van het opslaan (bv. boeken mislukt). */
  error?: string | null;
  /** Opslaan met de ingevulde afspraak. */
  onOpslaan: (afspraak: NieuweAfspraak) => void;
}

/** Aantal uren → duur-label ("2" → "2u", "1.5" → "1u30m", "0.5" → "30m"). */
function urenNaarLabel(u: number): string {
  if (!Number.isFinite(u) || u <= 0) return "1u";
  const totaalMin = Math.round(u * 60);
  const h = Math.floor(totaalMin / 60);
  const m = totaalMin % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}u`;
  return `${h}u${m}m`;
}

/** Lokale datum (YYYY-MM-DD) van vandaag, voor de default in de datumkiezer. */
function vandaagISO(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Nieuwe afspraak inplannen: bewerkbaar formulier (titel, klant, datum, tijd,
 *  duur). Opslaan zet de afspraak in de agenda (zie AgendaView). */
export function NewAppointmentModal({
  open,
  onClose,
  klanten,
  klantVerplicht = false,
  bezig = false,
  error = null,
  onOpslaan,
}: NewAppointmentModalProps) {
  const [titel, setTitel] = useState("");
  const [klant, setKlant] = useState("");
  const [klantOptie, setKlantOptie] = useState<KlantOptie | null>(null);
  const [datum, setDatum] = useState("");
  const [tijd, setTijd] = useState("10:00");
  const [uren, setUren] = useState("8");
  const [notifyWhatsapp, setNotifyWhatsapp] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(true);

  // Verse velden telkens als de modal opent.
  useEffect(() => {
    if (open) {
      setTitel("");
      setKlant("");
      setKlantOptie(null);
      setDatum(vandaagISO());
      setTijd("10:00");
      setUren("8");
      setNotifyWhatsapp(true);
      setNotifyEmail(true);
    }
  }, [open]);

  // Alleen koppelen als de tekst nog overeenkomt met de gekozen lead.
  const gekoppeld =
    klantOptie && klantOptie.naam === klant.trim() ? klantOptie : null;

  const kanOpslaan =
    titel.trim().length > 0 &&
    /^\d{4}-\d{2}-\d{2}$/.test(datum) &&
    /^\d{2}:\d{2}$/.test(tijd) &&
    Number(uren) > 0 &&
    (!klantVerplicht || !!gekoppeld);

  function opslaan() {
    if (!kanOpslaan) return;
    onOpslaan({
      titel: titel.trim(),
      klant: klant.trim(),
      leadId: gekoppeld?.leadId,
      telefoon: gekoppeld?.telefoon,
      adres: gekoppeld?.adres,
      afstandKm: gekoppeld?.afstandKm,
      datum,
      tijd,
      duur: urenNaarLabel(Number(uren)),
      notifyWhatsapp,
      notifyEmail,
    });
  }

  return (
    <Modal open={open} onClose={onClose} width={480} label="Nieuwe afspraak">
      <div className={styles.body}>
        <h2 className={styles.title}>Nieuwe afspraak</h2>
        <div className={styles.grid}>
          <div className={styles.full}>
            <label className={styles.label} htmlFor="na-titel">
              Titel
            </label>
            <input
              id="na-titel"
              type="text"
              className={styles.input}
              value={titel}
              onChange={(e) => setTitel(e.target.value)}
              placeholder="Klus · Oprit reinigen"
              autoComplete="off"
            />
          </div>

          <div className={styles.full}>
            <span className={styles.label}>
              Klant koppelen{klantVerplicht ? " *" : ""}
            </span>
            <KlantSelect
              klanten={klanten}
              value={klant}
              onChange={(v, gekozen) => {
                setKlant(v);
                setKlantOptie(gekozen);
              }}
            />
            {klantVerplicht ? (
              <p className={styles.hint}>
                Kies een bestaande klant. De afspraak wordt dan ook in Google Agenda
                gezet, zodat die dag in de planning bezet staat.
              </p>
            ) : null}
          </div>

          <div>
            <label className={styles.label} htmlFor="na-datum">
              Datum
            </label>
            <input
              id="na-datum"
              type="date"
              className={styles.input}
              value={datum}
              onChange={(e) => setDatum(e.target.value)}
            />
          </div>
          <div>
            <label className={styles.label} htmlFor="na-tijd">
              Tijd
            </label>
            <input
              id="na-tijd"
              type="time"
              className={styles.input}
              value={tijd}
              onChange={(e) => setTijd(e.target.value)}
            />
          </div>
          <div>
            <label className={styles.label} htmlFor="na-duur">
              Duur
            </label>
            <div className={styles.suffixField}>
              <input
                id="na-duur"
                type="number"
                min="0.5"
                step="0.5"
                className={styles.suffixInput}
                value={uren}
                onChange={(e) => setUren(e.target.value)}
              />
              <span className={styles.suffix}>uur</span>
            </div>
          </div>
        </div>
        {klantVerplicht ? (
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
        ) : null}

        {error ? <div className={styles.error}>{error}</div> : null}

        <div className={styles.actions}>
          <Button
            variant="primary"
            className={styles.flex}
            onClick={opslaan}
            disabled={!kanOpslaan || bezig}
          >
            {bezig ? "Bezig…" : "Opslaan"}
          </Button>
          <Button
            variant="secondary"
            className={styles.flex}
            onClick={onClose}
            disabled={bezig}
          >
            Annuleren
          </Button>
        </div>
      </div>
    </Modal>
  );
}
