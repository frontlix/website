//
// Pure vertaler van (data, rules, totals) + meta naar het OffertePdfData-
// contract dat OffertePdfPreview (telefoon) leest. Geport uit de inline
// pdfData-opbouw in MobileOfferteEditor, zodat zowel het live concept als een
// verstuurde versie dezelfde weergave delen.

import type {
  ManualOfferteData,
  RegelComputed,
  TotalsComputed,
} from '@/lib/dashboard/manual-offerte-types'
import type { OffertePdfData } from '@/components/dashboard/mobile/dossier/offerte/OffertePdfPreview'

export function toOffertePdfData(args: {
  data: ManualOfferteData
  rules: RegelComputed[]
  totals: TotalsComputed
  nr: string
  datum: string
  geldigTot: string
  effectiveKortingPct: number
  toelichting?: string
  btwPct?: number
}): OffertePdfData {
  const { data, rules, totals, nr, datum, geldigTot, effectiveKortingPct, toelichting, btwPct = 21 } = args

  const klant = data.factuur_zelfde
    ? {
        naam: data.naam,
        bedrijf: data.bedrijf || undefined,
        straat: `${data.straat} ${data.huisnummer}`.trim(),
        pcplaats: `${data.postcode} ${data.plaats}`.trim(),
        email: data.email || undefined,
        telefoon: data.telefoon || undefined,
      }
    : {
        naam: data.naam,
        bedrijf: data.bedrijf || undefined,
        straat: `${data.factuur_straat} ${data.factuur_huisnummer}`.trim(),
        pcplaats: `${data.factuur_postcode} ${data.factuur_plaats}`.trim(),
      }

  return {
    nr,
    datum,
    geldigTot,
    dienst: data.sub.includes('invegen') ? 'Reinigen en invegen' : 'Onkruidbeheersing',
    m2: data.m2 > 0 ? data.m2 : undefined,
    klant,
    regels: rules.map((r) => ({
      omschrijving: r.desc,
      aantalLabel: `${r.aantal} ${r.eenheid}`.trim(),
      stukprijs: r.prijs,
      totaal: r.totaal,
    })),
    subtotaal: totals.subtotal,
    toeslagen:
      totals.korstmosToeslag > 0
        ? [{ label: 'Korstmos-toeslag (10%)', bedrag: totals.korstmosToeslag }]
        : [],
    kortingPct: Math.round(effectiveKortingPct),
    kortingBedrag: totals.kortingBedrag,
    kortingNote: data.korting_omschrijving || undefined,
    totaalExcl: totals.total,
    btwPct,
    btwBedrag: totals.btw,
    totaalIncl: totals.total + totals.btw,
    toelichting: toelichting || undefined,
  }
}
