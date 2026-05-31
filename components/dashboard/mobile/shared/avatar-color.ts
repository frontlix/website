// Stabiele avatar-achtergrondkleur per naam (naam-hash → vast palet). Gedeeld door
// LeadCard (Leads) en InboxRow (Inbox), zodat dezelfde persoon overal dezelfde
// kleur krijgt i.p.v. een uniforme blauwe cirkel.

const AVATAR_COLORS = [
  '#1A56FF', '#0C7AB8', '#7C3AED', '#10B981', '#F59E0B',
  '#EF4444', '#6366F1', '#EC4899', '#14B8A6', '#F97316',
]

/** Deterministische kleur uit het palet op basis van de naam. */
export function getAvatarColor(naam: string): string {
  let hash = 0
  for (let i = 0; i < naam.length; i++) hash = (hash * 31 + naam.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}
