import type { Kostprijs } from './kostprijzen-actions'

// ── Fase 3a: marge-berekening per prijsregel + totaal ──────────────────
//
// Pure functies, geen side-effects. Wordt zowel in de marge-kaart als in
// de kostprijzen-modal gebruikt voor "Effect op deze offerte"-preview.
//
// We mappen elke prijsregel op één van 8 vaste categorieën via een
// trefwoord-heuristiek op de omschrijving. Geen DB-veld nodig op
// `prijsregels` — de omschrijvingen worden gegenereerd door computeRules()
// (auto-regels) of door de owner zelf getypt (handmatige regels). De
// matching is bewust simpel en defensief: onbekende strings vallen
// automatisch in 'overig_handmatig' met de bijbehorende default-marge.

/**
 * Lijst van alle valide categorie-keys. Geëxporteerd zodat andere modules
 * (validatie, iteratie in UI) kunnen rondgaan zonder hardcoded duplicates.
 */
export const RULE_KEYS = [
  'reiniging_straatwerk',
  'arbeid_invegen',
  'voegzand',
  'beschermlaag_impregneren',
  'plantenafscherming_folie',
  'reiskosten',
  'onderhoud_abonnement',
  'overig_handmatig',
] as const
export type RuleKey = typeof RULE_KEYS[number]

/**
 * Bepaal welke kostprijs-categorie hoort bij een prijsregel-omschrijving.
 *
 * Heuristiek: case-insensitive trefwoord-check op de omschrijving. Volgorde
 * van checks is belangrijk — meer-specifieke patronen eerst. Bijvoorbeeld
 * "beschermlaag" wordt eerder gematcht dan dat "arbeid" 'm zou afkapen
 * (een beschermlaag-regel kan ook "arbeid" in de tekst hebben).
 *
 * Voor onbekende omschrijvingen wordt 'overig_handmatig' teruggegeven —
 * dat is de catch-all met een redelijke default-marge (38%) zodat de
 * marge-kaart geen onrealistische 100% laat zien voor regels die niet
 * herkend worden.
 *
 * Heuristiek-keuzes per categorie:
 *  - reiniging_straatwerk: "reiniging" of "schoonmaak" — dekt de
 *    auto-regel "Reiniging straatwerk" + manual variaties.
 *  - arbeid_invegen: "invegen" als directe match, of "arbeid" zonder
 *    "extra" (zodat "Extra arbeid (meerwerk)" niet hierin valt; dat
 *    moet juist naar overig_handmatig vallen omdat het meestal een
 *    eenmalige meerwerk-toeslag is met andere marge).
 *  - voegzand: pure materiaalkost, herkenbaar aan "voegzand" in de
 *    omschrijving (zowel normaal als onkruidwerend).
 *  - beschermlaag_impregneren: "beschermlaag" of "impregneren".
 *  - plantenafscherming_folie: "plantenafscherming" of "folie".
 *  - reiskosten: "reiskosten", "voorrijden" of "km" (de auto-regel
 *    bevat "Reiskosten ({n} km)").
 *  - onderhoud_abonnement: "onderhoud" of "abonnement" — de auto-regel
 *    voor periodiek onderhoud bevat "Onderhoudsplan".
 *  - overig_handmatig: alles wat hierboven niet matcht.
 */
export function categoriseerRegel(omschrijving: string): RuleKey {
  const lower = omschrijving.toLowerCase()
  if (lower.includes('reiniging') || lower.includes('schoonmaak')) return 'reiniging_straatwerk'
  if (lower.includes('invegen') || (lower.includes('arbeid') && !lower.includes('extra'))) {
    return 'arbeid_invegen'
  }
  if (lower.includes('voegzand')) return 'voegzand'
  if (lower.includes('beschermlaag') || lower.includes('impregneren')) {
    return 'beschermlaag_impregneren'
  }
  if (lower.includes('plantenafscherming') || lower.includes('folie')) {
    return 'plantenafscherming_folie'
  }
  if (lower.includes('reiskosten') || lower.includes('voorrijden') || lower.includes('km')) {
    return 'reiskosten'
  }
  if (lower.includes('onderhoud') || lower.includes('abonnement')) return 'onderhoud_abonnement'
  return 'overig_handmatig'
}

export type MargeStatus = 'krap' | 'acceptabel' | 'gezond' | 'uitstekend'

export type MargeRegel = {
  omschrijving: string
  totaal: number          // excl BTW
  categorie: RuleKey
  kostPct: number         // 0-100
  kosten: number          // totaal * kostPct / 100
  marge: number           // totaal - kosten
  margePct: number        // marge / totaal * 100; 0 als totaal=0
  // ─── Aliassen voor UI-laag (consumers die andere naamgeving hanteren) ───
  // We exposen extra velden zodat de Kostprijzen-modal en marge-kaart
  // (Agent 3b's UI) niet hoeven te weten dat `totaal === omzet` en
  // `categorie === rule_key`. Pure aliassen, geen nieuwe data.
  /** Alias voor `categorie` — gebruikt door UI die in "rule_key"-naamgeving denkt. */
  rule_key: RuleKey
  /** Alias voor `totaal` — semantisch identiek (regel-omzet excl BTW). */
  omzet: number
  /** Per-regel status-bucket, zelfde drempels als overview-status. */
  status: MargeStatus
}

export type MargeOverview = {
  omzet: number           // som totaal (excl BTW)
  kosten: number
  marge: number
  margePct: number
  perRegel: MargeRegel[]
  /** Alias voor `perRegel` — voor consumers die kortere naam verkiezen. */
  regels: MargeRegel[]
  /** Indicator voor de UI: 'krap' (<30), 'acceptabel' (30-50), 'gezond' (50-70), 'uitstekend' (>70). */
  status: MargeStatus
}

/**
 * Bepaal de marge-status-bucket op basis van het totaal-marge-percentage.
 * Gebruikt door de marge-kaart voor kleur + label ("Krap", "Gezond" etc.).
 *
 * Buckets exact volgens de spec (sectie 3.2):
 *  - < 30%   : krap        (rood, "onder verlies-grens")
 *  - 30–50%  : acceptabel  (oranje)
 *  - 50–70%  : gezond      (groen, "boven 50%")
 *  - > 70%   : uitstekend  (blauw)
 *
 * Edge case: exact 50% valt in 'gezond' (>= 50). Exact 30% valt in
 * 'acceptabel'. Exact 70% valt in 'gezond' (< 70 stopt acceptabel niet,
 * dus we gebruiken > 70 → uitstekend strict).
 */
function bucketStatus(margePct: number): MargeStatus {
  if (margePct < 30) return 'krap'
  if (margePct < 50) return 'acceptabel'
  if (margePct <= 70) return 'gezond'
  return 'uitstekend'
}

/**
 * Bereken marge per regel + totalen.
 *
 * @param regelTotalen - array van { omschrijving, totaal } per prijsregel
 *                       (totaal in excl BTW, in euro's)
 * @param kostprijzen  - huidige kost_pct per categorie (uit getKostprijzen)
 *
 * Implementatie:
 *  - Bouw een Map van rule_key → kost_pct voor O(1) lookup.
 *  - Voor elke regel: categoriseer → lookup kost_pct → bereken kosten,
 *    marge en marge-percentage.
 *  - Sommeer alle regels naar overview-niveau.
 *  - margePct op overview-niveau wordt apart berekend (NIET de gemiddelde
 *    van per-regel-percentages), want regels hebben verschillende grootte
 *    en gewogen-gemiddelde via som-omzet/som-kosten is de juiste manier.
 *
 * Veiligheid:
 *  - Als `kostprijzen` leeg is (tabel nog niet geseed of fetch faalde),
 *    krijgen we default 0% kost_pct → 100% marge. Dat is niet correct
 *    maar veilig — de marge-kaart toont dan onrealistisch hoge marge en
 *    de owner ziet meteen dat de kostprijzen niet geconfigureerd zijn.
 *  - Als totaal = 0 voor een regel (gratis-regel?), margePct = 0 (niet
 *    NaN door deling door nul).
 *  - Als overview-omzet = 0 (lege offerte), margePct = 0 + status='krap'.
 */
export function berekenMarge(
  regelTotalen: Array<{ omschrijving: string; totaal: number }>,
  kostprijzen: Kostprijs[],
): MargeOverview {
  const kostPctByKey = new Map<string, number>(
    kostprijzen.map((k) => [k.rule_key, k.kost_pct] as const),
  )

  let omzet = 0
  let kostenTotaal = 0
  const perRegel: MargeRegel[] = []

  for (const r of regelTotalen) {
    const categorie = categoriseerRegel(r.omschrijving)
    // Default 0% kost als de categorie niet in de lijst staat (onwaarschijnlijk
    // omdat we 8 vaste keys hebben + de tabel die ook bevat, maar veilig).
    const kostPct = kostPctByKey.get(categorie) ?? 0
    const totaal = Number.isFinite(r.totaal) ? r.totaal : 0
    const kosten = (totaal * kostPct) / 100
    const marge = totaal - kosten
    const margePct = totaal > 0 ? (marge / totaal) * 100 : 0

    omzet += totaal
    kostenTotaal += kosten
    perRegel.push({
      omschrijving: r.omschrijving,
      totaal,
      categorie,
      kostPct,
      kosten,
      marge,
      margePct,
      // Aliassen + per-regel status voor de UI-laag (zie type-comment).
      rule_key: categorie,
      omzet: totaal,
      status: bucketStatus(margePct),
    })
  }

  const margeTotaal = omzet - kostenTotaal
  // Gewogen overview-percentage: marge/omzet, niet het gemiddelde van
  // per-regel-percentages.
  const overviewMargePct = omzet > 0 ? (margeTotaal / omzet) * 100 : 0

  return {
    omzet,
    kosten: kostenTotaal,
    marge: margeTotaal,
    margePct: overviewMargePct,
    perRegel,
    regels: perRegel, // alias voor consumers die kortere naam gebruiken
    status: bucketStatus(overviewMargePct),
  }
}
