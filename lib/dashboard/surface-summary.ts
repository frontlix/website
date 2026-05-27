/**
 * Pure tekst-builder voor de "Surface samenvatting" — een template-based
 * Nederlandse dag-cijfer-tekst die wordt getoond bovenaan zowel de
 * desktop-Overzicht (SurfaceDailySummary) als de mobile Overzicht
 * (AiBriefCard). Geen AI-call hier: deterministische zinnen op basis
 * van echte stats. Upgrade naar OpenAI kan later zonder caller-changes.
 *
 * Gestructureerd zodat elke zin alleen verschijnt als 'ie iets toevoegt
 * — geen awkward "0 nieuwe leads vandaag, 0 offertes uit, 0 akkoord."
 */

export type SurfaceSummaryStats = {
  leadsVandaag: number
  offertesWeek: number
  akkoordWeek: number
  omzetMaand: number
  gemTicket: number
}

export function buildSurfaceSummary(s: SurfaceSummaryStats): string {
  const zinnen: string[] = []

  // Zin 1 — vandaag + week
  const today =
    s.leadsVandaag === 0
      ? 'Nog geen nieuwe leads vandaag'
      : `${s.leadsVandaag} ${plural(s.leadsVandaag, 'nieuwe lead', 'nieuwe leads')} vandaag`
  const offertesPart =
    s.offertesWeek > 0
      ? `${s.offertesWeek} ${plural(s.offertesWeek, 'offerte', 'offertes')} uit deze week`
      : null
  const akkoordPart = s.akkoordWeek > 0 ? `${s.akkoordWeek} akkoord` : null

  const dayParts = [today, offertesPart, akkoordPart].filter(Boolean) as string[]
  zinnen.push(dayParts.join(', ') + '.')

  // Zin 2 — omzet + ticket
  const omzetTxt =
    s.omzetMaand > 0 ? `Omzet maand-tot-nu €${formatEuro(s.omzetMaand)}` : null
  const ticketTxt =
    s.gemTicket > 0 ? `gem. ticket €${formatEuro(s.gemTicket)}` : null
  const omzetParts = [omzetTxt, ticketTxt].filter(Boolean) as string[]
  if (omzetParts.length > 0) {
    zinnen.push(omzetParts.join(' — ') + '.')
  }

  return zinnen.join(' ')
}

function plural(n: number, een: string, meer: string): string {
  return n === 1 ? een : meer
}

function formatEuro(n: number): string {
  return Math.round(n).toLocaleString('nl-NL')
}
