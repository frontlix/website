import type { LeadListItem } from '@/lib/dashboard/lead-queries'
import { shortTimeAgo } from '@/lib/dashboard/relative-time'
import { botStatusForFase } from '@/lib/dashboard/fase-labels'

export type RawLead = LeadListItem
export type MobileLeadStage = 'gesprek' | 'review' | 'uit' | 'gepland' | 'klaar'
export type MobileLeadCard = {
  id: string
  naam: string
  plaats: string
  m2: number | null
  dienst: string
  stage: MobileLeadStage
  prijs: number | null
  binnen: string
  datum: string | null
  bron: 'wa' | 'form'
  urgent: boolean
  surfaceContext: string
  tagIds: string[]
}

/** Bepaal de mobile-stage op basis van dashboard_status + gesprek_fase. */
export function leadStage(l: RawLead): MobileLeadStage {
  // afgehandeld wint van alles, zelfs als de fase 'datum_kiezen' is
  if (l.dashboard_status === 'afgehandeld') return 'klaar'
  // "Offerte review" = een offerte die op een eigenaar-besluit wacht VÓÓR
  // verzending (pending_eigenaar_review). "Onderhandelen" betekent dat de
  // offerte al verstuurd is en de klant erover in gesprek is; die hoort dus bij
  // "Offerte uit" (met een eigen "In onderhandeling"-status op de kaart).
  if (l.pending_eigenaar_review) return 'review'
  switch (l.gesprek_fase) {
    case 'onderhandelen':
    case 'offerte_besproken':
      return 'uit'
    case 'datum_kiezen':
    case 'afspraak_bevestigd':
      return 'gepland'
    default:
      return 'gesprek'
  }
}

/**
 * Of een lead "urgent" is: wacht op eigenaar-review of de klus is
 * geblokkeerd. Gedeeld tussen de mobile card-mapping en de desktop
 * "Alleen urgent"-filter zodat beide dezelfde definitie gebruiken.
 */
export function isLeadUrgent(l: RawLead): boolean {
  return Boolean(l.pending_eigenaar_review) || Boolean(l.klus_geblokkeerd)
}

/** Bouw het dienst-label: "Hoofdcategorie · sub1 + sub2" of alleen hoofd. */
function dienstLabel(l: RawLead): string {
  const subs = Array.isArray(l.sub_diensten) ? l.sub_diensten.filter(Boolean) : []
  const head = l.hoofdcategorie ?? ''
  return subs.length > 0 ? `${head} · ${subs.join(' + ')}` : head || '—'
}

/** Formatteer afspraak_datum als "ma 19 mei" via nl-NL locale, of null. */
function datumLabel(l: RawLead): string | null {
  if (!l.afspraak_datum) return null
  const d = new Date(l.afspraak_datum)
  if (Number.isNaN(d.getTime())) return null
  return new Intl.DateTimeFormat('nl-NL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(d)
}

/**
 * Map een server LeadListItem naar de card-shape die de mobile UI nodig heeft.
 *
 * `laatsteInteractieAt` is de timestamp van het laatste INKOMENDE (klant)bericht,
 * meegegeven door de lijst-loader. De "binnen"-indicator toont die laatste
 * klant-interactie, of (zonder bericht) de binnenkomst `aangemaakt`. Bewust
 * NIET `bijgewerkt`: dat is een generieke updated_at die ook opspringt bij
 * eigenaar-/systeemacties (bijv. inbox markeren als gelezen), waardoor de kaart
 * onterecht "nu" toonde.
 */
export function mapLeadToCard(
  l: RawLead,
  now: number = Date.now(),
  laatsteInteractieAt?: string | null,
  tagIds: string[] = [],
): MobileLeadCard {
  return {
    id: l.lead_id,
    naam: l.naam ?? 'Onbekend',
    plaats: l.plaats ?? '',
    m2: l.m2,
    dienst: dienstLabel(l),
    stage: leadStage(l),
    prijs: l.totaal_prijs,
    binnen: shortTimeAgo(laatsteInteractieAt ?? l.aangemaakt, now),
    datum: datumLabel(l),
    bron: l.kanaal === 'web' ? 'form' : 'wa',
    urgent: isLeadUrgent(l),
    surfaceContext: botStatusForFase(l.gesprek_fase),
    tagIds,
  }
}
