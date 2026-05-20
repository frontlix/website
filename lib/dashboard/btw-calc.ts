/**
 * BTW-berekening voor offertes (Frontlix dashboard).
 *
 * Conventie:
 * - Alle regel-totalen zijn EXCL BTW.
 * - Korting wordt toegepast op het subtotaal EXCL BTW, vóór de BTW erbij komt.
 * - BTW is hardcoded op 21% (Nederland, standaard-tarief).
 *   Wijziging hiervan vereist bewuste codewijziging — geen runtime-config.
 * - Negatieve of >100 kortingen worden geclampt naar het bereik [0, 100].
 */

const BTW_PERCENTAGE = 21

export type Totalen = {
  /** Som van alle regel.totaal (excl BTW), vóór korting. */
  subtotaalExcl: number
  /** Bedrag in euro's dat van het subtotaal wordt afgetrokken. */
  kortingBedrag: number
  /** Subtotaal min korting (excl BTW). Grondslag voor BTW-berekening. */
  naKortingExcl: number
  /** BTW-bedrag: naKortingExcl × 21%. */
  btw: number
  /** Eindbedrag inclusief BTW. */
  totaalIncl: number
  /** Voor weergave in UI ("BTW {btwPercentage}%"). */
  btwPercentage: number
}

/**
 * Berekent alle offerte-totalen op basis van regel-totalen (excl BTW) en
 * een kortingspercentage.
 *
 * @param regelTotalen Array van regel.totaal (excl BTW). Lege array → alles 0.
 * @param kortingPct Kortingspercentage 0-100. Buiten bereik wordt geclampt.
 * @returns Volledig Totalen-object — alle bedragen in euro's, niet afgerond
 *          op centen (UI gebruikt formatEuro voor weergave).
 */
export function berekenTotalen(
  regelTotalen: number[],
  kortingPct: number
): Totalen {
  // Clamp korting binnen [0, 100] om negatieve totalen of onzin-getallen te voorkomen.
  const pct = Math.max(0, Math.min(100, kortingPct))

  const subtotaalExcl = regelTotalen.reduce((sum, n) => sum + (Number.isFinite(n) ? n : 0), 0)
  const kortingBedrag = subtotaalExcl * (pct / 100)
  const naKortingExcl = subtotaalExcl - kortingBedrag
  const btw = naKortingExcl * (BTW_PERCENTAGE / 100)
  const totaalIncl = naKortingExcl + btw

  return {
    subtotaalExcl,
    kortingBedrag,
    naKortingExcl,
    btw,
    totaalIncl,
    btwPercentage: BTW_PERCENTAGE,
  }
}
