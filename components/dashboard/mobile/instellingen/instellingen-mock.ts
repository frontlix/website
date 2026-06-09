/**
 * Sectie-definitie + iconen/tints voor de mobiele Instellingen-hub.
 *
 * De hub-structuur (groepen, iconen, labels) is statisch; de subtitels met
 * tellingen worden via `buildInstSections` met echte counts gevuld (team-leden,
 * actieve diensten, tags). De detailschermen krijgen hun data direct uit de
 * route, er wordt hier geen mock-data meer voor leads/prijzen/team/etc. gehouden.
 */

export type InstSection = {
  k: string
  icon: 'building' | 'users' | 'euro' | 'list' | 'wa' | 'bell' | 'spark' | 'tag' | 'calendar'
  l: string
  s: string
  tint: string
}
export type InstGroup = { group: string; items: InstSection[] }

const IC = { blue: '#1A56FF', green: '#16A34A', amber: '#F59E0B', red: '#DC2626', wa: '#25D366', violet: '#7C3AED' }

/** Counts die de hub-subtitels vullen; allemaal optioneel (neutraal label als afwezig). */
export type InstCounts = {
  teamCount?: number
  dienstenActief?: number
  tagCount?: number
}

/**
 * Bouwt de hub-secties met echte tellingen in de subtitels. Waar geen count
 * beschikbaar is, valt het label terug op een neutrale omschrijving (geen
 * verzonnen getal).
 */
export function buildInstGroups(counts: InstCounts = {}): InstGroup[] {
  const team =
    counts.teamCount !== undefined
      ? `${counts.teamCount} ${counts.teamCount === 1 ? 'lid' : 'leden'}`
      : 'Teamleden beheren'
  const diensten =
    counts.dienstenActief !== undefined
      ? `${counts.dienstenActief} actief`
      : 'Aanbod beheren'
  const tags =
    counts.tagCount !== undefined
      ? `${counts.tagCount} ${counts.tagCount === 1 ? 'tag' : 'tags'}`
      : 'Tags beheren'

  return [
    { group: 'Bedrijf', items: [
      { k: 'bedrijf', icon: 'building', l: 'Bedrijfsgegevens', s: 'Naam, adres, contact', tint: IC.blue },
      { k: 'team', icon: 'users', l: 'Team', s: team, tint: IC.violet },
    ] },
    { group: 'Surface · de bot', items: [
      { k: 'prijzen', icon: 'euro', l: 'Prijzen', s: 'Tarieven voor offertes', tint: IC.green },
      { k: 'diensten', icon: 'list', l: 'Diensten', s: diensten, tint: IC.blue },
      { k: 'opening', icon: 'wa', l: 'Openingsbericht', s: 'WhatsApp-template', tint: IC.wa },
      { k: 'reminders', icon: 'bell', l: 'Reminders', s: 'Automatische opvolging', tint: IC.amber },
      { k: 'integraties', icon: 'calendar', l: 'Agenda', s: 'Google Agenda koppelen', tint: IC.blue },
    ] },
    { group: 'Voorkeuren', items: [
      { k: 'notif', icon: 'spark', l: 'Notificaties', s: 'Per kanaal instellen', tint: IC.violet },
      { k: 'tags', icon: 'tag', l: 'Tags', s: tags, tint: IC.amber },
    ] },
  ]
}

/** Platte sectie-lijst met echte counts, handig voor zoeken + view-lookup. */
export function buildInstSections(counts: InstCounts = {}): InstSection[] {
  return buildInstGroups(counts).flatMap((g) => g.items)
}

/** Statische default-varianten (neutrale subtitels), gebruikt door tests. */
export const INST_GROUPS: InstGroup[] = buildInstGroups()
export const INST_ALL: InstSection[] = buildInstSections()

/* ── Openingsbericht-demo (WA-template preview in InstOpening) ──────────────
   De template-tekst zelf loopt via de Meta-goedkeuringsflow en is in v1 nog
   read-only in mobiel; deze demo-tekst dient alleen als preview-voorbeeld. */
export const INST_OPENING =
  'Hoi {voornaam} 👋\n\nBedankt voor je aanvraag bij {bedrijf}! Ik ben {bot_naam}, jullie online assistent. Ik help je snel aan een offerte op maat voor het reinigen van je {hoofddienst}.\n\nKlopt het dat het om ongeveer {m2} m² gaat?'
export const INST_VARS = ['{voornaam}', '{bedrijf}', '{bot_naam}', '{hoofddienst}', '{m2}', '{plaats}']
