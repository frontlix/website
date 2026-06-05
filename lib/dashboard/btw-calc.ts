/**
 * BTW-berekening voor offertes (Frontlix dashboard).
 *
 * Conventie:
 * - Alle regel-totalen zijn EXCL BTW.
 * - Korting wordt toegepast op het subtotaal EXCL BTW, vóór de BTW erbij komt.
 * - BTW is hardcoded op 21% (Nederland, standaard-tarief).
 *   Wijziging hiervan vereist bewuste codewijziging, geen runtime-config.
 * - Negatieve of >100 kortingen worden geclampt naar het bereik [0, 100].
 */

const BTW_PERCENTAGE = 21

/**
 * Herkent een reiskosten-regel. Korting wordt NOOIT over reiskosten berekend,
 * dus alle totaal-berekeningen sluiten deze regels uit van de kortingsgrondslag.
 * Reiskosten komen uit computeRules met eenheid 'km' en een omschrijving die met
 * "Reiskosten" begint; we matchen op beide zodat ook handmatige regels kloppen.
 */
export function isReiskostenRegel(r: {
  omschrijving?: string | null
  eenheid?: string | null
}): boolean {
  if ((r.eenheid ?? '').trim().toLowerCase() === 'km') return true
  return (r.omschrijving ?? '').trim().toLowerCase().startsWith('reiskosten')
}

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
 * @param nietKortbaarTotaal Deel van het subtotaal dat NIET kortbaar is
 *        (reiskosten). Zit wel in `regelTotalen`/subtotaal, maar telt niet mee
 *        in de kortingsgrondslag. Default 0 = oude gedrag.
 * @returns Volledig Totalen-object, alle bedragen in euro's, niet afgerond
 *          op centen (UI gebruikt formatEuro voor weergave).
 */
export function berekenTotalen(
  regelTotalen: number[],
  kortingPct: number,
  nietKortbaarTotaal = 0
): Totalen {
  // Clamp korting binnen [0, 100] om negatieve totalen of onzin-getallen te voorkomen.
  const pct = Math.max(0, Math.min(100, kortingPct))

  const subtotaalExcl = regelTotalen.reduce((sum, n) => sum + (Number.isFinite(n) ? n : 0), 0)
  // Korting geldt nooit over reiskosten: die zitten in het subtotaal maar worden
  // uit de kortingsgrondslag gehaald.
  const nietKortbaar = Number.isFinite(nietKortbaarTotaal)
    ? Math.max(0, nietKortbaarTotaal)
    : 0
  const kortbareGrondslag = Math.max(0, subtotaalExcl - nietKortbaar)
  const kortingBedrag = kortbareGrondslag * (pct / 100)
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
