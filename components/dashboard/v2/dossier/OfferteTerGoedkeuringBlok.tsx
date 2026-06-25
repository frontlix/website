"use client";

import { CheckCircle2, Pencil } from "lucide-react";
import { BekijkOffertePdf } from "@/components/dashboard/offerte/BekijkOffertePdf";
import type { SentOffertePdfModel } from "@/lib/dashboard/offerte/sent-offerte-pdf-model";
import type { OfferteRegel } from "./dossier-data";
import styles from "./OfferteTerGoedkeuringBlok.module.css";

interface OfferteTerGoedkeuringBlokProps {
  /** Dienst-label van de wachtende offerte. */
  dienst: string;
  /** Oppervlakte-label (bv. "45 m²") of leeg. */
  m2: string;
  /** Totaalbedrag incl. btw (geformatteerd, bv. "€ 459,80"). */
  totaal: string;
  /** Offerte-regels (omschrijving, rekenregel, bedrag). */
  regels: OfferteRegel[];
  /** Subtotaal excl. btw, geformatteerd. */
  subtotaal: string;
  /** Kortingbedrag geformatteerd, of null bij geen korting. */
  korting: string | null;
  /** BTW (21%), geformatteerd. */
  btw: string;
  /** PDF-model voor "Bekijk volledige offerte". */
  pdfModel: SentOffertePdfModel;
  /** Bezig met versturen: knoppen uit + label op "Versturen…". */
  sending: boolean;
  onGoedkeuren: () => void;
  onAanpassen: () => void;
}

/** Blok bovenaan het dossier zodra een offerte op goedkeuring wacht. Toont de
 *  offerte-inhoud (regels + subtotalen) in twee kolommen, met links het totaal
 *  en de acties Aanpassen + Goedkeuren, en een knop naar de volledige PDF. */
export function OfferteTerGoedkeuringBlok({
  dienst,
  m2,
  totaal,
  regels,
  subtotaal,
  korting,
  btw,
  pdfModel,
  sending,
  onGoedkeuren,
  onAanpassen,
}: OfferteTerGoedkeuringBlokProps) {
  const sub = [dienst, m2].filter(Boolean).join(" · ");
  return (
    <div className={styles.blok}>
      <div className={styles.head}>
        <span className={styles.icoon}>
          <CheckCircle2 size={20} strokeWidth={2.2} />
        </span>
        <div className={styles.tekst}>
          <strong>Offerte wacht op je goedkeuring</strong>
          <span>{sub}</span>
        </div>
        <BekijkOffertePdf model={pdfModel} className={styles.pdflink} />
      </div>

      <div className={styles.body}>
        <div className={styles.left}>
          <div className={styles.lbl}>Totaal incl. btw</div>
          <div className={styles.big}>{totaal}</div>
          <div className={styles.acties}>
            <button
              type="button"
              className={styles.goedkeuren}
              onClick={onGoedkeuren}
              disabled={sending}
            >
              {sending ? "Versturen…" : "Goedkeuren"}
            </button>
            <button
              type="button"
              className={styles.aanpassen}
              onClick={onAanpassen}
              disabled={sending}
            >
              <Pencil size={15} strokeWidth={2.1} />
              Aanpassen
            </button>
          </div>
        </div>

        <div className={styles.right}>
          {regels.map((r, i) => (
            <div key={`${r.naam}-${i}`} className={styles.regel}>
              <span className={styles.rNaam}>{r.naam}</span>
              {r.calc ? <span className={styles.rCalc}>{r.calc}</span> : null}
              <span className={styles.rBedrag}>{r.bedrag}</span>
            </div>
          ))}
          <div className={styles.divider} />
          <div className={styles.sub}>
            <span>Subtotaal</span>
            <span className={styles.subV}>{subtotaal}</span>
          </div>
          {korting ? (
            <div className={`${styles.sub} ${styles.subGreen}`}>
              <span>Korting</span>
              <span className={styles.subV}>− {korting}</span>
            </div>
          ) : null}
          <div className={styles.sub}>
            <span>BTW (21%)</span>
            <span className={styles.subV}>{btw}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
