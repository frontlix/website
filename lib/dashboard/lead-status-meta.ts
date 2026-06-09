/**
 * Gedeelde status-meta voor leads. Pure data + helpers, veilig voor imports
 * vanuit client-components.
 *
 * Een lead heeft twee orthogonale status-assen:
 *  - `status`            → de pijplijn-/bot-status (nieuw … offerte_verstuurd).
 *  - `dashboard_status`  → de handmatige owner-follow-up (open … afgehandeld).
 *
 * De leadlijst toont de pijplijn-status. De detailkop toonde alleen de
 * dashboard_status, met "In gesprek" als default bij een lege waarde, waardoor
 * een lead met een klaarstaand concept-offerte misleidend "In gesprek" bleef
 * tonen terwijl de lijst correct "Klaar voor offerte" liet zien. `headerStatusMeta`
 * lijnt de kop weer uit met de lijst.
 */

export type PillTone = 'blue' | 'amber' | 'green' | 'red' | 'gray'
export type StatusMeta = { label: string; tone: PillTone }

// Pijplijn-status (leads.status). Bron van waarheid, gedeeld door de leadlijst
// en de detailkop zodat ze niet uit elkaar lopen.
export const LEAD_STATUS_META: Record<string, StatusMeta> = {
  nieuw:             { label: 'Nieuw',              tone: 'blue'  },
  in_gesprek:        { label: 'In gesprek',         tone: 'blue'  },
  wacht_bevestiging: { label: 'Wacht op bevestig.', tone: 'amber' },
  info_compleet:     { label: 'Klaar voor offerte', tone: 'amber' },
  offerte_verstuurd: { label: 'Offerte verstuurd',  tone: 'amber' },
  goedgekeurd:       { label: 'Goedgekeurd',        tone: 'green' },
  afgewezen:         { label: 'Afgewezen',          tone: 'red'   },
  handoff:           { label: 'Handover',           tone: 'red'   },
}

/** Label + tone voor een pijplijn-status (met nette fallbacks). */
export function leadStatusMeta(status: string | null): StatusMeta {
  if (!status) return { label: '—', tone: 'gray' }
  return LEAD_STATUS_META[status] ?? { label: status.replace(/_/g, ' '), tone: 'gray' }
}

// Handmatige owner-follow-up (leads.dashboard_status).
const DASHBOARD_STATUS_META: Record<string, StatusMeta> = {
  open:           { label: 'In gesprek',     tone: 'green' },
  opgevolgd:      { label: 'Opgevolgd',      tone: 'blue'  },
  afgehandeld:    { label: 'Afgehandeld',    tone: 'green' },
  no_show:        { label: 'No show',        tone: 'amber' },
  geen_interesse: { label: 'Geen interesse', tone: 'red'   },
  archief:        { label: 'Gearchiveerd',   tone: 'gray'  },
}

/** Label + tone voor een handmatige owner-follow-up-status. */
export function dashboardStatusMeta(status: string | null): StatusMeta {
  if (!status) return DASHBOARD_STATUS_META.open
  return DASHBOARD_STATUS_META[status] ?? DASHBOARD_STATUS_META.open
}

/**
 * Welke badge de detailkop toont. Heeft de owner een handmatige follow-up-
 * status gezet (iets anders dan de default 'open'), dan wint die. Anders
 * spiegelen we de pijplijn-status zoals de leadlijst die toont.
 */
export function headerStatusMeta(lead: {
  status: string | null
  dashboard_status: string | null
}): StatusMeta {
  if (lead.dashboard_status && lead.dashboard_status !== 'open') {
    return dashboardStatusMeta(lead.dashboard_status)
  }
  return leadStatusMeta(lead.status)
}
