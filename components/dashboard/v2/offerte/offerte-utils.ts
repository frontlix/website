// Reken- en formatteer-helpers voor de offerte-wizard.

/** NL-bedrag met euroteken: poFmt(1234.5) → "€1.234,50". */
export function fmtEuro(n: number): string {
  return (
    "€" +
    n.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );
}

/** NL-notatie naar getal: "7,5" → 7.5. Lege/onzin → 0. */
export function parsePrijs(s: string | number): number {
  return parseFloat(String(s).replace(",", ".")) || 0;
}

/** Getal terug naar NL-string met komma: 7.5 → "7,5". */
export function naarKomma(n: number): string {
  return String(n).replace(".", ",");
}
