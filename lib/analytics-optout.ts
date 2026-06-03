// Eigen-bezoek-opt-out voor analytics (PostHog + Google Analytics).
// Chris/Georg bezoeken eenmalig `frontlix.com?notrack=1` op een apparaat/browser →
// dat zet een localStorage-vlag, waarna beide tools dat apparaat niet meer tracken.
// `?notrack=0` zet het weer aan.

const KEY = 'frontlix_notrack'

/** Lees de opt-out-status uit de URL (?notrack=1 / =0) en sla 'm op. Roep aan bij init. */
export function applyOptOutFromUrl(): void {
  if (typeof window === 'undefined') return
  try {
    const v = new URLSearchParams(window.location.search).get('notrack')
    if (v === '1') localStorage.setItem(KEY, '1')
    else if (v === '0') localStorage.removeItem(KEY)
  } catch {
    // localStorage kan geblokkeerd zijn (private mode), dan gewoon wél tracken
  }
}

/** True als dit apparaat/deze browser zichzelf heeft uitgesloten van tracking. */
export function isOptedOut(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}
