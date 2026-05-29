export type ReviewStatus = 'nieuw' | 'beantwoord'
export type ReviewTab = 'nieuw' | 'beantwoord' | 'aandacht'

export type MobileReview = {
  id: string
  naam: string
  initial: string
  /** Avatar-merk-kleur (data; hex). Geïnjecteerd via --avatar-bg. */
  color: string
  /** 0..5 (per review heel; aggregaat mag fractioneel). */
  sterren: number
  datum: string
  plaats: string
  text: string
  status: ReviewStatus
  /** Negatieve review die aandacht vraagt. */
  flag?: boolean
  /** Bestaande (reeds geplaatste) reactie. */
  reply?: string
}

export type ReviewTemplate = { k: string; label: string; text: string }

/** Drafts/done: id → tekst. */
export type ReviewTextMap = Record<string, string>

/** Eerste woord van de naam; de letterlijke 'Familie' wordt 'familie'. */
export function voornaam(naam: string): string {
  const first = naam.split(' ')[0] ?? ''
  return first === 'Familie' ? 'familie' : first
}

/** Vervangt {v} in een sjabloon door de voornaam. */
export function fillTemplate(tpl: string, naam: string): string {
  return tpl.replace('{v}', voornaam(naam))
}

/** Een review telt als "beantwoord" als status zo is, óf lokaal beantwoord (done). */
function isReplied(r: MobileReview, done: ReviewTextMap): boolean {
  return r.status === 'beantwoord' || Boolean(done[r.id])
}

export function reviewCounts(reviews: MobileReview[], done: ReviewTextMap) {
  return {
    nieuw: reviews.filter((r) => r.status === 'nieuw' && !done[r.id]).length,
    beantwoord: reviews.filter((r) => isReplied(r, done)).length,
    aandacht: reviews.filter((r) => r.flag && !done[r.id]).length,
  }
}

export function filterReviews(
  reviews: MobileReview[],
  tab: ReviewTab,
  done: ReviewTextMap,
): MobileReview[] {
  return reviews.filter((r) => {
    if (tab === 'nieuw') return r.status === 'nieuw' && !done[r.id]
    if (tab === 'beantwoord') return isReplied(r, done)
    return Boolean(r.flag) && !done[r.id]
  })
}
