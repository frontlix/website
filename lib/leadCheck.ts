/**
 * Pure rekenmodule voor de lead-lek-check.
 * Formule uit docs/superpowers/specs/2026-06-02-lead-lek-check-spec.md.
 * Gedeeld door de wizard (client) en /api/lead-check (server herberekent).
 */

export type Speed = '5min' | '1uur' | 'paar_uur' | 'zelfde_dag' | 'volgende_dag'
export type Afterhours = 'altijd' | 'soms' | 'nee'
export type Shoppen = 'meestal' | 'soms' | 'zelden'

export interface LeadCheckInput {
  aanvragenPerWeek: number
  speed: Speed
  afterhours: Afterhours
  conversiePct: number
  orderwaarde: number
  shoppen: Shoppen
}

export interface OmzetBand {
  laag: number
  hoog: number
}

export interface LeadCheckResultaat {
  score: number
  uplift: number
  gemisteKlantenMaand: number
  omzetMaand: OmzetBand
  omzetJaar: OmzetBand
}

/* Conservatieve factoren uit de spec; bewust niet aanpasbaar via de UI */
const BASE: Record<Speed, number> = {
  '5min': 0,
  '1uur': 0.08,
  paar_uur: 0.18,
  zelfde_dag: 0.3,
  volgende_dag: 0.45,
}
const AFTERHOURS_BONUS: Record<Afterhours, number> = { altijd: 0, soms: 0.05, nee: 0.12 }
const SHOP_MULT: Record<Shoppen, number> = { meestal: 1, soms: 0.65, zelden: 0.35 }
const MAX_UPLIFT = 0.6
const WEKEN_PER_MAAND = 4.33
const BAND_LAAG_FACTOR = 0.7

/* Invoergrenzen, ook server-side afgedwongen */
export const GRENZEN = {
  aanvragenPerWeek: { min: 0, max: 500 },
  conversiePct: { min: 1, max: 100 },
  orderwaarde: { min: 0, max: 100_000 },
} as const

export function berekenLeadCheck(input: LeadCheckInput): LeadCheckResultaat {
  const aanvragenMaand = input.aanvragenPerWeek * WEKEN_PER_MAAND
  const klantenMaand = aanvragenMaand * (input.conversiePct / 100)

  const uplift = Math.min(
    MAX_UPLIFT,
    (BASE[input.speed] + AFTERHOURS_BONUS[input.afterhours]) * SHOP_MULT[input.shoppen]
  )

  const gemisteKlantenMaand = klantenMaand * uplift
  const hoogMaand = gemisteKlantenMaand * input.orderwaarde

  return {
    score: Math.round((uplift / MAX_UPLIFT) * 100),
    uplift,
    gemisteKlantenMaand,
    omzetMaand: { laag: hoogMaand * BAND_LAAG_FACTOR, hoog: hoogMaand },
    omzetJaar: { laag: hoogMaand * BAND_LAAG_FACTOR * 12, hoog: hoogMaand * 12 },
  }
}

/** Conditionele verbeterpunten uit de spec, maximaal 3, copy zonder streepjes. */
export function verbeterpunten(input: LeadCheckInput): string[] {
  const punten: string[] = []
  if (input.speed === 'paar_uur' || input.speed === 'zelfde_dag' || input.speed === 'volgende_dag') {
    punten.push('Sneller reageren is je grootste hefboom: binnen een uur reageren kan je conversie merkbaar verhogen.')
  }
  if (input.afterhours !== 'altijd') {
    punten.push('Aanvragen die in de avond of het weekend binnenkomen liggen tot de volgende werkdag stil. Daar lekt het hardst.')
  }
  if (input.conversiePct < 25) {
    punten.push('Een deel van je aanvragers haakt af voordat er contact is. Snelle, persoonlijke opvolging tilt dit op.')
  }
  if (input.shoppen === 'meestal') {
    punten.push('Je klanten vergelijken meerdere aanbieders. Dan wint wie als eerste een goede offerte stuurt.')
  }
  return punten.slice(0, 3)
}

export interface LekVerdeling {
  /** Aandeel van het maand-lek (hoog-band) door trage reactie overdag. */
  reactieMaand: number
  /** Aandeel van het maand-lek (hoog-band) door avond- en weekendgaten. */
  avondMaand: number
  /** Kwalitatief effect van offerte-shoppen: dempt het lek of telt het volledig mee. */
  shoppenEffect: 'volledig' | 'gedempt' | 'sterk_gedempt'
}

/**
 * Verdeelt het geschatte maand-lek over zijn twee bronnen, naar rato van de
 * factoren uit de formule. Shoppen is in dit conservatieve model een
 * dempfactor (multiplier ≤ 1), geen aparte geldbron, en blijft dus kwalitatief.
 */
export function lekVerdeling(input: LeadCheckInput): LekVerdeling {
  const totaal = berekenLeadCheck(input).omzetMaand.hoog
  const wReactie = BASE[input.speed]
  const wAvond = AFTERHOURS_BONUS[input.afterhours]
  const som = wReactie + wAvond
  const reactieMaand = som > 0 ? totaal * (wReactie / som) : 0
  return {
    reactieMaand,
    avondMaand: som > 0 ? totaal - reactieMaand : 0,
    shoppenEffect:
      input.shoppen === 'meestal' ? 'volledig' : input.shoppen === 'soms' ? 'gedempt' : 'sterk_gedempt',
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

/** Valideert onbekende invoer (bijv. uit een request-body). Null bij ongeldig. */
export function parseLeadCheckInput(raw: unknown): LeadCheckInput | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>

  const speeds: Speed[] = ['5min', '1uur', 'paar_uur', 'zelfde_dag', 'volgende_dag']
  const afterhoursOpties: Afterhours[] = ['altijd', 'soms', 'nee']
  const shoppenOpties: Shoppen[] = ['meestal', 'soms', 'zelden']

  if (!speeds.includes(r.speed as Speed)) return null
  if (!afterhoursOpties.includes(r.afterhours as Afterhours)) return null
  if (!shoppenOpties.includes(r.shoppen as Shoppen)) return null

  const aanvragen = Number(r.aanvragenPerWeek)
  const conversie = Number(r.conversiePct)
  const order = Number(r.orderwaarde)
  if (!Number.isFinite(aanvragen) || !Number.isFinite(conversie) || !Number.isFinite(order)) return null

  return {
    aanvragenPerWeek: clamp(aanvragen, GRENZEN.aanvragenPerWeek.min, GRENZEN.aanvragenPerWeek.max),
    speed: r.speed as Speed,
    afterhours: r.afterhours as Afterhours,
    conversiePct: clamp(conversie, GRENZEN.conversiePct.min, GRENZEN.conversiePct.max),
    orderwaarde: clamp(order, GRENZEN.orderwaarde.min, GRENZEN.orderwaarde.max),
    shoppen: r.shoppen as Shoppen,
  }
}

/** Euro-weergave zonder decimalen, nl-NL (gedeeld door UI en mails). */
export function euro(n: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Math.round(n))
}
