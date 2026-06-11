// ─────────────────────────────────────────────────────────────────────
// Offerte-wizard — mappers tussen de echte (app)-databron/server-action en
// de v2-wizard-state. GEEN 'use client'/'use server': pure functies die de
// client-wizard importeert.
//
//  - mapMatchToKlant()       → ExistingClientMatch (echte lead-zoeker) → OfferteKlant
//  - mapWizardToManualOffer() → v2-wizard-state → ManualOfferteData
//
// De v2-look + prop-vormen blijven onaangeraakt; deze module vertaalt alleen
// de databron en de submit-payload naar de bestaande server-action
// createManualLeadEnOfferte().
// ─────────────────────────────────────────────────────────────────────

import type { ExistingClientMatch } from "@/lib/dashboard/manual-offerte-search";
import { DEFAULTS, type ManualOfferteData } from "@/lib/dashboard/manual-offerte-types";
import { parsePrijs } from "./offerte-utils";
import type { OfferteKlant } from "./offerte-data";
import type { Kanaal, Kleur } from "./types";

/** Initialen uit een naam ("Familie Bakker" → "FB", "Jan" → "JA"). */
function initialsFromNaam(naam: string): string {
  const parts = naam.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "★";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Korte context-subregel voor de zoekdropdown (adres + waarde indien bekend). */
function klantSub(m: ExistingClientMatch): string {
  const adres = [m.straat, m.huisnummer].filter(Boolean).join(" ");
  const adresFull = [adres, m.postcode, m.plaats].filter(Boolean).join(" · ");
  if (m.totaal_prijs && Number(m.totaal_prijs) > 0) {
    const waarde = `EUR ${Math.round(Number(m.totaal_prijs))}`;
    return adresFull ? `${adresFull} · ${waarde}` : `eerdere offerte (${waarde})`;
  }
  return adresFull || "nog geen offertes";
}

/**
 * Echte zoek-hit → wizard-klant. Bewaart `lead_id` zodat de submit de
 * offerte onder de bestaande lead hangt (createManualLeadEnOfferte gebruikt
 * data.existing_lead_id). De prop-vorm van OfferteKlant blijft gelijk;
 * `lead_id` is een additief optioneel veld.
 */
export function mapMatchToKlant(m: ExistingClientMatch): OfferteKlant {
  const naam = m.naam || m.bedrijfsnaam || "—";
  return {
    naam,
    bedrijf: m.bedrijfsnaam ?? "",
    straat: m.straat ?? "",
    nr: m.huisnummer ?? "",
    postcode: m.postcode ?? "",
    plaats: m.plaats ?? "",
    tel: m.telefoon ?? "",
    email: m.email ?? "",
    sub: klantSub(m),
    initials: initialsFromNaam(naam),
    bestaand: true,
    lead_id: m.lead_id,
  };
}

/** v2-kleurkeuze → de twee losse booleans die ManualOfferteData verwacht. */
function kleurToBooleans(kleur: Kleur): { naturel: boolean; antraciet: boolean } {
  return {
    naturel: kleur === "Naturel" || kleur === "Allebei",
    antraciet: kleur === "Antraciet" || kleur === "Allebei",
  };
}

/**
 * v2-kanaal → SendKanaal. Alleen 'mail' (PDF + e-mail-verzending) en 'manual'
 * bestaan server-side; WhatsApp-verzending vereist nog goedgekeurde
 * Meta-templates en valt daarom op 'manual' terug (offerte wordt opgeslagen,
 * de owner verstuurt 'm zelf via het gesprek). PDF-download is ook 'manual'.
 */
function kanaalToSend(kanaal: Kanaal): ManualOfferteData["kanaal"] {
  return kanaal === "email" ? "mail" : "manual";
}

/** Alle wizard-state die nodig is om een ManualOfferteData te bouwen. */
export interface WizardSubmitState {
  klant: OfferteKlant | null;
  factuurZelfde: boolean;
  factuur: { straat: string; nr: string; postcode: string; plaats: string };
  m2: number;
  qty: { invegen: number; rollen: number };
  rolPrijs: string;
  zakken: { normaal: number; onkruidwerend: number };
  zandPrijzen: { normaal: string; onkruidwerend: string };
  diensten: Record<string, boolean>;
  groeneAanslag: boolean;
  kleur: Kleur;
  korstmosConditie: boolean;
  kortingPct: string;
  kortingReden: string;
  bericht: string;
  kanaal: Kanaal;
  /** Echte enkele-reis-afstand uit de geocode (km). `null` ⇒ onbekend; dan
   *  geven we afstand_km: 0 mee zodat er nooit een onbedoelde reiskosten-regel
   *  ontstaat (i.p.v. de DEFAULTS-25 die de oude mapper liet staan). */
  afstandKm: number | null;
  /** Vrije meerwerk-regels (omschrijving + euro). Worden via de extra_arbeid-
   *  velden gepersisteerd; de wizard heeft het euro-bedrag al naar minuten
   *  vertaald met het live tarief, zie extraArbeid hieronder. */
  extraArbeid: {
    minuten: number;
    personen: number;
    omschrijving: string;
  };
}

/**
 * v2-wizard-state → ManualOfferteData. De server-action recomputet de regels
 * + totalen zelf (computeRules/computeTotals + getManualOffertePricing), dus
 * we leveren hier de invoervelden, niet de uitgerekende bedragen. De
 * v2-"Live totaal"-rail blijft een display-schatting; de opgeslagen offerte
 * volgt de server-side prijslijst (bewuste afwijking, zie oplevering).
 *
 * Bewuste keuzes (server-action ondersteunt deze niet, dus de UI is hierop
 * afgestemd zodat opgeslagen == getoond):
 *  - BTW: computeTotals rekent altijd 21%. De v2-UI pint BTW daarom op 21%
 *    (9%/0%/Verlegd zijn disabled in StapOfferte). Volle BTW-keuze is een
 *    follow-up (vereist btw_pct in payload + computeTotals).
 *  - Korting: alleen percentage wordt doorgegeven (korting_percentage). Het
 *    vaste-euro veld korting_bedrag wordt door de v2-UI niet aangeboden, dus
 *    er ontstaat geen divergentie; we laten korting_bedrag op DEFAULTS (0).
 *  - Vrije meerwerk-regels worden via de extra_arbeid-velden gepersisteerd
 *    (zie WizardSubmitState.extraArbeid). De wizard heeft het euro-bedrag al
 *    met het live per-minuut-tarief naar minuten omgerekend; door whole-minute
 *    afronding kan een paar cent verschil ontstaan (gedocumenteerde follow-up),
 *    maar het meerwerk verdwijnt niet langer stilzwijgend uit het totaal.
 */
export function mapWizardToManualOfferte(s: WizardSubmitState): ManualOfferteData {
  const k = s.klant;
  const m2 = Math.max(0, Number(s.m2) || 0);
  const { naturel, antraciet } = kleurToBooleans(s.kleur);

  // Diensten-chips → sub-diensten. "Reinigen + invegen" staat altijd aan.
  const sub: ManualOfferteData["sub"] = ["invegen"];
  if (s.diensten["Beschermlaag"]) sub.push("beschermlaag");
  if (s.diensten["Preventieve onkruid"]) sub.push("preventieve_onkruid");
  if (s.diensten["Onderhoudsabonnement"]) sub.push("onderhoud");

  // Hoofdcategorie afgeleid uit de gekozen sub-diensten zodat de lead-kolom
  // klopt (oprit/terras voor invegen/beschermlaag, onkruidbeheersing voor
  // preventief/onderhoud).
  const hoofd: ManualOfferteData["hoofdcategorie"] = [];
  if (sub.includes("invegen") || sub.includes("beschermlaag")) {
    hoofd.push("oprit_terras_terrein");
  }
  if (sub.includes("preventieve_onkruid") || sub.includes("onderhoud")) {
    hoofd.push("onkruidbeheersing");
  }

  const voegzandNormaalActief = Number(s.zakken.normaal) > 0;
  const voegzandOnkruidwerendActief = Number(s.zakken.onkruidwerend) > 0;
  const plantenActief = Number(s.qty.rollen) > 0;

  return {
    ...DEFAULTS,
    existing_lead_id: k?.lead_id ?? null,
    // klant
    naam: (k?.naam ?? "").trim(),
    bedrijf: (k?.bedrijf ?? "").trim(),
    telefoon: (k?.tel ?? "").trim(),
    email: (k?.email ?? "").trim(),
    straat: (k?.straat ?? "").trim(),
    huisnummer: (k?.nr ?? "").trim(),
    postcode: (k?.postcode ?? "").trim(),
    plaats: (k?.plaats ?? "").trim(),
    // factuur
    factuur_zelfde: s.factuurZelfde,
    factuur_straat: s.factuur.straat.trim(),
    factuur_huisnummer: s.factuur.nr.trim(),
    factuur_postcode: s.factuur.postcode.trim(),
    factuur_plaats: s.factuur.plaats.trim(),
    // werk
    hoofdcategorie: hoofd,
    sub,
    m2,
    // voegzand — m² per type = totale m² (de rules-engine gebruikt dit voor
    // de invegen-arbeidsregel; de v2-UI splitst m² niet per voegzandtype).
    voegzand_normaal_actief: voegzandNormaalActief,
    voegzand_normaal_m2: voegzandNormaalActief ? m2 : 0,
    voegzand_normaal_zakken: Number(s.zakken.normaal) || 0,
    voegzand_normaal_prijs: parsePrijs(s.zandPrijzen.normaal),
    voegzand_onkruidwerend_actief: voegzandOnkruidwerendActief,
    voegzand_onkruidwerend_m2: voegzandOnkruidwerendActief ? m2 : 0,
    voegzand_onkruidwerend_zakken: Number(s.zakken.onkruidwerend) || 0,
    voegzand_onkruidwerend_prijs: parsePrijs(s.zandPrijzen.onkruidwerend),
    // kleur
    kleur_naturel: naturel,
    kleur_antraciet: antraciet,
    // overige
    groene_aanslag: s.groeneAanslag ? "ja" : "nee",
    korstmos: s.korstmosConditie ? "ja" : "nee",
    // Echte afstand uit de geocode; onbekend ⇒ 0 (nooit DEFAULTS-25, anders
    // zou een tenant met lage reiskosten-drempel een onbedoelde regel krijgen).
    afstand_km: s.afstandKm != null && s.afstandKm > 0 ? s.afstandKm : 0,
    // plantenafscherming
    planten_afschermen_actief: plantenActief,
    planten_afschermen_rollen: Number(s.qty.rollen) || 0,
    planten_afschermen_prijs: parsePrijs(s.rolPrijs),
    // offerte
    korting_percentage: Math.min(100, Math.max(0, parsePrijs(s.kortingPct))),
    korting_omschrijving: s.kortingReden.trim(),
    // Vrije meerwerk-regels → extra_arbeid. computeRules voegt deze regel
    // alleen toe als minuten > 0 én personen > 0.
    extra_arbeid_minuten: Math.max(0, Math.round(s.extraArbeid.minuten)),
    extra_arbeid_personen: Math.max(0, Math.round(s.extraArbeid.personen)),
    extra_arbeid_omschrijving: s.extraArbeid.omschrijving.trim(),
    // verzending
    notitie: s.bericht.trim(),
    kanaal: kanaalToSend(s.kanaal),
  };
}
