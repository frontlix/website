"use client";

import { Check } from "lucide-react";
import { MiniStep } from "./MiniStep";
import { DIENST_REGELS, ONDERHOUD_WEKEN } from "./offerte-data";
import { fmtEuro, parsePrijs } from "./offerte-utils";
import type { Kleur } from "./types";
import styles from "./StapWerk.module.css";

interface StapWerkProps {
  m2: number;
  setM2: (v: number) => void;
  qty: { invegen: number; rollen: number };
  setQty: (q: { invegen: number; rollen: number }) => void;
  rolPrijs: string;
  setRolPrijs: (v: string) => void;
  /** Voegzand-m² per type (de in te vegen oppervlakte met dat type). */
  voegzandM2: { normaal: number; onkruidwerend: number };
  /** Zet de m² van één type én herbereken de zakken (auto-suggest). */
  zetVoegzandM2: (type: "normaal" | "onkruidwerend", v: number) => void;
  /** Aantal zakken per type, handmatig overschrijfbaar. */
  voegzandZakken: { normaal: number; onkruidwerend: number };
  setVoegzandZakken: (z: { normaal: number; onkruidwerend: number }) => void;
  zandPrijzen: { normaal: string; onkruidwerend: string };
  setZandPrijzen: (z: { normaal: string; onkruidwerend: string }) => void;
  zandPrijsN: number;
  zandPrijsO: number;
  /** Invegen-arbeidstarief per m² (Schoon Straatje-prijslijst). */
  arbeidNormaalPerM2: number;
  arbeidOnkruidwerendPerM2: number;
  diensten: Record<string, boolean>;
  setDiensten: (d: Record<string, boolean>) => void;
  bm2: number;
  setBm2: (v: number) => void;
  om2: number;
  setOm2: (v: number) => void;
  groeneAanslag: boolean;
  setGroeneAanslag: (b: boolean) => void;
  kleur: Kleur;
  setKleur: (k: Kleur) => void;
  korstmosConditie: boolean;
  setKorstmos: (b: boolean) => void;
  onderhoudWeken: number;
  setOnderhoudWeken: (w: number) => void;
  /** Echte enkele-reis-afstand van het werkadres (tenant-basis) naar de klant,
   *  uit de geocode in StapKlant; null = nog geen/niet geocodeerbaar adres. */
  afstandKm: number | null;
}

/** Stap 2 · Werk: diensten-chips, oppervlakte-stepper, voegzand per soort,
 *  conditie-kaart en planten afschermen. */
export function StapWerk({
  m2,
  setM2,
  qty,
  setQty,
  rolPrijs,
  setRolPrijs,
  voegzandM2,
  zetVoegzandM2,
  voegzandZakken,
  setVoegzandZakken,
  zandPrijzen,
  setZandPrijzen,
  zandPrijsN,
  zandPrijsO,
  arbeidNormaalPerM2,
  arbeidOnkruidwerendPerM2,
  diensten,
  setDiensten,
  bm2,
  setBm2,
  om2,
  setOm2,
  groeneAanslag,
  setGroeneAanslag,
  kleur,
  setKleur,
  korstmosConditie,
  setKorstmos,
  onderhoudWeken,
  setOnderhoudWeken,
  afstandKm,
}: StapWerkProps) {
  const wisselDienst = (d: string) => {
    const aan = !diensten[d];
    setDiensten({ ...diensten, [d]: aan });
    if (aan && d === "Beschermlaag") setBm2(m2);
    if (aan && d === "Preventieve onkruid") setOm2(m2);
  };

  const dienstM2: Record<string, { val: number; zet: (v: number) => void }> = {
    Beschermlaag: { val: bm2, zet: setBm2 },
    "Preventieve onkruid": { val: om2, zet: setOm2 },
  };

  const zandSoorten: {
    id: "normaal" | "onkruidwerend";
    naam: string;
    zakPrijs: number;
    arbeidPrijs: number;
  }[] = [
    { id: "normaal", naam: "Normaal", zakPrijs: zandPrijsN, arbeidPrijs: arbeidNormaalPerM2 },
    { id: "onkruidwerend", naam: "Onkruidwerend", zakPrijs: zandPrijsO, arbeidPrijs: arbeidOnkruidwerendPerM2 },
  ];

  return (
    <div className={styles.grid}>
      {/* Diensten */}
      <div className={`${styles.card} ${styles.full}`}>
        <div className="rb-section-label">Diensten, klik om te schakelen</div>
        <div className={styles.chips}>
          {Object.keys(diensten).map((d) => {
            const aan = diensten[d];
            return (
              <button
                type="button"
                key={d}
                onClick={() => wisselDienst(d)}
                className={`${styles.chip} ${aan ? styles.chipOn : ""}`}
              >
                {aan ? <Check size={13} strokeWidth={3} /> : null}
                {d}
              </button>
            );
          })}
        </div>
        {DIENST_REGELS.map(({ key, naam, prijs }) =>
          diensten[key] ? (
            <div key={key} className={styles.dienstRegel}>
              <span className={styles.dienstNaam}>{naam}</span>
              <span className={styles.m2Box}>
                <MiniStep dir="min" onClick={() => dienstM2[key].zet(Math.max(0, dienstM2[key].val - 5))} />
                <input
                  type="text"
                  inputMode="numeric"
                  className={styles.stepInput}
                  value={dienstM2[key].val}
                  onChange={(e) => dienstM2[key].zet(parseInt(e.target.value.replace(/\D/g, ""), 10) || 0)}
                  aria-label={`${naam}, m²`}
                />
                <span className={styles.unit}>m²</span>
                <MiniStep dir="plus" onClick={() => dienstM2[key].zet(dienstM2[key].val + 5)} />
              </span>
              <span className={styles.dienstMeta}>× {fmtEuro(prijs)}</span>
              <span className={styles.dienstBedrag}>{fmtEuro(dienstM2[key].val * prijs)}</span>
            </div>
          ) : null,
        )}
        {diensten["Onderhoudsabonnement"] ? (
          <div className={styles.dienstRegel}>
            <span className={styles.dienstNaam}>Onderhoudsinterval</span>
            <span className={styles.segmented}>
              {ONDERHOUD_WEKEN.map((w) => (
                <button
                  type="button"
                  key={w}
                  onClick={() => setOnderhoudWeken(w)}
                  className={`${styles.seg} ${onderhoudWeken === w ? styles.segActive : ""}`}
                >
                  {w} wkn
                </button>
              ))}
            </span>
          </div>
        ) : null}
      </div>

      {/* Oppervlakte (volle breedte als de voegzand-kaart ernaast wegvalt). */}
      <div className={`${styles.card} ${diensten["Invegen"] ? "" : styles.full}`}>
        <div className="rb-section-label">Oppervlakte</div>
        <div className={styles.opp}>
          <MiniStep dir="min" onClick={() => setM2(m2 - 5)} />
          <input
            type="text"
            inputMode="numeric"
            className={styles.oppInput}
            value={m2}
            onChange={(e) => setM2(parseInt(e.target.value.replace(/\D/g, ""), 10) || 0)}
            aria-label="Oppervlakte in m²"
          />
          <MiniStep dir="plus" onClick={() => setM2(m2 + 5)} />
          <span className={styles.oppUnit}>m²</span>
        </div>
        <div className={styles.note}>Stuurt de regels en het voegzand automatisch aan</div>
      </div>

      {/* Voegzand hoort bij invegen: alleen tonen als Invegen aan staat. */}
      {diensten["Invegen"] ? (
      <div className={styles.card}>
        <div className={styles.cardHead}>
          <span className="rb-section-label">Voegzand, m² per soort</span>
          <span className={styles.autoNote}>zakken auto uit m²</span>
        </div>
        {zandSoorten.map(({ id, naam, zakPrijs, arbeidPrijs }) => {
          const m2v = voegzandM2[id];
          const zakken = voegzandZakken[id];
          const actief = m2v > 0 || zakken > 0;
          const bedrag = m2v * arbeidPrijs + zakken * zakPrijs;
          return (
            <div key={id} className={`${styles.zandRow} ${actief ? "" : styles.dim}`}>
              <span className={styles.zandNaam}>{naam}</span>
              <span className={styles.prijsBox} title="Prijs per zak, aanpasbaar">
                <span className={styles.euro}>€</span>
                <input
                  className={styles.prijsInput}
                  value={zandPrijzen[id]}
                  onChange={(e) => setZandPrijzen({ ...zandPrijzen, [id]: e.target.value })}
                  aria-label={`Prijs per zak ${naam.toLowerCase()}`}
                />
                <span className={styles.perUnit}>/zak</span>
              </span>
              <span className={styles.zakBox} title="Aantal m² dat met dit type wordt ingeveegd">
                <MiniStep dir="min" onClick={() => zetVoegzandM2(id, Math.max(0, m2v - 5))} />
                <input
                  type="text"
                  inputMode="numeric"
                  className={styles.stepInput}
                  value={m2v}
                  onChange={(e) => zetVoegzandM2(id, parseInt(e.target.value.replace(/\D/g, ""), 10) || 0)}
                  aria-label={`m² ${naam.toLowerCase()} voegzand`}
                />
                <span className={styles.unit}>m²</span>
                <MiniStep dir="plus" onClick={() => zetVoegzandM2(id, m2v + 5)} />
              </span>
              <span className={styles.zakBox} title="Aantal zakken (auto uit m², handmatig aanpasbaar)">
                <MiniStep dir="min" onClick={() => setVoegzandZakken({ ...voegzandZakken, [id]: Math.max(0, zakken - 1) })} />
                <input
                  type="text"
                  inputMode="numeric"
                  className={styles.stepInput}
                  value={zakken}
                  onChange={(e) =>
                    setVoegzandZakken({ ...voegzandZakken, [id]: parseInt(e.target.value.replace(/\D/g, ""), 10) || 0 })
                  }
                  aria-label={`Aantal zakken ${naam.toLowerCase()}`}
                />
                <span className={styles.unit}>zak</span>
                <MiniStep dir="plus" onClick={() => setVoegzandZakken({ ...voegzandZakken, [id]: zakken + 1 })} />
              </span>
              <span className={styles.zandBedrag}>{actief ? fmtEuro(bedrag) : "—"}</span>
            </div>
          );
        })}
      </div>
      ) : null}

      {/* Conditie */}
      <div className={`${styles.card} ${styles.full}`}>
        <div className="rb-section-label">Conditie van de bestrating, klik om te kiezen</div>
        <div className={styles.conditie}>
          <div>
            <div className={styles.condLabel}>Groene aanslag</div>
            <JaNee waarde={groeneAanslag} zet={setGroeneAanslag} naam="groene aanslag" />
          </div>
          <div>
            <div className={styles.condLabel}>Korstmos</div>
            <JaNee waarde={korstmosConditie} zet={setKorstmos} naam="korstmos" />
          </div>
          {diensten["Invegen"] ? (
            <div>
              <div className={styles.condLabel}>Kleur bestrating</div>
              <span className={styles.segmented}>
                {(["Naturel", "Antraciet", "Allebei"] as Kleur[]).map((kl) => (
                  <button
                    type="button"
                    key={kl}
                    onClick={() => setKleur(kl)}
                    className={`${styles.seg} ${kleur === kl ? styles.segActive : ""}`}
                  >
                    {kl}
                  </button>
                ))}
              </span>
            </div>
          ) : null}
          <div className={styles.afstand}>
            <div className={styles.condLabel}>Afstand naar klant</div>
            <div className={styles.afstandVal}>
              {afstandKm != null ? `${afstandKm} km` : "—"}{" "}
              <span className={styles.afstandAuto}>
                {afstandKm != null ? "auto" : "vul adres in"}
              </span>
            </div>
          </div>
        </div>
        {korstmosConditie ? (
          <div className={styles.korstmosNote}>
            ↳ Korstmos = ja → de toeslag van +10% staat aan (aanpassen kan in stap 3)
          </div>
        ) : null}

        {/* Planten afschermen */}
        <div className={styles.planten}>
          <span className={styles.plantNaam}>Planten afschermen</span>
          <span className={styles.prijsBox} title="Prijs per rol, aanpasbaar">
            <span className={styles.euro}>€</span>
            <input
              className={styles.prijsInput}
              value={rolPrijs}
              onChange={(e) => setRolPrijs(e.target.value)}
              aria-label="Prijs per rol"
            />
            <span className={styles.perUnit}>/rol</span>
          </span>
          <span className={styles.zakBox}>
            <MiniStep dir="min" onClick={() => setQty({ ...qty, rollen: Math.max(0, qty.rollen - 1) })} />
            <input
              type="text"
              inputMode="numeric"
              className={styles.stepInput}
              value={qty.rollen}
              onChange={(e) =>
                setQty({ ...qty, rollen: parseInt(e.target.value.replace(/\D/g, ""), 10) || 0 })
              }
              aria-label="Aantal rollen"
            />
            <span className={styles.unit}>{qty.rollen === 1 ? "rol" : "rollen"}</span>
            <MiniStep dir="plus" onClick={() => setQty({ ...qty, rollen: qty.rollen + 1 })} />
          </span>
          <span className={styles.zandBedrag}>
            {qty.rollen > 0 ? fmtEuro(qty.rollen * parsePrijs(rolPrijs)) : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}

function JaNee({
  waarde,
  zet,
  naam,
}: {
  waarde: boolean;
  zet: (b: boolean) => void;
  naam: string;
}) {
  return (
    <span className={styles.segmented} role="group" aria-label={naam}>
      {(
        [
          ["Ja", true],
          ["Nee", false],
        ] as [string, boolean][]
      ).map(([l, v]) => (
        <button
          type="button"
          key={l}
          onClick={() => zet(v)}
          className={`${styles.segSm} ${waarde === v ? styles.segActive : ""}`}
        >
          {l}
        </button>
      ))}
    </span>
  );
}
