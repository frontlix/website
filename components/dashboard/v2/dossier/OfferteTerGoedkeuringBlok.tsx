"use client";

import { CheckCircle2, Pencil } from "lucide-react";
import styles from "./OfferteTerGoedkeuringBlok.module.css";

interface OfferteTerGoedkeuringBlokProps {
  /** Dienst-label van de wachtende offerte. */
  dienst: string;
  /** Oppervlakte-label (bv. "45 m²") of leeg. */
  m2: string;
  /** Totaalbedrag incl. btw (geformatteerd, bv. "€ 380,00"). */
  totaal: string;
  /** Bezig met versturen: knoppen uit + label op "Versturen…". */
  sending: boolean;
  onGoedkeuren: () => void;
  onAanpassen: () => void;
}

/** Blok bovenaan het dossier zodra een offerte op goedkeuring wacht. Toont een
 *  samenvatting en twee acties: Aanpassen (opent de offerte-editor) en
 *  Goedkeuren (verstuurt de offerte naar de klant via WhatsApp). */
export function OfferteTerGoedkeuringBlok({
  dienst,
  m2,
  totaal,
  sending,
  onGoedkeuren,
  onAanpassen,
}: OfferteTerGoedkeuringBlokProps) {
  const sub = [dienst, m2, totaal].filter(Boolean).join(" · ");
  return (
    <div className={styles.blok}>
      <span className={styles.icoon}>
        <CheckCircle2 size={20} strokeWidth={2.2} />
      </span>
      <div className={styles.tekst}>
        <strong>Offerte wacht op je goedkeuring</strong>
        <span>{sub}</span>
      </div>
      <div className={styles.acties}>
        <button
          type="button"
          className={styles.aanpassen}
          onClick={onAanpassen}
          disabled={sending}
        >
          <Pencil size={15} strokeWidth={2.1} />
          Aanpassen
        </button>
        <button
          type="button"
          className={styles.goedkeuren}
          onClick={onGoedkeuren}
          disabled={sending}
        >
          {sending ? "Versturen…" : "Goedkeuren"}
        </button>
      </div>
    </div>
  );
}
