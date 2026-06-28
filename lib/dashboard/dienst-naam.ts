// Gedeelde, leesbare weergave van de hoofdcategorie-sleutel (zoals
// 'oprit_terras_terrein' of 'onkruidbeheersing_zakelijk'). Desktop en mobiel
// gebruiken deze ene functie, zodat de dienstnaam overal hetzelfde en zonder
// "computertaal" (underscores) wordt getoond.
//
// Streep-vrij conform de Frontlix-huisstijl (komma i.p.v. liggend streepje).

/** Hoofdcategorie-sleutel -> leesbaar label: underscores worden spaties, elk
 *  woord een hoofdletter, en een schuine streep krijgt spaties eromheen.
 *  Lege/onbekende invoer geeft een lege string. */
export function humanizeHoofdcategorie(key: string | null | undefined): string {
  if (!key) return ''
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\//g, ' / ')
}
