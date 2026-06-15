"use client";

import { useEffect, useState, useTransition, type Dispatch, type SetStateAction } from "react";
import { Check, Plus, Search, Sparkles, X } from "lucide-react";
import {
  searchExistingClients,
  getRecentClients,
  type ExistingClientMatch,
} from "@/lib/dashboard/manual-offerte-search";
import { normalizePhone } from "@/lib/dashboard/lead-filters";
import { getAutoAfstandKm } from "@/lib/dashboard/afstand-actions";
import {
  LEGE_KLANT,
  offerteAdres,
  type OfferteKlant,
} from "./offerte-data";
import { mapMatchToKlant } from "./offerte-mappers";
import {
  isValidEmail,
  isValidNLMobile,
  normalizeToInternational,
  normalizeEmail,
} from "@/components/dashboard/offerte/StepKlant";
import {
  extractFieldsFromMessage,
  type ExtractedFields,
} from "@/lib/dashboard/manual-offerte-ai";
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
  /** AI-plak: callback met de door de OpenAI-extractie herkende velden; de
   *  wizard vult er zijn state mee. */
  onAiExtracted: (fields: ExtractedFields) => void;
}

// Aantal recente klanten dat vooraf wordt geladen voor instant client-side
// filteren. Boven deze grens valt de zoeker terug op de server-search.
const CLIENT_PRELOAD_CAP = 1000;

/** Filtert de voorgeladen klantenlijst lokaal met dezelfde "contains"-match als
 *  searchExistingClients (naam/bedrijfsnaam/postcode/straat/plaats + het
 *  genormaliseerde telefoonnummer), in recency-volgorde, gecapt op 25 hits. */
function filterClients(
  clients: ExistingClientMatch[],
  q: string,
): ExistingClientMatch[] {
  const needle = q.toLowerCase();
  const qTel = normalizePhone(q);
  const out: ExistingClientMatch[] = [];
  for (const c of clients) {
    const tekstHit = [c.naam, c.bedrijfsnaam, c.postcode, c.straat, c.plaats].some(
      (f) => f != null && f.toLowerCase().includes(needle),
    );
    const telHit =
      qTel.length >= 3 && !!c.telefoon && normalizePhone(c.telefoon).includes(qTel);
    if (tekstHit || telHit) {
      out.push(c);
      if (out.length >= 25) break;
    }
  }
  return out;
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
  onAiExtracted,
}: StapKlantProps) {
  // ── Echte klantzoeker: voorgeladen klantenlijst (getRecentClients) + instant
  // client-side filteren, zodat typen geen server-round-trip per toets meer doet
  // (de oude 250ms-debounce + server-action voelde als ~1s). De server-search
  // (searchExistingClients) blijft als vangnet boven CLIENT_PRELOAD_CAP.
  const [resultaten, setResultaten] = useState<OfferteKlant[]>([]);
  const [zoekt, setZoekt] = useState(false);
  // Eenmalige preload bij het openen (Modal mount StapKlant per keer dat-ie opent).
  const [allClients, setAllClients] = useState<ExistingClientMatch[] | null>(null);

  // AI-plak: plak een klantbericht en laat de OpenAI-extractie
  // (extractFieldsFromMessage) de velden invullen. Het resultaat gaat via
  // onAiExtracted naar de wizard-state; bij een fout tonen we 'm inline.
  const [aiText, setAiText] = useState("");
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiPending, startAi] = useTransition();
  // Standaard ingeklapt (compacte balk) zodat de zoeker + gegevens zonder
  // scrollen zichtbaar zijn; klikken klapt de plak-textarea uit.
  const [aiOpen, setAiOpen] = useState(false);

  function handleAiPlak() {
    setAiError(null);
    startAi(async () => {
      const res = await extractFieldsFromMessage(aiText);
      if (!res.ok) {
        setAiError(res.error);
        return;
      }
      onAiExtracted(res.fields);
      setAiText("");
      setAiOpen(false);
    });
  }

  // Eenmalige preload van de klantenlijst bij mount (= wizard open).
  useEffect(() => {
    let cancelled = false;
    getRecentClients().then((list) => {
      if (!cancelled) setAllClients(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const safe = zoek.trim();
    // Zoek al vanaf de eerste letter (consistent met searchExistingClients).
    if (safe.length < 1) {
      setResultaten([]);
      setZoekt(false);
      return;
    }

    // Instant: filter de voorgeladen lijst client-side, geen round-trip per toets.
    if (allClients) {
      const local = filterClients(allClients, safe);
      setResultaten(local.map(mapMatchToKlant));
      // Klaar, tenzij de lijst gecapt was én lokaal niets matcht: dan kan de
      // klant buiten de voorgeladen recente set vallen → server-vangnet.
      if (local.length > 0 || allClients.length < CLIENT_PRELOAD_CAP) {
        setZoekt(false);
        return;
      }
    }

    // Vangnet: lijst nog niet geladen, of gecapt met 0 lokale hits → server-search.
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
  }, [zoek, allClients]);

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

  // Telefoon- en e-mailvalidatie (zelfde checks als v1 StepKlant). De
  // waarschuwing verschijnt pas nadat het veld is verlaten (touched), zodat
  // 'geen geldig nummer' niet al bij de eerste toets flikkert. Op blur
  // normaliseren we telefoon naar +316... en e-mail naar trim + lowercase.
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const phoneFilled = k.tel.trim().length > 0;
  const emailFilled = k.email.trim().length > 0;
  const phoneWarning = phoneTouched && phoneFilled && !isValidNLMobile(k.tel);
  const emailWarning = emailTouched && emailFilled && !isValidEmail(k.email);

  return (
    <div className={styles.col}>
      {/* AI-plak: ingeklapt een compacte balk, klik klapt de textarea uit. */}
      {aiOpen ? (
        <div className={styles.aiCard}>
          <div className={styles.cardHead}>
            <span className="rb-section-label">Plak een bericht of e-mail van de klant</span>
            <button
              type="button"
              className={styles.aiClose}
              onClick={() => setAiOpen(false)}
              aria-label="AI-plak sluiten"
            >
              <X size={14} />
            </button>
          </div>
          <textarea
            className={styles.aiTextarea}
            value={aiText}
            onChange={(e) => setAiText(e.target.value)}
            placeholder="Plak hier het WhatsApp- of mailbericht van de klant. Surface haalt er automatisch de naam, het adres, telefoon, m² en wensen uit."
            rows={2}
            autoFocus
          />
          {aiError ? <div className={styles.warning}>{aiError}</div> : null}
          <div className={styles.aiChips}>
            <span className={styles.aiHint}>{aiText.trim().length}/4000 tekens</span>
            <button
              type="button"
              className={styles.aiBtn}
              disabled={aiPending || aiText.trim().length < 10}
              onClick={handleAiPlak}
            >
              {aiPending ? "Bezig…" : "Vul automatisch in →"}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className={styles.aiCardClosed}
          onClick={() => setAiOpen(true)}
        >
          <span className="rb-section-label">Plak een bericht of e-mail van de klant</span>
          <span className={styles.aiPill}>
            <Sparkles size={12} strokeWidth={2.5} /> AI-plak
          </span>
        </button>
      )}

      {/* Klantzoeker */}
      <div className={styles.card}>
        <div className="rb-section-label">Zoek een klant</div>
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
            {!zoekt && resultaten.length === 0 && zoek.trim().length >= 1 ? (
              <div className={styles.searchHint}>
                Geen klant gevonden, maak hieronder een nieuwe aan
              </div>
            ) : null}
            {resultaten.length > 0 ? (
              <div className={styles.resultatenScroll}>
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
              </div>
            ) : null}
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
        ) : null}
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
              onBlur={() => {
                setPhoneTouched(true);
                const genormaliseerd = normalizeToInternational(k.tel);
                if (genormaliseerd !== k.tel) zet("tel")(genormaliseerd);
              }}
            />
            {phoneWarning ? (
              <div className={styles.warning}>Let op, geen geldig nummer</div>
            ) : null}
          </Veld>
          <div className={styles.emailFull}>
            <Veld label="E-mail">
              <input
                className={styles.veld}
                value={k.email}
                placeholder="optioneel"
                onChange={(e) => zet("email")(e.target.value)}
                onBlur={() => {
                  setEmailTouched(true);
                  const genormaliseerd = normalizeEmail(k.email);
                  if (genormaliseerd !== k.email) zet("email")(genormaliseerd);
                }}
              />
              {emailWarning ? (
                <div className={styles.warning}>Let op, geen geldig e-mailadres</div>
              ) : null}
            </Veld>
          </div>
        </div>

        {/* Adres op een eigen rij met ruime straat/plaats-velden, anders worden
            lange straat- of plaatsnamen afgekapt. */}
        <div className={styles.adresGrid}>
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
