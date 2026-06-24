"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Pencil, TriangleAlert, FileStack, Trash2, Plus } from "lucide-react";
import { Modal } from "@/components/dashboard/v2/ui";
import {
  listDrafts,
  upsertDraft,
  removeDraft,
  makeDraftId,
  formatLaatstBewerkt,
  type OfferteDraft,
} from "./offerte-drafts";
import { createManualLeadEnOfferte } from "@/lib/dashboard/manual-offerte-actions";
import { getPricingForOffertePreview, getOffertePreviewMeta } from "@/lib/dashboard/pricing-actions";
import { FALLBACK_PRICING, type ManualOffertePricing } from "@/lib/dashboard/pricing-types";
import { isValidEmail } from "@/components/dashboard/offerte/StepKlant";
import { mapWizardToManualOfferte } from "./offerte-mappers";
import { StapKlant } from "./StapKlant";
import { StapWerk } from "./StapWerk";
import { StapOfferte } from "./StapOfferte";
import { StapVersturen } from "./StapVersturen";
import { OfferteRail } from "./OfferteRail";
import { OfferteVerzonden } from "./OfferteVerzonden";
import { Stepper } from "./WizardStepper";
import {
  DIENSTEN_INIT,
  LEGE_KLANT,
  PRIJZEN,
  type OfferteKlant,
} from "./offerte-data";
import type { ExtractedFields } from "@/lib/dashboard/manual-offerte-ai";
import type { OpmerkingKey, RegelOpmerking } from "@/lib/dashboard/manual-offerte-types";
import { parsePrijs, naarKomma, fmtEuro } from "./offerte-utils";
import type {
  BtwKeuze,
  GeordendItem,
  Kanaal,
  Kleur,
  KlantType,
  KortingType,
  Regel,
  VrijeRegel,
} from "./types";
import styles from "./OfferteWizard.module.css";

interface OfferteWizardProps {
  open: boolean;
  onClose: () => void;
  /** Navigeert naar het lead-dossier vanuit de verzonden-staat. */
  onNaarLeads?: () => void;
}

const STAPPEN = ["Klant", "Werk", "Offerte", "Versturen"] as const;

/** Download een base64-PDF (server-gerenderd) als bestand in de browser. */
function downloadPdfFromBase64(base64: string, filename: string) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Handmatige offerte-wizard: modal met klikbare stepper, stap-inhoud links
 *  en een sticky "Live totaal"-rail rechts die overal live meerekent. */
export function OfferteWizard({ open, onClose, onNaarLeads }: OfferteWizardProps) {
  const [stap, setStap] = useState(0);
  const [verzonden, setVerzonden] = useState(false);
  // Submit-staat: pending tijdens de server-action, foutmelding bij falen,
  // en het echte server-totaal (de action recomputet de prijslijst) voor de
  // verzonden-staat.
  const [bezig, startVerstuur] = useTransition();
  const [fout, setFout] = useState<string | null>(null);
  const [serverTotaal, setServerTotaal] = useState<number | null>(null);

  // ── Concepten (drafts) ──
  // De wizard wordt automatisch als concept in localStorage bewaard zodra er
  // inhoud is, zodat sluiten/herladen het werk niet wist. draftId is het id van
  // het concept dat we nu bewerken (null = nog niets opgeslagen). De
  // concepten-knop rechtsboven opent een lijst om naar een ander concept te
  // springen of een nieuw leeg concept te beginnen.
  const [draftId, setDraftId] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [conceptenOpen, setConceptenOpen] = useState(false);
  const [drafts, setDrafts] = useState<OfferteDraft[]>([]);

  // Live pricing-snapshot (zelfde bron als ManualOfferteModal). Nodig om de
  // vrije meerwerk-regels betrouwbaar naar de extra_arbeid-velden te vertalen:
  // de server rekent extra arbeid als minuten × per_min, dus we converteren
  // het euro-bedrag met deze tenant-tarief terug naar minuten zodat het
  // opgeslagen bedrag gelijk is aan wat de gebruiker zag.
  const [pricing, setPricing] = useState<ManualOffertePricing>(FALLBACK_PRICING);
  useEffect(() => {
    let cancelled = false;
    getPricingForOffertePreview().then((p) => {
      if (cancelled) return;
      setPricing(p);
      // Voegzand-prijs per zak volgt de tenant-prijslijst (Schoon Straatje);
      // de gebruiker kan 'm daarna nog per offerte aanpassen.
      setZandPrijzen({
        normaal: naarKomma(p.voegzand_normaal_per_zak),
        onkruidwerend: naarKomma(p.voegzand_onkruidwerend_per_zak),
      });
    });
    // Geldigheid-default + bedrijfsnaam uit de tenant-instelling, zodat de wizard
    // het echte startgetal en de juiste afzender toont i.p.v. hardcoded waarden.
    // Eén keer bij mount; daarna bepaalt de owner de geldigheid per offerte (of
    // laadt een concept de opgeslagen waarde).
    getOffertePreviewMeta().then((meta) => {
      if (cancelled) return;
      if (meta.geldigheidDagen > 0) setGeldigDagen(meta.geldigheidDagen);
      if (meta.bedrijfsnaam) setBedrijfsnaam(meta.bedrijfsnaam);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Stap 1 — klant
  const [zoek, setZoek] = useState("");
  const [klant, setKlant] = useState<OfferteKlant | null>(null);
  const [klantType, setKlantType] = useState<KlantType>("Particulier");
  const [aiGebruikt, setAiGebruikt] = useState(false);
  const [factuurZelfde, setFactuurZelfde] = useState(true);
  const [factuur, setFactuur] = useState({ straat: "", nr: "", postcode: "", plaats: "" });
  // Echte enkele-reis-afstand uit de geocode (StapKlant). null = onbekend/niet
  // geocodeerbaar → submit geeft dan afstand_km: 0 mee (geen onbedoelde
  // reiskosten-regel), nooit de DEFAULTS-25.
  const [afstandKm, setAfstandKm] = useState<number | null>(null);

  // Stap 2 — werk. Alles begint leeg: de offerte vult zich pas terwijl de
  // gebruiker oppervlakte invult en diensten aanklikt, zodat de Live totaal-rail
  // bij een verse offerte geen voorgevulde demo-regels toont. rolPrijs/
  // zandPrijzen/kleur/btw houden hun prijs-default of -keuze (die tonen pas iets
  // zodra er een hoeveelheid is).
  const [m2, setM2kaal] = useState(0);
  const [qty, setQty] = useState({ invegen: 0, rollen: 0 });
  const [rolPrijs, setRolPrijs] = useState<string>(PRIJZEN.rol);
  // Voegzand per type in m² (de in te vegen oppervlakte met dat type). De
  // zakken en de productprijs leiden we af via de dekkingsfactor (m²/zak).
  const [voegzandM2, setVoegzandM2] = useState({ normaal: 0, onkruidwerend: 0 });
  // Aantal zakken per type. Volgt de m² (ceil(m²/dekking)) bij elke m²-wijziging,
  // maar is daarna handmatig overschrijfbaar (Schoon Straatje laat een afwijkend
  // zak-aantal toe, los van de in te vegen m²).
  const [voegzandZakken, setVoegzandZakken] = useState({ normaal: 0, onkruidwerend: 0 });
  const [zandPrijzen, setZandPrijzen] = useState({
    normaal: naarKomma(FALLBACK_PRICING.voegzand_normaal_per_zak),
    onkruidwerend: naarKomma(FALLBACK_PRICING.voegzand_onkruidwerend_per_zak),
  });
  const [diensten, setDiensten] = useState<Record<string, boolean>>({ ...DIENSTEN_INIT });
  const [bm2, setBm2] = useState(0); // m² beschermlaag
  const [om2, setOm2] = useState(0); // m² preventieve onkruidbehandeling
  // Per-offerte eenheidsprijs-overrides per regel-id (rauwe invoer; "" =
  // prijslijst). Keys: reinigen_dagprijs, reiniging_per_m2, invegenN, invegenO,
  // bescherm, onkruid, reiskosten. Voegzand/rol hebben hun eigen prijs-state
  // (zandPrijzen/rolPrijs) en zijn in stap 3 via die setters bewerkbaar.
  const [prijsOverrides, setPrijsOverrides] = useState<Record<string, string>>({});
  const [groeneAanslag, setGroeneAanslag] = useState(false);
  const [kleur, setKleur] = useState<Kleur>("Naturel");
  const [korstmosConditie, setKorstmosConditie] = useState(false);
  // Onderhoudsabonnement-interval (weken); getoond zodra de dienst aan staat.
  const [onderhoudWeken, setOnderhoudWeken] = useState(8);
  // Per-onderdeel opmerkingen (tekst + schakelaar; default aan). Key =
  // OpmerkingKey. Verschijnen in de offerte onder het bijbehorende onderdeel.
  const [regelOpmerkingen, setRegelOpmerkingen] = useState<
    Partial<Record<OpmerkingKey, RegelOpmerking>>
  >({});
  const zetOpmerking = (key: OpmerkingKey, next: RegelOpmerking) =>
    setRegelOpmerkingen((m) => ({ ...m, [key]: next }));

  // Stap 3 — offerte (korstmos-toeslag komt uit stap 2)
  const [korstmosToeslag, setKorstmosToeslag] = useState(false);
  // Korting: percentage óf vast euro-bedrag (kortingType schakelt). Beide als
  // rauwe invoerstring zodat de owner vrij kan typen (komma toegestaan).
  const [kortingType, setKortingType] = useState<KortingType>("procent");
  const [kortingPct, setKortingPct] = useState("");
  const [kortingEuro, setKortingEuro] = useState("");
  const [kortingReden, setKortingReden] = useState("");
  // Geldigheid in dagen. Default = tenant-instelling (hieronder opgehaald); de
  // owner kan het per offerte aanpassen. 14 is een neutrale beginwaarde tot de
  // tenant-default binnen is.
  const [geldigDagen, setGeldigDagen] = useState(14);
  // Bedrijfsnaam van de tenant (voor de verstuur-preview: "Team {bedrijf}").
  const [bedrijfsnaam, setBedrijfsnaam] = useState("Schoon Straatje");
  const [btw, setBtw] = useState<BtwKeuze>("21%");
  const [vrij, setVrij] = useState<VrijeRegel[]>([]);
  const [volgorde, setVolgorde] = useState<string[]>([]); // herorden-volgorde stap 3
  const [bericht, setBericht] = useState("");

  // Stap 4 — versturen. Default e-mail: WhatsApp-verzending is nog "Binnenkort"
  // (de bot verstuurt WhatsApp, niet de dashboard-code), dus niet selecteerbaar.
  const [kanaal, setKanaal] = useState<Kanaal>("email");

  // Oppervlakte stuurt de afgeleide hoeveelheden aan. Vrije invoer (≥0); de
  // invegen-m² en het voegzand worden uit de oppervlakte berekend, en
  // beschermlaag/onkruid volgen de oppervlakte zolang ze aan staan, zodat het
  // aanpassen van de m² ook hun m² bijwerkt.
  const dekkingFactor = pricing.voegzand_m2_per_zak > 0 ? pricing.voegzand_m2_per_zak : 5;

  const setM2 = (v: number) => {
    const nm = Math.max(0, v);
    setM2kaal(nm);
    // Voegzand-m² volgt de oppervlakte met behoud van de ingestelde verhouding:
    // nog niets verdeeld → 100% normaal; anders schaalt de bestaande verhouding
    // (bv. een handmatige 40/60) proportioneel mee, i.p.v. terug te springen
    // naar 50/50. De zakken volgen de nieuwe m²-verdeling (auto-suggest).
    const totaal = voegzandM2.normaal + voegzandM2.onkruidwerend;
    const next =
      totaal <= 0
        ? { normaal: nm, onkruidwerend: 0 }
        : {
            normaal: Math.round((voegzandM2.normaal / totaal) * nm),
            onkruidwerend: nm - Math.round((voegzandM2.normaal / totaal) * nm),
          };
    setVoegzandM2(next);
    setVoegzandZakken({
      normaal: Math.ceil(next.normaal / dekkingFactor),
      onkruidwerend: Math.ceil(next.onkruidwerend / dekkingFactor),
    });
    if (diensten["Beschermlaag"]) setBm2(nm);
    if (diensten["Preventieve onkruid"]) setOm2(nm);
  };

  // m² van één voegzandtype zetten via de eigen stepper + de zakken
  // auto-suggereren (de gebruiker kan de zakken daarna nog los aanpassen).
  const zetVoegzandM2Type = (type: "normaal" | "onkruidwerend", v: number) => {
    const m = Math.max(0, v);
    setVoegzandM2((vz) => ({ ...vz, [type]: m }));
    setVoegzandZakken((zk) => ({ ...zk, [type]: Math.ceil(m / dekkingFactor) }));
  };

  // ── Live berekening ──
  const zandPrijsN = parsePrijs(zandPrijzen.normaal);
  const zandPrijsO = parsePrijs(zandPrijzen.onkruidwerend);

  const regels = useMemo<Regel[]>(() => {
    const out: Regel[] = [];
    // Bewerkbaar prijs-veld + effectieve eenheidsprijs voor een regel met een
    // override-key. raw "" = prijslijst (prijsDefault); "0" = gratis. De
    // effectieve `prijs` voedt het regel-totaal én het live-totaal, zodat de
    // override identiek doorwerkt als op de server (computeRules: override ??
    // pricing.*).
    const prijsVeld = (key: string, prijsDefault: number) => {
      const raw = prijsOverrides[key] ?? "";
      const parsed = parsePrijs(raw);
      const heeftOverride = raw.trim() !== "" && Number.isFinite(parsed);
      return {
        prijs: heeftOverride ? parsed : prijsDefault,
        prijsDefault,
        prijsInvoer: raw,
        setPrijsInvoer: (v: string) =>
          setPrijsOverrides((p) => ({ ...p, [key]: v })),
      };
    };
    // Elke regel verschijnt pas als zijn dienst is aangeklikt én er een
    // hoeveelheid is ingevuld (geen lege €0-regels in de rail). Reinigen en
    // invegen staan los van elkaar; voegzand hoort bij invegen.
    // Reiniging (Schoon Straatje): vaste dagprijs onder 100 m², daarboven m² ×
    // tarief. De prijs komt uit de prijslijst, tenzij per-offerte overschreven.
    if (diensten["Reinigen"] && m2 > 0) {
      if (m2 < 100) {
        out.push({
          id: "oprit",
          naam: "Reiniging oppervlak (dagprijs)",
          qty: 1,
          unit: "dag",
          set: () => {},
          ...prijsVeld("reinigen_dagprijs", pricing.reinigen_dagprijs_onder_100m2),
        });
      } else {
        out.push({
          id: "oprit",
          naam: "Reiniging oppervlak",
          qty: m2,
          unit: "m²",
          set: (v) => setM2(v),
          ...prijsVeld("reiniging_per_m2", pricing.reiniging_per_m2),
        });
      }
    }
    // Voegzand per type (Schoon Straatje-logica): per actief type een
    // invegen-arbeidsregel (m² × arbeidstarief) plus een voegzand-productregel
    // (zakken = m² / dekkingsfactor, naar boven afgerond, × prijs per zak).
    if (diensten["Invegen"] && voegzandM2.normaal > 0) {
      out.push({
        id: "invegenN",
        naam: "Invegen normaal voegzand",
        qty: voegzandM2.normaal,
        unit: "m²",
        set: (v) => zetVoegzandM2Type("normaal", v),
        ...prijsVeld("invegenN", pricing.arbeid_invegen_normaal_per_m2),
      });
      if (voegzandZakken.normaal > 0)
        out.push({
          id: "zandN",
          naam: "Voegzand normaal (15 kg/zak)",
          qty: voegzandZakken.normaal,
          unit: "zak",
          prijs: zandPrijsN,
          set: (v) => setVoegzandZakken((zk) => ({ ...zk, normaal: Math.max(0, v) })),
          // Voegzand-prijs (per zak) is al per offerte instelbaar via zandPrijzen.
          prijsInvoer: zandPrijzen.normaal,
          setPrijsInvoer: (v) => setZandPrijzen((z) => ({ ...z, normaal: v })),
        });
    }
    if (diensten["Invegen"] && voegzandM2.onkruidwerend > 0) {
      out.push({
        id: "invegenO",
        naam: "Invegen onkruidwerend voegzand",
        qty: voegzandM2.onkruidwerend,
        unit: "m²",
        set: (v) => zetVoegzandM2Type("onkruidwerend", v),
        ...prijsVeld("invegenO", pricing.arbeid_invegen_onkruidwerend_per_m2),
      });
      if (voegzandZakken.onkruidwerend > 0)
        out.push({
          id: "zandO",
          naam: "Voegzand onkruidwerend (15 kg/zak)",
          qty: voegzandZakken.onkruidwerend,
          unit: "zak",
          prijs: zandPrijsO,
          set: (v) => setVoegzandZakken((zk) => ({ ...zk, onkruidwerend: Math.max(0, v) })),
          prijsInvoer: zandPrijzen.onkruidwerend,
          setPrijsInvoer: (v) => setZandPrijzen((z) => ({ ...z, onkruidwerend: v })),
        });
    }
    if (qty.rollen > 0)
      out.push({
        id: "rollen",
        naam: "Planten afschermen",
        qty: qty.rollen,
        unit: "rol",
        prijs: parsePrijs(rolPrijs),
        set: (v) => setQty((q) => ({ ...q, rollen: Math.max(0, v) })),
        // Rolprijs is al per offerte instelbaar via rolPrijs.
        prijsInvoer: rolPrijs,
        setPrijsInvoer: setRolPrijs,
      });
    if (diensten["Beschermlaag"])
      out.push({
        id: "bescherm",
        naam: "Beschermlaag aanbrengen",
        qty: bm2,
        unit: "m²",
        set: (v) => setBm2(Math.max(0, v)),
        ...prijsVeld("bescherm", pricing.beschermlaag_per_m2),
      });
    if (diensten["Preventieve onkruid"])
      out.push({
        id: "onkruid",
        naam: "Preventieve onkruidbehandeling",
        qty: om2,
        unit: "m²",
        set: (v) => setOm2(Math.max(0, v)),
        ...prijsVeld("onkruid", pricing.preventieve_onkruid_per_m2),
      });
    if (afstandKm != null && afstandKm > pricing.reiskosten_drempel_km) {
      // Reiskosten boven de gratis drempel, exact zoals de server (computeRules):
      // retour = (afstand - drempel) × 2, × prijs/km. Telt mee in het totaal maar
      // NIET in de korting/toeslag-grondslag (zie de calc hieronder).
      const km = afstandKm - pricing.reiskosten_drempel_km;
      const retourKm = Math.round(km * 2 * 100) / 100;
      out.push({
        id: "reiskosten",
        naam: `Reiskosten (${Math.round(afstandKm)} km enkele reis, retour)`,
        qty: retourKm,
        unit: "km",
        set: () => {},
        ...prijsVeld("reiskosten", pricing.reiskosten_per_km),
      });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m2, qty.rollen, voegzandM2.normaal, voegzandM2.onkruidwerend, voegzandZakken.normaal, voegzandZakken.onkruidwerend, zandPrijsN, zandPrijsO, rolPrijs, zandPrijzen, diensten, bm2, om2, pricing, afstandKm, prijsOverrides]);

  // Geordende lijst: vaste regels + vrije regels, volgens herorden-volgorde.
  const regelItems = useMemo<GeordendItem[]>(
    () => [
      ...regels.map((r) => ({ key: "r-" + r.id, regel: r }) as GeordendItem),
      ...vrij.map((v) => ({ key: "v-" + v.id, vrij: v }) as GeordendItem),
    ],
    [regels, vrij],
  );

  const orderedKeys = useMemo(() => {
    const known = volgorde.filter((k) => regelItems.some((i) => i.key === k));
    const rest = regelItems.map((i) => i.key).filter((k) => !volgorde.includes(k));
    return [...known, ...rest];
  }, [volgorde, regelItems]);

  const geordend = useMemo<GeordendItem[]>(
    () => orderedKeys.map((k) => regelItems.find((i) => i.key === k)!).filter(Boolean),
    [orderedKeys, regelItems],
  );

  /** Herschik op index: haal de regel op positie `van` weg en zet 'm op `naar`
   *  (1 omhoog of 1 omlaag). Echte verschuiving via splice, beide richtingen. */
  const herorden = (van: number, naar: number) => {
    if (naar < 0 || naar >= orderedKeys.length || van === naar) return;
    const ks = [...orderedKeys];
    const [verplaatst] = ks.splice(van, 1);
    ks.splice(naar, 0, verplaatst);
    setVolgorde(ks);
  };

  // Reiskosten tellen WEL mee in het eindtotaal maar NIET in de grondslag voor
  // korstmos-toeslag of korting (exact zoals computeTotals: diensten = subtotal
  // - reiskosten, korting/toeslag alleen over diensten).
  const reiskostenBedrag = regels
    .filter((r) => r.id === "reiskosten")
    .reduce((s, r) => s + r.qty * r.prijs, 0);
  const subDiensten =
    regels.filter((r) => r.id !== "reiskosten").reduce((s, r) => s + r.qty * r.prijs, 0) +
    vrij.reduce((s, v) => s + parsePrijs(v.bedrag), 0);
  const toeslag = korstmosToeslag ? subDiensten * 0.1 : 0;
  // Korting: percentage van (diensten + toeslag), óf een vast euro-bedrag gecapt
  // op datzelfde grondslag (nooit over reiskosten). Eén modus actief.
  const kortingNum = Math.min(100, Math.max(0, parsePrijs(kortingPct)));
  const korting =
    kortingType === "euro"
      ? Math.min(subDiensten + toeslag, Math.max(0, parsePrijs(kortingEuro)))
      : ((subDiensten + toeslag) * kortingNum) / 100;
  // Net-totaal (excl. BTW): diensten + korstmos-toeslag - korting + reiskosten.
  // De server (computeTotals) rekent identiek: BTW komt EROP, niet eruit. Zo is
  // het getoonde "Totaal incl. BTW" gelijk aan wat de offerte opslaat en mailt.
  const totaalExcl = subDiensten + toeslag - korting + reiskostenBedrag;
  const btwBedrag =
    btw === "21%" ? totaalExcl * 0.21 : btw === "9%" ? totaalExcl * 0.09 : 0;
  const totaal = totaalExcl + btwBedrag;

  // ── Auto-opslag als concept ──
  // Er is "inhoud" zodra er een klantnaam/bedrijf is, een hoeveelheid is
  // ingevuld, een dienst aanstaat of er een vrije regel/bericht is. Een leeg
  // (net geopend) formulier maken we bewust géén concept van, zodat de lijst
  // niet volloopt met lege offertes.
  const heeftInhoud =
    !!(klant && (klant.naam?.trim() || klant.bedrijf?.trim())) ||
    m2 > 0 ||
    bm2 > 0 ||
    om2 > 0 ||
    qty.rollen > 0 ||
    voegzandM2.normaal > 0 ||
    voegzandM2.onkruidwerend > 0 ||
    vrij.length > 0 ||
    bericht.trim().length > 0 ||
    Object.values(diensten).some(Boolean);

  const conceptLabel =
    klant?.bedrijf?.trim() || klant?.naam?.trim() || "Naamloos concept";

  useEffect(() => {
    // Niet de zojuist verstuurde offerte opnieuw als concept wegschrijven, en
    // pas opslaan zodra er inhoud is.
    if (verzonden || !heeftInhoud) return;
    const id = draftId ?? makeDraftId();
    if (!draftId) setDraftId(id);
    // Debounce: schrijf 500ms na de laatste wijziging, zodat snel typen niet
    // bij elke toetsaanslag naar localStorage gaat.
    const t = setTimeout(() => {
      upsertDraft({
        id,
        updatedAt: Date.now(),
        label: conceptLabel,
        totaal,
        state: {
          stap,
          zoek,
          klant,
          klantType,
          aiGebruikt,
          factuurZelfde,
          factuur,
          afstandKm,
          m2,
          qty,
          rolPrijs,
          voegzandM2,
          voegzandZakken,
          zandPrijzen,
          prijsOverrides,
          diensten,
          bm2,
          om2,
          groeneAanslag,
          kleur,
          korstmosConditie,
          onderhoudWeken,
          regelOpmerkingen,
          korstmosToeslag,
          kortingType,
          kortingPct,
          kortingEuro,
          kortingReden,
          geldigDagen,
          btw,
          vrij,
          volgorde,
          bericht,
          kanaal,
        },
      });
      setSavedAt(Date.now());
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    stap, zoek, klant, klantType, aiGebruikt, factuurZelfde, factuur, afstandKm,
    m2, qty, rolPrijs, voegzandM2, voegzandZakken, zandPrijzen, prijsOverrides, diensten, bm2,
    om2, groeneAanslag, kleur, korstmosConditie, onderhoudWeken, regelOpmerkingen, korstmosToeslag,
    kortingType, kortingPct, kortingEuro, kortingReden, geldigDagen, btw, vrij,
    volgorde, bericht, kanaal, totaal,
    verzonden, heeftInhoud, conceptLabel, draftId,
  ]);

  // Concepten-lijst verversen telkens als het paneel opent (en bij mount).
  useEffect(() => {
    if (conceptenOpen) setDrafts(listDrafts());
  }, [conceptenOpen]);

  // Laad een bestaand concept terug in de wizard. setM2kaal i.p.v. setM2 zodat
  // de exacte opgeslagen voegzand-verdeling blijft staan (setM2 herrekent die).
  const laadConcept = (d: OfferteDraft) => {
    const s = d.state;
    setStap(s.stap);
    setZoek(s.zoek);
    setKlant(s.klant);
    setKlantType(s.klantType);
    setAiGebruikt(s.aiGebruikt);
    setFactuurZelfde(s.factuurZelfde);
    setFactuur(s.factuur);
    setAfstandKm(s.afstandKm);
    setM2kaal(s.m2);
    setQty(s.qty);
    setRolPrijs(s.rolPrijs);
    setVoegzandM2(s.voegzandM2);
    setVoegzandZakken(s.voegzandZakken);
    setZandPrijzen(s.zandPrijzen);
    // Oudere concepten zonder prijs-overrides → lege map (prijslijst).
    setPrijsOverrides(s.prijsOverrides ?? {});
    setDiensten(s.diensten);
    setBm2(s.bm2);
    setOm2(s.om2);
    setGroeneAanslag(s.groeneAanslag);
    setKleur(s.kleur);
    setKorstmosConditie(s.korstmosConditie);
    setOnderhoudWeken(s.onderhoudWeken);
    // Oudere concepten zonder opmerkingen → lege map.
    setRegelOpmerkingen(s.regelOpmerkingen ?? {});
    setKorstmosToeslag(s.korstmosToeslag);
    // Korting-modus + beide waarden; oudere concepten zonder deze velden vallen
    // terug op percentage-modus en de tenant-default-geldigheid.
    setKortingType(s.kortingType ?? "procent");
    setKortingPct(s.kortingPct);
    setKortingEuro(s.kortingEuro ?? "");
    setKortingReden(s.kortingReden);
    if (typeof s.geldigDagen === "number" && s.geldigDagen > 0) setGeldigDagen(s.geldigDagen);
    setBtw(s.btw);
    setVrij(s.vrij);
    setVolgorde(s.volgorde);
    setBericht(s.bericht);
    setKanaal(s.kanaal);
    setDraftId(d.id);
    setSavedAt(d.updatedAt);
    setVerzonden(false);
    setFout(null);
    setServerTotaal(null);
    setConceptenOpen(false);
  };

  // Begin een vers, leeg concept (alles terug naar de begintoestand).
  const nieuwLeegConcept = () => {
    setStap(0);
    setZoek("");
    setKlant(null);
    setKlantType("Particulier");
    setAiGebruikt(false);
    setFactuurZelfde(true);
    setFactuur({ straat: "", nr: "", postcode: "", plaats: "" });
    setAfstandKm(null);
    setM2kaal(0);
    setQty({ invegen: 0, rollen: 0 });
    setRolPrijs(PRIJZEN.rol);
    setVoegzandM2({ normaal: 0, onkruidwerend: 0 });
    setVoegzandZakken({ normaal: 0, onkruidwerend: 0 });
    setZandPrijzen({
      normaal: naarKomma(pricing.voegzand_normaal_per_zak),
      onkruidwerend: naarKomma(pricing.voegzand_onkruidwerend_per_zak),
    });
    setPrijsOverrides({});
    setDiensten({ ...DIENSTEN_INIT });
    setBm2(0);
    setOm2(0);
    setGroeneAanslag(false);
    setKleur("Naturel");
    setKorstmosConditie(false);
    setOnderhoudWeken(8);
    setRegelOpmerkingen({});
    setKorstmosToeslag(false);
    setKortingType("procent");
    setKortingPct("");
    setKortingEuro("");
    setKortingReden("");
    setBtw("21%");
    setVrij([]);
    setVolgorde([]);
    setBericht("");
    setKanaal("email");
    setDraftId(null);
    setSavedAt(null);
    setVerzonden(false);
    setFout(null);
    setServerTotaal(null);
    setConceptenOpen(false);
  };

  // Verwijder een concept uit de lijst (en uit de wizard als het de actieve was).
  const verwijderConcept = (id: string) => {
    removeDraft(id);
    setDrafts(listDrafts());
    if (id === draftId) nieuwLeegConcept();
  };

  const klantOk = !!(klant && klant.naam && klant.naam.trim());
  const naarStap = (i: number) => {
    if (i === 0 || klantOk) setStap(i);
  };

  // Korstmos in stap 2 koppelt de toeslag in stap 3.
  const setKorstmos = (waarde: boolean) => {
    setKorstmosConditie(waarde);
    setKorstmosToeslag(waarde);
  };

  // AI-plak: vul de wizard-state met de door de AI herkende velden
  // (extractFieldsFromMessage). Alleen niet-lege velden overschrijven, de AI
  // laat onbekende velden null, zodat al ingevulde gegevens blijven staan.
  // Telefoon blijft rauw; de blur in StapKlant normaliseert 'm naar +316.
  const applyAiExtracted = (f: ExtractedFields) => {
    setKlant((prev) => {
      const base = prev ?? LEGE_KLANT;
      return {
        ...base,
        naam: f.naam ?? base.naam,
        bedrijf: f.bedrijf ?? base.bedrijf,
        tel: f.telefoon ?? base.tel,
        email: f.email ?? base.email,
        postcode: f.postcode ?? base.postcode,
        nr: f.huisnummer ?? base.nr,
        straat: f.straat ?? base.straat,
        plaats: f.plaats ?? base.plaats,
        nieuw: true,
      };
    });
    setAiGebruikt(true);

    // Afwijkend factuuradres (alleen als de AI een apart factuuradres vond).
    if (f.factuur_postcode || f.factuur_huisnummer) {
      setFactuurZelfde(false);
      setFactuur({
        straat: f.factuur_straat ?? "",
        nr: f.factuur_huisnummer ?? "",
        postcode: f.factuur_postcode ?? "",
        plaats: f.factuur_plaats ?? "",
      });
    }

    // Werk.
    if (f.m2 != null) setM2(f.m2);
    // AI levert het aantal zakken; reken dat terug naar m² (× dekkingsfactor)
    // voor de m²-per-type-invoer.
    const vzDekking = pricing.voegzand_m2_per_zak > 0 ? pricing.voegzand_m2_per_zak : 5;
    const zn = f.voegzand_normaal_zakken;
    if (zn != null && zn > 0) setVoegzandM2((z) => ({ ...z, normaal: Math.round(zn * vzDekking) }));
    const zo = f.voegzand_onkruidwerend_zakken;
    if (zo != null && zo > 0) setVoegzandM2((z) => ({ ...z, onkruidwerend: Math.round(zo * vzDekking) }));
    const rollen = f.planten_afschermen_rollen;
    if (rollen != null) setQty((q) => ({ ...q, rollen }));
    if (f.sub_diensten.includes("beschermlaag"))
      setDiensten((d) => ({ ...d, Beschermlaag: true }));
    if (f.sub_diensten.includes("preventieve_onkruid"))
      setDiensten((d) => ({ ...d, "Preventieve onkruid": true }));
    if (f.kleur_naturel && f.kleur_antraciet) setKleur("Allebei");
    else if (f.kleur_antraciet) setKleur("Antraciet");
    else if (f.kleur_naturel) setKleur("Naturel");
    if (f.groene_aanslag != null) setGroeneAanslag(f.groene_aanslag);
    if (f.korstmos) setKorstmos(true);

    // Offerte.
    if (f.korting_percentage != null) setKortingPct(String(f.korting_percentage));
    if (f.korting_omschrijving) setKortingReden(f.korting_omschrijving);
    if (f.kanaal === "mail") setKanaal("email");
    if (f.wensen) setBericht(f.wensen);
  };

  // Bij sluiten: terug naar de eerste stap en uit de verzonden-staat, zodat
  // een volgende keer openen schoon op stap "Klant" begint (de prototype
  // her-mountte de modal volledig).
  const handleClose = () => {
    onClose();
    setConceptenOpen(false);
    setFout(null);
    if (verzonden) {
      // Net verstuurd: het concept is al verwijderd, begin schoon zodat een
      // volgende keer openen een leeg formulier toont.
      nieuwLeegConcept();
    }
    // Niet-verstuurd: laat de in-memory state (en het autosave-concept) staan,
    // zodat heropenen naadloos verdergaat waar je was.
  };

  // Verstuur-stap: map de wizard-state → ManualOfferteData en roep de
  // bestaande server-action createManualLeadEnOfferte() aan. Bij succes tonen
  // we de verzonden-staat met het server-totaal; bij fout een inline melding.
  const handleVerstuur = () => {
    if (bezig) return;
    setFout(null);

    // E-mailkanaal-gate: zelfde isValidEmail-eis als de bestaande app
    // (StepKlant). Zonder geldig adres slaat de server-action de mail-
    // verzending stilzwijgend over en zou de wizard "verstuurd via e-mail"
    // tonen terwijl er niets ging. Blokkeer dat hier met een inline-fout.
    if (kanaal === "email" && !isValidEmail(klant?.email ?? "")) {
      setFout(
        "Vul een geldig e-mailadres in bij de klant om via e-mail te versturen, of kies een ander kanaal.",
      );
      return;
    }

    // Vrije meerwerk-regels → extra_arbeid. De server kent geen vaste-euro
    // regel, alleen arbeid per minuut, dus reken het euro-totaal met het live
    // tarief terug naar (whole) minuten bij 1 persoon. Whole-minute-afronding
    // kan een paar cent schelen (gedocumenteerde follow-up); het meerwerk
    // verdwijnt zo niet meer stilzwijgend uit het opgeslagen totaal.
    const vrijSom = vrij.reduce((s, v) => s + parsePrijs(v.bedrag), 0);
    const perMin = pricing.extra_arbeid_per_min > 0 ? pricing.extra_arbeid_per_min : 1;
    const extraMinuten = vrijSom > 0 ? Math.round(vrijSom / perMin) : 0;
    const vrijOmschrijving = vrij
      .map((v) => v.naam.trim())
      .filter(Boolean)
      .join("; ");
    const extraArbeid =
      extraMinuten > 0
        ? { minuten: extraMinuten, personen: 1, omschrijving: vrijOmschrijving || "Meerwerk" }
        : { minuten: 0, personen: 0, omschrijving: "" };

    const payload = mapWizardToManualOfferte({
      klant,
      factuurZelfde,
      factuur,
      m2,
      qty,
      rolPrijs,
      voegzandM2,
      voegzandZakken,
      voegzandDekking: pricing.voegzand_m2_per_zak > 0 ? pricing.voegzand_m2_per_zak : 5,
      zandPrijzen,
      prijsOverrides,
      diensten,
      groeneAanslag,
      kleur,
      korstmosConditie,
      kortingType,
      kortingPct,
      kortingEuro,
      kortingReden,
      geldigheidDagen: geldigDagen,
      bericht,
      kanaal,
      afstandKm,
      extraArbeid,
      bm2,
      om2,
      regelOpmerkingen,
    });
    startVerstuur(async () => {
      try {
        const res = await createManualLeadEnOfferte(payload);
        if (res.ok && res.mailError) {
          // Offerte is opgeslagen maar de mail faalde: blijf op het formulier
          // met een inline melding (geen verzonden-staat, die zou suggereren
          // dat de klant 'm heeft) zodat de owner 'm alsnog kan nasturen.
          setServerTotaal(res.total);
          setFout(`Offerte opgeslagen, maar de mail mislukte: ${res.mailError}. Verstuur 'm zelf vanuit het dossier.`);
        } else if (res.ok) {
          setServerTotaal(res.total);
          // "Download PDF" → server gaf de PDF als base64 terug; download 'm.
          if (res.pdfBase64) {
            downloadPdfFromBase64(
              res.pdfBase64,
              `offerte-${res.offertenummer ?? "schoon-straatje"}.pdf`,
            );
          }
          // Verstuurd/gedownload → het is nu een echte offerte, geen concept meer.
          if (draftId) {
            removeDraft(draftId);
            setDraftId(null);
          }
          setVerzonden(true);
        } else {
          setFout(res.error);
        }
      } catch (e) {
        // requireApprovedUser() gooit een NEXT_REDIRECT bij niet-ingelogd; die
        // laat Next zelf afhandelen (re-throw). Andere fouten tonen we inline.
        if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
        const msg =
          typeof e === "object" && e !== null && "digest" in e &&
          typeof (e as { digest?: unknown }).digest === "string" &&
          (e as { digest: string }).digest.startsWith("NEXT_REDIRECT")
            ? null
            : "Er ging iets mis bij het versturen, probeer het opnieuw.";
        if (msg === null) throw e;
        setFout(msg);
      }
    });
  };

  return (
    <Modal open={open} onClose={handleClose} width={1150} label="Handmatige offerte">
      <div className={styles.shell}>
        {verzonden ? (
          <OfferteVerzonden
            totaal={serverTotaal ?? totaal}
            klant={klant}
            kanaal={kanaal}
            geldigDagen={geldigDagen}
            onClose={handleClose}
            onNaarLeads={onNaarLeads}
          />
        ) : (
          <>
            {/* Concepten-knop + paneel, links van de sluit-X (die levert de Modal). */}
            <div className={styles.conceptenWrap}>
              <button
                type="button"
                className={styles.conceptenBtn}
                onClick={() => setConceptenOpen((o) => !o)}
                aria-expanded={conceptenOpen}
                title="Openstaande concepten"
              >
                <FileStack size={14} strokeWidth={2.5} />
                <span>Concepten</span>
                {drafts.length > 0 ? (
                  <span className={styles.conceptenCount}>{drafts.length}</span>
                ) : null}
              </button>
              {conceptenOpen ? (
                <>
                  <div
                    className={styles.conceptenScrim}
                    onClick={() => setConceptenOpen(false)}
                    aria-hidden="true"
                  />
                  <div className={styles.conceptenPaneel} role="dialog" aria-label="Openstaande concepten">
                    <div className={styles.conceptenKop}>
                      <span>Openstaande concepten</span>
                      <button
                        type="button"
                        className={styles.conceptenNieuw}
                        onClick={nieuwLeegConcept}
                      >
                        <Plus size={13} strokeWidth={2.5} /> Nieuw leeg
                      </button>
                    </div>
                    {drafts.length === 0 ? (
                      <div className={styles.conceptenLeeg}>
                        Nog geen openstaande concepten. Zodra je begint met invullen,
                        bewaren we het hier automatisch.
                      </div>
                    ) : (
                      <ul className={styles.conceptenLijst}>
                        {drafts.map((d) => (
                          <li
                            key={d.id}
                            className={`${styles.conceptItem} ${d.id === draftId ? styles.conceptActief : ""}`}
                          >
                            <button
                              type="button"
                              className={styles.conceptOpen}
                              onClick={() => laadConcept(d)}
                            >
                              <span className={styles.conceptNaam}>{d.label}</span>
                              <span className={styles.conceptMeta}>
                                {d.totaal > 0 ? `${fmtEuro(d.totaal)} · ` : ""}
                                {formatLaatstBewerkt(d.updatedAt)}
                                {d.id === draftId ? " · nu open" : ""}
                              </span>
                            </button>
                            <button
                              type="button"
                              className={styles.conceptVerwijder}
                              onClick={() => verwijderConcept(d.id)}
                              title="Concept verwijderen"
                              aria-label={`Concept ${d.label} verwijderen`}
                            >
                              <Trash2 size={14} strokeWidth={2.5} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              ) : null}
            </div>

            {/* Kop */}
            <div className={styles.head}>
              <div className={styles.headIcon} aria-hidden="true">
                <Pencil size={16} strokeWidth={2.5} />
              </div>
              <div className={styles.headText}>
                <div className={styles.headTitleRow}>
                  <span className={styles.headTitle}>Handmatige offerte</span>
                  <span className={styles.conceptPill}>Concept</span>
                  <span className={styles.saved}>
                    <span className={styles.savedDot} aria-hidden="true" />
                    {savedAt ? `opgeslagen ${formatLaatstBewerkt(savedAt)}` : "automatisch opgeslagen"}
                  </span>
                </div>
                <div className={styles.headSub}>
                  Voor een klant die je telefonisch sprak, Surface verstuurt &apos;m via WhatsApp of mail
                </div>
              </div>
            </div>

            {/* Klikbare stepper */}
            <Stepper stappen={STAPPEN} stap={stap} klantOk={klantOk} onJump={naarStap} />

            {/* Inline foutmelding van de server-action (versturen mislukt of
                mail-fout). Verzonden-staat verschijnt alleen bij res.ok. */}
            {fout ? (
              <div
                role="alert"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  margin: "0 20px 4px",
                  padding: "8px 12px",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--rb-danger, #b42318)",
                  background: "var(--rb-danger-soft, #fef3f2)",
                  border: "1px solid var(--rb-danger-border, #fecdca)",
                }}
              >
                <TriangleAlert size={14} strokeWidth={2.5} aria-hidden="true" />
                {fout}
              </div>
            ) : null}

            {/* Body: stap-inhoud + sticky rail */}
            <div className={styles.body}>
              <div className={styles.content}>
                {stap === 0 ? (
                  <StapKlant
                    zoek={zoek}
                    setZoek={setZoek}
                    klant={klant}
                    setKlant={setKlant}
                    klantType={klantType}
                    setKlantType={setKlantType}
                    aiGebruikt={aiGebruikt}
                    setAiGebruikt={setAiGebruikt}
                    factuurZelfde={factuurZelfde}
                    setFactuurZelfde={setFactuurZelfde}
                    factuur={factuur}
                    setFactuur={setFactuur}
                    setAfstandKm={setAfstandKm}
                    onAiExtracted={applyAiExtracted}
                  />
                ) : null}
                {stap === 1 ? (
                  <StapWerk
                    m2={m2}
                    setM2={setM2}
                    qty={qty}
                    setQty={setQty}
                    rolPrijs={rolPrijs}
                    setRolPrijs={setRolPrijs}
                    voegzandM2={voegzandM2}
                    zetVoegzandM2={zetVoegzandM2Type}
                    voegzandZakken={voegzandZakken}
                    setVoegzandZakken={setVoegzandZakken}
                    zandPrijzen={zandPrijzen}
                    setZandPrijzen={setZandPrijzen}
                    zandPrijsN={zandPrijsN}
                    zandPrijsO={zandPrijsO}
                    arbeidNormaalPerM2={pricing.arbeid_invegen_normaal_per_m2}
                    arbeidOnkruidwerendPerM2={pricing.arbeid_invegen_onkruidwerend_per_m2}
                    diensten={diensten}
                    setDiensten={setDiensten}
                    bm2={bm2}
                    setBm2={setBm2}
                    om2={om2}
                    setOm2={setOm2}
                    groeneAanslag={groeneAanslag}
                    setGroeneAanslag={setGroeneAanslag}
                    kleur={kleur}
                    setKleur={setKleur}
                    korstmosConditie={korstmosConditie}
                    setKorstmos={setKorstmos}
                    onderhoudWeken={onderhoudWeken}
                    setOnderhoudWeken={setOnderhoudWeken}
                    afstandKm={afstandKm}
                    regelOpmerkingen={regelOpmerkingen}
                    zetOpmerking={zetOpmerking}
                  />
                ) : null}
                {stap === 2 ? (
                  <StapOfferte
                    geordend={geordend}
                    herorden={herorden}
                    vrij={vrij}
                    setVrij={setVrij}
                    kortingType={kortingType}
                    setKortingType={setKortingType}
                    kortingPct={kortingPct}
                    setKortingPct={setKortingPct}
                    kortingEuro={kortingEuro}
                    setKortingEuro={setKortingEuro}
                    kortingReden={kortingReden}
                    setKortingReden={setKortingReden}
                    geldigDagen={geldigDagen}
                    setGeldigDagen={setGeldigDagen}
                    btw={btw}
                    setBtw={setBtw}
                    bericht={bericht}
                    setBericht={setBericht}
                  />
                ) : null}
                {stap === 3 ? (
                  <StapVersturen
                    totaal={totaal}
                    kanaal={kanaal}
                    setKanaal={setKanaal}
                    klant={klant}
                    geldigDagen={geldigDagen}
                    bedrijfsnaam={bedrijfsnaam}
                    bericht={bericht}
                  />
                ) : null}
              </div>

              <OfferteRail
                stap={stap}
                setStap={naarStap}
                klant={klant}
                geordend={geordend}
                korstmosToeslag={korstmosToeslag}
                toeslag={toeslag}
                kortingType={kortingType}
                kortingPct={kortingPct}
                kortingReden={kortingReden}
                korting={korting}
                totaal={totaal}
                btw={btw}
                btwBedrag={btwBedrag}
                kanaal={kanaal}
                onVerstuur={handleVerstuur}
                onClose={handleClose}
              />
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
