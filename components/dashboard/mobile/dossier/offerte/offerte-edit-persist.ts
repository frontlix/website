// Persist-helper voor de mobiele offerte-editor (DossOfferteEdit).
//
// Vertaalt de lokale editor-state (regels + toeslagen) naar de
// DraftRegelInput[]-vorm die `saveDraft` verwacht, zodat een mobiele edit
// dezelfde DB-staat oplevert als de desktop-flow: de desktop-tab, de
// /offerte-preview-PDF en het CRM lezen daarna allemaal dezelfde regels.
//
// Belangrijk:
//  - Toeslagen worden als echte prijs-regels weggeschreven (een aparte regel
//    per actieve toeslag), met het berekende euro-bedrag. Zo komt het
//    saveDraft-totaal (dat zelf hertelt) overeen met het editor-totaal.
//  - Korting wordt NIET vooraf toegepast hier: saveDraft past het
//    kortingPct zelf toe en sluit reiskosten al uit. Daarom alleen de
//    bruto regel-/toeslag-bedragen meegeven.

import type { DraftRegelInput } from '@/lib/dashboard/offerte-draft-actions'
import { lineQty, lineAmount, type OfferteLine, type Toeslag } from './offerte-edit-model'

/** Rond af op centen (2 decimalen), identiek aan round2 in offerte-edit-model. */
function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Bouwt de DraftRegelInput[] uit de actieve regels + toeslagen.
 *
 * Regels (line.on === true):
 *   bron       = manual bij vrije regel, anders auto_lead
 *   omschrijving = label of 'Regel'
 *   aantal     = lineQty(line) of null (bij 0)
 *   eenheid    = line.unit
 *   stukprijs  = line.rate
 *
 * Toeslagen (t.on === true) → eigen post-regel:
 *   pct-mode    : bedrag = round2(sub0 * value/100), sub0 = Σ lineAmount(on-regels)
 *   bedrag-mode : bedrag = value
 *   omschrijving krijgt bij pct het percentage als suffix ('Korstmos (10%)').
 */
export function toDraftRegels(lines: OfferteLine[], toeslagen: Toeslag[]): DraftRegelInput[] {
  const regels: DraftRegelInput[] = []
  let volgorde = 0

  // ── 1. Actieve regels ──
  lines.forEach((line) => {
    if (!line.on) return
    volgorde += 1
    const qty = lineQty(line)
    regels.push({
      bron: line.custom ? 'manual' : 'auto_lead',
      omschrijving: line.label || 'Regel',
      aantal: qty || null,
      eenheid: line.unit,
      stukprijs: line.rate,
      volgorde,
    })
  })

  // ── 2. Actieve toeslagen → post-regels met berekend euro-bedrag ──
  // sub0 = subtotaal over de on-regels (zelfde basis als offerteTotals).
  const sub0 = lines.reduce((s, l) => s + lineAmount(l), 0)
  toeslagen.forEach((t) => {
    if (!t.on) return
    volgorde += 1
    const bedrag = t.mode === 'pct' ? round2(sub0 * (t.value / 100)) : t.value
    regels.push({
      bron: 'manual',
      omschrijving: t.label + (t.mode === 'pct' ? ` (${t.value}%)` : ''),
      aantal: 1,
      eenheid: 'post',
      stukprijs: bedrag,
      volgorde,
    })
  })

  return regels
}
