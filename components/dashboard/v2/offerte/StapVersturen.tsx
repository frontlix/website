"use client";

import { Eye, FileDown, FileText, Mail, MessageCircle } from "lucide-react";
import { fmtEuro } from "./offerte-utils";
import type { Kanaal, OfferteKlant } from "./types";
import styles from "./StapVersturen.module.css";

interface StapVersturenProps {
  totaal: number;
  kanaal: Kanaal;
  setKanaal: (k: Kanaal) => void;
  klant: OfferteKlant | null;
}

/** Stap 4 · Versturen: kanaal-kaarten (actief = blauwe rand) + berichtpreview
 *  als WhatsApp-bubbel met live totaal en PDF-bijlage-chip. */
export function StapVersturen({ totaal, kanaal, setKanaal, klant }: StapVersturenProps) {
  const naam = klant ? klant.naam : "de klant";
  const kanalen: { id: Kanaal; titel: string; sub: string; Icon: typeof MessageCircle }[] = [
    { id: "whatsapp", titel: "WhatsApp", sub: "Aanbevolen, klant appte vandaag", Icon: MessageCircle },
    {
      id: "email",
      titel: "E-mail",
      sub: klant && klant.email ? klant.email : "Geen e-mailadres bekend",
      Icon: Mail,
    },
    { id: "pdf", titel: "Download PDF", sub: "Sla op of print, verstuur zelf", Icon: FileDown },
  ];

  const isWa = kanaal === "whatsapp";

  return (
    <div className={styles.col}>
      {/* Kanaalkeuze */}
      <div className={styles.card}>
        <div className="rb-section-label">Hoe wil je versturen? Klik om te kiezen</div>
        <div className={styles.kanalen}>
          {kanalen.map((k) => {
            const aan = kanaal === k.id;
            return (
              <button
                type="button"
                key={k.id}
                onClick={() => setKanaal(k.id)}
                className={`${styles.kanaal} ${aan ? styles.kanaalAan : ""}`}
              >
                <div className={styles.kanaalTitel}>
                  <k.Icon size={16} strokeWidth={2.2} />
                  {k.titel}
                </div>
                <div className={styles.kanaalSub}>{k.sub}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Berichtpreview */}
      <div className={styles.card}>
        <div className={styles.cardHead}>
          <span className="rb-section-label">Het bericht</span>
          <span className={styles.preview}>
            <Eye size={13} strokeWidth={2.2} /> zo ziet de klant het
          </span>
        </div>
        <div className={`${styles.canvas} ${isWa ? styles.canvasWa : styles.canvasMail}`}>
          <div className={`${styles.bubble} ${isWa ? styles.bubbleWa : styles.bubbleMail}`}>
            Hoi {naam}! Hierbij de offerte voor het reinigen en opnieuw invegen van jullie oprit:{" "}
            <strong>{fmtEuro(totaal)} incl. BTW</strong>. Geldig t/m 24 juni. Vragen?{" "}
            {isWa ? "App gerust terug!" : "Reageer gerust!"}
            <div className={styles.attach}>
              <span className={styles.attachIcon}>
                <FileText size={15} strokeWidth={2.2} />
              </span>
              <div>
                <div className={styles.attachNaam}>Offerte-SS-2026-047.pdf</div>
                <div className={styles.attachMeta}>1 pagina · met online akkoord-knop</div>
              </div>
            </div>
            <div className={styles.bubbleTime}>nog niet verstuurd</div>
          </div>
        </div>
      </div>
    </div>
  );
}
