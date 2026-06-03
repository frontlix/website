/**
 * Presets voor tag-iconen en -kleuren. Server-safe (geen React imports),  * wordt zowel client-side (picker UI) als server-side (action-validatie)
 * gebruikt.
 *
 * Iconen → string-keys die mappen naar lucide-react componenten in
 * `components/dashboard/instellingen/tag-icons.tsx`. Kleuren → hex-codes,
 * direct gebruikt als kleur-input in de pill.
 */

export const ICON_OPTIONS = [
  'Tag',
  'Star',
  'Flame',
  'Heart',
  'Crown',
  'Shield',
  'Award',
  'Bell',
  'Bookmark',
  'MapPin',
  'Sparkles',
  'Zap',
  'Diamond',
  'Gem',
  'Target',
  'Flag',
  'AlertTriangle',
  'Briefcase',
  'User',
  'Repeat',
] as const

export type IconKey = (typeof ICON_OPTIONS)[number]

export const COLOR_OPTIONS = [
  '#64748b', // slate (default neutraal)
  '#3b82f6', // blauw
  '#06b6d4', // cyaan
  '#10b981', // groen
  '#84cc16', // limoen
  '#eab308', // geel
  '#f97316', // oranje
  '#ef4444', // rood
  '#ec4899', // roze
  '#a855f7', // paars
] as const

export function isValidIcon(value: unknown): value is IconKey {
  return typeof value === 'string' && (ICON_OPTIONS as readonly string[]).includes(value)
}

export function isValidColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)
}

/**
 * Defaults per systeem-tag. Gebruikt door `ensureSystemTagsExist` om
 * nieuwe systeem-tags te seeden met een kleur + icoon, en om bestaande
 * systeem-tags die nog NULL zijn alsnog te upgraden.
 */
export const SYSTEM_TAG_DEFAULTS: Array<{
  naam: string
  kleur: string
  icon: IconKey
}> = [
  { naam: 'Particulier', kleur: '#3b82f6', icon: 'User' },
  { naam: 'Zakelijk', kleur: '#a855f7', icon: 'Briefcase' },
  { naam: 'Korting', kleur: '#f97316', icon: 'AlertTriangle' },
  { naam: 'Buiten radius', kleur: '#ef4444', icon: 'MapPin' },
  { naam: 'Review', kleur: '#10b981', icon: 'Star' },
]
