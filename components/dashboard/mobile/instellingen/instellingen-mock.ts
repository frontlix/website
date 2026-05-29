/** MOCK — v1 UI gebruikt lokale state hiervan. Wiren aan echte settings-actions
 *  gebeurt in de functionele eind-pass (zie plan-context). */

export type InstSection = {
  k: string
  icon: 'building' | 'users' | 'euro' | 'list' | 'wa' | 'bell' | 'spark' | 'tag'
  l: string
  s: string
  tint: string
}
export type InstGroup = { group: string; items: InstSection[] }

const IC = { blue: '#1A56FF', green: '#16A34A', amber: '#F59E0B', red: '#DC2626', wa: '#25D366', violet: '#7C3AED' }

export const INST_GROUPS: InstGroup[] = [
  { group: 'Bedrijf', items: [
    { k: 'bedrijf', icon: 'building', l: 'Bedrijfsgegevens', s: 'Naam, adres, contact', tint: IC.blue },
    { k: 'team', icon: 'users', l: 'Team', s: '3 leden', tint: IC.violet },
  ] },
  { group: 'Surface · de bot', items: [
    { k: 'prijzen', icon: 'euro', l: 'Prijzen', s: 'Tarieven voor offertes', tint: IC.green },
    { k: 'diensten', icon: 'list', l: 'Diensten', s: '4 actief', tint: IC.blue },
    { k: 'opening', icon: 'wa', l: 'Openingsbericht', s: 'WhatsApp-template', tint: IC.wa },
    { k: 'reminders', icon: 'bell', l: 'Reminders', s: '3 herinneringen', tint: IC.amber },
  ] },
  { group: 'Voorkeuren', items: [
    { k: 'notif', icon: 'spark', l: 'Notificaties', s: 'Per kanaal instellen', tint: IC.violet },
    { k: 'tags', icon: 'tag', l: 'Tags', s: '7 tags', tint: IC.amber },
  ] },
]
export const INST_ALL: InstSection[] = INST_GROUPS.flatMap((g) => g.items)

export type PriceItem = { k: string; l: string; v: number; unit: string; step: number }
export const INST_PRICE: PriceItem[] = [
  { k: 'oprit', l: 'Oprit reinigen', v: 3.95, unit: '/m²', step: 0.05 },
  { k: 'terras', l: 'Terras reinigen', v: 4.5, unit: '/m²', step: 0.05 },
  { k: 'gevel', l: 'Gevelreiniging', v: 6.25, unit: '/m²', step: 0.05 },
  { k: 'voegzand', l: 'Voegzand', v: 18.0, unit: '/zak', step: 0.5 },
  { k: 'voorrij', l: 'Voorrijkosten', v: 0.35, unit: '/km', step: 0.05 },
]

export type NotifType = { k: string; l: string; def: { app: boolean; push: boolean; mail: boolean } }
export const INST_NOTIF: NotifType[] = [
  { k: 'new_lead', l: 'Nieuwe lead', def: { app: true, push: true, mail: true } },
  { k: 'review_req', l: 'Owner-review nodig', def: { app: true, push: true, mail: false } },
  { k: 'discount', l: 'Korting gevraagd', def: { app: true, push: true, mail: false } },
  { k: 'quote_ok', l: 'Offerte akkoord', def: { app: true, push: true, mail: true } },
  { k: 'review_in', l: 'Nieuwe review', def: { app: true, push: false, mail: true } },
  { k: 'daily', l: 'Dagsamenvatting', def: { app: false, push: false, mail: true } },
]

export const INST_OPENING =
  'Hoi {voornaam} 👋\n\nBedankt voor je aanvraag bij {bedrijf}! Ik ben {bot_naam}, jullie online assistent. Ik help je snel aan een offerte op maat voor het reinigen van je {hoofddienst}.\n\nKlopt het dat het om ongeveer {m2} m² gaat?'
export const INST_VARS = ['{voornaam}', '{bedrijf}', '{bot_naam}', '{hoofddienst}', '{m2}', '{plaats}']

export type Reminder = { dag: number; label: string; tone: string; sub: string }
export const INST_REMINDERS: Reminder[] = [
  { dag: 2, label: 'Eerste herinnering', tone: IC.blue, sub: 'Vriendelijk, zonder druk' },
  { dag: 5, label: 'Tweede herinnering', tone: IC.amber, sub: 'Vraagt of klant nog interesse heeft' },
  { dag: 8, label: 'Derde herinnering', tone: IC.red, sub: 'Laatste poging, optie tot afmelden' },
]

export type TeamMember = { naam: string; email: string; role: string; tint: string }
export const INST_TEAM: TeamMember[] = [
  { naam: 'Christiaan Tromp', email: 'christiaan@frontlix.com', role: 'Owner', tint: IC.blue },
  { naam: 'Georg Tromp', email: 'georg@frontlix.com', role: 'Admin', tint: IC.violet },
  { naam: 'Lisa Vermeer', email: 'lisa@schoonstraatje.nl', role: 'Member', tint: IC.green },
]

export type Tag = { l: string; c: string; n: number; sys?: boolean }
export const INST_TAGS: Tag[] = [
  { l: 'Particulier', c: '#6B7280', n: 14, sys: true }, { l: 'Zakelijk', c: IC.blue, n: 3, sys: true },
  { l: 'Repeat', c: IC.green, n: 2 }, { l: '⚠️ Korting', c: IC.amber, n: 1, sys: true },
  { l: '📍 Buiten radius', c: IC.red, n: 1, sys: true }, { l: '⭐ Review', c: IC.violet, n: 1 },
  { l: 'VIP-klant', c: IC.blue, n: 0 },
]

export type Dienst = { l: string; on: boolean }
export const INST_DIENSTEN: Dienst[] = [
  { l: 'Terras reinigen', on: true }, { l: 'Oprit & paden', on: true }, { l: 'Gevelreiniging', on: true },
  { l: 'Voegen herstellen', on: true }, { l: 'Onkruidbeheersing', on: false },
]
