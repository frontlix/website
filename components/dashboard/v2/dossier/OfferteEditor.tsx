"use client";

// ─────────────────────────────────────────────────────────────────────
// OfferteEditor (v2) — inline bewerking van de CONCEPT-offerte van de lead.
//
// Herwerkt zodat de opmaak, sectie-structuur en werking 1-op-1 het oude
// dashboard-form (LeadOfferteForm) volgen, maar in de v2-look (CSS Modules
// + var(--rb-*) tokens, lucide). Secties + volgorde, identiek aan het oude
// form (BEHALVE "Klantgegevens op offerte" — die velden staan al in de
// v2 Info-tab):
//   1. Werk & oppervlakte        (+ toelichting voor klant)
//   2. Extra diensten            (+ toelichting voor klant)
//   3. Extra arbeid
//   4. Voegzand (alleen invegen) (+ toelichting voor klant)
//   5. Actiekorting              (+ toelichting voor klant)
//   6. Geldigheid offerte
//   7. Live prijsoverzicht
//
// Alle getallen zijn handmatig invoerbaar via NlNumberInput (accepteert
// komma, commit op blur); de +/- steppers blijven als extra ernaast.
//
// We hergebruiken het echte data-model + de repo-helpers EXACT, geen nieuwe
// DB-logica:
//   - ManualOfferteData                → state-vorm
//   - computeRules / computeTotals     → live prijsafleiding
//   - saveOfferteForm(...)             → debounced server-persist
//   - revertConcept(...)               → terug naar verstuurde versie
//   - formatEuro(...)                  → geldweergave
//
// Auto-save spiegelt het oude form: 600ms-debounce over een fingerprint van
// data + geldigheidDagen, skip-first-render, saveState 'idle'|'saving'|'saved',
// reset naar idle na 2s. In demo-modus (geen leadId) is de editor INERT:
// alle controls zijn uitgeschakeld en er wordt nooit opgeslagen.
//
// De "Toelichting voor klant"-velden zijn (net als in het oude form)
// display-only lokale state (NotesState); het schema heeft er geen kolom
// voor, dus ze worden NIET gepersisteerd.
//
// Streep-vrij conform de Frontlix-huisstijl (komma i.p.v. liggend streepje;
// geen klemtoonaccenten in zichtbare tekst).
// ─────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Minus, Plus, RotateCcw } from "lucide-react";
import type { ManualOfferteData, SubDienst } from "@/lib/dashboard/manual-offerte-types";
import { computeRules, computeTotals } from "@/lib/dashboard/manual-offerte-rules";
import type { ManualOffertePricing } from "@/lib/dashboard/pricing-types";
import { FALLBACK_PRICING } from "@/lib/dashboard/pricing-types";
import { formatEuro } from "@/lib/dashboard/format";
import { saveOfferteForm } from "@/lib/dashboard/offerte-form-actions";
import { revertConcept } from "@/lib/dashboard/offerte-draft-actions";
import { NlNumberInput } from "@/components/dashboard/NlNumberInput";
import { SegmentedControl } from "@/components/dashboard/v2/ui";
import styles from "./OfferteEditor.module.css";

/** Wat de server-fetch aanlevert (of de demo-fallback). */
export interface OfferteFormData {
  /** Init-state uit mapLeadToFormData(detail.lead). */
  data: ManualOfferteData;
  /** Prijslijst (getManualOffertePricing), nodig voor computeRules. */
  pricing: ManualOffertePricing;
  /** Geldigheid in dagen (lead.offerte_geldigheid_dagen ?? 14). */
  geldigheidDagen: number;
}

interface OfferteEditorProps {
  /** Echte lead_id ⇒ live opslaan. Zonder ⇒ inert/demo (read-only). */
  leadId?: string;
  /** Init-data; zonder leadId is dit demo-input (niet gepersisteerd). */
  form: OfferteFormData;
  /** Meldt het live totaal-incl-BTW (geformatteerd) terug, zodat de
   *  concept-rij in de lijst hetzelfde bedrag toont als de editor. */
  onTotaal?: (totaalIncl: string) => void;
}

type SaveState = "idle" | "saving" | "saved";
type JaNee = "ja" | "nee";

/**
 * Display-only toelichtingen, gekeyed op sectie. Niet gepersisteerd
 * (exact zoals het oude form: het schema heeft er geen kolom voor).
 */
type NotesState = {
  werk: string;
  diensten: string;
  voegzand: string;
  korting: string;
};

/** Nederlandse maand-namen voor de "geldig t/m"-datumweergave. */
const MAANDEN_NL = [
  "januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december",
];

/** "19 juni 2026" voor een gegeven Date. */
function formatDatumLang(d: Date): string {
  return `${d.getDate()} ${MAANDEN_NL[d.getMonth()]} ${d.getFullYear()}`;
}

/** "dd-mm-yyyy" voor het geldig-t/m-label. */
function formatDatumKort(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${d.getFullYear()}`;
}

/** Stabiele fingerprint voor change-detection (vermijdt dubbele saves). */
function dataFingerprint(data: ManualOfferteData, geldigheidDagen: number): string {
  return JSON.stringify(data) + `|${geldigheidDagen}`;
}

const JANEE_OPTIES: { value: JaNee; label: string }[] = [
  { value: "nee", label: "Nee" },
  { value: "ja", label: "Ja" },
];

/** De los toe te voegen/te verwijderen diensten (mirror van het oude form). */
const DIENST_OPTIES: { k: SubDienst; label: string }[] = [
  { k: "invegen", label: "Invegen" },
  { k: "preventieve_onkruid", label: "Preventieve onkruidbeheersing" },
  { k: "beschermlaag", label: "Nieuwe beschermlaag" },
];

/**
 * Inline concept-editor in v2-stijl, met dezelfde secties/volgorde en werking
 * als het oude dashboard-form. Bewerkbaar: oppervlakte (m²), groene aanslag/
 * korstmos/planten, de losse diensten, extra arbeid (minuten/personen),
 * voegzand (zakken/m²/prijs per type + kleur), korting (percentage of vast
 * bedrag) en de geldigheid. Alle getallen zijn handmatig invoerbaar. Het
 * totaal rekent live mee (computeRules/computeTotals) en slaat debounced op
 * via saveOfferteForm.
 */
export function OfferteEditor({ leadId, form, onTotaal }: OfferteEditorProps) {
  const live = Boolean(leadId);
  const router = useRouter();
  const [reverting, startRevert] = useTransition();

  // "Terug naar verzonden versie": verwijdert het concept en zet de regels
  // terug naar de snapshot van de laatst verstuurde offerte (zelfde gedrag als
  // het oude dashboard). Werkt alleen als die verstuurde versie een snapshot
  // heeft (offertes via het nieuwe form); legacy bot-offertes hebben er geen.
  const handleRevert = () => {
    if (!leadId || reverting) return;
    if (
      !window.confirm(
        "Wijzigingen ongedaan maken en terug naar de laatst verstuurde offerte?",
      )
    ) {
      return;
    }
    startRevert(async () => {
      const res = await revertConcept(leadId);
      if (res.ok) router.refresh();
      else window.alert(res.error);
    });
  };

  // ─── Enige bron van waarheid ───────────────────────────────
  const [data, setData] = useState<ManualOfferteData>(() => form.data);
  const [geldigheidDagen, setGeldigheidDagen] = useState<number>(form.geldigheidDagen);

  // ─── Lokale display-only state (niet in het model/schema) ──
  // "Planten in de buurt" heeft geen eigen veld; alleen UI-pariteit met het
  // oude form. Per-sectie toelichtingen worden (nog) nergens opgeslagen.
  const [plantenBuurt, setPlantenBuurt] = useState<JaNee>("nee");
  const [notes, setNotes] = useState<NotesState>({
    werk: "", diensten: "", voegzand: "", korting: "",
  });
  const setNote = useCallback((k: keyof NotesState, v: string) => {
    setNotes((s) => ({ ...s, [k]: v }));
  }, []);

  // ─── Save-state ────────────────────────────────────────────
  const [saveState, setSaveState] = useState<SaveState>("idle");

  // ─── Debounce-machinerie (spiegelt het oude form) ──────────
  const isFirstRenderRef = useRef(true);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFingerprintRef = useRef<string | null>(null);

  /** Eén veld bijwerken zonder de rest aan te raken. */
  const setField = useCallback(
    <K extends keyof ManualOfferteData>(k: K, v: ManualOfferteData[K]) => {
      setData((s) => ({ ...s, [k]: v }));
    },
    [],
  );

  // Factuuradres-veld: zet de waarde en markeer dat het factuuradres afwijkt
  // van het werkadres (zelfde gedrag als het oude form).
  const setFactuurField = useCallback(
    <K extends keyof ManualOfferteData>(k: K, v: ManualOfferteData[K]) => {
      setData((s) => ({ ...s, [k]: v, factuur_zelfde: false }));
    },
    [],
  );

  // ─── Sub-dienst toggle (behoudt overige sub-waarden) ───────
  const toggleSub = useCallback((k: SubDienst) => {
    setData((s) => {
      const has = s.sub.includes(k);
      return {
        ...s,
        sub: has ? s.sub.filter((x) => x !== k) : [...s.sub, k],
      };
    });
  }, []);

  // ─── Voegzand: actief zodra zakken of m² > 0 ───────────────
  const setVoegzandNormaal = useCallback(
    (
      patch: Partial<
        Pick<
          ManualOfferteData,
          "voegzand_normaal_zakken" | "voegzand_normaal_m2" | "voegzand_normaal_prijs"
        >
      >,
    ) => {
      setData((s) => {
        const next = { ...s, ...patch };
        next.voegzand_normaal_actief =
          (Number(next.voegzand_normaal_zakken) || 0) > 0 ||
          (Number(next.voegzand_normaal_m2) || 0) > 0;
        return next;
      });
    },
    [],
  );
  const setVoegzandOnkruid = useCallback(
    (
      patch: Partial<
        Pick<
          ManualOfferteData,
          | "voegzand_onkruidwerend_zakken"
          | "voegzand_onkruidwerend_m2"
          | "voegzand_onkruidwerend_prijs"
        >
      >,
    ) => {
      setData((s) => {
        const next = { ...s, ...patch };
        next.voegzand_onkruidwerend_actief =
          (Number(next.voegzand_onkruidwerend_zakken) || 0) > 0 ||
          (Number(next.voegzand_onkruidwerend_m2) || 0) > 0;
        return next;
      });
    },
    [],
  );

  /** Voert de server-call uit; managet saveState. */
  const flushSave = useCallback(
    async (payload: ManualOfferteData, dagen: number) => {
      if (!leadId) return;
      setSaveState("saving");
      if (idleResetTimerRef.current) {
        clearTimeout(idleResetTimerRef.current);
        idleResetTimerRef.current = null;
      }

      const res = await saveOfferteForm(leadId, payload, dagen);

      if (res.ok) {
        setSaveState("saved");
        idleResetTimerRef.current = setTimeout(() => {
          setSaveState("idle");
          idleResetTimerRef.current = null;
        }, 2000);
      } else {
        setSaveState("idle");
        // Fingerprint resetten zodat een retry niet als no-op geldt.
        lastFingerprintRef.current = null;
        // eslint-disable-next-line no-alert
        alert(`Opslaan mislukt: ${res.error}`);
      }
    },
    [leadId],
  );

  // ─── Debounced auto-save effect (600ms) ────────────────────
  useEffect(() => {
    // Demo-modus: nooit opslaan, ook geen fingerprint-bookkeeping.
    if (!live) return;

    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      lastFingerprintRef.current = dataFingerprint(data, geldigheidDagen);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const fp = dataFingerprint(data, geldigheidDagen);
      if (fp === lastFingerprintRef.current) return;
      lastFingerprintRef.current = fp;
      void flushSave(data, geldigheidDagen);
    }, 600);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [data, geldigheidDagen, flushSave, live]);

  // Cleanup open timers bij unmount (StrictMode-veilig).
  useEffect(() => {
    return () => {
      if (idleResetTimerRef.current) clearTimeout(idleResetTimerRef.current);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  // ─── Live afleiding ────────────────────────────────────────
  const pricing = form.pricing ?? FALLBACK_PRICING;
  const rules = useMemo(() => computeRules(data, pricing), [data, pricing]);
  const totals = useMemo(() => computeTotals(rules, data), [rules, data]);

  // Reiskosten apart tonen: die zijn niet kortbaar, dus los van het
  // diensten-subtotaal in het live prijsoverzicht.
  const reiskostenTotaal = useMemo(
    () => rules.filter((r) => r.eenheid === "km").reduce((s, r) => s + r.totaal, 0),
    [rules],
  );
  const dienstenSubtotaal = totals.subtotal - reiskostenTotaal;

  // Kortbare grondslag: diensten + korstmos-toeslag (nooit reiskosten). Dient
  // als grondslag voor de actiekorting en om het percentage af te leiden.
  const kortbareGrondslag = dienstenSubtotaal + totals.korstmosToeslag;

  // Effectief kortingspercentage puur voor weergave. De echte korting kan een
  // vast bedrag (data.korting_bedrag) of een percentage zijn; totals.kortingBedrag
  // is altijd het uiteindelijke euro-bedrag.
  const effectiveKortingPct =
    kortbareGrondslag > 0 ? (totals.kortingBedrag / kortbareGrondslag) * 100 : 0;

  const totaalIncl = totals.total + totals.btw;

  // Vervaldatum = vandaag + N dagen.
  const vervalDatum = useMemo(
    () => new Date(Date.now() + geldigheidDagen * 86400000),
    [geldigheidDagen],
  );

  // Live extra-arbeid totaal (min × personen × tarief).
  const arbeidTotaal =
    (Number(data.extra_arbeid_minuten) || 0) *
    (Number(data.extra_arbeid_personen) || 0) *
    pricing.extra_arbeid_per_min;

  // Meld het live totaal terug zodat de concept-rij in de lijst hetzelfde
  // bedrag toont als de editor (i.p.v. het stale €0 van een vers concept).
  useEffect(() => {
    onTotaal?.(formatEuro(totaalIncl));
  }, [totaalIncl, onTotaal]);

  // ─── Korting-helpers ───────────────────────────────────────
  /** Zet percentage-korting (wist het vaste bedrag). */
  const setKortingPct = useCallback((pct: number) => {
    setData((s) => ({
      ...s,
      korting_percentage: Math.max(0, Math.min(100, pct)),
      korting_bedrag: 0,
    }));
  }, []);

  const saveLabel =
    saveState === "saving" ? "Opslaan" : saveState === "saved" ? "Opgeslagen" : "";

  const showVoegzand = data.sub.includes("invegen");

  return (
    <div className={styles.editor} aria-disabled={!live}>
      {/* ── Kop: titel + autosave-status + terug-naar-verstuurd ── */}
      <div className={styles.editorHead}>
        <span className={styles.editorTitle}>Concept bewerken</span>
        {live && saveLabel ? (
          <span
            className={`${styles.saveBadge} ${
              saveState === "saved" ? styles.saveBadgeDone : ""
            }`}
          >
            {saveState === "saving" ? (
              <Loader2 size={12} strokeWidth={2.4} className={styles.spin} />
            ) : (
              <Check size={12} strokeWidth={2.6} />
            )}
            {saveLabel}
          </span>
        ) : null}
        {live ? (
          <button
            type="button"
            className={styles.revertBtn}
            onClick={handleRevert}
            disabled={reverting}
            title="Zet de offerte terug naar de laatst verstuurde versie"
          >
            <RotateCcw size={13} strokeWidth={2.2} />
            Terug naar verstuurde versie
          </button>
        ) : null}
        {!live ? (
          <span className={styles.demoBadge}>Voorbeeld, niet bewerkbaar</span>
        ) : null}
      </div>

      {/* ── 0. Klantgegevens op offerte ── */}
      <section className={styles.card}>
        <div className={styles.cardHead}>
          <span className={styles.cardTitle}>Klantgegevens op offerte</span>
        </div>
        <div className={styles.grid2}>
          <label className={styles.field}>
            <span className={styles.label}>Naam</span>
            <input
              className={styles.textInput}
              value={data.naam}
              onChange={(e) => setField("naam", e.target.value)}
              disabled={!live}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>
              Bedrijfsnaam <span className={styles.labelHint}>(optioneel)</span>
            </span>
            <input
              className={styles.textInput}
              value={data.bedrijf}
              onChange={(e) => setField("bedrijf", e.target.value)}
              disabled={!live}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>E-mail</span>
            <input
              type="email"
              className={styles.textInput}
              value={data.email}
              onChange={(e) => setField("email", e.target.value)}
              disabled={!live}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Telefoon op offerte</span>
            <input
              type="tel"
              className={styles.textInput}
              value={data.telefoon}
              onChange={(e) => setField("telefoon", e.target.value)}
              disabled={!live}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Postcode</span>
            <input
              className={styles.textInput}
              value={data.postcode}
              onChange={(e) => setField("postcode", e.target.value)}
              disabled={!live}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Huisnummer</span>
            <input
              className={styles.textInput}
              value={data.huisnummer}
              onChange={(e) => setField("huisnummer", e.target.value)}
              disabled={!live}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Straat</span>
            <input
              className={styles.textInput}
              value={data.straat}
              onChange={(e) => setField("straat", e.target.value)}
              disabled={!live}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Plaats</span>
            <input
              className={styles.textInput}
              value={data.plaats}
              onChange={(e) => setField("plaats", e.target.value)}
              disabled={!live}
            />
          </label>
        </div>

        {/* Factuuradres-gelijk-checkbox (zelfde gedrag als de handmatige
            offerte-wizard): aangevinkt = factuuradres = werkadres, velden
            verborgen. Uitvinken toont de 4 factuuradres-velden. */}
        <button
          type="button"
          className={`${styles.check} ${data.factuur_zelfde ? styles.checkOn : ""}`}
          onClick={() => setField("factuur_zelfde", !data.factuur_zelfde)}
          disabled={!live}
        >
          <span className={styles.checkBox}>
            {data.factuur_zelfde ? <Check size={13} strokeWidth={2.8} /> : null}
          </span>
          <span className={styles.checkL}>Factuuradres is gelijk aan het werkadres</span>
        </button>

        {!data.factuur_zelfde ? (
          <div className={styles.grid2}>
            <label className={styles.field}>
              <span className={styles.label}>Factuur-postcode</span>
              <input
                className={styles.textInput}
                value={data.factuur_postcode}
                onChange={(e) => setFactuurField("factuur_postcode", e.target.value)}
                disabled={!live}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Factuur-huisnummer</span>
              <input
                className={styles.textInput}
                value={data.factuur_huisnummer}
                onChange={(e) => setFactuurField("factuur_huisnummer", e.target.value)}
                disabled={!live}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Factuur-straat</span>
              <input
                className={styles.textInput}
                value={data.factuur_straat}
                onChange={(e) => setFactuurField("factuur_straat", e.target.value)}
                disabled={!live}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Factuur-plaats</span>
              <input
                className={styles.textInput}
                value={data.factuur_plaats}
                onChange={(e) => setFactuurField("factuur_plaats", e.target.value)}
                disabled={!live}
              />
            </label>
          </div>
        ) : null}
      </section>

      {/* ── 1. Werk & oppervlakte ── */}
      <section className={styles.card}>
        <div className={styles.cardHead}>
          <span className={styles.cardTitle}>Werk &amp; oppervlakte</span>
        </div>
        <div className={styles.grid2}>
          <label className={styles.field}>
            <span className={styles.label}>Oppervlakte m&#178;</span>
            <NumberField
              value={data.m2}
              onChange={(v) => setField("m2", v)}
              min={0}
              step={5}
              affix="m²"
              disabled={!live}
              ariaLabel="Oppervlakte in vierkante meter"
            />
          </label>
          <label className={styles.field}>
            {/* Display-only: het model kent geen los "planten in de buurt"-veld. */}
            <span className={styles.label}>Planten in de buurt</span>
            <SegmentedControl<JaNee>
              options={JANEE_OPTIES}
              value={plantenBuurt}
              onChange={(v) => setPlantenBuurt(v)}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Groene aanslag</span>
            <SegmentedControl<JaNee>
              options={JANEE_OPTIES}
              value={data.groene_aanslag}
              onChange={(v) => setField("groene_aanslag", v)}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Korstmos (10% toeslag)</span>
            <SegmentedControl<JaNee>
              options={JANEE_OPTIES}
              value={data.korstmos}
              onChange={(v) => setField("korstmos", v)}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Planten afschermen</span>
            <SegmentedControl<JaNee>
              options={JANEE_OPTIES}
              value={data.planten_afschermen_actief ? "ja" : "nee"}
              onChange={(v) => setField("planten_afschermen_actief", v === "ja")}
            />
          </label>
        </div>
        <NoteField
          value={notes.werk}
          onChange={(v) => setNote("werk", v)}
          placeholder="Bijvoorbeeld, extra uitleg over het werk."
          disabled={!live}
        />
      </section>

      {/* ── 2. Extra diensten ── */}
      <section className={styles.card}>
        <div className={styles.cardHead}>
          <span className={styles.cardTitle}>Extra diensten</span>
        </div>
        <div className={styles.checks}>
          {DIENST_OPTIES.map((d) => {
            const on = data.sub.includes(d.k);
            return (
              <button
                key={d.k}
                type="button"
                className={`${styles.check} ${on ? styles.checkOn : ""}`}
                aria-pressed={on}
                onClick={() => toggleSub(d.k)}
                disabled={!live}
              >
                <span className={styles.checkBox}>
                  {on ? <Check size={13} strokeWidth={3} aria-hidden /> : null}
                </span>
                <span className={styles.checkL}>{d.label}</span>
              </button>
            );
          })}
        </div>
        <NoteField
          value={notes.diensten}
          onChange={(v) => setNote("diensten", v)}
          placeholder="Bijvoorbeeld, wat de extra diensten inhouden."
          disabled={!live}
        />
      </section>

      {/* ── 3. Extra arbeid ── */}
      <section className={styles.card}>
        <div className={styles.cardHead}>
          <span className={styles.cardTitle}>Extra arbeid</span>
        </div>
        <div className={styles.arbeid}>
          <label className={styles.field}>
            <span className={styles.numLabel}>Minuten</span>
            <NumberField
              value={data.extra_arbeid_minuten}
              onChange={(v) => setField("extra_arbeid_minuten", v)}
              min={0}
              step={15}
              disabled={!live}
              ariaLabel="Minuten extra arbeid"
            />
          </label>
          <label className={styles.field}>
            <span className={styles.numLabel}>Personen</span>
            <NumberField
              value={data.extra_arbeid_personen}
              onChange={(v) => setField("extra_arbeid_personen", v)}
              min={0}
              step={1}
              disabled={!live}
              ariaLabel="Aantal personen extra arbeid"
            />
          </label>
          <div className={styles.field}>
            <span className={styles.numLabel}>Totaal</span>
            <span className={styles.arbeidBedrag}>{formatEuro(arbeidTotaal)}</span>
          </div>
        </div>
      </section>

      {/* ── 4. Voegzand (alleen bij invegen) ── */}
      {showVoegzand ? (
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <span className={styles.cardTitle}>Voegzand</span>
          </div>

          <div className={styles.zandRow}>
            <span className={styles.zandName}>Normaal</span>
            <label className={styles.field}>
              <span className={styles.numLabel}>Aantal zakken</span>
              <NumberField
                value={data.voegzand_normaal_zakken}
                onChange={(v) => setVoegzandNormaal({ voegzand_normaal_zakken: v })}
                min={0}
                step={1}
                disabled={!live}
                ariaLabel="Aantal zakken normaal voegzand"
              />
            </label>
            <label className={styles.field}>
              <span className={styles.numLabel}>Invegen-m&#178;</span>
              <NumberField
                value={data.voegzand_normaal_m2}
                onChange={(v) => setVoegzandNormaal({ voegzand_normaal_m2: v })}
                min={0}
                step={5}
                affix="m²"
                disabled={!live}
                ariaLabel="Invegen oppervlak normaal voegzand"
              />
            </label>
            <label className={styles.field}>
              <span className={styles.numLabel}>&#8364; per zak</span>
              <NumberField
                value={data.voegzand_normaal_prijs}
                onChange={(v) => setVoegzandNormaal({ voegzand_normaal_prijs: v })}
                min={0}
                step={0.5}
                prefix="€"
                disabled={!live}
                ariaLabel="Prijs per zak normaal voegzand"
              />
            </label>
          </div>

          <div className={styles.zandRow}>
            <span className={styles.zandName}>Onkruidwerend</span>
            <label className={styles.field}>
              <span className={styles.numLabel}>Aantal zakken</span>
              <NumberField
                value={data.voegzand_onkruidwerend_zakken}
                onChange={(v) => setVoegzandOnkruid({ voegzand_onkruidwerend_zakken: v })}
                min={0}
                step={1}
                disabled={!live}
                ariaLabel="Aantal zakken onkruidwerend voegzand"
              />
            </label>
            <label className={styles.field}>
              <span className={styles.numLabel}>Invegen-m&#178;</span>
              <NumberField
                value={data.voegzand_onkruidwerend_m2}
                onChange={(v) => setVoegzandOnkruid({ voegzand_onkruidwerend_m2: v })}
                min={0}
                step={5}
                affix="m²"
                disabled={!live}
                ariaLabel="Invegen oppervlak onkruidwerend voegzand"
              />
            </label>
            <label className={styles.field}>
              <span className={styles.numLabel}>&#8364; per zak</span>
              <NumberField
                value={data.voegzand_onkruidwerend_prijs}
                onChange={(v) => setVoegzandOnkruid({ voegzand_onkruidwerend_prijs: v })}
                min={0}
                step={0.5}
                prefix="€"
                disabled={!live}
                ariaLabel="Prijs per zak onkruidwerend voegzand"
              />
            </label>
          </div>

          <div className={styles.kleuren}>
            <button
              type="button"
              className={`${styles.kleur} ${data.kleur_naturel ? styles.kleurOn : ""}`}
              aria-pressed={data.kleur_naturel}
              onClick={() => setField("kleur_naturel", !data.kleur_naturel)}
              disabled={!live}
            >
              <span className={styles.swatch} style={{ background: "#C6BBA1" }} />
              <span className={styles.checkL}>Naturel</span>
            </button>
            <button
              type="button"
              className={`${styles.kleur} ${data.kleur_antraciet ? styles.kleurOn : ""}`}
              aria-pressed={data.kleur_antraciet}
              onClick={() => setField("kleur_antraciet", !data.kleur_antraciet)}
              disabled={!live}
            >
              <span className={styles.swatch} style={{ background: "#3A3A3A" }} />
              <span className={styles.checkL}>Antraciet</span>
            </button>
          </div>

          <NoteField
            value={notes.voegzand}
            onChange={(v) => setNote("voegzand", v)}
            placeholder="Bijvoorbeeld, keuze van voegzand toelichten."
            disabled={!live}
          />
        </section>
      ) : null}

      {/* ── 5. Actiekorting ── */}
      <section className={`${styles.card} ${styles.cardAccent}`}>
        <div className={styles.cardHead}>
          <span className={styles.cardTitle}>Actiekorting</span>
          <span className={styles.cardHint}>Alleen op diensten, niet op reiskosten</span>
        </div>
        <div className={styles.korting}>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            className={styles.slider}
            value={Math.round(effectiveKortingPct)}
            onChange={(e) => setKortingPct(Number(e.target.value))}
            disabled={!live}
            aria-label="Actiekorting percentage"
          />
          <div className={styles.kortingPctField}>
            <NumberField
              value={effectiveKortingPct}
              onChange={(v) => setKortingPct(v)}
              min={0}
              max={100}
              step={1}
              affix="%"
              disabled={!live}
              ariaLabel="Kortingspercentage"
            />
          </div>
          <span className={styles.kortingEur}>{formatEuro(totals.kortingBedrag)}</span>
        </div>
        {totals.kortingBedrag > 0 ? (
          <div className={styles.kortingHint}>
            Korting over {formatEuro(kortbareGrondslag)}, dat is{" "}
            {formatEuro(totals.kortingBedrag)}.
          </div>
        ) : null}
        <NoteField
          value={notes.korting}
          onChange={(v) => setNote("korting", v)}
          placeholder="Bijvoorbeeld, reden van de actiekorting."
          disabled={!live}
        />
      </section>

      {/* ── 6. Geldigheid offerte ── */}
      <section className={styles.card}>
        <div className={styles.cardHead}>
          <span className={styles.cardTitle}>Geldigheid offerte</span>
        </div>
        <div className={styles.geldig}>
          <span className={styles.geldigL}>Aantal dagen geldig vanaf vandaag</span>
          <NumberField
            value={geldigheidDagen}
            onChange={(v) => setGeldigheidDagen(Math.max(1, Math.round(v) || 1))}
            min={1}
            step={1}
            affix="dagen"
            disabled={!live}
            ariaLabel="Aantal dagen geldig"
          />
        </div>
        <p className={styles.geldigHint}>
          De vervaldatum wordt berekend als vandaag + dit aantal dagen:{" "}
          <strong>{formatDatumLang(vervalDatum)}</strong>
        </p>
      </section>

      {/* ── 7. Live prijsoverzicht ── */}
      <section className={styles.totals}>
        <div className={styles.overviewHead}>
          <span className={styles.overviewTitle}>Live prijsoverzicht</span>
          <span className={styles.overviewUpdated}>
            {saveState === "saving" ? "Opslaan" : "Bijgewerkt"}
          </span>
        </div>

        {/* Afgeleide prijsregels, uitgesplitst */}
        <div className={styles.lineList}>
          {rules.length === 0 ? (
            <div className={styles.lineEmpty}>Nog geen diensten geselecteerd.</div>
          ) : (
            rules.map((r, i) => (
              <div className={styles.lineRow} key={`${r.desc}-${i}`}>
                <span className={styles.lineLabel}>{r.desc}</span>
                <span className={styles.lineRight}>
                  <span className={styles.lineMeta}>
                    {r.aantal} {r.eenheid} &#215;{" "}
                    {r.overrideKey && live ? (
                      <span className={styles.linePrijs}>
                        <span className={styles.linePrijsEuro}>&#8364;</span>
                        <NlNumberInput
                          value={r.prijs}
                          onChange={(v) => setField(r.overrideKey!, v)}
                          min={0}
                          className={styles.linePrijsInput}
                          ariaLabel={`Prijs ${r.desc}`}
                        />
                        {r.overrideKey.endsWith("_override") &&
                        data[r.overrideKey] != null ? (
                          <button
                            type="button"
                            className={styles.linePrijsReset}
                            onClick={() => setField(r.overrideKey!, undefined)}
                            title="Terug naar de prijslijst"
                            aria-label="Prijs terug naar de prijslijst"
                          >
                            <RotateCcw size={11} strokeWidth={2.5} />
                          </button>
                        ) : null}
                      </span>
                    ) : (
                      formatEuro(r.prijs)
                    )}
                  </span>
                  <span className={styles.lineTotal}>{formatEuro(r.totaal)}</span>
                </span>
              </div>
            ))
          )}
        </div>

        <div className={styles.totalsDiv} />

        {/* Samenvatting: diensten, korting, reiskosten apart, BTW */}
        <div className={styles.totalsRows}>
          <div className={styles.totalsRow}>
            <span className={styles.totalsRowMuted}>Subtotaal diensten</span>
            <span className={styles.totalsValue}>{formatEuro(dienstenSubtotaal)}</span>
          </div>
          {totals.korstmosToeslag > 0 ? (
            <div className={styles.totalsRow}>
              <span className={styles.totalsRowMuted}>Korstmos-toeslag (10%)</span>
              <span className={styles.totalsValue}>{formatEuro(totals.korstmosToeslag)}</span>
            </div>
          ) : null}
          {totals.kortingBedrag > 0 ? (
            <div className={`${styles.totalsRow} ${styles.kortingRow}`}>
              <span>
                {data.korting_bedrag > 0
                  ? "Actiekorting (vast bedrag)"
                  : `Actiekorting (${Math.round(effectiveKortingPct)}%)`}
              </span>
              <span className={styles.totalsValue}>
                &#8722; {formatEuro(totals.kortingBedrag)}
              </span>
            </div>
          ) : null}
          {reiskostenTotaal > 0 ? (
            <div className={styles.totalsRow}>
              <span className={styles.totalsRowMuted}>Reiskosten</span>
              <span className={styles.totalsValue}>{formatEuro(reiskostenTotaal)}</span>
            </div>
          ) : null}
          <div className={styles.totalsRow}>
            <span className={styles.totalsRowMuted}>Totaal excl. BTW</span>
            <span className={styles.totalsValue}>{formatEuro(totals.total)}</span>
          </div>
          <div className={styles.totalsRow}>
            <span className={styles.totalsRowMuted}>BTW (21%)</span>
            <span className={styles.totalsValue}>{formatEuro(totals.btw)}</span>
          </div>
        </div>

        {/* Eind-totaal */}
        <div className={styles.grandLine}>
          <div className={styles.grandLineL}>
            <span className={styles.grandLineTitle}>Totaal incl. BTW</span>
            <span className={styles.grandLineSub}>
              geldig t/m {formatDatumKort(vervalDatum)}
            </span>
          </div>
          <span className={styles.grandLineV}>{formatEuro(totaalIncl)}</span>
        </div>
      </section>
    </div>
  );
}

/**
 * Handmatig invoerbaar getal-veld in v2-stijl. Wikkelt NlNumberInput (komma,
 * commit op blur) zodat de gebruiker kan typen, met +/- stepper-knopjes
 * ernaast als extra. Optionele prefix (€) of affix (m², dagen).
 */
function NumberField({
  value,
  onChange,
  min,
  max,
  step = 1,
  prefix,
  affix,
  placeholder,
  blankWhenZero,
  disabled,
  ariaLabel,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** HTML-entiteit toegestaan (bv. "&#8364;"). */
  prefix?: string;
  /** HTML-entiteit toegestaan (bv. "m&#178;"). */
  affix?: string;
  placeholder?: string;
  blankWhenZero?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const clamp = (n: number) => {
    let v = n;
    if (min != null) v = Math.max(min, v);
    if (max != null) v = Math.min(max, v);
    return v;
  };
  const cur = Number.isFinite(value) ? value : 0;
  // Afronding op 2 decimalen voorkomt drijvende-komma-ruis bij stappen van 0,5.
  const bump = (delta: number) => onChange(clamp(Math.round((cur + delta) * 100) / 100));

  return (
    <div className={styles.numField}>
      <button
        type="button"
        className={styles.numBtn}
        onClick={() => bump(-step)}
        disabled={disabled || (min != null && cur <= min)}
        aria-label="Verlagen"
        tabIndex={-1}
      >
        <Minus size={13} strokeWidth={2.5} />
      </button>
      <div className={styles.numBox}>
        {prefix ? <span className={styles.numAffix}>{prefix}</span> : null}
        <NlNumberInput
          value={cur}
          onChange={(v) => onChange(clamp(v))}
          min={min}
          max={max}
          className={styles.numInput}
          placeholder={placeholder}
          blankWhenZero={blankWhenZero}
          ariaLabel={ariaLabel}
        />
        {affix ? <span className={styles.numAffix}>{affix}</span> : null}
      </div>
      <button
        type="button"
        className={styles.numBtn}
        onClick={() => bump(step)}
        disabled={disabled || (max != null && cur >= max)}
        aria-label="Verhogen"
        tabIndex={-1}
      >
        <Plus size={13} strokeWidth={2.5} />
      </button>
    </div>
  );
}

/**
 * "Toelichting voor klant (optioneel)" textarea, display-only (NotesState).
 * Niet gepersisteerd, exact zoals in het oude form. Standaard ingeklapt tot
 * een knop, zodat de editor schoner oogt; klik toont het veld (en het blijft
 * open zolang er tekst in staat).
 */
function NoteField({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(() => value.trim() !== "");
  const areaRef = useRef<HTMLTextAreaElement | null>(null);

  const openen = () => {
    setOpen(true);
    requestAnimationFrame(() => areaRef.current?.focus());
  };

  // Sluit weer in zodra het veld leeg is en de focus weggaat.
  const onBlur = () => {
    if (value.trim() === "") setOpen(false);
  };

  if (!open) {
    return (
      <button
        type="button"
        className={styles.noteAddBtn}
        onClick={openen}
        disabled={disabled}
      >
        <Plus size={13} strokeWidth={2.4} />
        Toelichting voor klant toevoegen
      </button>
    );
  }

  return (
    <div className={styles.note}>
      <span className={styles.noteLabel}>Toelichting voor klant (optioneel)</span>
      <textarea
        ref={areaRef}
        className={styles.noteArea}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        disabled={disabled}
      />
    </div>
  );
}
