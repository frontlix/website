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
import { readSnapshotRegels } from '@/lib/dashboard/offerte-snapshot'

export type SentOffertePdfModel = {
  data: ManualOfferteData
  rules: RegelComputed[]
  totals: TotalsComputed
  offerteNummer: string
  geldigheidDagen: number
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
  btwTarief?: number
  geldigheidFallback?: number
}): SentOffertePdfModel | null {
  const { offerte, baseData, leadId, btwTarief = 21, geldigheidFallback = 14 } = input

  const snap = readSnapshotRegels(offerte.regels_snapshot)
  if (!snap || snap.length === 0) return null

  const rules: RegelComputed[] = [...snap]
    .sort((a, b) => a.volgorde - b.volgorde)
    .map((r) => ({
      desc: r.omschrijving,
      aantal: r.aantal ?? 0,
      eenheid: r.eenheid ?? '',
      prijs: r.stukprijs,
      totaal: r.totaal,
      // Bevroren opmerking (indien aanwezig) zodat een verstuurde versie haar
      // eigen opmerkingen toont, los van latere wijzigingen op de lead.
      ...(r.opmerking ? { opmerking: r.opmerking } : {}),
    }))

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

  return { data: baseData, rules, totals, offerteNummer, geldigheidDagen }
}
