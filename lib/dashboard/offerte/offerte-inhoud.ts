// ─────────────────────────────────────────────────────────────────────
// Offerte-inhoud voor het goedkeuringsblok. Bouwt de regels, de subtotalen
// en een volledig PDF-model LIVE uit de offerte-form-data (lead-velden +
// prijslijst), via dezelfde computeRules/computeTotals als de editor en de
// PDF. Zo klopt het blok intern (regels + subtotalen + totaal tellen op) en
// komt het overeen met wat de bot bij goedkeuren daadwerkelijk verstuurt
// (approveQuote herberekent ook live). Werkt ook als de offerte nog geen
// opgeslagen regels_snapshot heeft.
//
// Streep-vrij conform de Frontlix-huisstijl (komma i.p.v. liggend streepje).
// ─────────────────────────────────────────────────────────────────────

import { computeRules, computeTotals } from '../manual-offerte-rules'
import { formatEuro } from '../format'
import type { ManualOfferteData } from '../manual-offerte-types'
import type { ManualOffertePricing } from '../pricing-types'
import type { SentOffertePdfModel } from './sent-offerte-pdf-model'

/** Eén offerte-regel voor de preview in het blok. */
export interface OfferteInhoudRegel {
  naam: string
  /** "45 m² × € 5,00" of leeg. */
  calc: string
  /** "€ 225,00" */
  bedrag: string
}

export interface OfferteInhoud {
  regels: OfferteInhoudRegel[]
  /** Subtotaal (excl. btw, vóór korting), geformatteerd. */
  subtotaal: string
  /** Kortingbedrag, geformatteerd, of null als er geen korting is. */
  korting: string | null
  /** BTW (21%), geformatteerd. */
  btw: string
  /** Totaal incl. btw (live herberekend), geformatteerd. */
  totaalIncl: string
  /** Live opgebouwd PDF-model voor "Bekijk volledige offerte". */
  pdfModel: SentOffertePdfModel
}

/** Bouwt de offerte-inhoud (regels, subtotalen, totaal en PDF-model) live uit
 *  de offerte-form-data. `leadIdLeesbaar` is de leesbare lead_id (voor het
 *  offertenummer, zelfde formule als de editor); `jaar` is het kalenderjaar. */
export function buildOfferteInhoud(
  form: { data: ManualOfferteData; pricing: ManualOffertePricing; geldigheidDagen: number },
  leadIdLeesbaar: string,
  jaar: number,
): OfferteInhoud {
  const rules = computeRules(form.data, form.pricing)
  const totals = computeTotals(rules, form.data)
  const offerteNummer = `${jaar}-${leadIdLeesbaar.replace(/\D/g, '').slice(-4).padStart(4, '0')}`
  return {
    regels: rules.map((r) => ({
      naam: r.desc,
      calc: [
        r.aantal ? `${r.aantal} ${r.eenheid}`.trim() : null,
        r.prijs ? `× ${formatEuro(r.prijs)}` : null,
      ]
        .filter(Boolean)
        .join(' '),
      bedrag: formatEuro(r.totaal),
    })),
    subtotaal: formatEuro(totals.subtotal),
    korting: totals.kortingBedrag > 0 ? formatEuro(totals.kortingBedrag) : null,
    btw: formatEuro(totals.btw),
    totaalIncl: formatEuro(totals.total + totals.btw),
    pdfModel: {
      data: form.data,
      rules,
      totals,
      offerteNummer,
      geldigheidDagen: form.geldigheidDagen,
    },
  }
}
