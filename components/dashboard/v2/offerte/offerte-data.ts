// ─────────────────────────────────────────────────────────────────────
// Offerte-wizard — pagina-eigen demo-data.
//
// Prijzen, diensten en bestaande klanten voor de handmatige offerte-wizard.
// Bron: POfferte.jsx + POfferteStappen.jsx uit de design-handoff. Prijzen
// zijn incl. BTW (particulier). Klantzoeker gebruikt LEADS uit de gedeelde
// demo-data als "bestaande klanten", aangevuld met een paar offerte-klanten
// uit het prototype.
// ─────────────────────────────────────────────────────────────────────

import { LEADS } from "../demo-data";

/** Een klant in de offerte-wizard (kan bestaand of nieuw zijn). */
export interface OfferteKlant {
  naam: string;
  bedrijf: string;
  straat: string;
  nr: string;
  postcode: string;
  plaats: string;
  tel: string;
  email: string;
  /** Subregel in de zoekdropdown (bv. "offerte open (€395)"). */
  sub?: string;
  initials: string;
  /** Bestaande klant uit de database (toont "automatisch"-label). */
  bestaand?: boolean;
  /** Lead-id van de gekoppelde, echte lead (uit de klantzoeker). Zet de
   *  submit op "bestaande lead bijwerken" i.p.v. nieuwe lead aanmaken. */
  lead_id?: string;
  /** Nieuw aangemaakt tijdens deze sessie. */
  nieuw?: boolean;
  /** Adres is via postcode-autofill ingevuld. */
  autoAdres?: boolean;
}

/** Vaste offerte-klanten uit het prototype. */
const PROTO_KLANTEN: OfferteKlant[] = [
  {
    naam: "Familie Bakker",
    bedrijf: "",
    straat: "Dorpsstraat",
    nr: "41",
    postcode: "3811 KE",
    plaats: "Amersfoort",
    tel: "06 23 45 67 81",
    email: "",
    sub: "1 eerdere offerte (2024 · €380)",
    initials: "FB",
    bestaand: true,
  },
  {
    naam: "R. Bakker",
    bedrijf: "Bakker Hoveniers",
    straat: "Birkstraat",
    nr: "8",
    postcode: "3768 HD",
    plaats: "Soest",
    tel: "06 11 22 33 44",
    email: "r.bakker@xs4all.nl",
    sub: "nog geen offertes",
    initials: "RB",
    bestaand: true,
  },
  {
    naam: "Thomas Wilms",
    bedrijf: "",
    straat: "Zonnehof",
    nr: "3",
    postcode: "3811 ND",
    plaats: "Amersfoort",
    tel: "06 99 88 77 66",
    email: "",
    sub: "offerte open (€395)",
    initials: "TW",
    bestaand: true,
  },
];

// Adressen voor de overige leads (bestaande klanten) zodat de zoeker een
// adres en context kan tonen. Soberder dan de proto-klanten, maar genoeg
// om de dropdown te vullen.
const LEAD_ADRESSEN: Record<string, { straat: string; nr: string; postcode: string }> = {
  smit: { straat: "Slotlaan", nr: "12", postcode: "3701 GC" },
  vandijk: { straat: "Oudegracht", nr: "210", postcode: "3511 NR" },
  janssen: { straat: "Gijsbrecht", nr: "77", postcode: "1213 EJ" },
  deboer: { straat: "Leusderweg", nr: "5", postcode: "3818 AA" },
  vermeulen: { straat: "Burgemeesterln", nr: "23", postcode: "3768 GW" },
};

/** Leads als "bestaande klanten" voor de zoeker (prototype-klanten eerst). */
const LEAD_KLANTEN: OfferteKlant[] = LEADS.filter(
  (l) => !PROTO_KLANTEN.some((p) => p.naam === l.naam),
).map((l) => {
  const adres = LEAD_ADRESSEN[l.id];
  return {
    naam: l.naam,
    bedrijf: "",
    straat: adres?.straat ?? "",
    nr: adres?.nr ?? "",
    postcode: adres?.postcode ?? "",
    plaats: l.plaats,
    tel: l.bron === "WhatsApp" ? "06 12 34 56 78" : "",
    email: "",
    sub: `${l.status.toLowerCase()} · ${l.waarde}`,
    initials: l.initials,
    bestaand: true,
  };
});

/** Alle bestaande klanten voor de live filterende zoeker. */
export const OFFERTE_KLANTEN: OfferteKlant[] = [...PROTO_KLANTEN, ...LEAD_KLANTEN];

/** Lege klant-template (typen maakt vanzelf een nieuwe klant aan). */
export const LEGE_KLANT: OfferteKlant = {
  naam: "",
  bedrijf: "",
  straat: "",
  nr: "",
  postcode: "",
  plaats: "",
  tel: "",
  email: "",
  initials: "+",
  nieuw: true,
};

/** Korte adresregel "Straat nr, Plaats" (leeg als er geen straat is). */
export function offerteAdres(k: OfferteKlant | null): string {
  return k && k.straat ? `${k.straat} ${k.nr}, ${k.plaats}` : "";
}

// ── Vaste prijzen (incl. BTW, particulier) ───────────────────────────────

export const PRIJZEN = {
  oprit: 4.75,
  invegen: 2.9,
  beschermlaag: 3.1,
  onkruid: 1.5,
  zandNormaal: "2,90",
  zandOnkruidwerend: "4,50",
  rol: "8,50",
} as const;

/** Diensten-chips. "Reinigen + invegen" staat vast aan. */
export const DIENSTEN_INIT: Record<string, boolean> = {
  "Reinigen + invegen": true,
  Beschermlaag: false,
  "Preventieve onkruid": false,
  Onderhoudsabonnement: false,
};

/** Diensten die een eigen offerteregel met m²-stepper togglen. */
export const DIENST_REGELS: {
  key: string;
  naam: string;
  prijs: number;
}[] = [
  { key: "Beschermlaag", naam: "Beschermlaag aanbrengen", prijs: PRIJZEN.beschermlaag },
  { key: "Preventieve onkruid", naam: "Preventieve onkruidbehandeling", prijs: PRIJZEN.onkruid },
];

/** AI-plak: het geplakte klantbericht + de herkende velden. De losse velden
 *  voeden de "Vul automatisch in"-demo (echte AI-extractie is een follow-up). */
export const AI_PLAK = {
  bericht:
    '"Hoi, ik kreeg jullie nummer via Jan de Vries. Wij zijn fam. Bakker, Dorpsstraat 41 in Amersfoort. Onze oprit is helemaal groen en er zit korstmos op, ongeveer 80 m2. Kunnen jullie een prijs doorgeven? Gr, 06-23456781"',
  chips: ["Naam", "Adres", "Telefoon", "Werk · 80 m²", "Korstmos"],
  naam: "Familie Bakker",
  straat: "Dorpsstraat",
  nr: "41",
  plaats: "Amersfoort",
  tel: "06 23 45 67 81",
} as const;

/** Geldigheids-datum (14 dagen, demo). */
export const GELDIG_TM = "24 jun 2026";
