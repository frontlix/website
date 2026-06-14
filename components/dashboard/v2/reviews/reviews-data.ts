// ─────────────────────────────────────────────────────────────────────
// Reviews-pagina (rebrand v2), PAGINA-SPECIFIEKE demo-data.
//
// Geporteerd uit de design-handoff (object C3 in CData3.jsx). Houd deze
// data los van de gedeelde demo-data.ts (single-writer) zodat er geen
// merge-conflicten ontstaan. Tekst is streep-vrij volgens de huisstijl.
// ─────────────────────────────────────────────────────────────────────

/** Een review die nog op een antwoord wacht. Surface zet een
 *  conceptantwoord klaar dat je kunt aanpassen en versturen. */
export interface WaitingReview {
  naam: string;
  initials: string;
  score: number;
  bron: string;
  tijd: string;
  tekst: string;
  /** Conceptantwoord van Surface (voorgevuld in de composer). */
  concept: string;
}

/** Een al beantwoorde review (verschijnt onder de wachtende). */
export interface AnsweredReview {
  naam: string;
  initials: string;
  score: number;
  bron: string;
  tijd: string;
  tekst: string;
  beantwoord: true;
}

export interface BronScore {
  bron: string;
  score: string;
  aantal: number;
}

export interface ReviewStats {
  /** Gemiddelde score in NL-notatie (komma). */
  gem: string;
  totaal: number;
  /** [ster, aantal] per sterklasse, hoog naar laag. */
  verdeling: [number, number][];
  /** Noemer voor de verdelingsbalken (grootste klasse). */
  verdelingMax: number;
}

export const REVIEW_STATS: ReviewStats = {
  gem: "4,8",
  totaal: 47,
  verdeling: [
    [5, 38],
    [4, 6],
    [3, 2],
    [2, 1],
    [1, 0],
  ],
  verdelingMax: 38,
};

export const REVIEWS_WACHTEND: WaitingReview[] = [
  {
    naam: "Anna Smit",
    initials: "AS",
    score: 5,
    bron: "Google",
    tijd: "3d geleden",
    tekst:
      "De oprit ziet er weer als nieuw uit! Snel geschakeld via WhatsApp, nette prijs en de mannen ruimden alles keurig op. Een aanrader.",
    concept:
      "Dank je wel Anna! Fijn dat je zo snel geholpen bent, veel plezier van de schone oprit. Tot de volgende keer!",
  },
  {
    naam: "Sandra Janssen",
    initials: "SJ",
    score: 4,
    bron: "Klusvergelijk",
    tijd: "1d geleden",
    tekst:
      "Netjes gewerkt en duidelijk gecommuniceerd. Ze begonnen iets later dan afgesproken, maar het resultaat is prima.",
    concept:
      "Bedankt voor je eerlijke review Sandra! Excuses voor de latere start, fijn dat je tevreden bent met het resultaat.",
  },
];

export const REVIEWS_RECENT: AnsweredReview[] = [
  {
    naam: "Familie de Wit",
    initials: "FW",
    score: 5,
    bron: "Google",
    tijd: "1w",
    tekst: "Gevel ziet er fantastisch uit. Duidelijke offerte, geen verrassingen.",
    beantwoord: true,
  },
  {
    naam: "P. Bos",
    initials: "PB",
    score: 5,
    bron: "Google",
    tijd: "2w",
    tekst: "Supersnelle reactie en vakkundig werk aan onze dakgoten.",
    beantwoord: true,
  },
  {
    naam: "J. Mulder",
    initials: "JM",
    score: 4,
    bron: "Werkspot",
    tijd: "2w",
    tekst: "Goede prijs-kwaliteit. Communicatie via WhatsApp werkte prettig.",
    beantwoord: true,
  },
  {
    naam: "T. Visser",
    initials: "TV",
    score: 5,
    bron: "Google",
    tijd: "3w",
    tekst: "Terras weer als nieuw. Kwamen zelfs een dag eerder dan gepland!",
    beantwoord: true,
  },
];

export const BRON_SCORES: BronScore[] = [
  { bron: "Google", score: "4,9", aantal: 31 },
  { bron: "Klusvergelijk", score: "4,6", aantal: 9 },
  { bron: "Werkspot", score: "4,7", aantal: 7 },
];

// ── Pariteit-demo (uit het bestaande (app)-dashboard) ──────────────────
// Vorm overgenomen van components/dashboard/reviews/ReviewCard.tsx (ReviewItem)
// en PendingReviewRow.tsx (PendingReview), zodat de v2-kaarten + wachtrij
// dezelfde velden tonen als het bestaande dashboard (avatar, plaats, datum,
// NPS-tone, gepubliceerd-status, open-lead-link, days-since). Tot er een
// reviews-tabel is blijft dit placeholder; de mappers vormen 'm naar de
// v2-component-props. Tekst is streep-vrij volgens de huisstijl.

/** Eén review uit het bestaande dashboard (zie reviews/ReviewCard.tsx). */
export interface ReviewItem {
  id: string;
  leadId: string;
  naam: string;
  plaats: string;
  datum: string;
  /** 0 t/m 5. */
  score: number;
  nps: "promoter" | "passive" | "detractor";
  text: string;
  published: boolean;
}

/** Eén wachtende review (zie reviews/PendingReviewRow.tsx). */
export interface PendingReview {
  id: string;
  leadId: string;
  naam: string;
  plaats: string;
  klusDatum: string;
  /** Dagen sinds verzoek (of klus, als nog niet verstuurd). */
  daysSince: number;
  /** Is er al een review-verzoek verstuurd via WhatsApp? */
  sent: boolean;
}

export const REVIEW_ITEMS: ReviewItem[] = [
  {
    id: "r1",
    leadId: "demo-1",
    naam: "Anna Smit",
    plaats: "Den Haag",
    datum: "2 dagen geleden",
    score: 5,
    nps: "promoter",
    text: "Geweldig werk. Op tijd, schoon werk, perfecte communicatie via WhatsApp tijdens en na de klus. Een aanrader.",
    published: true,
  },
  {
    id: "r2",
    leadId: "demo-2",
    naam: "Sandra Janssen",
    plaats: "Pijnacker",
    datum: "1 week geleden",
    score: 4.5,
    nps: "promoter",
    text: "Heel netjes gewerkt en eerlijk advies gekregen over de beschermlaag. Resultaat is super.",
    published: true,
  },
  {
    id: "r3",
    leadId: "demo-3",
    naam: "Erik van der Velde",
    plaats: "Rotterdam",
    datum: "2 weken geleden",
    score: 4,
    nps: "passive",
    text: "Goed werk geleverd. Aankomsttijd was iets later dan afgesproken maar verder prima.",
    published: true,
  },
  {
    id: "r4",
    leadId: "demo-4",
    naam: "Familie Kuiper",
    plaats: "Delft",
    datum: "3 weken geleden",
    score: 5,
    nps: "promoter",
    text: "Vakwerk. Het terras ziet er weer als nieuw uit, dankzij de antraciet voegen een prachtige uitstraling.",
    published: true,
  },
  {
    id: "r5",
    leadId: "demo-5",
    naam: "Bert Koning",
    plaats: "Utrecht",
    datum: "1 maand geleden",
    score: 3,
    nps: "detractor",
    text: "Werk goed gedaan maar prijs viel iets hoger uit dan in de offerte was aangegeven.",
    published: false,
  },
];

export const REVIEWS_PENDING: PendingReview[] = [
  {
    id: "p1",
    leadId: "demo-p1",
    naam: "Thomas Wilms",
    plaats: "Delft",
    klusDatum: "vrijdag 8 mei",
    daysSince: 2,
    sent: false,
  },
  {
    id: "p2",
    leadId: "demo-p2",
    naam: "Petra de Boer",
    plaats: "Gouda",
    klusDatum: "dinsdag 28 april",
    daysSince: 8,
    sent: true,
  },
];
