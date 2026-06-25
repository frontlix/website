"use client";

import { CheckCircle2, Pencil } from "lucide-react";
import { useBotAction } from "@/components/dashboard/bot-actions/use-bot-action";
import styles from "./MobileOfferteGoedkeuring.module.css";

interface MobileOfferteGoedkeuringProps {
  leadId: string;
  dienst: string;
  m2: string;
  totaal: string;
  /** Opent het Offerte-tabblad om de offerte aan te passen. */
  onAanpassen: () => void;
}

/** Mobiel blok onder de kop zodra een offerte op goedkeuring wacht. Goedkeuren
 *  verstuurt via dezelfde approve-quote-route als desktop; Aanpassen opent het
 *  Offerte-tabblad. */
export function MobileOfferteGoedkeuring({
  leadId,
  dienst,
  m2,
  totaal,
  onAanpassen,
}: MobileOfferteGoedkeuringProps) {
  const { run, pending, error } = useBotAction(
    `/api/dashboard/lead/${leadId}/approve-quote`,
  );
  const sub = [dienst, m2, totaal].filter(Boolean).join(" · ");

  const goedkeuren = () => {
    if (pending) return;
    if (!window.confirm("Offerte nu naar de klant sturen via WhatsApp?")) return;
    run();
  };

  return (
    <section className={styles.blok}>
      <div className={styles.kop}>
        <span className={styles.icoon}>
          <CheckCircle2 size={18} strokeWidth={2.2} />
        </span>
        <div className={styles.tekst}>
          <strong>Offerte wacht op je goedkeuring</strong>
          <span>{sub}</span>
        </div>
      </div>
      <div className={styles.acties}>
        <button
          type="button"
          className={styles.aanpassen}
          onClick={onAanpassen}
          disabled={pending}
        >
          <Pencil size={15} strokeWidth={2.1} />
          Aanpassen
        </button>
        <button
          type="button"
          className={styles.goedkeuren}
          onClick={goedkeuren}
          disabled={pending}
        >
          {pending ? "Versturen…" : "Goedkeuren"}
        </button>
      </div>
      {error ? <p className={styles.fout}>{error}</p> : null}
    </section>
  );
}
