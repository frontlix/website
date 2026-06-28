"use client";

// ─────────────────────────────────────────────────────────────────────
// OfferteEditor (v2) — inline bewerking van de CONCEPT-offerte van de lead.
//
// Herwerkt zodat de opmaak, sectie-structuur en werking 1-op-1 het oude
// dashboard-form (LeadOfferteForm) volgen, maar in de v2-look (CSS Modules
// + var(--rb-*) tokens, lucide). Secties + volgorde, identiek aan het oude
// form (BEHALVE "Klantgegevens op offerte" — die velden staan al in de
// v2 Info-tab):
//   1. Werk & oppervlakte
//   2. Extra diensten
//   3. Extra arbeid
//   4. Voegzand (alleen invegen)
//   5. Actiekorting
//   6. Geldigheid offerte
//   7. Live prijsoverzicht (per regel een opmerking-veld + schakelaar)
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
// Per offerte-regel (in het live prijsoverzicht) staat een opmerking-veld met
// een schakelaar (default AAN). Aan + niet-lege tekst → de opmerking verschijnt
// in de offerte onder die regel. De opmerkingen worden via
// data.regel_opmerkingen gepersisteerd (leads.offerte_regel_opmerkingen) en
// door computeRules onder de juiste regel gehangen.
//
// Streep-vrij conform de Frontlix-huisstijl (komma i.p.v. liggend streepje;
// geen klemtoonaccenten in zichtbare tekst).
// ─────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { ReactNode, RefObject } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  Eye,
  Loader2,
  Minus,
  Percent,
  Plus,
  RotateCcw,
  Ruler,
  User,
} from "lucide-react";
import type {
  ManualOfferteData,
  OpmerkingKey,
  RegelOpmerking,
  SubDienst,
} from "@/lib/dashboard/manual-offerte-types";
import {
  computeRules,
  computeTotals,
  laatsteOnderdeelRegelIndices,
} from "@/lib/dashboard/manual-offerte-rules";
import { OpmerkingVeld } from "@/components/dashboard/v2/offerte/OpmerkingVeld";
import type { ManualOffertePricing } from "@/lib/dashboard/pricing-types";
import { FALLBACK_PRICING } from "@/lib/dashboard/pricing-types";
import { formatEuro } from "@/lib/dashboard/format";
import { saveOfferteForm } from "@/lib/dashboard/offerte-form-actions";
import { revertConcept } from "@/lib/dashboard/offerte-draft-actions";
import { OffertePdfDocument } from "@/components/dashboard/offerte/OffertePdf";
import { NlNumberInput } from "@/components/dashboard/NlNumberInput";
import { Modal, SegmentedControl } from "@/components/dashboard/v2/ui";
import type { DossierOfferte } from "./dossier-data";
import styles from "./OfferteEditor.module.css";

/** Imperatieve API die de editor op een ref publiceert: schrijf eventuele
 *  pending (debounced) wijzigingen direct weg. Gebruikt door de "Offerte
 *  versturen"-knop in de dossier-kop, zodat de bot het laatst bewerkte
 *  concept verstuurt. */
export type OfferteEditorApi = { flush: () => Promise<void> };

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
  /** Alle offertes van de lead (voor de versie-historie-modal). */
  offertes?: DossierOfferte[];
  /** Aantal bijgevoegde foto's (voor de "N foto's bijgevoegd"-regel). */
  fotosCount?: number;
  /** Ref waarop de editor een { flush } publiceert, zodat de "Offerte
   *  versturen"-knop in de dossier-kop de laatste wijzigingen kan wegschrijven
   *  vóór het versturen. */
  apiRef?: RefObject<OfferteEditorApi | null>;
  /** Meldt het live totaal-incl-BTW (geformatteerd) terug, zodat de
   *  concept-rij in de lijst hetzelfde bedrag toont als de editor. */
  onTotaal?: (totaalIncl: string) => void;
  /** Optionele Goedkeuren-actie (verstuurt de offerte). Wanneer gezet toont de
   *  actiebalk een Goedkeuren-knop naast Bekijk/Download/Historie. */
  onGoedkeuren?: () => void;
}

type SaveState = "idle" | "saving" | "saved";
type JaNee = "ja" | "nee";

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

/** Eén opmerking-onderdeel direct onder welke Extra-dienst-checkbox. Invegen =
 *  voegzand, dus daar hangt de voegzand-opmerking onder. */
const DIENST_OPM: Partial<Record<SubDienst, { key: OpmerkingKey; label: string }>> = {
  invegen: { key: "voegzand_normaal", label: "Voegzand" },
  preventieve_onkruid: { key: "preventieve_onkruid", label: "Preventieve onkruidbehandeling" },
  beschermlaag: { key: "beschermlaag", label: "Nieuwe beschermlaag" },
};

/**
 * Inline concept-editor in v2-stijl, met dezelfde secties/volgorde en werking
 * als het oude dashboard-form. Bewerkbaar: oppervlakte (m²), groene aanslag/
 * korstmos/planten, de losse diensten, extra arbeid (minuten/personen),
 * voegzand (zakken/m²/prijs per type + kleur), korting (percentage of vast
 * bedrag) en de geldigheid. Alle getallen zijn handmatig invoerbaar. Het
 * totaal rekent live mee (computeRules/computeTotals) en slaat debounced op
 * via saveOfferteForm.
 */
export function OfferteEditor({
  leadId,
  form,
  offertes = [],
  fotosCount = 0,
  apiRef,
  onTotaal,
  onGoedkeuren,
}: OfferteEditorProps) {
  const live = Boolean(leadId);
  const router = useRouter();
  const [reverting, startRevert] = useTransition();

  // "Terug naar verzonden versie": verwijdert het concept en zet de regels
  // terug naar de snapshot van de laatst verstuurde offerte (zelfde gedrag als
  // het oude dashboard). Werkt alleen als die verstuurde versie een snapshot
  // heeft (offertes via het nieuwe form); legacy bot-offertes hebben er geen.
  const handleRevert = () => {
    if (!leadId || reverting) return;
    startRevert(async () => {
      const res = await revertConcept(leadId);
      if (!res.ok) {
        window.alert(res.error);
        return;
      }
      // Vervang de lokale editor-state direct door de teruggezette versie. Een
      // router.refresh() is een SOFT refresh die client-state behoudt; zonder
      // deze setData bleef het oude concept zichtbaar (en kon de debounced
      // auto-save het herstel zelfs weer overschrijven). De fingerprint zetten
      // we meteen gelijk zodat de auto-save de herstelde state niet als
      // "wijziging" terugschrijft.
      if (res.data) {
        setData(res.data.form);
        setGeldigheidDagen(res.data.geldigheidDagen);
        lastFingerprintRef.current = dataFingerprint(
          res.data.form,
          res.data.geldigheidDagen,
        );
      }
      router.refresh();
    });
  };

  // ─── Enige bron van waarheid ───────────────────────────────
  const [data, setData] = useState<ManualOfferteData>(() => form.data);
  const [geldigheidDagen, setGeldigheidDagen] = useState<number>(form.geldigheidDagen);

  // ─── Lokale display-only state (niet in het model/schema) ──
  // "Planten in de buurt" heeft geen eigen veld; alleen UI-pariteit met het
  // oude form.
  const [plantenBuurt, setPlantenBuurt] = useState<JaNee>("nee");

  // Per-onderdeel opmerking bijwerken (tekst + schakelaar). Wordt via
  // data.regel_opmerkingen gepersisteerd (offerte_regel_opmerkingen-kolom) en
  // door computeRules onder de juiste regel in de offerte gezet.
  const zetOpmerking = useCallback((key: OpmerkingKey, next: RegelOpmerking) => {
    setData((s) => ({
      ...s,
      regel_opmerkingen: { ...(s.regel_opmerkingen ?? {}), [key]: next },
    }));
  }, []);

  // ─── Accordion open/dicht-state (spiegelt de mobiele editor) ──
  // Werk & oppervlakte staat standaard open zodat de kern-velden meteen in
  // beeld zijn; de overige secties beginnen ingeklapt voor een rustig overzicht.
  const [openKlant, setOpenKlant] = useState(false);
  const [openWerk, setOpenWerk] = useState(true);
  const [openKorting, setOpenKorting] = useState(false);
  const [openGeldig, setOpenGeldig] = useState(false);

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

  // Publiceer een imperatieve flush op apiRef: schrijf eventuele pending
  // (debounced) wijzigingen direct weg. De "Offerte versturen"-knop in de
  // dossier-kop wacht hierop, zodat de bot het laatst bewerkte concept
  // verstuurt i.p.v. een net-niet-opgeslagen versie. Re-registreert bij elke
  // data-wijziging zodat de closure altijd de laatste state heeft.
  useEffect(() => {
    if (!apiRef) return;
    apiRef.current = {
      flush: async () => {
        if (!leadId) return;
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        const fp = dataFingerprint(data, geldigheidDagen);
        if (fp === lastFingerprintRef.current) return; // niets gewijzigd
        lastFingerprintRef.current = fp;
        await flushSave(data, geldigheidDagen);
      },
    };
    return () => {
      if (apiRef) apiRef.current = null;
    };
  }, [apiRef, leadId, data, geldigheidDagen, flushSave]);

  // ─── Live afleiding ────────────────────────────────────────
  const pricing = form.pricing ?? FALLBACK_PRICING;
  const rules = useMemo(() => computeRules(data, pricing), [data, pricing]);
  const totals = useMemo(() => computeTotals(rules, data), [rules, data]);
  // Welke regel-index per onderdeel het opmerking-veld krijgt (laatste regel van
  // elk onderdeel), zodat een onderdeel met meerdere regels één veld heeft.
  const opmIndices = useMemo(() => laatsteOnderdeelRegelIndices(rules), [rules]);
  // Welke onderdelen een regel in de offerte opleveren; alleen die krijgen een
  // opmerking-veld (anders is er niets om 'm onder te zetten).
  const actieveOpm = useMemo(() => new Set(opmIndices.values()), [opmIndices]);
  /** Opmerking-veld voor één onderdeel, onder de bijbehorende optie in de editor.
   *  Het label maakt duidelijk bij welk onderdeel de opmerking hoort; alleen
   *  getoond als dat onderdeel ook echt een regel oplevert. */
  const opm = (key: OpmerkingKey, label: string) =>
    actieveOpm.has(key) ? (
      <OpmerkingVeld
        label={label}
        waarde={data.regel_opmerkingen?.[key]}
        zet={(next) => zetOpmerking(key, next)}
        disabled={!live}
      />
    ) : null;
  /** Opmerking-veld voor een niet-regel-onderdeel (conditie / korting): altijd
   *  tonen, want er is geen prijsregel om de zichtbaarheid aan te koppelen. */
  const opmVast = (key: OpmerkingKey, label: string) => (
    <OpmerkingVeld
      label={label}
      waarde={data.regel_opmerkingen?.[key]}
      zet={(next) => zetOpmerking(key, next)}
      disabled={!live}
    />
  );

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

  // Toon ALTIJD een heel percentage 0-100. In percentage-modus tonen we de
  // expliciet gezette korting_percentage (de slider/preset-waarde), niet de
  // teruggerekende effectieve pct, die door euro-afronding net naast een heel
  // getal valt (bv. 56,999%). In vast-bedrag-modus tonen we de afgeleide pct.
  const pctDisplay = Math.round(
    data.korting_bedrag === 0 ? data.korting_percentage : effectiveKortingPct,
  );

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
  /** Zet percentage-korting (heel getal 0-100, wist het vaste bedrag). */
  const setKortingPct = useCallback((pct: number) => {
    setData((s) => ({
      ...s,
      korting_percentage: Math.round(Math.max(0, Math.min(100, pct))),
      korting_bedrag: 0,
    }));
  }, []);

  /** Zet een vast kortingsbedrag (overruling het percentage). */
  const setKortingBedrag = useCallback((bedrag: number) => {
    setData((s) => ({
      ...s,
      korting_bedrag: Math.max(0, bedrag),
      korting_percentage: 0,
    }));
  }, []);

  const saveLabel =
    saveState === "saving" ? "Opslaan" : saveState === "saved" ? "Opgeslagen" : "";

  const showVoegzand = data.sub.includes("invegen");

  // ─── Samenvattingen voor de accordion-koppen (rechts, ingeklapt zichtbaar) ──
  const klantSummary = [data.naam, data.plaats].filter(Boolean).join(", ") || "Niet ingevuld";
  const werkSummary = `${data.m2} m², ${data.sub.length} ${data.sub.length === 1 ? "dienst" : "diensten"}`;
  const kortingSummary =
    totals.kortingBedrag > 0
      ? data.korting_bedrag > 0
        ? `${formatEuro(totals.kortingBedrag)} korting`
        : `${pctDisplay}% korting`
      : "Geen korting";
  const geldigSummary = `${geldigheidDagen} dagen`;

  // ─── PDF (bekijken/downloaden) + versie-historie ───────────
  const [pdfOpen, setPdfOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [histOpen, setHistOpen] = useState(false);
  const pdfUrlRef = useRef<string | null>(null);

  const offerteNummer = leadId
    ? `${new Date().getFullYear()}-${leadId.replace(/\D/g, "").slice(-4).padStart(4, "0")}`
    : `${new Date().getFullYear()}-0000`;

  /** Genereert de echte offerte-PDF (zelfde @react-pdf-document als de wizard,
   *  client-side gerenderd uit de live state). */
  const buildPdfBlob = useCallback(async (): Promise<Blob> => {
    const { pdf } = await import("@react-pdf/renderer");
    return pdf(
      <OffertePdfDocument
        data={data}
        rules={rules}
        totals={totals}
        offerteNummer={offerteNummer}
        geldigheidDagen={geldigheidDagen}
        origin={typeof window !== "undefined" ? window.location.origin : undefined}
      />,
    ).toBlob();
  }, [data, rules, totals, offerteNummer, geldigheidDagen]);

  const handleViewPdf = useCallback(async () => {
    if (pdfBusy) return;
    setPdfBusy(true);
    try {
      const blob = await buildPdfBlob();
      const url = URL.createObjectURL(blob);
      if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
      pdfUrlRef.current = url;
      setPdfUrl(url);
      setPdfOpen(true);
    } catch (e) {
      console.error("[OfferteEditor] PDF-preview mislukt:", e);
      // eslint-disable-next-line no-alert
      alert("PDF maken mislukt, probeer het opnieuw.");
    } finally {
      setPdfBusy(false);
    }
  }, [pdfBusy, buildPdfBlob]);

  const closePdf = useCallback(() => {
    setPdfOpen(false);
    if (pdfUrlRef.current) {
      URL.revokeObjectURL(pdfUrlRef.current);
      pdfUrlRef.current = null;
    }
    setPdfUrl(null);
  }, []);

  const handleDownloadPdf = useCallback(async () => {
    if (pdfBusy) return;
    setPdfBusy(true);
    try {
      const blob = await buildPdfBlob();
      const slug = (data.naam || "klant")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      // Desktop: directe download via <a download>. Bewust NIET de Web Share
      // API (deliverPdfBlob), die opent op macOS/Windows het deel-/bewaar-vel
      // i.p.v. direct te downloaden.
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `offerte-${slug || "schoon-straatje"}.pdf`;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e) {
      console.error("[OfferteEditor] PDF-download mislukt:", e);
      // eslint-disable-next-line no-alert
      alert("PDF maken mislukt, probeer het opnieuw.");
    } finally {
      setPdfBusy(false);
    }
  }, [pdfBusy, buildPdfBlob, data.naam]);

  // Eventuele open object-URL opruimen bij unmount.
  useEffect(() => {
    return () => {
      if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
    };
  }, []);

  // Eerdere (verstuurde/archief) versies voor de historie-modal.
  const eerdereVersies = offertes.filter((o) => !o.concept);

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

      {/* ── Klantgegevens ── */}
      <AccordionSection
        icon={<User size={15} strokeWidth={2.2} />}
        title="Klantgegevens op offerte"
        summary={klantSummary}
        open={openKlant}
        onToggle={() => setOpenKlant((o) => !o)}
      >
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
      </AccordionSection>

      {/* ── Werk & oppervlakte (incl. extra diensten, arbeid, voegzand) ── */}
      <AccordionSection
        icon={<Ruler size={15} strokeWidth={2.2} />}
        title="Werk & oppervlakte"
        summary={werkSummary}
        open={openWerk}
        onToggle={() => setOpenWerk((o) => !o)}
      >
        {/* 2 kolommen zoals voorheen, met onder elke optie z'n eigen opmerking. */}
        <div className={styles.grid2}>
          <div className={styles.veldBlok}>
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
            {opmVast("reiniging", "Reiniging")}
          </div>
          <div className={styles.veldBlok}>
            <label className={styles.field}>
              {/* Display-only: het model kent geen los "planten in de buurt"-veld. */}
              <span className={styles.label}>Planten in de buurt</span>
              <SegmentedControl<JaNee>
                options={JANEE_OPTIES}
                value={plantenBuurt}
                onChange={(v) => setPlantenBuurt(v)}
              />
            </label>
            {opmVast("planten_buurt", "Planten in de buurt")}
          </div>
          <div className={styles.veldBlok}>
            <label className={styles.field}>
              <span className={styles.label}>Groene aanslag</span>
              <SegmentedControl<JaNee>
                options={JANEE_OPTIES}
                value={data.groene_aanslag}
                onChange={(v) => setField("groene_aanslag", v)}
              />
            </label>
            {opmVast("groene_aanslag", "Groene aanslag")}
          </div>
          <div className={styles.veldBlok}>
            <label className={styles.field}>
              <span className={styles.label}>Korstmos (10% toeslag)</span>
              <SegmentedControl<JaNee>
                options={JANEE_OPTIES}
                value={data.korstmos}
                onChange={(v) => setField("korstmos", v)}
              />
            </label>
            {opmVast("korstmos", "Korstmos")}
          </div>
          <div className={styles.veldBlok}>
            <label className={styles.field}>
              <span className={styles.label}>Planten afschermen</span>
              <SegmentedControl<JaNee>
                options={JANEE_OPTIES}
                value={data.planten_afschermen_actief ? "ja" : "nee"}
                onChange={(v) => setField("planten_afschermen_actief", v === "ja")}
              />
            </label>
            {opmVast("planten", "Planten afschermen")}
          </div>
        </div>

        {/* Reiskosten heeft geen eigen control; alleen tonen als 'ie een regel oplevert. */}
        {opm("reiskosten", "Reiskosten")}

        {/* Sub-blok: Extra diensten — elke checkbox met z'n opmerking er direct onder. */}
        <div className={styles.subLabel}>Extra diensten</div>
        <div className={styles.checks}>
          {DIENST_OPTIES.map((d) => {
            const on = data.sub.includes(d.k);
            const o = DIENST_OPM[d.k];
            return (
              <div key={d.k}>
                <button
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
                {on && o ? opmVast(o.key, o.label) : null}
              </div>
            );
          })}
        </div>

        {/* Sub-blok: Extra arbeid */}
        <div className={styles.subLabel}>Extra arbeid</div>
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

        {/* Sub-blok: Voegzand (alleen bij invegen) */}
        {showVoegzand ? (
          <>
            <div className={styles.subLabel}>Voegzand</div>
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

          </>
        ) : null}
      </AccordionSection>

      {/* ── Actiekorting ── */}
      <AccordionSection
        icon={<Percent size={15} strokeWidth={2.2} />}
        title="Actiekorting"
        summary={kortingSummary}
        accent
        open={openKorting}
        onToggle={() => setOpenKorting((o) => !o)}
      >
        <span className={styles.cardHintRow}>Alleen op diensten, niet op reiskosten</span>

        {/* Snelkeuze-percentages */}
        <div className={styles.presetRow}>
          {[10, 20, 30, 50].map((p) => {
            const on = data.korting_bedrag === 0 && pctDisplay === p;
            return (
              <button
                key={p}
                type="button"
                className={`${styles.preset} ${on ? styles.presetOn : ""}`}
                onClick={() => setKortingPct(p)}
                disabled={!live}
              >
                {p}%
              </button>
            );
          })}
        </div>

        <div className={styles.korting}>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            className={styles.slider}
            value={pctDisplay}
            onChange={(e) => setKortingPct(Number(e.target.value))}
            disabled={!live}
            aria-label="Actiekorting percentage"
          />
          <div className={styles.kortingPctField}>
            <NumberField
              value={pctDisplay}
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

        {/* Vast bedrag (overruled het percentage) */}
        <label className={styles.field}>
          <span className={styles.label}>Of een vast bedrag korting</span>
          <NumberField
            value={data.korting_bedrag}
            onChange={(v) => setKortingBedrag(v)}
            min={0}
            step={5}
            prefix="€"
            blankWhenZero
            placeholder="0,00"
            disabled={!live}
            ariaLabel="Vast kortingsbedrag in euro"
          />
        </label>

        {totals.kortingBedrag > 0 ? (
          <div className={styles.kortingHint}>
            Korting over {formatEuro(kortbareGrondslag)}, dat is{" "}
            {formatEuro(totals.kortingBedrag)}.
          </div>
        ) : null}
        {opmVast("korting", "Actiekorting")}
      </AccordionSection>

      {/* ── Geldigheid offerte ── */}
      <AccordionSection
        icon={<Calendar size={15} strokeWidth={2.2} />}
        title="Geldigheid offerte"
        summary={geldigSummary}
        open={openGeldig}
        onToggle={() => setOpenGeldig((o) => !o)}
      >
        {/* Snelkeuze-dagen */}
        <div className={styles.presetRow}>
          {[7, 14, 30, 60].map((d) => (
            <button
              key={d}
              type="button"
              className={`${styles.preset} ${geldigheidDagen === d ? styles.presetOn : ""}`}
              onClick={() => setGeldigheidDagen(d)}
              disabled={!live}
            >
              {d} dgn
            </button>
          ))}
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
      </AccordionSection>

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
                  : `Actiekorting (${pctDisplay}%)`}
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

        {fotosCount > 0 ? (
          <div className={styles.fotoLine}>
            {fotosCount} {fotosCount === 1 ? "foto" : "foto's"} bijgevoegd bij de offerte
          </div>
        ) : null}
      </section>

      {/* ── Actiebalk: PDF bekijken/downloaden + versie-historie ── */}
      {live ? (
        <div className={styles.actionBar}>
          {onGoedkeuren ? (
            <button
              type="button"
              className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
              onClick={onGoedkeuren}
            >
              <CheckCircle2 size={15} strokeWidth={2.2} />
              Goedkeuren
            </button>
          ) : null}
          <button
            type="button"
            className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
            onClick={handleViewPdf}
            disabled={pdfBusy}
          >
            {pdfBusy ? (
              <Loader2 size={15} strokeWidth={2.4} className={styles.spin} />
            ) : (
              <Eye size={15} strokeWidth={2.2} />
            )}
            Bekijk PDF
          </button>
          <button
            type="button"
            className={styles.actionBtn}
            onClick={handleDownloadPdf}
            disabled={pdfBusy}
          >
            <Download size={15} strokeWidth={2.2} />
            Download PDF
          </button>
          <button
            type="button"
            className={styles.actionBtn}
            onClick={() => setHistOpen(true)}
          >
            <Clock size={15} strokeWidth={2.2} />
            Versie-historie
          </button>
        </div>
      ) : null}

      {/* ── PDF-preview modal (echte PDF in een iframe) ── */}
      <Modal open={pdfOpen} onClose={closePdf} width={920} label="Offerte PDF">
        <div className={styles.pdfModal}>
          <div className={styles.pdfModalHead}>
            <span className={styles.modalTitle}>Offerte-PDF</span>
            <button
              type="button"
              className={styles.actionBtn}
              onClick={handleDownloadPdf}
              disabled={pdfBusy}
            >
              <Download size={14} strokeWidth={2.2} />
              Download
            </button>
          </div>
          {pdfUrl ? (
            <iframe src={pdfUrl} className={styles.pdfFrame} title="Offerte PDF" />
          ) : (
            <div className={styles.pdfLoading}>PDF laden…</div>
          )}
        </div>
      </Modal>

      {/* ── Versie-historie modal ── */}
      <Modal
        open={histOpen}
        onClose={() => setHistOpen(false)}
        width={520}
        label="Versie-historie"
      >
        <div className={styles.histModal}>
          <span className={styles.modalTitle}>Versie-historie</span>
          <div className={styles.histList}>
            <div className={`${styles.histRow} ${styles.histRowCurrent}`}>
              <div className={styles.histMain}>
                <span className={styles.histNr}>Huidige versie</span>
                <span className={styles.histSub}>Nu, nog niet verstuurd</span>
              </div>
              <span className={styles.histTotaal}>{formatEuro(totaalIncl)}</span>
            </div>
            {eerdereVersies.map((o) => (
              <div key={o.nr} className={styles.histRow}>
                <div className={styles.histMain}>
                  <span className={styles.histNr}>{o.nr}</span>
                  <span className={styles.histSub}>{o.sub}</span>
                </div>
                <span className={styles.histTotaal}>{o.totaal}</span>
              </div>
            ))}
            {eerdereVersies.length === 0 ? (
              <div className={styles.histEmpty}>Nog geen eerdere versies verstuurd.</div>
            ) : null}
          </div>
        </div>
      </Modal>
    </div>
  );
}

/**
 * Uitklapbare sectie-kaart (accordion) in v2-stijl. Kop = icoon-badge + titel
 * + (ingeklapt zichtbare) samenvatting + chevron. Het lichaam blijft altijd in
 * de DOM (open/dicht puur via CSS: een grid-rij-collapse van 0fr naar 1fr),
 * zodat print/zonder-JS alles toont. `accent` geeft de blauwe rand (Actiekorting).
 */
function AccordionSection({
  icon,
  title,
  summary,
  open,
  onToggle,
  accent,
  children,
}: {
  icon: ReactNode;
  title: string;
  summary?: string;
  open: boolean;
  onToggle: () => void;
  accent?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={`${styles.acc} ${accent ? styles.accAccent : ""}`}
      data-open={open}
    >
      <button
        type="button"
        className={styles.accHead}
        onClick={onToggle}
        aria-expanded={open}
      >
        <span className={styles.accIcon}>{icon}</span>
        <span className={styles.accTitle}>{title}</span>
        {summary ? <span className={styles.accSummary}>{summary}</span> : null}
        <ChevronDown size={16} strokeWidth={2.4} className={styles.accChevron} />
      </button>
      <div className={styles.accClip}>
        <div className={styles.accInner}>
          <div className={styles.accBody}>{children}</div>
        </div>
      </div>
    </section>
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
