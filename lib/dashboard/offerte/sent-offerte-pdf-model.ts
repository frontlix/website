//
// Zet een VERSTUURDE offerte (opgeslagen snapshot + het op de rij bevroren
// eindbedrag) om naar het model dat OffertePdfDocument verwacht. Pure functie,
// geen next/headers of supabase: veilig vanuit server-mappers en client.
//
// Eindbedrag is leidend: het getoonde totaal incl. BTW = offerte.totaal_incl.
// De korting/toeslag-split leiden we daaruit af zodat de bedragen optellen.
// De regels komen exact uit de snapshot (bevroren bij versturen); de
// klantgegevens uit baseData (de huidige lead, want die staan niet in de
// snapshot).

import type {
  ManualOfferteData,
  RegelComputed,
  TotalsComputed,
} from '@/lib/dashboard/manual-offerte-types'
import { computeRules } from '@/lib/dashboard/manual-offerte-rules'
import type { ManualOffertePricing } from '@/lib/dashboard/pricing-types'
import { readSnapshotRegels } from '@/lib/dashboard/offerte-snapshot'

/** Notitie die in de PDF en de UI verschijnt bij een heropgemaakte (oude) offerte. */
export const HEROPGEMAAKT_NOTE =
  'Let op: deze offerte is heropgemaakt uit de huidige gegevens. Het eindbedrag is het oorspronkelijk verzonden bedrag; losse regelprijzen kunnen afwijken van het origineel.'

export type SentOffertePdfModel = {
  data: ManualOfferteData
  rules: RegelComputed[]
  totals: TotalsComputed
  offerteNummer: string
  geldigheidDagen: number
  /** true = geen opgeslagen snapshot, regels heropgemaakt uit de huidige
   *  leadgegevens + huidige prijslijst. Eindbedrag blijft het verzonden bedrag. */
  reconstructed: boolean
}

type SentOfferteRow = {
  regels_snapshot: unknown
  totaal_incl: number
  korting_pct: number | null
  versie: number
  aangemaakt_op: string | null
  offertenummer?: string | null
}

function readSnapshotGeldigheid(raw: unknown): number | null {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const g = (raw as Record<string, unknown>).geldigheidDagen
    if (typeof g === 'number' && Number.isFinite(g) && g > 0) return g
  }
  return null
}

export function buildSentOffertePdfModel(input: {
  offerte: SentOfferteRow
  baseData: ManualOfferteData
  leadId: string
  pricing: ManualOffertePricing
  btwTarief?: number
  geldigheidFallback?: number
}): SentOffertePdfModel | null {
  const { offerte, baseData, leadId, pricing, btwTarief = 21, geldigheidFallback = 14 } = input

  const snap = readSnapshotRegels(offerte.regels_snapshot)

  // Bron van de regels: de bevroren snapshot als die er is (exact zoals verstuurd),
  // anders heropmaken uit de huidige leadgegevens + huidige prijslijst (dezelfde
  // engine als de concept-editor). Bij heropmaken kan een regelprijs afwijken van
  // het origineel; het eindbedrag blijft leidend uit offerte.totaal_incl.
  const reconstructed = !snap || snap.length === 0
  const rules: RegelComputed[] = reconstructed
    ? computeRules(baseData, pricing)
    : [...snap]
        .sort((a, b) => a.volgorde - b.volgorde)
        .map((r) => ({
          desc: r.omschrijving,
          aantal: r.aantal ?? 0,
          eenheid: r.eenheid ?? '',
          prijs: r.stukprijs,
          totaal: r.totaal,
        }))

  // Niets te tonen als ook heropmaken geen regels oplevert (lead zonder diensten).
  if (rules.length === 0) return null

  const subtotal = rules.reduce((s, r) => s + r.totaal, 0)
  const totaalIncl = offerte.totaal_incl
  const total = totaalIncl / (1 + btwTarief / 100) // excl. BTW
  const btw = totaalIncl - total
  // subtotal + korstmosToeslag - kortingBedrag === total (excl). We kennen de
  // split niet apart (snapshot bevriest die niet), dus leiden we 'm af uit het
  // verschil zodat de bedragen optellen en het eindbedrag exact klopt.
  const diff = total - subtotal
  const korstmosToeslag = diff > 0 ? diff : 0
  const kortingBedrag = diff < 0 ? -diff : 0
  const discount = offerte.korting_pct ?? 0

  const totals: TotalsComputed = {
    subtotal,
    korstmosToeslag,
    kortingBedrag,
    discount,
    total,
    btw,
  }

  const year = offerte.aangemaakt_op
    ? new Date(offerte.aangemaakt_op).getFullYear()
    : new Date().getFullYear()
  const offerteNummer =
    offerte.offertenummer?.trim() ||
    `${year}-${leadId.replace(/\D/g, '').slice(-4).padStart(4, '0')}`

  const geldigheidDagen = readSnapshotGeldigheid(offerte.regels_snapshot) ?? geldigheidFallback

  // Bij heropmaken een waarschuwingsnotitie vooraan in de PDF-toelichting zetten,
  // zodat de heropgemaakte PDF zelf ook duidelijk maakt dat hij kan afwijken.
  const data: ManualOfferteData = reconstructed
    ? {
        ...baseData,
        notitie: baseData.notitie
          ? `${HEROPGEMAAKT_NOTE}\n\n${baseData.notitie}`
          : HEROPGEMAAKT_NOTE,
      }
    : baseData

  return { data, rules, totals, offerteNummer, geldigheidDagen, reconstructed }
}
