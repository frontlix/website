"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Pencil, TriangleAlert } from "lucide-react";
import { Modal } from "@/components/dashboard/v2/ui";
import { createManualLeadEnOfferte } from "@/lib/dashboard/manual-offerte-actions";
import { getPricingForOffertePreview } from "@/lib/dashboard/pricing-actions";
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
  PRIJZEN,
  type OfferteKlant,
} from "./offerte-data";
import { parsePrijs } from "./offerte-utils";
import type {
  BtwKeuze,
  GeordendItem,
  Kanaal,
  Kleur,
  KlantType,
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

  // Live pricing-snapshot (zelfde bron als ManualOfferteModal). Nodig om de
  // vrije meerwerk-regels betrouwbaar naar de extra_arbeid-velden te vertalen:
  // de server rekent extra arbeid als minuten × per_min, dus we converteren
  // het euro-bedrag met deze tenant-tarief terug naar minuten zodat het
  // opgeslagen bedrag gelijk is aan wat de gebruiker zag.
  const [pricing, setPricing] = useState<ManualOffertePricing>(FALLBACK_PRICING);
  useEffect(() => {
    let cancelled = false;
    getPricingForOffertePreview().then((p) => {
      if (!cancelled) setPricing(p);
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

  // Stap 2 — werk
  const [m2, setM2kaal] = useState(80);
  const [qty, setQty] = useState({ invegen: 65, rollen: 2 });
  const [rolPrijs, setRolPrijs] = useState<string>(PRIJZEN.rol);
  const [zakken, setZakken] = useState({ normaal: 16, onkruidwerend: 0 });
  const [zandPrijzen, setZandPrijzen] = useState({
    normaal: PRIJZEN.zandNormaal as string,
    onkruidwerend: PRIJZEN.zandOnkruidwerend as string,
  });
  const [diensten, setDiensten] = useState<Record<string, boolean>>({ ...DIENSTEN_INIT });
  const [bm2, setBm2] = useState(80); // m² beschermlaag
  const [om2, setOm2] = useState(80); // m² preventieve onkruidbehandeling
  const [groeneAanslag, setGroeneAanslag] = useState(true);
  const [kleur, setKleur] = useState<Kleur>("Naturel");
  const [korstmosConditie, setKorstmosConditie] = useState(true);

  // Stap 3 — offerte (korstmos-toeslag komt uit stap 2)
  const [korstmosToeslag, setKorstmosToeslag] = useState(true);
  const [kortingPct, setKortingPct] = useState("5");
  const [kortingReden, setKortingReden] = useState("Via buurman, bestaande klant");
  const [btw, setBtw] = useState<BtwKeuze>("21%");
  const [vrij, setVrij] = useState<VrijeRegel[]>([
    { id: 1, naam: "Meerwerk: rij tegels recht leggen", bedrag: 45 },
  ]);
  const [volgorde, setVolgorde] = useState<string[]>([]); // herorden-volgorde stap 3
  const [bericht, setBericht] = useState(
    "Beste familie Bakker, zoals telefonisch besproken hierbij de offerte inclusief de korstmos-behandeling. We kunnen donderdag al starten.",
  );

  // Stap 4 — versturen
  const [kanaal, setKanaal] = useState<Kanaal>("whatsapp");

  // Oppervlakte stuurt regels + voegzand-suggestie aan.
  const setM2 = (v: number) => {
    const nm = Math.max(10, v);
    setM2kaal(nm);
    setQty((q) => ({ ...q, invegen: Math.max(0, nm - 15) }));
    setZakken((z) => ({ ...z, normaal: Math.round(nm / 5) }));
  };

  // ── Live berekening ──
  const zandPrijsN = parsePrijs(zandPrijzen.normaal);
  const zandPrijsO = parsePrijs(zandPrijzen.onkruidwerend);

  const regels = useMemo<Regel[]>(() => {
    const out: Regel[] = [
      { id: "oprit", naam: "Oprit reinigen", qty: m2, unit: "m²", prijs: PRIJZEN.oprit, set: (v) => setM2(v) },
      {
        id: "invegen",
        naam: "Opnieuw invegen",
        qty: qty.invegen,
        unit: "m²",
        prijs: PRIJZEN.invegen,
        set: (v) => setQty((q) => ({ ...q, invegen: Math.max(0, v) })),
      },
    ];
    if (zakken.normaal > 0)
      out.push({
        id: "zandN",
        naam: "Voegzand normaal",
        qty: zakken.normaal,
        unit: "zak",
        prijs: zandPrijsN,
        set: (v) => setZakken((z) => ({ ...z, normaal: Math.max(0, v) })),
      });
    if (zakken.onkruidwerend > 0)
      out.push({
        id: "zandO",
        naam: "Voegzand onkruidwerend",
        qty: zakken.onkruidwerend,
        unit: "zak",
        prijs: zandPrijsO,
        set: (v) => setZakken((z) => ({ ...z, onkruidwerend: Math.max(0, v) })),
      });
    if (qty.rollen > 0)
      out.push({
        id: "rollen",
        naam: "Planten afschermen",
        qty: qty.rollen,
        unit: "rol",
        prijs: parsePrijs(rolPrijs),
        set: (v) => setQty((q) => ({ ...q, rollen: Math.max(0, v) })),
      });
    if (diensten["Beschermlaag"])
      out.push({
        id: "bescherm",
        naam: "Beschermlaag aanbrengen",
        qty: bm2,
        unit: "m²",
        prijs: PRIJZEN.beschermlaag,
        set: (v) => setBm2(Math.max(0, v)),
      });
    if (diensten["Preventieve onkruid"])
      out.push({
        id: "onkruid",
        naam: "Preventieve onkruidbehandeling",
        qty: om2,
        unit: "m²",
        prijs: PRIJZEN.onkruid,
        set: (v) => setOm2(Math.max(0, v)),
      });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m2, qty.invegen, qty.rollen, zakken.normaal, zakken.onkruidwerend, zandPrijsN, zandPrijsO, rolPrijs, diensten, bm2, om2]);

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

  const sub =
    regels.reduce((s, r) => s + r.qty * r.prijs, 0) + vrij.reduce((s, v) => s + v.bedrag, 0);
  const toeslag = korstmosToeslag ? sub * 0.1 : 0;
  const kortingNum = Math.min(100, Math.max(0, parsePrijs(kortingPct)));
  const korting = ((sub + toeslag) * kortingNum) / 100;
  const totaal = sub + toeslag - korting;
  const btwBedrag =
    btw === "21%" ? (totaal * 21) / 121 : btw === "9%" ? (totaal * 9) / 109 : 0;

  const klantOk = !!(klant && klant.naam && klant.naam.trim());
  const naarStap = (i: number) => {
    if (i === 0 || klantOk) setStap(i);
  };

  // Korstmos in stap 2 koppelt de toeslag in stap 3.
  const setKorstmos = (waarde: boolean) => {
    setKorstmosConditie(waarde);
    setKorstmosToeslag(waarde);
  };

  // Bij sluiten: terug naar de eerste stap en uit de verzonden-staat, zodat
  // een volgende keer openen schoon op stap "Klant" begint (de prototype
  // her-mountte de modal volledig).
  const handleClose = () => {
    onClose();
    setStap(0);
    setVerzonden(false);
    setFout(null);
    setServerTotaal(null);
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
    const vrijSom = vrij.reduce((s, v) => s + (Number(v.bedrag) || 0), 0);
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
      zakken,
      zandPrijzen,
      diensten,
      groeneAanslag,
      kleur,
      korstmosConditie,
      kortingPct,
      kortingReden,
      bericht,
      kanaal,
      afstandKm,
      extraArbeid,
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
            onClose={handleClose}
            onNaarLeads={onNaarLeads}
          />
        ) : (
          <>
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
                    <span className={styles.savedDot} aria-hidden="true" /> automatisch opgeslagen
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
                    zakken={zakken}
                    setZakken={setZakken}
                    zandPrijzen={zandPrijzen}
                    setZandPrijzen={setZandPrijzen}
                    zandPrijsN={zandPrijsN}
                    zandPrijsO={zandPrijsO}
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
                  />
                ) : null}
                {stap === 2 ? (
                  <StapOfferte
                    geordend={geordend}
                    herorden={herorden}
                    vrij={vrij}
                    setVrij={setVrij}
                    kortingPct={kortingPct}
                    setKortingPct={setKortingPct}
                    kortingReden={kortingReden}
                    setKortingReden={setKortingReden}
                    btw={btw}
                    setBtw={setBtw}
                    bericht={bericht}
                    setBericht={setBericht}
                  />
                ) : null}
                {stap === 3 ? (
                  <StapVersturen totaal={totaal} kanaal={kanaal} setKanaal={setKanaal} klant={klant} />
                ) : null}
              </div>

              <OfferteRail
                stap={stap}
                setStap={naarStap}
                klant={klant}
                geordend={geordend}
                korstmosToeslag={korstmosToeslag}
                toeslag={toeslag}
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
