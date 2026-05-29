import type { DossierLead } from './dossier-mock'

/** '€ 1.871,57' — nl-NL met 2 decimalen. */
export function dossEur(n: number): string {
  return `€ ${n.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** Tot 2 hoofdletter-initialen; 'L' als fallback. */
export function initials(naam: string): string {
  const parts = naam.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'L'
  return parts.map((p) => p[0]).slice(0, 2).join('').toUpperCase()
}

/** 4 KPI-feiten voor de fact-strip. */
export function factStrip(lead: DossierLead): Array<{ v: string; l: string }> {
  return [
    { v: `${lead.m2} m²`, l: 'Oppervlak' },
    { v: String(lead.fotos), l: "Foto's" },
    { v: lead.prijs ? `€ ${lead.prijs.toLocaleString('nl-NL')}` : '—', l: 'Offerte' },
    { v: lead.binnen.replace(' geleden', ''), l: 'Binnen' },
  ]
}
