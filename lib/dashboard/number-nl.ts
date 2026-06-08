// NL-decimaal: komma → punt, dan parsen. Geeft NaN bij ongeldige/lege invoer.
export function parseNl(raw: string): number {
  return parseFloat(String(raw).replace(',', '.'));
}

// Spiegelbeeld: toon een getal met komma als decimaalteken.
export function toCommaStr(n: number): string {
  return String(n).replace('.', ',');
}
