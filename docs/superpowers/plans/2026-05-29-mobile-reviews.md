# Mobile Reviews — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the mobile **Reviews** screen (route `/reviews`) pixel-matched to the design handoff: a Google-reviews model (5-star) with a score-header, 3 tabs (Nieuw / Beantwoord / Aandacht), review cards with an inline reply composer (template chips + name substitution), a negative-review "Aandacht" accent, and a success toast.

**Architecture:** Pure-UI screen with **mock data** (there is no `reviews` table yet — confirmed; the desktop `/reviews` is a separate NPS demo and stays untouched). A `'use client'` `MobileReviews` component owns the interaction state (active tab, open composer, drafts, locally-placed replies, toast). Pure logic (star-fill math, name substitution, tab counts/filtering) lives in tested helper modules. Mounted CSS-gated in the existing `reviews/page.tsx` via the `.desktopTree`/`.mobileTree` split, exactly like `statistieken` and `leads`.

**Tech Stack:** Next.js App Router, TypeScript, CSS Modules, design tokens, lucide-react icons, vitest.

---

## Context the engineer needs

- **Mock-only, clearly labelled.** Per the master spec, Reviews ships with mock data (Google 5-star model from the handoff). NPS↔Google reconciliation + a real `reviews` table are explicitly out of scope. Name the mock file so this is obvious.
- **The shell renders the "Reviews" title + header** (`MobileShellHeader` PAGE_TITLES `'/reviews': 'Reviews'`). So `MobileReviews` renders **content only**, starting with the Google score-header (which shows "Google-reviews" + the 4,8 aggregate — that is content, not a page title). No top status-bar padding (the shell's `<main>` handles header + bottom-nav spacing).
- **Mount pattern = `statistieken`/`leads`.** The page renders both `.desktopTree` (existing NPS UI, unchanged) and `.mobileTree` (`<MobileReviews/>`); CSS toggles at `max-width:640px`. The desktop page is a server component with `export const dynamic = 'force-dynamic'` — leave that and all desktop markup intact, just wrap it.
- **House-style (must follow):** one `.tsx` + colocated `.module.css`; `'use client'` on interactive components; named exports; camelCase classes; **variants via `data-*`**; dynamic values via **CSS custom properties injected through `style`** (e.g. `style={{ '--star-fill': '60%' } as React.CSSProperties}`) — never inline theme colors (see how `BarRow`/`DonutRing` were built in the Analyses round). All color/spacing/radius via `var(--token)`.
- **Icons:** use `lucide-react` (`Check`, `Flame`) — the handoff's `AIcon name="check"/"fire"` map to these. (`Check` for the empty-state + toast, `Flame` for the herstel-hint.)
- **Reference (pixel source):** `mobile-app-handoff/src/screens/MobileReviews.jsx` — keep it open. All spacing/size/weight values below come from it; the handoff's inline `t.*`/`GREV.*` map to tokens per the table in Task 1.

### Token / color mapping (handoff → ours)

| Handoff | Ours |
|---|---|
| `t.bg` / `t.surface` / `t.surface2` | `--color-bg` / `--color-surface` / `--color-surface-2` |
| `t.fg` / `t.fgSoft` / `t.fgMuted` | `--color-text` / `--color-text-soft` / `--color-text-muted` |
| `t.border` / `t.chipBg` | `--color-border` / `--color-chip-bg` |
| `GREV.yellow` (stars) | **new** `--review-star` |
| star "empty" (`#E3E5E8` / `rgba(255,255,255,.18)`) | **new** `--review-star-empty` |
| `GREV.blue` (Reageer / Plaats op Google) | **new** `--google-blue` |
| `GREV.red` (Aandacht accent) | `--color-danger` (keep codebase semantic red) |
| `GREV.green` (empty-state/toast check) | `--color-success` |
| per-reviewer avatar color | data value (hex in mock), injected via `--avatar-bg` |

---

## Task 1: Reviews (Google) tokens

**Files:**
- Modify: `styles/tokens.css`

- [ ] **Step 1: Add the 3 light tokens to `:root`**

Find the light block added in the Analyses round (`  --color-border-soft: rgba(0, 0, 0, 0.06);`) and add directly after it:

```css
  /* Reviews — Google-merk-accenten (los van het thema). */
  --google-blue: #4285F4;
  --review-star: #FBBC04;
  --review-star-empty: #E3E5E8;
```

- [ ] **Step 2: Add the dark override to `.dark`**

Find `  --color-border-soft: rgba(255, 255, 255, 0.05);` (added in the Analyses round) and add directly after it:

```css
  --review-star-empty: rgba(255, 255, 255, 0.18);
```

(`--google-blue` and `--review-star` are brand colors — no dark override.)

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add styles/tokens.css
git commit -m "feat(mobile/tokens): google-blue + review star tokens"
```

---

## Task 2: StarRating primitive (fractional fill) + math (TDD)

**Files:**
- Create: `components/dashboard/mobile/shared/StarRating.tsx` (+ `.module.css`)
- Test: `components/dashboard/mobile/shared/StarRating.test.ts`

The fractional-fill technique from the handoff: each star is an empty path with a width-clipped overlay of the filled path. Star fill % per index = `clamp(value - i, 0, 1) * 100`.

- [ ] **Step 1: Write the failing test**

Create `components/dashboard/mobile/shared/StarRating.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { starFills } from './StarRating'

describe('starFills', () => {
  it('full stars for an integer rating', () => {
    expect(starFills(5)).toEqual([100, 100, 100, 100, 100])
    expect(starFills(0)).toEqual([0, 0, 0, 0, 0])
  })
  it('partial fill for a fractional rating', () => {
    expect(starFills(4.8)).toEqual([100, 100, 100, 100, 80])
  })
  it('clamps each star between 0 and 100', () => {
    expect(starFills(2)).toEqual([100, 100, 0, 0, 0])
    expect(starFills(3.5)).toEqual([100, 100, 100, 50, 0])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/dashboard/mobile/shared/StarRating.test.ts`
Expected: FAIL — cannot find module `./StarRating`.

- [ ] **Step 3: Write the implementation**

Create `components/dashboard/mobile/shared/StarRating.tsx`:

```typescript
'use client'

import styles from './StarRating.module.css'

const STAR_PATH =
  'M12 2.2l2.9 6.26 6.85.56-5.2 4.52 1.57 6.66L12 16.95 5.88 20.2l1.57-6.66-5.2-4.52 6.85-.56z'

/** Vul-percentage per ster (0..100) voor een waarde van 0..5. */
export function starFills(value: number, count = 5): number[] {
  return Array.from({ length: count }, (_, i) =>
    Math.max(0, Math.min(1, value - i)) * 100,
  )
}

type Props = {
  value: number
  /** Ster-grootte in px. */
  size?: number
  /** Tussenruimte in px. */
  gap?: number
}

/** Google-stijl sterren met fractionele vulling (twee-laags SVG-clip). */
export function StarRating({ value, size = 14, gap = 2 }: Props) {
  const vars = { '--star-size': `${size}px`, '--star-gap': `${gap}px` } as React.CSSProperties
  return (
    <div className={styles.row} style={vars} role="img" aria-label={`${value} van 5 sterren`}>
      {starFills(value).map((pct, i) => (
        <span key={i} className={styles.star} style={{ '--star-fill': `${pct}%` } as React.CSSProperties}>
          <svg className={styles.base} viewBox="0 0 24 24" aria-hidden="true">
            <path d={STAR_PATH} />
          </svg>
          <span className={styles.clip}>
            <svg className={styles.fill} viewBox="0 0 24 24" aria-hidden="true">
              <path d={STAR_PATH} />
            </svg>
          </span>
        </span>
      ))}
    </div>
  )
}
```

Create `components/dashboard/mobile/shared/StarRating.module.css`:

```css
.row {
  display: inline-flex;
  align-items: center;
  gap: var(--star-gap, 2px);
}
.star {
  position: relative;
  display: inline-block;
  width: var(--star-size, 14px);
  height: var(--star-size, 14px);
  flex-shrink: 0;
}
.base,
.fill {
  display: block;
  width: 100%;
  height: 100%;
}
/* CSS `fill` is inherited door de child-<path> (geen fill-attribuut nodig). */
.base {
  position: absolute;
  inset: 0;
  fill: var(--review-star-empty);
}
.clip {
  position: absolute;
  inset: 0;
  width: var(--star-fill, 0%);
  overflow: hidden;
}
.fill {
  fill: var(--review-star);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/dashboard/mobile/shared/StarRating.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/dashboard/mobile/shared/StarRating.tsx components/dashboard/mobile/shared/StarRating.module.css components/dashboard/mobile/shared/StarRating.test.ts
git commit -m "feat(mobile/shared): StarRating primitive with fractional fill + tests"
```

---

## Task 3: review-helpers (types + pure logic, TDD)

**Files:**
- Create: `components/dashboard/mobile/reviews/review-helpers.ts`
- Test: `components/dashboard/mobile/reviews/review-helpers.test.ts`

- [ ] **Step 1: Write the failing test**

Create `components/dashboard/mobile/reviews/review-helpers.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import {
  voornaam,
  fillTemplate,
  reviewCounts,
  filterReviews,
  type MobileReview,
} from './review-helpers'

const reviews: MobileReview[] = [
  { id: 'a', naam: 'Anna Smit', initial: 'A', color: '#4285F4', sterren: 5, datum: '2 dagen geleden', plaats: 'Den Haag', text: '...', status: 'nieuw' },
  { id: 'b', naam: 'Sandra Janssen', initial: 'S', color: '#EA4335', sterren: 4, datum: '1 week geleden', plaats: 'Pijnacker', text: '...', status: 'beantwoord', reply: 'Bedankt!' },
  { id: 'c', naam: 'Bert Koning', initial: 'B', color: '#5F6368', sterren: 2, datum: '2 weken geleden', plaats: 'Utrecht', text: '...', status: 'nieuw', flag: true },
]

describe('voornaam', () => {
  it('takes the first word', () => expect(voornaam('Anna Smit')).toBe('Anna'))
  it('lowercases the literal "Familie"', () => expect(voornaam('Familie Kuiper')).toBe('familie'))
})

describe('fillTemplate', () => {
  it('substitutes {v} with the first name', () => {
    expect(fillTemplate('Bedankt {v}!', 'Anna Smit')).toBe('Bedankt Anna!')
  })
})

describe('reviewCounts', () => {
  it('counts nieuw/beantwoord/aandacht, respecting locally-placed replies', () => {
    expect(reviewCounts(reviews, {})).toEqual({ nieuw: 2, beantwoord: 1, aandacht: 1 })
    // 'a' beantwoord deze sessie → schuift van nieuw naar beantwoord
    expect(reviewCounts(reviews, { a: 'dank!' })).toEqual({ nieuw: 1, beantwoord: 2, aandacht: 1 })
    // 'c' (flag) beantwoord → verdwijnt uit aandacht
    expect(reviewCounts(reviews, { c: 'sorry' }).aandacht).toBe(0)
  })
})

describe('filterReviews', () => {
  it('nieuw excludes locally-replied', () => {
    expect(filterReviews(reviews, 'nieuw', {}).map((r) => r.id)).toEqual(['a', 'c'])
    expect(filterReviews(reviews, 'nieuw', { a: 'x' }).map((r) => r.id)).toEqual(['c'])
  })
  it('beantwoord includes existing + locally-replied', () => {
    expect(filterReviews(reviews, 'beantwoord', { a: 'x' }).map((r) => r.id)).toEqual(['a', 'b'])
  })
  it('aandacht = flagged & not yet replied', () => {
    expect(filterReviews(reviews, 'aandacht', {}).map((r) => r.id)).toEqual(['c'])
    expect(filterReviews(reviews, 'aandacht', { c: 'x' })).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/dashboard/mobile/reviews/review-helpers.test.ts`
Expected: FAIL — cannot find module `./review-helpers`.

- [ ] **Step 3: Write the implementation**

Create `components/dashboard/mobile/reviews/review-helpers.ts`:

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/dashboard/mobile/reviews/review-helpers.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/dashboard/mobile/reviews/review-helpers.ts components/dashboard/mobile/reviews/review-helpers.test.ts
git commit -m "feat(mobile/reviews): review helpers (types, counts, filter, name-fill) + tests"
```

---

## Task 4: Mock data

**Files:**
- Create: `components/dashboard/mobile/reviews/reviews-mock.ts`

- [ ] **Step 1: Create the mock dataset**

Create `components/dashboard/mobile/reviews/reviews-mock.ts`:

```typescript
import type { MobileReview, ReviewTemplate } from './review-helpers'

/**
 * MOCK-DATA — placeholder. Er bestaat (nog) geen reviews-tabel; de bot stuurt
 * nog geen review-vragen. Zodra dat er is, vervang dit door echte queries
 * (zie de desktop /reviews-pagina die om dezelfde reden demo-data toont).
 * Google-merk-kleuren als avatar-tint (data).
 */
const G = { blue: '#4285F4', yellow: '#FBBC04', red: '#EA4335', green: '#34A853', grey: '#5F6368' }

export const REVIEW_AGGREGATE = { score: 4.8, total: 142, deltaMaand: 9 }

export const REVIEWS_MOCK: MobileReview[] = [
  { id: 'g1', naam: 'Anna Smit', initial: 'A', color: G.blue, sterren: 5, datum: '2 dagen geleden', plaats: 'Den Haag', status: 'nieuw',
    text: 'Geweldig werk geleverd! Het terras ziet er weer als nieuw uit. Op tijd, netjes en superfijne communicatie via WhatsApp. Echt een aanrader.' },
  { id: 'g2', naam: 'Erik van der Velde', initial: 'E', color: G.green, sterren: 5, datum: '4 dagen geleden', plaats: 'Rotterdam', status: 'nieuw',
    text: 'Oprit en gevel laten reinigen — prachtig resultaat. Vriendelijke jongens en alles netjes achtergelaten.' },
  { id: 'g3', naam: 'Sandra Janssen', initial: 'S', color: G.red, sterren: 4, datum: '1 week geleden', plaats: 'Pijnacker', status: 'beantwoord',
    text: 'Netjes gewerkt en eerlijk advies gekregen over de beschermlaag. Kwam iets later dan afgesproken, maar verder dik tevreden.',
    reply: 'Bedankt Sandra! Fijn dat je tevreden bent — excuses voor de latere aankomst, we houden de planning scherper in de gaten.' },
  { id: 'g4', naam: 'Familie Kuiper', initial: 'K', color: G.yellow, sterren: 5, datum: '1 week geleden', plaats: 'Delft', status: 'beantwoord',
    text: 'Vakwerk! De antraciet voegen geven het terras een prachtige uitstraling.',
    reply: 'Dank jullie wel! Geniet van het terras deze zomer.' },
  { id: 'g5', naam: 'Bert Koning', initial: 'B', color: G.grey, sterren: 2, datum: '2 weken geleden', plaats: 'Utrecht', status: 'nieuw', flag: true,
    text: 'Werk op zich prima, maar de eindprijs lag hoger dan in de offerte stond. Daar baalde ik wel van.' },
  { id: 'g6', naam: 'Marieke de Wit', initial: 'M', color: G.blue, sterren: 5, datum: '3 weken geleden', plaats: 'Zeist', status: 'beantwoord',
    text: 'Snelle reactie op mijn aanvraag en binnen een week ingepland. Top service van begin tot eind!',
    reply: 'Bedankt Marieke, tot de volgende keer!' },
  { id: 'g7', naam: 'Thomas Wilms', initial: 'T', color: G.green, sterren: 5, datum: '3 weken geleden', plaats: 'Delft', status: 'beantwoord',
    text: 'Heel tevreden over de gevelreiniging. Aanrader voor de buurt.',
    reply: 'Dank je Thomas!' },
]

export const REVIEW_TEMPLATES: ReviewTemplate[] = [
  { k: 'dank',    label: 'Bedankt',   text: 'Bedankt voor je mooie review, {v}! Wat fijn dat je zo tevreden bent. Groet, team Schoon Straatje 🌿' },
  { k: 'terug',   label: 'Tot ziens', text: 'Dank je wel {v}! We zien je graag terug voor het jaarlijkse onderhoud. — Schoon Straatje' },
  { k: 'herstel', label: 'Herstel',   text: 'Hoi {v}, vervelend dat het niet helemaal naar wens ging. We nemen vandaag nog contact met je op om dit recht te zetten.' },
]
```

- [ ] **Step 2: Type-check + commit**

Run: `npx tsc --noEmit`
Expected: no errors.

```bash
git add components/dashboard/mobile/reviews/reviews-mock.ts
git commit -m "feat(mobile/reviews): Google-reviews mock data (flagged placeholder)"
```

---

## Task 5: Reviews atoms + sub-components

**Files:**
- Create: `components/dashboard/mobile/reviews/ReviewAtoms.tsx` (+ `.module.css`) — `GoogleMark`, `ReviewAvatar`
- Create: `components/dashboard/mobile/reviews/ReviewScoreHeader.tsx` (+ `.module.css`)
- Create: `components/dashboard/mobile/reviews/ReviewsTabs.tsx` (+ `.module.css`)
- Create: `components/dashboard/mobile/reviews/ReviewReplyComposer.tsx` (+ `.module.css`)
- Create: `components/dashboard/mobile/reviews/ReviewCard.tsx` (+ `.module.css`)

- [ ] **Step 1: ReviewAtoms (GoogleMark + ReviewAvatar)**

Create `components/dashboard/mobile/reviews/ReviewAtoms.tsx`:

```typescript
import styles from './ReviewAtoms.module.css'

/** Google "G"-merkbadge (geen logo-reproductie). */
export function GoogleMark({ size = 20 }: { size?: number }) {
  return (
    <div className={styles.gMark} style={{ '--g-size': `${size}px` } as React.CSSProperties}>
      <span className={styles.gLetter}>G</span>
    </div>
  )
}

/** Reviewer-avatar: initiaal op merk-kleur (data). */
export function ReviewAvatar({ initial, color, size = 38 }: { initial: string; color: string; size?: number }) {
  return (
    <div
      className={styles.avatar}
      style={{ '--avatar-bg': color, '--avatar-size': `${size}px` } as React.CSSProperties}
    >
      {initial}
    </div>
  )
}
```

Create `components/dashboard/mobile/reviews/ReviewAtoms.module.css`:

```css
.gMark {
  width: var(--g-size, 20px);
  height: var(--g-size, 20px);
  border-radius: 50%;
  background: #fff;
  border: 1px solid var(--color-border);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.gLetter {
  font-family: Arial, system-ui, sans-serif;
  font-weight: 700;
  font-size: calc(var(--g-size, 20px) * 0.62);
  line-height: 1;
  color: var(--google-blue);
  margin-top: -1px;
}
.avatar {
  width: var(--avatar-size, 38px);
  height: var(--avatar-size, 38px);
  border-radius: 50%;
  background: var(--avatar-bg, var(--color-primary));
  color: #fff;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  font-size: calc(var(--avatar-size, 38px) * 0.42);
  font-weight: 600;
  font-family: Arial, system-ui, sans-serif;
}
```

- [ ] **Step 2: ReviewScoreHeader**

Create `components/dashboard/mobile/reviews/ReviewScoreHeader.tsx`:

```typescript
import { StarRating } from '../shared/StarRating'
import { GoogleMark } from './ReviewAtoms'
import styles from './ReviewScoreHeader.module.css'

type Props = { score: number; total: number; deltaMaand: number; bedrijfsnaam?: string }

export function ReviewScoreHeader({ score, total, deltaMaand, bedrijfsnaam = 'Schoon Straatje' }: Props) {
  // Komma-notatie zoals Google (nl-NL): 4.8 → "4,8".
  const scoreLabel = score.toLocaleString('nl-NL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  return (
    <section className={styles.header}>
      <div className={styles.top}>
        <GoogleMark size={20} />
        <span className={styles.brand}>Google-reviews</span>
        <span className={styles.tenant}>{bedrijfsnaam}</span>
      </div>
      <div className={styles.scoreRow}>
        <div className={styles.score}>{scoreLabel}</div>
        <div className={styles.scoreMeta}>
          <StarRating value={score} size={18} />
          <div className={styles.count}>{total} reviews · +{deltaMaand} deze maand</div>
        </div>
      </div>
    </section>
  )
}
```

Create `components/dashboard/mobile/reviews/ReviewScoreHeader.module.css`:

```css
.header {
  background: var(--color-surface);
  padding: 8px 18px 16px;
  border-bottom: 1px solid var(--color-border);
}
.top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.brand {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text);
}
.tenant {
  margin-left: auto;
  font-size: 12.5px;
  color: var(--color-text-muted);
}
.scoreRow {
  display: flex;
  align-items: center;
  gap: 16px;
}
.score {
  font-size: 44px;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1;
  color: var(--color-text);
}
.scoreMeta {
  flex: 1;
}
.count {
  font-size: 13px;
  color: var(--color-text-soft);
  margin-top: 6px;
}
```

- [ ] **Step 3: ReviewsTabs**

Create `components/dashboard/mobile/reviews/ReviewsTabs.tsx`:

```typescript
'use client'

import type { ReviewTab } from './review-helpers'
import styles from './ReviewsTabs.module.css'

type Props = {
  active: ReviewTab
  counts: { nieuw: number; beantwoord: number; aandacht: number }
  onSelect: (tab: ReviewTab) => void
}

const TABS: Array<{ k: ReviewTab; l: string }> = [
  { k: 'nieuw', l: 'Nieuw' },
  { k: 'beantwoord', l: 'Beantwoord' },
  { k: 'aandacht', l: 'Aandacht' },
]

export function ReviewsTabs({ active, counts, onSelect }: Props) {
  return (
    <div className={styles.tabs} role="tablist" aria-label="Review-filter">
      {TABS.map((tb) => {
        const on = active === tb.k
        const warn = tb.k === 'aandacht' && counts[tb.k] > 0
        return (
          <button
            key={tb.k}
            type="button"
            role="tab"
            aria-selected={on}
            className={styles.tab}
            data-active={on}
            onClick={() => onSelect(tb.k)}
          >
            {tb.l}
            <span className={styles.badge} data-active={on} data-warn={warn}>
              {counts[tb.k]}
            </span>
          </button>
        )
      })}
    </div>
  )
}
```

Create `components/dashboard/mobile/reviews/ReviewsTabs.module.css`:

```css
.tabs {
  display: flex;
  gap: 8px;
  padding: 14px 16px 12px;
}
.tab {
  flex: 1;
  padding: 9px 6px;
  border-radius: 99px;
  border: none;
  cursor: pointer;
  background: var(--color-surface);
  color: var(--color-text-soft);
  font-size: 13px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}
.tab[data-active='true'] {
  background: var(--color-text);
  color: var(--color-bg);
  box-shadow: none;
}
.badge {
  font-size: 11px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 99px;
  min-width: 17px;
  text-align: center;
  background: var(--color-chip-bg);
  color: var(--color-text-muted);
}
.badge[data-warn='true'] {
  background: var(--color-danger-bg);
  color: var(--color-danger);
}
.badge[data-active='true'] {
  background: rgba(255, 255, 255, 0.22);
  color: var(--color-bg);
}
:global(.dark) .badge[data-active='true'] {
  background: rgba(0, 0, 0, 0.18);
}
```

- [ ] **Step 4: ReviewReplyComposer**

Create `components/dashboard/mobile/reviews/ReviewReplyComposer.tsx`:

```typescript
'use client'

import { fillTemplate, type MobileReview, type ReviewTemplate } from './review-helpers'
import styles from './ReviewReplyComposer.module.css'

type Props = {
  review: MobileReview
  templates: ReviewTemplate[]
  draft: string
  onDraftChange: (text: string) => void
  onCancel: () => void
  onPost: () => void
}

export function ReviewReplyComposer({ review, templates, draft, onDraftChange, onCancel, onPost }: Props) {
  return (
    <div className={styles.composer}>
      <div className={styles.title}>Openbaar antwoord op Google</div>
      <div className={styles.chips}>
        {templates.map((tp) => {
          const herstel = tp.k === 'herstel' && Boolean(review.flag)
          return (
            <button
              key={tp.k}
              type="button"
              className={styles.chip}
              data-herstel={herstel}
              onClick={() => onDraftChange(fillTemplate(tp.text, review.naam))}
            >
              {tp.label}
            </button>
          )
        })}
      </div>
      <textarea
        className={styles.textarea}
        value={draft}
        onChange={(e) => onDraftChange(e.target.value)}
        placeholder="Schrijf een antwoord…"
      />
      <div className={styles.actions}>
        <button type="button" className={styles.cancel} onClick={onCancel}>
          Annuleer
        </button>
        <button type="button" className={styles.post} disabled={!draft.trim()} onClick={onPost}>
          Plaats op Google
        </button>
      </div>
    </div>
  )
}
```

Create `components/dashboard/mobile/reviews/ReviewReplyComposer.module.css`:

```css
.composer {
  margin-top: 12px;
  background: var(--color-surface-2);
  border-radius: 12px;
  padding: 12px;
}
.title {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-muted);
  margin-bottom: 8px;
}
.chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}
.chip {
  padding: 5px 11px;
  border-radius: 99px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.chip[data-herstel='true'] {
  border-color: var(--color-danger);
  background: var(--color-danger-bg);
  color: var(--color-danger);
}
.textarea {
  width: 100%;
  min-height: 78px;
  resize: none;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 10px;
  font-size: 13.5px;
  line-height: 1.45;
  color: var(--color-text);
  font-family: inherit;
  background: var(--color-surface);
  box-sizing: border-box;
  outline: none;
}
.actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}
.cancel {
  padding: 9px 14px;
  border-radius: 10px;
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.post {
  flex: 1;
  padding: 9px 14px;
  border-radius: 10px;
  border: none;
  background: var(--google-blue);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}
.post:disabled {
  background: #a9c4f7;
  cursor: default;
}
:global(.dark) .post:disabled {
  background: rgba(66, 133, 244, 0.4);
}
```

- [ ] **Step 5: ReviewCard**

Create `components/dashboard/mobile/reviews/ReviewCard.tsx`:

```typescript
'use client'

import { Flame } from 'lucide-react'
import { StarRating } from '../shared/StarRating'
import { ReviewAvatar } from './ReviewAtoms'
import { ReviewReplyComposer } from './ReviewReplyComposer'
import type { MobileReview, ReviewTemplate } from './review-helpers'
import styles from './ReviewCard.module.css'

type Props = {
  review: MobileReview
  /** Lokaal geplaatste reactie (deze sessie), indien aanwezig. */
  placedReply?: string
  isOpen: boolean
  draft: string
  templates: ReviewTemplate[]
  onOpen: () => void
  onCancel: () => void
  onDraftChange: (text: string) => void
  onPost: () => void
}

export function ReviewCard({
  review, placedReply, isOpen, draft, templates, onOpen, onCancel, onDraftChange, onPost,
}: Props) {
  const replyText = placedReply ?? (review.status === 'beantwoord' ? review.reply : undefined)
  const replied = Boolean(replyText)
  const flagged = Boolean(review.flag) && !replied

  return (
    <article className={styles.card} data-flagged={flagged}>
      <div className={styles.head}>
        <ReviewAvatar initial={review.initial} color={review.color} size={38} />
        <div className={styles.who}>
          <div className={styles.naam}>{review.naam}</div>
          <div className={styles.meta}>
            <StarRating value={review.sterren} size={13} gap={1} />
            <span className={styles.datum}>{review.datum}</span>
          </div>
        </div>
        {flagged && <span className={styles.flagPill}>Aandacht</span>}
      </div>

      <p className={styles.text}>{review.text}</p>

      {flagged && !isOpen && (
        <div className={styles.hint}>
          <Flame size={14} aria-hidden="true" />
          Reageer met zorg — een nette reactie herstelt vertrouwen.
        </div>
      )}

      {replied && !isOpen && (
        <div className={styles.reply}>
          <div className={styles.replyAuthor}>Reactie van Schoon Straatje</div>
          <div className={styles.replyText}>{replyText}</div>
        </div>
      )}

      {!replied && !isOpen && (
        <button type="button" className={styles.reageer} onClick={onOpen}>
          Reageer
        </button>
      )}

      {isOpen && (
        <ReviewReplyComposer
          review={review}
          templates={templates}
          draft={draft}
          onDraftChange={onDraftChange}
          onCancel={onCancel}
          onPost={onPost}
        />
      )}
    </article>
  )
}
```

Create `components/dashboard/mobile/reviews/ReviewCard.module.css`:

```css
.card {
  background: var(--color-surface);
  border-radius: 16px;
  padding: 14px;
}
.card[data-flagged='true'] {
  border-left: 3px solid var(--color-danger);
}
.head {
  display: flex;
  gap: 11px;
  align-items: center;
}
.who {
  flex: 1;
  min-width: 0;
}
.naam {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}
.meta {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 2px;
}
.datum {
  font-size: 11.5px;
  color: var(--color-text-muted);
}
.flagPill {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-danger);
  background: var(--color-danger-bg);
  padding: 3px 9px;
  border-radius: 99px;
  height: fit-content;
}
.text {
  font-size: 13.5px;
  color: var(--color-text-soft);
  line-height: 1.5;
  margin: 10px 0 0;
}
.hint {
  margin-top: 11px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--color-danger);
  background: var(--color-danger-bg);
  padding: 8px 11px;
  border-radius: 10px;
}
.reply {
  margin-top: 12px;
  margin-left: 2px;
  padding-left: 12px;
  border-left: 2px solid var(--color-border);
}
.replyAuthor {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text);
}
.replyText {
  font-size: 13px;
  color: var(--color-text-muted);
  line-height: 1.45;
  margin-top: 3px;
}
.reageer {
  margin-top: 12px;
  width: 100%;
  padding: 11px;
  border-radius: 11px;
  border: none;
  background: var(--google-blue);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}
```

- [ ] **Step 6: Type-check + commit**

Run: `npx tsc --noEmit`
Expected: no errors.

```bash
git add components/dashboard/mobile/reviews/ReviewAtoms.* components/dashboard/mobile/reviews/ReviewScoreHeader.* components/dashboard/mobile/reviews/ReviewsTabs.* components/dashboard/mobile/reviews/ReviewReplyComposer.* components/dashboard/mobile/reviews/ReviewCard.*
git commit -m "feat(mobile/reviews): score-header, tabs, review card, reply composer, atoms"
```

---

## Task 6: MobileReviews screen (compose + state)

**Files:**
- Create: `components/dashboard/mobile/reviews/MobileReviews.tsx` (+ `.module.css`)

- [ ] **Step 1: Compose the screen**

Create `components/dashboard/mobile/reviews/MobileReviews.tsx`:

```typescript
'use client'

import { useMemo, useState } from 'react'
import { Check } from 'lucide-react'
import { ReviewScoreHeader } from './ReviewScoreHeader'
import { ReviewsTabs } from './ReviewsTabs'
import { ReviewCard } from './ReviewCard'
import { reviewCounts, filterReviews, type ReviewTab, type ReviewTextMap } from './review-helpers'
import { REVIEWS_MOCK, REVIEW_TEMPLATES, REVIEW_AGGREGATE } from './reviews-mock'
import styles from './MobileReviews.module.css'

export function MobileReviews() {
  const [tab, setTab] = useState<ReviewTab>('nieuw')
  const [openId, setOpenId] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<ReviewTextMap>({})
  const [done, setDone] = useState<ReviewTextMap>({})
  const [toast, setToast] = useState(false)

  const counts = useMemo(() => reviewCounts(REVIEWS_MOCK, done), [done])
  const list = useMemo(() => filterReviews(REVIEWS_MOCK, tab, done), [tab, done])

  const post = (id: string) => {
    const text = (drafts[id] ?? '').trim()
    if (!text) return
    setDone((d) => ({ ...d, [id]: text }))
    setOpenId(null)
    setToast(true)
    window.setTimeout(() => setToast(false), 2600)
  }

  return (
    <div className={styles.root}>
      <ReviewScoreHeader
        score={REVIEW_AGGREGATE.score}
        total={REVIEW_AGGREGATE.total}
        deltaMaand={REVIEW_AGGREGATE.deltaMaand}
      />

      <ReviewsTabs active={tab} counts={counts} onSelect={(t) => { setTab(t); setOpenId(null) }} />

      <div className={styles.list}>
        {list.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              <Check size={26} aria-hidden="true" />
            </div>
            <div className={styles.emptyTitle}>Niets meer te doen</div>
            <div className={styles.emptySub}>Alle reviews in deze lijst zijn afgehandeld.</div>
          </div>
        ) : (
          list.map((r) => (
            <ReviewCard
              key={r.id}
              review={r}
              placedReply={done[r.id]}
              isOpen={openId === r.id}
              draft={drafts[r.id] ?? ''}
              templates={REVIEW_TEMPLATES}
              onOpen={() => setOpenId(r.id)}
              onCancel={() => setOpenId(null)}
              onDraftChange={(text) => setDrafts((d) => ({ ...d, [r.id]: text }))}
              onPost={() => post(r.id)}
            />
          ))
        )}
      </div>

      {toast && (
        <div className={styles.toast} role="status">
          <Check size={16} aria-hidden="true" className={styles.toastIcon} />
          <span>Antwoord geplaatst op Google</span>
        </div>
      )}
    </div>
  )
}
```

Create `components/dashboard/mobile/reviews/MobileReviews.module.css`:

```css
.root {
  padding-bottom: var(--space-4);
}
.list {
  padding: 0 16px 8px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.empty {
  text-align: center;
  padding: 36px 16px;
}
.emptyIcon {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  background: var(--color-success-bg);
  color: var(--color-success);
  display: grid;
  place-items: center;
  margin: 0 auto 12px;
}
.emptyTitle {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text);
}
.emptySub {
  font-size: 13px;
  color: var(--color-text-muted);
  margin-top: 4px;
}
.toast {
  position: fixed;
  left: 16px;
  right: 16px;
  bottom: calc(var(--mobile-bottom-nav-h) + var(--space-3) + var(--mobile-safe-area-bottom));
  z-index: 20;
  background: #202124;
  color: #fff;
  border-radius: 12px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13.5px;
  font-weight: 600;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
}
:global(.dark) .toast {
  background: #2c2c2e;
}
.toastIcon {
  color: var(--color-success);
}
```

- [ ] **Step 2: Type-check + commit**

Run: `npx tsc --noEmit`
Expected: no errors.

```bash
git add components/dashboard/mobile/reviews/MobileReviews.tsx components/dashboard/mobile/reviews/MobileReviews.module.css
git commit -m "feat(mobile/reviews): MobileReviews screen composition + state"
```

---

## Task 7: Wire into the reviews page

**Files:**
- Modify: `app/dashboard/(app)/reviews/page.tsx`
- Modify: `app/dashboard/(app)/reviews/page.module.css`

- [ ] **Step 1: Import MobileReviews**

In `app/dashboard/(app)/reviews/page.tsx`, add to the imports (after the `ReviewsFilterTabs` import block, before `import styles`):

```typescript
import { MobileReviews } from '@/components/dashboard/mobile/reviews/MobileReviews'
```

- [ ] **Step 2: Wrap desktop in `.desktopTree` and add the mobile tree**

The current `return ( <> … </> )` wraps the whole desktop UI in a fragment. Change the opening `return (\n    <>` to wrap the existing desktop markup in `<div className={styles.desktopTree}>` and append the mobile tree before the closing fragment.

Replace the opening of the return:

```tsx
  return (
    <>
      <div className="dash-section-head">
```

with:

```tsx
  return (
    <>
      <div className={styles.desktopTree}>
      <div className="dash-section-head">
```

And replace the closing of the return (the final `ReviewsFilterTabs`/grid block end):

```tsx
      )}
    </>
  )
}
```

with:

```tsx
      )}
      </div>

      <div className={styles.mobileTree}>
        <MobileReviews />
      </div>
    </>
  )
}
```

> Note: the desktop markup between these two anchors is unchanged — it is now nested one level deeper inside `styles.desktopTree`. Verify indentation compiles (JSX doesn't care about indentation; this is cosmetic).

- [ ] **Step 3: Add the tree-toggle CSS**

Append to `app/dashboard/(app)/reviews/page.module.css`:

```css
/* ── Desktop / mobile tree toggle (mirror statistieken/leads) ─────────────── */
.desktopTree { display: block; }
.mobileTree { display: none; }

@media (max-width: 640px) {
  .desktopTree { display: none; }
  .mobileTree { display: block; }
}
```

- [ ] **Step 4: Type-check + lint + build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: no errors; `/dashboard/reviews` builds.

- [ ] **Step 5: Commit**

```bash
git add "app/dashboard/(app)/reviews/page.tsx" "app/dashboard/(app)/reviews/page.module.css"
git commit -m "feat(mobile/reviews): wire MobileReviews into reviews page (desktop/mobile split)"
```

---

## Task 8: Verify end-to-end

**Files:** none (verification only)

- [ ] **Step 1: Tests**

Run: `npx vitest run components/dashboard/mobile/`
Expected: StarRating + review-helpers tests PASS; all prior mobile tests still PASS.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: succeeds, no TypeScript errors.

- [ ] **Step 3: Visual check at mobile width**

Dev server → log in at `app.localhost:3000` → open `/reviews` at ≤640px. Compare to `mobile-app-handoff/src/screens/MobileReviews.jsx` (rendered in the demo HTML). Check: score-header (44px score, fractional stars), 3 pill tabs with counts (Aandacht warn-badge red when >0), review cards (avatar, stars, date), Aandacht left-border + pill + herstel-hint on the negative review, "Reageer" → composer (template chips, Herstel chip red on flagged), "Plaats op Google" → card moves to Beantwoord + toast appears above the bottom-nav. Light + dark. Note + fix any spacing/color deviations.

- [ ] **Step 4: Final commit (if visual fixes were made)**

```bash
git add -A
git commit -m "fix(mobile/reviews): pixel-match polish vs handoff"
```

---

## Self-Review (completed during planning)

- **Spec coverage:** score-header (Task 5) ✓; 3 tabs + counts (Tasks 3,5) ✓; review cards + fractional stars (Tasks 2,5) ✓; inline composer + template chips + name substitution (Tasks 3,5) ✓; negative-review accent (Task 5 `data-flagged`/danger) ✓; toast (Task 6) ✓; mock data flagged (Task 4) ✓; mount split (Task 7) ✓. StarRating primitive (deferred from Fase 0) built here ✓.
- **Mock-only is explicit:** `reviews-mock.ts` header + the desktop demo-banner already states placeholder. No real-data wiring (none exists).
- **Type consistency:** `MobileReview`/`ReviewTab`/`ReviewTextMap`/`ReviewTemplate` defined in Task 3 and consumed identically in Tasks 4-6; `starFills` (Task 2) used by `StarRating`; `reviewCounts`/`filterReviews` signatures match the screen's calls.
- **House-style:** dynamic values via CSS custom properties (`--star-fill`, `--avatar-bg`, `--g-size`), `data-*` variants (tabs `data-active`/`data-warn`, card `data-flagged`), tokens throughout, `'use client'` on every interactive/SVG component, lucide icons. `:global(.dark)` used only where a literal dark value is unavoidable (toast bg, active-badge).
- **Shell-aware:** no duplicate page title (shell shows "Reviews"); toast is `position:fixed` above `--mobile-bottom-nav-h` + safe-area; no manual status-bar padding.
- **No placeholders:** every code step contains full code.
- **Open verification baked in:** Task 7 Step 2 flags the JSX-wrap anchors; Task 7 Step 4 runs lint+build to catch any mis-wrap.
