"use client";

import { ChevronDown, ChevronUp, RotateCcw, X } from "lucide-react";
import { MiniStep } from "./MiniStep";
import { fmtEuro, naarKomma, parsePrijs } from "./offerte-utils";
import type { BtwKeuze, GeordendItem, KortingType, Regel, VrijeRegel } from "./types";

/** Is de eenheidsprijs van deze regel handmatig afgewijkt van de prijslijst?
 *  (Alleen voor regels met een prijsDefault; voegzand/rol hebben geen lijst-
 *  default en tonen dus geen "aangepast"-indicatie.) */
function prijsAangepast(r: Regel): boolean {
  return (
    r.prijsDefault != null &&
    (r.prijsInvoer ?? "").trim() !== "" &&
    parsePrijs(r.prijsInvoer ?? "") !== r.prijsDefault
  );
}
import styles from "./StapOfferte.module.css";

interface StapOfferteProps {
  geordend: GeordendItem[];
  /** Verschuift de regel op index `van` naar index `naar` (1 omhoog/omlaag). */
  herorden: (van: number, naar: number) => void;
  vrij: VrijeRegel[];
  setVrij: (v: VrijeRegel[]) => void;
  kortingType: KortingType;
  setKortingType: (t: KortingType) => void;
  kortingPct: string;
  setKortingPct: (v: string) => void;
  kortingEuro: string;
  setKortingEuro: (v: string) => void;
  kortingReden: string;
  setKortingReden: (v: string) => void;
  geldigDagen: number;
  setGeldigDagen: (n: number) => void;
  btw: BtwKeuze;
  setBtw: (b: BtwKeuze) => void;
  bericht: string;
  setBericht: (v: string) => void;
}

/** "geldig t/m"-datum: vandaag + n dagen, NL-genotuleerd. */
function geldigTotDatum(dagen: number): string {
  const d = new Date();
  d.setDate(d.getDate() + Math.max(0, dagen));
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

const BTW_OPTIES: BtwKeuze[] = ["21%", "9%", "0%", "Verlegd"];

/** Stap 3 · Offerte: regels met steppers + omhoog/omlaag herordenen, vrije
 *  regels, BTW-keuze, korting (typbaar + stappen van 5), geldigheid, bericht. */
export function StapOfferte({
  geordend,
  herorden,
  vrij,
  setVrij,
  kortingType,
  setKortingType,
  kortingPct,
  setKortingPct,
  kortingEuro,
  setKortingEuro,
  kortingReden,
  setKortingReden,
  geldigDagen,
  setGeldigDagen,
  btw,
  setBtw,
  bericht,
  setBericht,
}: StapOfferteProps) {
  const voegVrijToe = () => setVrij([...vrij, { id: Date.now(), naam: "", bedrag: "50" }]);
  const zetVrij = (id: number, patch: Partial<VrijeRegel>) =>
    setVrij(vrij.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  const wegVrij = (id: number) => setVrij(vrij.filter((v) => v.id !== id));
  /** Stap het euro-bedrag van een vrije regel met ±5 (en houd het als string). */
  const stapVrijBedrag = (id: number, huidig: string, richting: 1 | -1) => {
    const nieuw = Math.max(0, parsePrijs(huidig) + richting * 5);
    zetVrij(id, { bedrag: naarKomma(nieuw) });
  };

  const omhoog = (i: number) => herorden(i, i - 1);
  const omlaag = (i: number) => herorden(i, i + 1);

  const stapKorting = (richting: 1 | -1) => {
    const huidig = parsePrijs(kortingPct);
    const nieuw =
      richting === 1 ? Math.min(100, huidig + 5) : Math.max(0, huidig - 5);
    setKortingPct(naarKomma(nieuw));
  };

  const stapKortingEuro = (richting: 1 | -1) => {
    const nieuw = Math.max(0, parsePrijs(kortingEuro) + richting * 10);
    setKortingEuro(naarKomma(nieuw));
  };

  const stapGeldig = (richting: 1 | -1) => {
    setGeldigDagen(Math.max(1, geldigDagen + richting));
  };

  return (
    <div className={styles.col}>
      {/* Regels */}
      <div className={styles.card}>
        <div className={styles.cardHead}>
          <span className="rb-section-label">Offerteregels</span>
          <span className={styles.handHint}>
            Gebruik de pijltjes om de volgorde aan te passen.
          </span>
        </div>
        <div className={styles.regels}>
          {geordend.map((item, i) => {
            const eerste = i === 0;
            const laatste = i === geordend.length - 1;
            const handle = (
              <span className={styles.handle}>
                <button
                  type="button"
                  className={styles.ordBtn}
                  onClick={() => omhoog(i)}
                  disabled={eerste}
                  aria-label="Naar boven"
                >
                  <ChevronUp size={12} strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  className={styles.ordBtn}
                  onClick={() => omlaag(i)}
                  disabled={laatste}
                  aria-label="Naar beneden"
                >
                  <ChevronDown size={12} strokeWidth={2.5} />
                </button>
              </span>
            );
            return item.regel ? (
              <div key={item.key} className={styles.regel}>
                {handle}
                <span className={styles.regelNaam}>{item.regel.naam}</span>
                <span className={styles.qtyBox}>
                  <MiniStep
                    dir="min"
                    onClick={() =>
                      item.regel!.set(item.regel!.qty - (item.regel!.unit === "m²" ? 5 : 1))
                    }
                  />
                  <strong>{item.regel.qty}</strong>
                  <span className={styles.unit}>{item.regel.unit}</span>
                  <MiniStep
                    dir="plus"
                    onClick={() =>
                      item.regel!.set(item.regel!.qty + (item.regel!.unit === "m²" ? 5 : 1))
                    }
                  />
                </span>
                {item.regel.setPrijsInvoer ? (
                  <span className={styles.regelMeta}>
                    ×{" "}
                    <span
                      className={`${styles.vrijBedragBox} ${
                        prijsAangepast(item.regel) ? styles.prijsAangepast : ""
                      }`}
                    >
                      <span className={styles.vrijEuro}>€</span>
                      <input
                        className={styles.vrijBedragInput}
                        value={item.regel.prijsInvoer ?? ""}
                        inputMode="decimal"
                        placeholder={naarKomma(item.regel.prijsDefault ?? item.regel.prijs)}
                        onChange={(e) => item.regel!.setPrijsInvoer!(e.target.value)}
                        aria-label={`Prijs ${item.regel.naam}`}
                      />
                      {prijsAangepast(item.regel) ? (
                        <button
                          type="button"
                          className={styles.prijsReset}
                          onClick={() => item.regel!.setPrijsInvoer!("")}
                          title="Terug naar prijslijst"
                          aria-label="Prijs terug naar de prijslijst"
                        >
                          <RotateCcw size={11} strokeWidth={2.5} />
                        </button>
                      ) : null}
                    </span>
                  </span>
                ) : (
                  <span className={styles.regelMeta}>× {fmtEuro(item.regel.prijs)}</span>
                )}
                <span className={styles.regelBedrag}>
                  {fmtEuro(item.regel.qty * item.regel.prijs)}
                </span>
              </div>
            ) : (
              <div key={item.key} className={styles.vrijRegel}>
                {handle}
                <span className={styles.vrijBadge}>vrije regel</span>
                <input
                  className={styles.vrijInput}
                  value={item.vrij!.naam}
                  placeholder="Omschrijving meerwerk…"
                  onChange={(e) => zetVrij(item.vrij!.id, { naam: e.target.value })}
                  aria-label="Omschrijving meerwerk"
                />
                <span className={styles.vrijBedragBox}>
                  <MiniStep
                    dir="min"
                    onClick={() => stapVrijBedrag(item.vrij!.id, item.vrij!.bedrag, -1)}
                  />
                  <span className={styles.vrijEuro}>€</span>
                  <input
                    className={styles.vrijBedragInput}
                    value={item.vrij!.bedrag}
                    inputMode="decimal"
                    placeholder="0"
                    onChange={(e) => zetVrij(item.vrij!.id, { bedrag: e.target.value })}
                    aria-label="Bedrag meerwerk"
                  />
                  <MiniStep
                    dir="plus"
                    onClick={() => stapVrijBedrag(item.vrij!.id, item.vrij!.bedrag, 1)}
                  />
                </span>
                <button
                  type="button"
                  className={styles.wegBtn}
                  onClick={() => wegVrij(item.vrij!.id)}
                  title="Regel verwijderen"
                  aria-label="Regel verwijderen"
                >
                  <X size={11} strokeWidth={2.5} />
                </button>
              </div>
            );
          })}
        </div>
        <div className={styles.regelActies}>
          <button type="button" className={styles.actieBlue} onClick={voegVrijToe}>
            + Vrije regel (meerwerk)
          </button>
          <button type="button" className={styles.actieGrijs}>
            + Uit prijslijst
          </button>
        </div>
      </div>

      {/* BTW · Korting · Geldigheid */}
      <div className={styles.subGrid}>
        <div className={styles.cardSm}>
          <div className="rb-section-label">BTW</div>
          <div className={styles.btwRow}>
            {BTW_OPTIES.map((t) => {
              // De server-action rekent op dit moment altijd 21% (computeTotals
              // kent geen btw_pct). Daarom is alleen 21% kiesbaar; 9%/0%/Verlegd
              // zijn disabled zodat de getoonde BTW gelijk is aan wat wordt
              // opgeslagen en gemaild. Volle BTW-keuze is een follow-up.
              const beschikbaar = t === "21%";
              return (
                <button
                  type="button"
                  key={t}
                  onClick={() => beschikbaar && setBtw(t)}
                  disabled={!beschikbaar}
                  aria-disabled={!beschikbaar}
                  title={beschikbaar ? undefined : "Binnenkort beschikbaar, nu rekent de offerte met 21%"}
                  className={`${styles.btwBtn} ${btw === t ? styles.btwActive : ""}`}
                >
                  {t}
                </button>
              );
            })}
          </div>
          <div className={styles.kortingNote}>
            Op dit moment rekent de offerte met 21% BTW, andere tarieven volgen binnenkort
          </div>
        </div>

        <div className={styles.cardSm}>
          <div className={styles.kortingHead}>
            <span className="rb-section-label">Korting</span>
            <div className={styles.kortingToggle}>
              <button
                type="button"
                className={`${styles.toggleBtn} ${kortingType === "procent" ? styles.toggleActive : ""}`}
                onClick={() => setKortingType("procent")}
              >
                Percentage
              </button>
              <button
                type="button"
                className={`${styles.toggleBtn} ${kortingType === "euro" ? styles.toggleActive : ""}`}
                onClick={() => setKortingType("euro")}
              >
                Vast bedrag
              </button>
            </div>
          </div>
          <div className={styles.kortingRow}>
            {kortingType === "procent" ? (
              <span className={styles.kortingBox}>
                <MiniStep dir="min" onClick={() => stapKorting(-1)} />
                <input
                  className={styles.kortingInput}
                  value={kortingPct}
                  placeholder="0"
                  inputMode="decimal"
                  onChange={(e) => setKortingPct(e.target.value)}
                  aria-label="Kortingspercentage"
                />
                <span className={styles.kortingPct}>%</span>
                <MiniStep dir="plus" onClick={() => stapKorting(1)} />
              </span>
            ) : (
              <span className={styles.kortingBox}>
                <MiniStep dir="min" onClick={() => stapKortingEuro(-1)} />
                <span className={styles.kortingPct}>€</span>
                <input
                  className={styles.kortingInput}
                  value={kortingEuro}
                  placeholder="0"
                  inputMode="decimal"
                  onChange={(e) => setKortingEuro(e.target.value)}
                  aria-label="Kortingsbedrag in euro"
                />
                <MiniStep dir="plus" onClick={() => stapKortingEuro(1)} />
              </span>
            )}
            <input
              className={styles.redenInput}
              value={kortingReden}
              placeholder="Reden (zichtbaar voor klant)"
              onChange={(e) => setKortingReden(e.target.value)}
              aria-label="Reden korting"
            />
          </div>
          <div className={styles.kortingNote}>
            {kortingType === "procent"
              ? "Typ een eigen percentage (komma mag, bijv. 7,5) of klik −/+ voor stappen van 5"
              : "Typ een vast bedrag in euro (bijv. 100) of klik −/+ voor stappen van 10"}
          </div>
        </div>

        <div className={styles.cardSm}>
          <div className="rb-section-label">Geldigheid, pas zelf aan</div>
          <div className={styles.geldigRow}>
            <span className={styles.geldigBox}>
              <MiniStep dir="min" onClick={() => stapGeldig(-1)} />
              <input
                className={styles.geldigInput}
                value={geldigDagen}
                inputMode="numeric"
                onChange={(e) =>
                  setGeldigDagen(parseInt(e.target.value.replace(/\D/g, ""), 10) || 0)
                }
                aria-label="Geldigheid in dagen"
              />
              <span className={styles.geldigEenheid}>dagen</span>
              <MiniStep dir="plus" onClick={() => stapGeldig(1)} />
            </span>
            <span className={styles.geldigSub}>
              geldig t/m <strong>{geldigTotDatum(geldigDagen)}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Persoonlijk bericht */}
      <div className={styles.cardSm}>
        <div className="rb-section-label">Persoonlijk bericht bovenaan de offerte, typ gerust</div>
        <textarea
          className={styles.bericht}
          value={bericht}
          rows={2}
          onChange={(e) => setBericht(e.target.value)}
        />
      </div>
    </div>
  );
}
