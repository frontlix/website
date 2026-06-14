"use client";

import { Clock, Eye, FileDown, FileText, Mail, MessageCircle } from "lucide-react";
import { fmtEuro } from "./offerte-utils";
import type { Kanaal, OfferteKlant } from "./types";
import styles from "./StapVersturen.module.css";

interface StapVersturenProps {
  totaal: number;
  kanaal: Kanaal;
  setKanaal: (k: Kanaal) => void;
  klant: OfferteKlant | null;
  /** Geldigheid in dagen, voor de "geldig t/m"-datum in de preview. */
  geldigDagen: number;
  /** Bedrijfsnaam van de tenant, voor de afsluiting "Team {bedrijf}". */
  bedrijfsnaam: string;
  /** Persoonlijk bericht (komt in plaats van de standaard-introtekst). */
  bericht: string;
}

/** "geldig t/m"-datum: vandaag + n dagen, NL-genotuleerd. */
function geldigTotDatum(dagen: number): string {
  const d = new Date();
  d.setDate(d.getDate() + Math.max(0, dagen));
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}

/** Stap 4 · Versturen: kanaal-kaarten (e-mail of PDF; WhatsApp is "Binnenkort")
 *  + een preview die exact toont wat de klant straks ontvangt. De teksten volgen
 *  de Schoon Straatje-assistent, zodat dashboard en bot dezelfde toon hebben. */
export function StapVersturen({
  totaal,
  kanaal,
  setKanaal,
  klant,
  geldigDagen,
  bedrijfsnaam,
  bericht,
}: StapVersturenProps) {
  const voornaam = klant?.naam ? klant.naam.split(" ")[0] : "de klant";
  const geldigTot = geldigTotDatum(geldigDagen);

  const kanalen: {
    id: Kanaal;
    titel: string;
    sub: string;
    Icon: typeof MessageCircle;
    binnenkort?: boolean;
  }[] = [
    {
      id: "whatsapp",
      titel: "WhatsApp",
      sub: "Binnenkort, verloopt via de bot",
      Icon: MessageCircle,
      binnenkort: true,
    },
    {
      id: "email",
      titel: "E-mail",
      sub: klant && klant.email ? klant.email : "Geen e-mailadres bekend",
      Icon: Mail,
    },
    { id: "pdf", titel: "Download PDF", sub: "Sla op of print, verstuur zelf", Icon: FileDown },
  ];

  const isPdf = kanaal === "pdf";

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
                onClick={() => !k.binnenkort && setKanaal(k.id)}
                disabled={k.binnenkort}
                aria-disabled={k.binnenkort}
                title={k.binnenkort ? "Binnenkort, WhatsApp-verzending loopt via de bot" : undefined}
                className={`${styles.kanaal} ${aan ? styles.kanaalAan : ""} ${k.binnenkort ? styles.kanaalUit : ""}`}
              >
                {k.binnenkort ? (
                  <span className={styles.binnenkortBadge}>
                    <Clock size={11} strokeWidth={2.5} /> Binnenkort
                  </span>
                ) : null}
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
          <span className="rb-section-label">{isPdf ? "De PDF" : "Het bericht"}</span>
          <span className={styles.preview}>
            <Eye size={13} strokeWidth={2.2} /> {isPdf ? "zo ziet de offerte eruit" : "zo ziet de klant het"}
          </span>
        </div>

        {isPdf ? (
          <div className={`${styles.canvas} ${styles.canvasPdf}`}>
            <div className={styles.pdfKaart}>
              <span className={styles.attachIcon}>
                <FileText size={18} strokeWidth={2.2} />
              </span>
              <div>
                <div className={styles.attachNaam}>offerte-schoon-straatje.pdf</div>
                <div className={styles.attachMeta}>
                  {fmtEuro(totaal)} incl. BTW · geldig t/m {geldigTot}
                </div>
              </div>
            </div>
            <div className={styles.pdfUitleg}>
              Je downloadt de offerte als PDF en verstuurt &apos;m zelf. Er gaat niets
              automatisch naar de klant.
            </div>
          </div>
        ) : (
          <div className={`${styles.canvas} ${styles.canvasMail}`}>
            <div className={`${styles.bubble} ${styles.bubbleMail}`}>
              <div className={styles.mailOnderwerp}>Uw offerte, {bedrijfsnaam}</div>
              Goed nieuws, {voornaam}!
              <br />
              <br />
              {bericht.trim()
                ? bericht.trim()
                : "Uw offerte is opgesteld en staat voor u klaar. In de bijlage van deze e-mail vindt u uw persoonlijke offerte."}
              <div className={styles.attach}>
                <span className={styles.attachIcon}>
                  <FileText size={15} strokeWidth={2.2} />
                </span>
                <div>
                  <div className={styles.attachNaam}>offerte-schoon-straatje.pdf</div>
                  <div className={styles.attachMeta}>
                    {fmtEuro(totaal)} incl. BTW · geldig t/m {geldigTot}
                  </div>
                </div>
              </div>
              <div className={styles.mailGroet}>
                Met vriendelijke groet,
                <br />
                Team {bedrijfsnaam}
              </div>
              <div className={styles.bubbleTime}>nog niet verstuurd</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
