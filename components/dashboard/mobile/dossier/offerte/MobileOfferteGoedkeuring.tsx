"use client";

import { CheckCircle2, Pencil } from "lucide-react";
import { useBotAction } from "@/components/dashboard/bot-actions/use-bot-action";
import { BekijkOffertePdf } from "@/components/dashboard/offerte/BekijkOffertePdf";
import type { SentOffertePdfModel } from "@/lib/dashboard/offerte/sent-offerte-pdf-model";
import type { OfferteInhoudRegel } from "@/lib/dashboard/offerte/offerte-inhoud";
import styles from "./MobileOfferteGoedkeuring.module.css";

interface MobileOfferteGoedkeuringProps {
  leadId: string;
  dienst: string;
  m2: string;
  /** Totaal incl. btw (geformatteerd). */
  totaal: string;
  /** Offerte-regels (mobiel tonen we per regel alleen het bedrag). */
  regels: OfferteInhoudRegel[];
  /** Kortingbedrag geformatteerd, of null. */
  korting: string | null;
  /** PDF-model voor "Bekijk volledige offerte". */
  pdfModel: SentOffertePdfModel;
  /** Opent het Offerte-tabblad om de offerte aan te passen. */
  onAanpassen: () => void;
}

/** Mobiel blok onder de kop zodra een offerte op goedkeuring wacht. Toont de
 *  regels en het totaal, een knop naar de volledige PDF, en de acties Aanpassen
 *  en Goedkeuren (verstuurt via dezelfde approve-quote-route als desktop). */
export function MobileOfferteGoedkeuring({
  leadId,
  dienst,
  m2,
  totaal,
  regels,
  korting,
  pdfModel,
  onAanpassen,
}: MobileOfferteGoedkeuringProps) {
  const { run, pending, error } = useBotAction(
    `/api/dashboard/lead/${leadId}/approve-quote`,
  );
  const sub = [dienst, m2].filter(Boolean).join(" · ");

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

      <div className={styles.regels}>
        {regels.map((r, i) => (
          <div key={`${r.naam}-${i}`} className={styles.regel}>
            <span className={styles.rNaam}>{r.naam}</span>
            <span className={styles.rBedrag}>{r.bedrag}</span>
          </div>
        ))}
        {korting ? (
          <div className={`${styles.regel} ${styles.green}`}>
            <span className={styles.rNaam}>Korting</span>
            <span className={styles.rBedrag}>− {korting}</span>
          </div>
        ) : null}
        <div className={styles.tot}>
          <strong>Totaal incl. btw</strong>
          <span className={styles.totBedrag}>{totaal}</span>
        </div>
      </div>

      <BekijkOffertePdf model={pdfModel} className={styles.pdflink} />

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
