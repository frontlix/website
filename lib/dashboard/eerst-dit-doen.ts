import type { LeadListItem } from './lead-queries'
import { isHandover } from './lead-status-meta'
import { amsterdamDayKey } from './amsterdam-time'

/**
 * "Eerst dit doen", afleiding van openstaande owner-acties uit de leads-lijst.
 *
 * Doel: één heldere actiehiërarchie bovenaan het dashboard. Geen aparte tabel,  * we leiden alles af uit bestaande lead-velden zodat de UI puur op leesoperaties
 * draait. Volgorde: tone (hot vóór warm) → urgency-score → wachttijd desc.
 */

export type ActionTone = 'hot' | 'warm'

export type ActionKind =
  | 'handover'            // bot heeft overgedragen (buiten werkgebied + onder min-m2)
  | 'owner_review'        // pending_eigenaar_review is set
  | 'klus_geblokkeerd'    // klus_geblokkeerd = true
  | 'offerte_versturen'   // offerte_pending_sinds set + nog niet verstuurd
  | 'afspraak_vandaag'    // afspraak_datum = vandaag, nog open
  | 'klus_afronden'       // afspraak voorbij + nog open: ging de klus door?
  | 'onderhandeling'      // gesprek_fase = 'onderhandelen' (en niet al owner_review)
  | 'buiten_radius'       // afstand_km > 75 + nog niet beslist
  | 'stille_klant'        // offerte verstuurd > 3d geleden, geen akkoord

export interface DashboardAction {
  id: string
  leadId: string
  kind: ActionKind
  tone: ActionTone
  /** Eerste regel, actie-titel ("Owner-review nodig") */
  title: string
  /** Tweede regel, context ("Korstmos-toeslag · €736") */
  subtitle: string
  /** Wachtlabel rechts ("Wacht 4u 12m", "Vandaag", "3d open") */
  waitLabel: string
  /** Onderliggende wacht-duur in ms, voor sortering */
  waitMs: number
  /** Hogere waarde = urgenter, gebruikt als tie-breaker */
  urgency: number
}

// Fallback-werkstraal als de caller geen radius_max_km meegeeft. De echte
// waarde komt uit tenant_settings.radius_max_km (getRadiusMaxKm), zodat de
// "buiten radius"-actie de INGESTELDE werkstraal volgt i.p.v. een vast getal.
const KM_RADIUS_LIMIT = 200 // boven de werkstraal = "buiten radius, beslissen"
const STILLE_KLANT_THRESHOLD_MS = 3 * 24 * 60 * 60 * 1000 // 3 dagen
const OFFERTE_PENDING_HOT_MS = 12 * 60 * 60 * 1000 // 12u, daarna wordt het hot
const NOW_TOLERANCE_MS = 60 * 1000 // < 1 min behandelen we als "Nu"

/**
 * Bouwt het bericht-onafhankelijke wachtlabel.
 * - < 1 min  → "Nu"
 * - < 1u     → "Xm"
 * - < 24u    → "Xu Ym" (m alleen als > 0)
 * - 1-7 dgn  → "Xd open"
 * - > 7 dgn  → ">7d"
 */
function formatWait(waitMs: number): string {
  if (waitMs < NOW_TOLERANCE_MS) return 'Nu'
  const totalMin = Math.floor(waitMs / 60000)
  if (totalMin < 60) return `${totalMin}m`
  const totalHours = Math.floor(totalMin / 60)
  if (totalHours < 24) {
    const restMin = totalMin - totalHours * 60
    return restMin > 0 ? `${totalHours}u ${restMin}m` : `${totalHours}u`
  }
  const days = Math.floor(totalHours / 24)
  if (days > 7) return '>7d'
  return `${days}d open`
}

function formatPrijs(prijs: number | null | undefined): string {
  if (!prijs) return ''
  return `€${Math.round(prijs).toLocaleString('nl-NL')}`
}

function isVandaag(isoDate: string | null): boolean {
  if (!isoDate) return false
  const d = new Date(isoDate)
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

/**
 * Ligt `isoDate` (de afspraak-datum) vóór vandaag in Amsterdam-tijd? Vergelijkt
 * dag-sleutels (YYYY-MM-DD) zodat een afspraak van gisteren of eerder telt en
 * vandaag NIET (die valt onder de afspraak_vandaag-actie). DST-correct via
 * amsterdamDayKey.
 */
function isVoorVandaag(isoDate: string | null, nowMs: number): boolean {
  if (!isoDate) return false
  const d = new Date(isoDate)
  if (Number.isNaN(d.getTime())) return false
  return amsterdamDayKey(d) < amsterdamDayKey(new Date(nowMs))
}

/**
 * Per lead: bepaal de zwaarste actie. Eén lead = max één rij in "Eerst dit doen",
 * anders gaat hetzelfde lead in meerdere rijen onder elkaar staan.
 */
function deriveActionForLead(
  lead: LeadListItem,
  nowMs: number,
  radiusMaxKm: number = KM_RADIUS_LIMIT,
  klusStatusMelden: boolean = true,
): DashboardAction | null {
  // 0. Bot heeft de lead overgedragen: eigenaar moet het gesprek zelf voeren.
  //    Verdwijnt zodra de lead is afgehandeld/geen interesse/gearchiveerd.
  if (
    isHandover(lead) &&
    lead.dashboard_status !== 'afgehandeld' &&
    lead.dashboard_status !== 'geen_interesse' &&
    lead.dashboard_status !== 'archief'
  ) {
    const createdMs = lead.aangemaakt ? new Date(lead.aangemaakt).getTime() : nowMs
    const waitMs = Math.max(0, nowMs - createdMs)
    return {
      id: `handover-${lead.lead_id}`,
      leadId: lead.lead_id,
      kind: 'handover',
      tone: 'hot',
      title: `Zelf overnemen: ${lead.naam ?? 'onbekend'}`,
      subtitle: subtitleForLead(lead),
      waitLabel: formatWait(waitMs),
      waitMs,
      urgency: 95,
    }
  }

  // 1. Klus geblokkeerd → altijd hot, hoogste urgency
  if (lead.klus_geblokkeerd === true) {
    const updatedMs = lead.bijgewerkt ? new Date(lead.bijgewerkt).getTime() : nowMs
    const waitMs = Math.max(0, nowMs - updatedMs)
    return {
      id: `blokk-${lead.lead_id}`,
      leadId: lead.lead_id,
      kind: 'klus_geblokkeerd',
      tone: 'hot',
      title: 'Klus geblokkeerd, beslissen',
      subtitle: subtitleForLead(lead),
      waitLabel: formatWait(waitMs),
      waitMs,
      urgency: 100,
    }
  }

  // 2. Owner-review nodig (expliciete flag) → hot
  if (lead.pending_eigenaar_review !== null && lead.pending_eigenaar_review !== undefined) {
    const updatedMs = lead.bijgewerkt ? new Date(lead.bijgewerkt).getTime() : nowMs
    const waitMs = Math.max(0, nowMs - updatedMs)
    return {
      id: `review-${lead.lead_id}`,
      leadId: lead.lead_id,
      kind: 'owner_review',
      tone: 'hot',
      title: 'Owner-review nodig',
      subtitle: subtitleForLead(lead),
      waitLabel: formatWait(waitMs),
      waitMs,
      urgency: 90,
    }
  }

  // 3. Offerte wacht op verzending (offerte_pending_sinds gezet, niet verstuurd)
  if (lead.offerte_pending_sinds && lead.offerte_verstuurd !== true) {
    const sindsMs = new Date(lead.offerte_pending_sinds).getTime()
    const waitMs = Math.max(0, nowMs - sindsMs)
    const isHot = waitMs > OFFERTE_PENDING_HOT_MS
    return {
      id: `offerte-${lead.lead_id}`,
      leadId: lead.lead_id,
      kind: 'offerte_versturen',
      tone: isHot ? 'hot' : 'warm',
      title: isHot ? 'Offerte versturen, wacht al' : 'Offerte vandaag versturen',
      subtitle: subtitleForLead(lead),
      waitLabel: isVandaag(lead.offerte_pending_sinds) && !isHot ? 'Vandaag' : formatWait(waitMs),
      waitMs,
      urgency: isHot ? 80 : 50,
    }
  }

  // 4. Afspraak vandaag, nog open
  if (
    lead.afspraak_datum &&
    isVandaag(lead.afspraak_datum) &&
    lead.dashboard_status === 'open'
  ) {
    return {
      id: `afspraak-${lead.lead_id}`,
      leadId: lead.lead_id,
      kind: 'afspraak_vandaag',
      tone: 'hot',
      title: 'Afspraak vandaag, bevestig',
      subtitle: subtitleForLead(lead),
      waitLabel: 'Vandaag',
      waitMs: 0,
      urgency: 85,
    }
  }

  // 4b. Afspraak voorbij maar lead nog open: ging de klus door? De owner moet
  //     de klus afronden (afgehandeld) of als niet-doorgegaan markeren. Alleen
  //     als de toggle (tenant_settings.klus_status_melden) aan staat. Een al
  //     geblokkeerde klus is hier niet meer relevant: stap 1 (klus_geblokkeerd)
  //     vangt die lead al af en returnt vóór deze conditie.
  if (
    klusStatusMelden &&
    lead.afspraak_datum &&
    isVoorVandaag(lead.afspraak_datum, nowMs) &&
    lead.dashboard_status === 'open'
  ) {
    const afspraakMs = new Date(lead.afspraak_datum).getTime()
    const waitMs = Math.max(0, nowMs - afspraakMs)
    return {
      id: `klus-${lead.lead_id}`,
      leadId: lead.lead_id,
      kind: 'klus_afronden',
      tone: 'warm',
      title: "Klus afronden, ging 'ie door?",
      subtitle: subtitleForLead(lead),
      waitLabel: formatWait(waitMs),
      waitMs,
      urgency: 70,
    }
  }

  // 5. Klant in onderhandeling (warm)
  if (lead.gesprek_fase === 'onderhandelen') {
    const updatedMs = lead.bijgewerkt ? new Date(lead.bijgewerkt).getTime() : nowMs
    const waitMs = Math.max(0, nowMs - updatedMs)
    return {
      id: `onderh-${lead.lead_id}`,
      leadId: lead.lead_id,
      kind: 'onderhandeling',
      tone: 'warm',
      title: 'Klant in onderhandeling',
      subtitle: subtitleForLead(lead),
      waitLabel: formatWait(waitMs),
      waitMs,
      urgency: 40,
    }
  }

  // 6. Buiten radius, owner moet beslissen of we de klus aannemen
  if (
    lead.afstand_km !== null &&
    lead.afstand_km !== undefined &&
    lead.afstand_km > radiusMaxKm &&
    lead.dashboard_status !== 'afgehandeld' &&
    lead.dashboard_status !== 'geen_interesse' &&
    lead.dashboard_status !== 'archief' &&
    lead.offerte_verstuurd !== true
  ) {
    const createdMs = lead.aangemaakt ? new Date(lead.aangemaakt).getTime() : nowMs
    const waitMs = Math.max(0, nowMs - createdMs)
    return {
      id: `radius-${lead.lead_id}`,
      leadId: lead.lead_id,
      kind: 'buiten_radius',
      tone: 'warm',
      title: 'Buiten radius, beslissen',
      subtitle: `${Math.round(lead.afstand_km)} km · ${lead.plaats ?? '—'}${
        lead.totaal_prijs ? ` · ${formatPrijs(lead.totaal_prijs)}` : ''
      }`,
      waitLabel: formatWait(waitMs),
      waitMs,
      urgency: 30,
    }
  }

  // 7. Stille klant na offerte (> 3 dagen, geen akkoord)
  if (
    lead.offerte_verstuurd === true &&
    lead.offerte_verstuurd_op &&
    !lead.akkoord_op &&
    lead.dashboard_status === 'open'
  ) {
    const verstuurdMs = new Date(lead.offerte_verstuurd_op).getTime()
    const waitMs = Math.max(0, nowMs - verstuurdMs)
    if (waitMs >= STILLE_KLANT_THRESHOLD_MS) {
      return {
        id: `stil-${lead.lead_id}`,
        leadId: lead.lead_id,
        kind: 'stille_klant',
        tone: 'warm',
        title: 'Stille klant, follow-up?',
        subtitle: subtitleForLead(lead),
        waitLabel: formatWait(waitMs),
        waitMs,
        urgency: 20,
      }
    }
  }

  return null
}

function subtitleForLead(lead: LeadListItem): string {
  const parts: string[] = []
  if (lead.hoofdcategorie) parts.push(lead.hoofdcategorie)
  if (lead.totaal_prijs) parts.push(formatPrijs(lead.totaal_prijs))
  else if (lead.naam) parts.push(lead.naam)
  return parts.join(' · ')
}

/**
 * Verzamel + sorteer alle openstaande acties uit de leads-lijst.
 * - Eén actie per lead (zwaarste)
 * - Sortering: tone (hot vóór warm) → urgency desc → waitMs desc
 * - Cap op `max` (default 5) zodat het lijstje overzichtelijk blijft
 */
export function deriveActions(
  leads: LeadListItem[],
  max: number = 5,
  radiusMaxKm: number = KM_RADIUS_LIMIT,
  klusStatusMelden: boolean = true,
): DashboardAction[] {
  const nowMs = Date.now()
  const actions: DashboardAction[] = []

  for (const lead of leads) {
    const a = deriveActionForLead(lead, nowMs, radiusMaxKm, klusStatusMelden)
    if (a) actions.push(a)
  }

  actions.sort((a, b) => {
    if (a.tone !== b.tone) return a.tone === 'hot' ? -1 : 1
    if (a.urgency !== b.urgency) return b.urgency - a.urgency
    return b.waitMs - a.waitMs
  })

  return actions.slice(0, max)
}

/** Helper: tellingen voor de hot/warm-pills rechtsboven in de card. */
export function countByTone(actions: DashboardAction[]): { hot: number; warm: number } {
  return actions.reduce(
    (acc, a) => {
      if (a.tone === 'hot') acc.hot += 1
      else acc.warm += 1
      return acc
    },
    { hot: 0, warm: 0 },
  )
}
