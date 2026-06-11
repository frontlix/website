"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { Check, Plus, Search, Sparkles } from "lucide-react";
import { searchExistingClients } from "@/lib/dashboard/manual-offerte-search";
import { getAutoAfstandKm } from "@/lib/dashboard/afstand-actions";
import {
  AI_PLAK,
  LEGE_KLANT,
  offerteAdres,
  type OfferteKlant,
} from "./offerte-data";
import { mapMatchToKlant } from "./offerte-mappers";
import type { KlantType } from "./types";
import styles from "./StapKlant.module.css";

interface StapKlantProps {
  zoek: string;
  setZoek: (v: string) => void;
  klant: OfferteKlant | null;
  // Dispatch-vorm zodat de geocode-callback met de meest recente klant-state
  // kan mergen (functionele update) zonder stale closure.
  setKlant: Dispatch<SetStateAction<OfferteKlant | null>>;
  klantType: KlantType;
  setKlantType: (t: KlantType) => void;
  aiGebruikt: boolean;
  setAiGebruikt: (b: boolean) => void;
  factuurZelfde: boolean;
  setFactuurZelfde: (b: boolean) => void;
  factuur: { straat: string; nr: string; postcode: string; plaats: string };
  setFactuur: (f: { straat: string; nr: string; postcode: string; plaats: string }) => void;
  /** Echte enkele-reis-afstand uit de geocode (km tot tenant-basis), naar de
   *  wizard zodat de submit afstand_km met de werkelijke waarde meegeeft i.p.v.
   *  de DEFAULTS-25. `null` betekent: nog niet/niet geocodeerbaar. */
  setAfstandKm: (km: number | null) => void;
}

/** Stap 1 · Klant: AI-plak, live filterende zoeker, altijd typbaar gegevens-
 *  blok, Particulier/Zakelijk en factuuradres-gelijk-checkbox. */
export function StapKlant({
  zoek,
  setZoek,
  klant,
  setKlant,
  klantType,
  setKlantType,
  // aiGebruikt wordt niet meer gelezen (AI-plak is een no-op tot echte
  // extractie bestaat); setAiGebruikt blijft om de reset bij "nieuwe klant".
  setAiGebruikt,
  factuurZelfde,
  setFactuurZelfde,
  factuur,
  setFactuur,
  setAfstandKm,
}: StapKlantProps) {
  // ── Echte klantzoeker: debounced server-action searchExistingClients,
  // mapt de hits naar OfferteKlant. ≥ 2 tekens + 250ms debounce, zelfde
  // gedrag als de bestaande ExistingClientSearch in het (app)-dashboard.
  const [resultaten, setResultaten] = useState<OfferteKlant[]>([]);
  const [zoekt, setZoekt] = useState(false);

  useEffect(() => {
    const safe = zoek.trim();
    if (safe.length < 2) {
      setResultaten([]);
      setZoekt(false);
      return;
    }
    setZoekt(true);
    let cancelled = false;
    const t = setTimeout(async () => {
      const hits = await searchExistingClients(safe);
      if (cancelled) return;
      setResultaten(hits.map(mapMatchToKlant));
      setZoekt(false);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [zoek]);

  // Velden zijn altijd invulbaar; typen maakt vanzelf een nieuwe klant aan.
  const k = klant ?? LEGE_KLANT;
  const zet = (veld: keyof OfferteKlant) => (v: string) => setKlant({ ...k, [veld]: v });
  const zetF = (veld: keyof typeof factuur) => (v: string) => setFactuur({ ...factuur, [veld]: v });

  // Echte adres-autofill: zelfde geocode-flow als ManualOfferteModal. Zodra
  // postcode + huisnummer geldig zijn (400ms debounce) haalt getAutoAfstandKm
  // de echte straat, plaats en enkele-reis-afstand op. Straat/plaats vullen we
  // ALLEEN als ze leeg zijn (handmatige invoer nooit overschrijven); de
  // afstand gaat naar de wizard zodat de submit de werkelijke afstand_km
  // meegeeft i.p.v. de DEFAULTS-25. Geen hardcoded adres-string meer.
  const pc = klant?.postcode ?? "";
  const hn = klant?.nr ?? "";
  useEffect(() => {
    if (!pc.trim() || !hn.trim()) {
      setAfstandKm(null);
      return;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      getAutoAfstandKm(pc.trim(), hn.trim()).then((res) => {
        if (cancelled) return;
        if (!res.ok) {
          setAfstandKm(null);
          return;
        }
        setAfstandKm(res.km);
        // Functionele update zodat we mergen met de meest recente klant-state
        // (de gebruiker kan tijdens de 400ms debounce verder hebben getypt).
        setKlant((prev: OfferteKlant | null) => {
          const base = prev ?? LEGE_KLANT;
          // Alleen invullen als leeg én de geocode iets opleverde; bestaande
          // (handmatig of via klantzoeker gevulde) waardes blijven staan.
          const straat = base.straat.trim() === "" && res.street ? res.street : base.straat;
          const plaats = base.plaats.trim() === "" && res.city ? res.city : base.plaats;
          const autoAdres =
            base.autoAdres ||
            (base.straat.trim() === "" && !!res.street) ||
            (base.plaats.trim() === "" && !!res.city);
          if (straat === base.straat && plaats === base.plaats && autoAdres === base.autoAdres) {
            return prev;
          }
          return { ...base, straat, plaats, autoAdres };
        });
      });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pc, hn]);

  const autoStraat = !!(k.straat && (k.bestaand || k.autoAdres));

  return (
    <div className={styles.col}>
      {/* AI-plak */}
      <div className={styles.aiCard}>
        <div className={styles.cardHead}>
          <span className="rb-section-label">Plak een bericht of e-mail van de klant</span>
          <span className={styles.aiPill}>
            <Sparkles size={12} strokeWidth={2.5} /> AI-plak
          </span>
        </div>
        <div className={styles.aiText}>{AI_PLAK.bericht}</div>
        <div className={styles.aiChips}>
          {AI_PLAK.chips.map((c) => (
            <span key={c} className={styles.aiChip}>
              <Check size={11} strokeWidth={3} /> {c}
            </span>
          ))}
          {/* Echte AI-extractie bestaat nog niet in de gekoppelde wizard.
              De knop schrijft daarom GEEN hardcoded persoonsgegevens meer in
              de submit-state (dat creeerde anders een fictieve "Familie
              Bakker"-lead in productie). Hij is uitgeschakeld tot de echte
              extractie er is; de voorbeeld-kaart blijft staan als uitleg van
              wat AI-plak straks doet. */}
          <button
            type="button"
            className={styles.aiBtn}
            disabled
            aria-disabled="true"
            title="AI-extractie volgt binnenkort, vul de klant zolang handmatig in of zoek 'm op"
          >
            Vul automatisch in →
          </button>
        </div>
      </div>

      {/* Klantzoeker */}
      <div className={styles.card}>
        <div className="rb-section-label">Of zoek een klant</div>
        <div className={styles.search}>
          <Search size={15} strokeWidth={2.5} className={styles.searchIcon} />
          <input
            value={zoek}
            placeholder="Typ een naam…"
            onChange={(e) => setZoek(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        {zoek.trim() ? (
          <div className={styles.dropdown}>
            {zoekt && resultaten.length === 0 ? (
              <div className={styles.searchHint}>Zoeken…</div>
            ) : null}
            {!zoekt && resultaten.length === 0 && zoek.trim().length >= 2 ? (
              <div className={styles.searchHint}>
                Geen klant gevonden, maak hieronder een nieuwe aan
              </div>
            ) : null}
            {resultaten.map((r) => {
              const gekozen = klant && (r.lead_id ? klant.lead_id === r.lead_id : klant.naam === r.naam);
              return (
                <button
                  type="button"
                  key={r.lead_id ?? r.naam}
                  onClick={() => setKlant(r)}
                  className={`${styles.dropRow} ${gekozen ? styles.dropRowActive : ""}`}
                >
                  <span className={`${styles.dropAvatar} ${gekozen ? styles.dropAvatarActive : ""}`}>
                    {r.initials}
                  </span>
                  <div className={styles.dropText}>
                    <div className={styles.dropNaam}>{r.naam}</div>
                    <div className={styles.dropSub}>
                      {offerteAdres(r)} · {r.sub}
                    </div>
                  </div>
                  <span className={styles.dropKies}>{gekozen ? "✓ gekozen" : "kies"}</span>
                </button>
              );
            })}
            <button
              type="button"
              className={styles.dropNew}
              onClick={() => {
                setKlant({
                  ...LEGE_KLANT,
                  naam: zoek.trim().replace(/^./, (c) => c.toUpperCase()),
                });
                setAiGebruikt(false);
              }}
            >
              <span className={styles.dropNewIcon}>
                <Plus size={14} strokeWidth={2.5} />
              </span>
              Nieuwe klant &quot;{zoek.trim()}&quot; aanmaken
            </button>
          </div>
        ) : (
          <div className={styles.searchHint}>
            Typ om te zoeken in je klanten, of gebruik AI-plak hierboven
          </div>
        )}
      </div>

      {/* Gegevens */}
      <div className={styles.card}>
        <div className={styles.cardHead}>
          <span className="rb-section-label">Gegevens</span>
          <span className={styles.segmented}>
            {(["Particulier", "Zakelijk"] as KlantType[]).map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => setKlantType(t)}
                className={`${styles.seg} ${klantType === t ? styles.segActive : ""}`}
              >
                {t}
              </button>
            ))}
          </span>
        </div>

        <div className={styles.grid}>
          <Veld label="Naam">
            <input
              className={styles.veld}
              value={k.naam}
              placeholder="Naam of bedrijf"
              onChange={(e) => zet("naam")(e.target.value)}
            />
          </Veld>
          <Veld label="Bedrijf">
            <input
              className={styles.veld}
              value={k.bedrijf || ""}
              placeholder="optioneel"
              onChange={(e) => zet("bedrijf")(e.target.value)}
            />
          </Veld>
          <Veld label="Telefoon">
            <input
              className={styles.veld}
              value={k.tel}
              placeholder="06 …"
              onChange={(e) => zet("tel")(e.target.value)}
            />
          </Veld>
          <Veld label="E-mail">
            <input
              className={styles.veld}
              value={k.email}
              placeholder="optioneel"
              onChange={(e) => zet("email")(e.target.value)}
            />
          </Veld>

          <div className={styles.pcGrid}>
            <Veld label="Postcode">
              <input
                className={styles.veld}
                value={k.postcode}
                placeholder="1234 AB"
                onChange={(e) => zet("postcode")(e.target.value)}
              />
            </Veld>
            <Veld label="Nr.">
              <input
                className={styles.veld}
                value={k.nr}
                placeholder="—"
                onChange={(e) => zet("nr")(e.target.value)}
              />
            </Veld>
          </div>

          <div className={styles.straatGrid}>
            <div>
              <div className={styles.straatLabelRow}>
                <span className={styles.veldLabel}>Straat</span>
                {autoStraat ? <span className={styles.autoLabel}>✓ automatisch</span> : null}
              </div>
              <input
                className={styles.veld}
                value={k.straat || ""}
                placeholder="vul postcode + nr in"
                onChange={(e) => zet("straat")(e.target.value)}
              />
            </div>
            <Veld label="Plaats">
              <input
                className={styles.veld}
                value={k.plaats || ""}
                placeholder="—"
                onChange={(e) => zet("plaats")(e.target.value)}
              />
            </Veld>
          </div>
        </div>

        {/* Factuuradres gelijk */}
        <button
          type="button"
          onClick={() => setFactuurZelfde(!factuurZelfde)}
          className={`${styles.factuur} ${factuurZelfde ? styles.factuurOn : styles.factuurOff}`}
        >
          <span className={`${styles.check} ${factuurZelfde ? styles.checkOn : ""}`}>
            {factuurZelfde ? <Check size={11} strokeWidth={3} /> : null}
          </span>
          <span className={styles.factuurText}>
            <span className={styles.factuurTitel}>Factuuradres is gelijk aan het werkadres</span>
            <span className={styles.factuurSub}>
              {factuurZelfde
                ? "Vink uit voor een afwijkend factuuradres"
                : "Afwijkend, vul hieronder het factuuradres in"}
            </span>
          </span>
        </button>

        {!factuurZelfde ? (
          <div className={styles.factuurGrid}>
            <Veld label="Factuur, straat">
              <input
                className={styles.veld}
                value={factuur.straat}
                placeholder="Postbusstraat"
                onChange={(e) => zetF("straat")(e.target.value)}
              />
            </Veld>
            <Veld label="Nr.">
              <input
                className={styles.veld}
                value={factuur.nr}
                placeholder="—"
                onChange={(e) => zetF("nr")(e.target.value)}
              />
            </Veld>
            <Veld label="Postcode">
              <input
                className={styles.veld}
                value={factuur.postcode}
                placeholder="1234 AB"
                onChange={(e) => zetF("postcode")(e.target.value)}
              />
            </Veld>
            <Veld label="Plaats">
              <input
                className={styles.veld}
                value={factuur.plaats}
                placeholder="—"
                onChange={(e) => zetF("plaats")(e.target.value)}
              />
            </Veld>
          </div>
        ) : null}

        {k.tel ? (
          <div className={styles.waRow}>
            <span className={styles.waPill}>
              WhatsApp <Check size={11} strokeWidth={3} />
            </span>
            Dit nummer heeft WhatsApp, versturen kan straks direct in het gesprek
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Veld({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className={styles.veldLabel}>{label}</div>
      {children}
    </div>
  );
}
