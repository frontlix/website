// Gedeelde types voor de offerte-wizard (stappen + rail).

import type { OfferteKlant } from "./offerte-data";

/** Een vaste, berekende offerteregel (qty × prijs). */
export interface Regel {
  id: string;
  naam: string;
  qty: number;
  unit: "m²" | "zak" | "rol";
  prijs: number;
  /** Past de bron-state aan (stepper in stap 3 / rail). */
  set: (v: number) => void;
}

/** Een vrije regel (meerwerk, eigen omschrijving + bedrag). */
export interface VrijeRegel {
  id: number;
  naam: string;
  bedrag: number;
}

/** Een item in de geordende lijst: ofwel een vaste regel ofwel een vrije. */
export type GeordendItem =
  | { key: string; regel: Regel; vrij?: undefined }
  | { key: string; vrij: VrijeRegel; regel?: undefined };

export type Kanaal = "whatsapp" | "email" | "pdf";
export type BtwKeuze = "21%" | "9%" | "0%" | "Verlegd";
export type KlantType = "Particulier" | "Zakelijk";
export type Kleur = "Naturel" | "Antraciet" | "Allebei";

export type { OfferteKlant };
