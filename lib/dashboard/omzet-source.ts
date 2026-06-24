//
// Pure omzet-bron. Bepaalt per gewonnen lead het echte gewonnen bedrag op basis
// van de VERZONDEN offerte-snapshot (offertes.totaal_incl, onveranderlijk per
// versie), met terugval op leads.totaal_prijs. Geen DB-toegang, zodat dit zonder
// env testbaar is. stats-queries.ts voedt deze functie uit de DB.

export interface WonLeadInput {
  lead_id: string
  akkoord_op: string | null
  afspraak_geboekt_op: string | null
  /** Live offertebedrag op de lead; terugval als er geen verzonden offerte is. */
  totaal_prijs: number | null
  hoofdcategorie: string | null
}

export interface SentOfferteInput {
  lead_id: string
  versie: number
  totaal_incl: number
}

export interface OmzetRowOut {
  wonDate: string
  prijs: number
  categorie: string
}

/** Hoogste-versie totaal_incl per lead (de laatst verzonden offerte). */
export function latestSentTotaalByLead(offertes: SentOfferteInput[]): Map<string, number> {
  const best = new Map<string, { versie: number; totaal: number }>()
  for (const o of offertes) {
    const prev = best.get(o.lead_id)
    if (!prev || o.versie > prev.versie) {
      best.set(o.lead_id, { versie: o.versie, totaal: Number(o.totaal_incl) })
    }
  }
  const out = new Map<string, number>()
  for (const [lead, v] of best) out.set(lead, v.totaal)
  return out
}

/**
 * Bouwt omzet-rijen voor gewonnen leads. Bedrag = laatste verzonden
 * offerte-snapshot, anders leads.totaal_prijs, anders 0. Win-datum =
 * akkoord_op, anders afspraak_geboekt_op. Leads zonder win-datum worden
 * overgeslagen.
 */
export function buildOmzetRows(
  wonLeads: WonLeadInput[],
  sentOffertes: SentOfferteInput[],
): OmzetRowOut[] {
  const snapByLead = latestSentTotaalByLead(sentOffertes)
  const out: OmzetRowOut[] = []
  for (const l of wonLeads) {
    const wonDate = l.akkoord_op ?? l.afspraak_geboekt_op
    if (!wonDate) continue
    const snap = snapByLead.get(l.lead_id)
    const prijs = snap != null ? snap : l.totaal_prijs != null ? Number(l.totaal_prijs) : 0
    out.push({ wonDate, prijs, categorie: l.hoofdcategorie ?? 'Onbekend' })
  }
  return out
}
