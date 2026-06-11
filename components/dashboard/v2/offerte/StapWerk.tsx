"use client";

import { Check } from "lucide-react";
import { MiniStep } from "./MiniStep";
import { DIENST_REGELS } from "./offerte-data";
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
  zakken: { normaal: number; onkruidwerend: number };
  setZakken: (z: { normaal: number; onkruidwerend: number }) => void;
  zandPrijzen: { normaal: string; onkruidwerend: string };
  setZandPrijzen: (z: { normaal: string; onkruidwerend: string }) => void;
  zandPrijsN: number;
  zandPrijsO: number;
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
  zakken,
  setZakken,
  zandPrijzen,
  setZandPrijzen,
  zandPrijsN,
  zandPrijsO,
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

  const zandSoorten: { id: "normaal" | "onkruidwerend"; naam: string; prijs: number }[] = [
    { id: "normaal", naam: "Normaal", prijs: zandPrijsN },
    { id: "onkruidwerend", naam: "Onkruidwerend", prijs: zandPrijsO },
  ];

  return (
    <div className={styles.grid}>
      {/* Diensten */}
      <div className={`${styles.card} ${styles.full}`}>
        <div className="rb-section-label">Diensten, klik om te schakelen</div>
        <div className={styles.chips}>
          {Object.keys(diensten).map((d) => {
            const aan = diensten[d];
            const vast = d === "Reinigen + invegen";
            return (
              <button
                type="button"
                key={d}
                onClick={vast ? undefined : () => wisselDienst(d)}
                className={`${styles.chip} ${aan ? styles.chipOn : ""} ${vast ? styles.chipVast : ""}`}
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
                <strong>{dienstM2[key].val}</strong>
                <span className={styles.unit}>m²</span>
                <MiniStep dir="plus" onClick={() => dienstM2[key].zet(dienstM2[key].val + 5)} />
              </span>
              <span className={styles.dienstMeta}>× {fmtEuro(prijs)}</span>
              <span className={styles.dienstBedrag}>{fmtEuro(dienstM2[key].val * prijs)}</span>
            </div>
          ) : null,
        )}
      </div>

      {/* Oppervlakte */}
      <div className={styles.card}>
        <div className="rb-section-label">Oppervlakte</div>
        <div className={styles.opp}>
          <MiniStep dir="min" onClick={() => setM2(m2 - 5)} />
          <span className={styles.oppVeld}>{m2}</span>
          <MiniStep dir="plus" onClick={() => setM2(m2 + 5)} />
          <span className={styles.oppUnit}>m²</span>
        </div>
        <div className={styles.note}>Stuurt de regels en het voegzand automatisch aan</div>
      </div>

      {/* Voegzand */}
      <div className={styles.card}>
        <div className={styles.cardHead}>
          <span className="rb-section-label">Voegzand, per soort instelbaar</span>
          <span className={styles.autoNote}>auto-berekend uit m²</span>
        </div>
        {zandSoorten.map(({ id, naam, prijs }) => {
          const n = zakken[id];
          return (
            <div key={id} className={`${styles.zandRow} ${n > 0 ? "" : styles.dim}`}>
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
              <span className={styles.zakBox}>
                <MiniStep dir="min" onClick={() => setZakken({ ...zakken, [id]: Math.max(0, n - 1) })} />
                <strong className={styles.zakVal}>{n}</strong>
                <span className={styles.unit}>zak</span>
                <MiniStep dir="plus" onClick={() => setZakken({ ...zakken, [id]: n + 1 })} />
              </span>
              <span className={styles.zandBedrag}>{n > 0 ? fmtEuro(n * prijs) : "—"}</span>
            </div>
          );
        })}
        <div className={styles.noteSmall}>
          Zet een soort op 0 zakken om &apos;m van de offerte te halen, allebei tegelijk kan ook
        </div>
      </div>

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
          <div className={styles.afstand}>
            <div className={styles.condLabel}>Afstand</div>
            <div className={styles.afstandVal}>
              25 km <span className={styles.afstandAuto}>auto</span>
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
            <strong className={styles.zakVal}>{qty.rollen}</strong>
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
