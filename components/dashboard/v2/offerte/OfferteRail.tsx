"use client";

import { Check, ChevronLeft, FileDown, Send, TriangleAlert } from "lucide-react";
import { offerteAdres } from "./offerte-data";
import { fmtEuro } from "./offerte-utils";
import type { BtwKeuze, GeordendItem, Kanaal, OfferteKlant } from "./types";
import styles from "./OfferteRail.module.css";

interface OfferteRailProps {
  stap: number;
  setStap: (i: number) => void;
  klant: OfferteKlant | null;
  geordend: GeordendItem[];
  korstmosToeslag: boolean;
  toeslag: number;
  kortingPct: string;
  kortingReden: string;
  korting: number;
  totaal: number;
  btw: BtwKeuze;
  btwBedrag: number;
  kanaal: Kanaal;
  onVerstuur: () => void;
  onClose: () => void;
}

/** Rechter sticky-rail: live totaal, regels, toeslag, korting, BTW-regel,
 *  validatiemelding en Terug/Volgende (of de verstuur-knop op stap 4). */
export function OfferteRail({
  stap,
  setStap,
  klant,
  geordend,
  korstmosToeslag,
  toeslag,
  kortingPct,
  kortingReden,
  korting,
  totaal,
  btw,
  btwBedrag,
  kanaal,
  onVerstuur,
  onClose,
}: OfferteRailProps) {
  const klantNaam = klant && klant.naam && klant.naam.trim();
  const klaar = stap > 0 || !!klantNaam;
  const volgendeLabels = ["Werk", "Offerte", "Versturen"];

  const btwLabel =
    btw === "Verlegd" ? "BTW verlegd" : btw === "0%" ? "BTW-vrijgesteld" : `waarvan ${btw} BTW`;
  const totaalLabel = btw === "Verlegd" || btw === "0%" ? "Totaal" : "Totaal incl. BTW";

  const verstuurLabel =
    kanaal === "whatsapp"
      ? "Verstuur via WhatsApp"
      : kanaal === "email"
        ? "Verstuur via e-mail"
        : "Download PDF";

  return (
    <div className={styles.rail}>
      <div className={styles.topRow}>
        <span className={styles.title}>Live totaal</span>
        <span className={styles.marge}>Marge: 34%</span>
      </div>

      <div className={styles.scroll}>
        {/* Klantkaart */}
        {klantNaam ? (
          <div className={styles.klant}>
            <span className={styles.klantAvatar}>{klant?.initials || "★"}</span>
            <div className={styles.klantText}>
              <div className={styles.klantNaam}>{klant?.naam}</div>
              <div className={styles.klantAdres}>{offerteAdres(klant) || "adres volgt"}</div>
            </div>
          </div>
        ) : (
          <div className={styles.geenKlant}>Nog geen klant gekozen</div>
        )}

        {/* Regels */}
        {geordend.map((item) =>
          item.regel ? (
            <div key={item.key} className={styles.regel}>
              <div className={styles.regelText}>
                <div className={styles.regelNaam}>{item.regel.naam}</div>
                <div className={styles.regelMeta}>
                  {item.regel.qty} {item.regel.unit} × {fmtEuro(item.regel.prijs)}
                </div>
              </div>
              <span className={styles.regelBedrag}>{fmtEuro(item.regel.qty * item.regel.prijs)}</span>
            </div>
          ) : (
            <div key={item.key} className={styles.regel}>
              <div className={styles.regelText}>
                <div className={styles.regelNaam}>{item.vrij!.naam || "Vrije regel"}</div>
                <div className={styles.regelMeta}>vrije regel · eigen prijs</div>
              </div>
              <span className={styles.regelBedrag}>{fmtEuro(item.vrij!.bedrag)}</span>
            </div>
          ),
        )}

        {/* Korstmos-toeslag */}
        {korstmosToeslag ? (
          <div className={`${styles.regel} ${styles.toeslag}`}>
            <span className={styles.regelNaam}>Korstmos-toeslag (10%)</span>
            <span className={styles.regelBedrag}>{fmtEuro(toeslag)}</span>
          </div>
        ) : null}

        {/* Korting */}
        {korting > 0 ? (
          <div className={styles.korting}>
            <span className={styles.regelNaam}>
              Korting {kortingPct}%
              {kortingReden ? `, ${kortingReden.split(",")[0]}` : ""}
            </span>
            <span className={styles.regelBedrag}>−{fmtEuro(korting)}</span>
          </div>
        ) : null}
      </div>

      <div className={styles.foot}>
        <div className={styles.btwRow}>
          <span>{btwLabel}</span>
          <span>{btwBedrag > 0 ? fmtEuro(btwBedrag) : "—"}</span>
        </div>
        <div className={styles.totaalRow}>
          <span className={styles.totaalLabel}>{totaalLabel}</span>
          <span className={styles.totaalBedrag}>{fmtEuro(totaal)}</span>
        </div>

        <div className={`${styles.valid} ${klaar ? styles.validOk : styles.validWarn}`}>
          {klaar ? (
            <>
              <Check size={13} strokeWidth={3} /> Alles ingevuld, je kunt door
            </>
          ) : (
            <>
              <TriangleAlert size={13} strokeWidth={2.5} /> Vul een klantnaam in, of kies een klant
            </>
          )}
        </div>

        <div className={styles.knoppen}>
          {stap === 0 ? (
            <button type="button" className={styles.ghostBtn} onClick={onClose}>
              Annuleer
            </button>
          ) : (
            <button type="button" className={styles.ghostBtn} onClick={() => setStap(stap - 1)}>
              <ChevronLeft size={15} strokeWidth={2.5} /> Terug
            </button>
          )}

          {stap < 3 ? (
            <button
              type="button"
              className={styles.primBtn}
              disabled={!klaar}
              onClick={() => setStap(stap + 1)}
            >
              Volgende: {volgendeLabels[stap]}
              <ChevronLeft size={15} strokeWidth={2.5} className={styles.flip} />
            </button>
          ) : (
            <button type="button" className={styles.primBtn} onClick={onVerstuur}>
              {verstuurLabel}
              {kanaal === "pdf" ? (
                <FileDown size={15} strokeWidth={2.5} />
              ) : (
                <Send size={15} strokeWidth={2.5} />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
