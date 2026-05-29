# Mobile Leads & Inbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Twee nieuwe mobiele dashboard-schermen (Leads-pipeline + WhatsApp-stijl Inbox) op echte data + bestaande API's, pixel-perfect geport uit de handoff.

**Architecture:** Route-native, gespiegeld aan de mobiele Overzicht: elke server-`page.tsx` bouwt een typed data-blob en geeft die door aan een `'use client'` composer; CSS-mediaquery toont `.mobileTree` (≤640px) of `.desktopTree` (≥641px). Desktop blijft ongewijzigd. Inbox-navigatie is URL-gedreven (`/inbox`, `?lead=`, `?q=`).

**Tech Stack:** Next.js App Router (RSC), TypeScript, CSS Modules, dashboard CSS-tokens, Vitest (`vi.mock`) voor pure functies, Puppeteer (`screenshot.mjs`) voor visuele verificatie.

**Visuele bron-of-truth:** `supabase/migrations-frontlix/design_handoff_mobile_leads_inbox/` — `README.md` (exacte hex/spacing/timing per component) en `source/**` (referentie-JSX). Port-taken verwijzen naar de specifieke README-sectie + source-bestand i.p.v. elke waarde te hertypen. De **spec** is `docs/superpowers/specs/2026-05-28-mobile-leads-inbox-design.md`.

**Verificatie-conventie:**
- Pure functies → Vitest TDD (colocated `*.test.ts`, `vi.mock`-patroon zoals `lib/dashboard/lead-actions.test.ts`).
- Visuele componenten → `npm run build` (TS+lint) + `node screenshot.mjs http://localhost:3000/<route> <label>` op 402px, **light én dark**, + handmatige golden-path. Géén component-unit-tests (repo-conventie: MobileOverzicht heeft die ook niet).

**Parallellisatie:** Fase 0 eerst (blokkeert). Daarna zijn **Fase 1 (Leads)** en **Fase 2 (Inbox)** onafhankelijk → parallel via aparte sub-agents. Fase 3 integreert.

---

## File Structure

```
GEDEELD
  lib/dashboard/relative-time.ts            (Create) — shortTimeAgo() extractie, gedeeld door Overzicht+Leads
  lib/dashboard/relative-time.test.ts       (Create) — TDD
  lib/dashboard/fase-labels.ts              (Create) — botStatusForFase(), gedeeld door Leads-expand + Inbox
  app/dashboard/(app)/page.tsx              (Modify) — importeer shortTimeAgo i.p.v. lokale kopie
  components/dashboard/mobile/useSwipeReveal.ts        (Create) — swipe-hook + pure resolveSwipe()
  components/dashboard/mobile/useSwipeReveal.test.ts   (Create) — TDD pure deel
  styles/tokens.css                         (Modify) — WA-chat tokenset + .dark

LEADS  (components/dashboard/mobile/leads/)
  lead-mappers.ts            (Create) — leadStage(), mapLeadToCard(), buildMobileLeadsData()  [pure, server]
  lead-mappers.test.ts       (Create) — TDD
  MobileLeads.tsx/.module.css            (Create) — scherm + state
  LeadsSegmentedChips.tsx/.module.css    (Create)
  LeadCard.tsx/.module.css               (Create)
  SwipeableLeadCard.tsx/.module.css      (Create)
  LeadExpandedPanel.tsx/.module.css      (Create)
  LeadsFilterSheet.tsx/.module.css       (Create)
  app/dashboard/(app)/leads/page.tsx     (Modify) — .desktopTree wrap + .mobileTree
  app/dashboard/(app)/leads/page.module.css (Modify) — .desktopTree/.mobileTree media-query

INBOX  (components/dashboard/mobile/inbox/)
  inbox-mappers.ts           (Create) — bucketFor(), speakerFor(), buildInboxListData()  [pure]
  inbox-mappers.test.ts      (Create) — TDD
  MobileInboxList.tsx/.module.css        (Create)
  InboxRow.tsx/.module.css               (Create)
  SwipeableInboxRow.tsx                  (Create)
  MessageBubble.tsx/.module.css          (Create) — + DaySeparator + SystemBanner exports
  MobileChatComposer.tsx/.module.css     (Create)
  MobileLeadInfoSheet.tsx/.module.css    (Create)
  MobileChatDetail.tsx/.module.css       (Create)
  app/dashboard/(app)/inbox/page.tsx     (Modify) — .desktopTree wrap + .mobileTree (list/chat branch)
  app/dashboard/(app)/inbox/page.module.css (Modify)

INTEGRATIE
  components/dashboard/mobile/MobileShell.tsx (Modify) — BottomNav verbergen op /inbox?lead=
  components/dashboard/mobile/BottomNav.module.css (evt.) — n.v.t. als via prop
```

---

# FASE 0 — Gedeeld substraat (blokkeert Fase 1 & 2)

### Task 0.1: Extract `shortTimeAgo` naar gedeelde util

**Files:**
- Create: `lib/dashboard/relative-time.ts`
- Create: `lib/dashboard/relative-time.test.ts`
- Modify: `app/dashboard/(app)/page.tsx` (verwijder lokale `shortTimeAgo`, importeer)

- [ ] **Step 1: Failing test**

```ts
// lib/dashboard/relative-time.test.ts
import { describe, it, expect } from 'vitest'
import { shortTimeAgo } from './relative-time'

describe('shortTimeAgo', () => {
  const now = new Date('2026-05-28T12:00:00Z').getTime()
  it('geeft "nu" onder 60s', () => {
    expect(shortTimeAgo(new Date(now - 30_000).toISOString(), now)).toBe('nu')
  })
  it('minuten', () => {
    expect(shortTimeAgo(new Date(now - 12 * 60_000).toISOString(), now)).toBe('12m')
  })
  it('uren', () => {
    expect(shortTimeAgo(new Date(now - 3 * 3600_000).toISOString(), now)).toBe('3u')
  })
  it('dagen', () => {
    expect(shortTimeAgo(new Date(now - 2 * 86400_000).toISOString(), now)).toBe('2d')
  })
  it('leeg/ongeldig → "—"', () => {
    expect(shortTimeAgo(null, now)).toBe('—')
  })
})
```

- [ ] **Step 2: Run, expect FAIL** — `npm test -- relative-time` → "Cannot find module './relative-time'".

- [ ] **Step 3: Implement** (kopie van de bestaande private fn in `app/dashboard/(app)/page.tsx`, met injecteerbare `now` voor testbaarheid)

```ts
// lib/dashboard/relative-time.ts
/** Korte relatieve tijd — "nu" | "12m" | "3u" | "2d". Lege/ongeldige input → "—". */
export function shortTimeAgo(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) return '—'
  const ms = now - new Date(iso).getTime()
  if (!Number.isFinite(ms) || ms < 0) return 'nu'
  const sec = Math.floor(ms / 1000)
  if (sec < 60) return 'nu'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}u`
  return `${Math.floor(hr / 24)}d`
}
```

- [ ] **Step 4: Run, expect PASS** — `npm test -- relative-time`.

- [ ] **Step 5: Refactor de Overzicht-page** — verwijder de lokale `function shortTimeAgo(...)` onderaan `app/dashboard/(app)/page.tsx` en voeg toe bij de imports: `import { shortTimeAgo } from '@/lib/dashboard/relative-time'`. De bestaande aanroep `shortTimeAgo(item.timestamp)` blijft werken (now-arg heeft default).

- [ ] **Step 6: Verify build** — `npm run build`. Expected: groen, geen ongebruikte-functie-lint.

- [ ] **Step 7: Commit**

```bash
git add lib/dashboard/relative-time.ts lib/dashboard/relative-time.test.ts "app/dashboard/(app)/page.tsx"
git commit -m "refactor(dashboard): extract shortTimeAgo naar gedeelde util"
```

---

### Task 0.2: `useSwipeReveal` hook (+ pure `resolveSwipe`)

Swipe-fysica uit handoff README §"Swipe physics": `REVEAL=144`, `THRESHOLD=40`, clamp `±(REVEAL+24)`, snap-easing `--ease-ios`.

**Files:**
- Create: `components/dashboard/mobile/useSwipeReveal.ts`
- Create: `components/dashboard/mobile/useSwipeReveal.test.ts`

- [ ] **Step 1: Failing test** (pure snap-beslissing)

```ts
// components/dashboard/mobile/useSwipeReveal.test.ts
import { describe, it, expect } from 'vitest'
import { resolveSwipe, REVEAL, THRESHOLD } from './useSwipeReveal'

describe('resolveSwipe', () => {
  it('snap naar +REVEAL bij dx > THRESHOLD', () => {
    expect(resolveSwipe(THRESHOLD + 1)).toBe(REVEAL)
  })
  it('snap naar -REVEAL bij dx < -THRESHOLD', () => {
    expect(resolveSwipe(-THRESHOLD - 1)).toBe(-REVEAL)
  })
  it('snap naar 0 binnen drempel', () => {
    expect(resolveSwipe(THRESHOLD)).toBe(0)
    expect(resolveSwipe(-THRESHOLD)).toBe(0)
    expect(resolveSwipe(0)).toBe(0)
  })
})

describe('clamp in resolveSwipe-domein', () => {
  it('REVEAL=144, THRESHOLD=40', () => {
    expect(REVEAL).toBe(144)
    expect(THRESHOLD).toBe(40)
  })
})
```

- [ ] **Step 2: Run, expect FAIL** — `npm test -- useSwipeReveal`.

- [ ] **Step 3: Implement**

```ts
// components/dashboard/mobile/useSwipeReveal.ts
'use client'
import { useRef, useState, useCallback } from 'react'

export const REVEAL = 144
export const THRESHOLD = 40
const MAX = REVEAL + 24

/** Pure snap-beslissing op basis van eind-dx. */
export function resolveSwipe(dx: number): number {
  if (dx > THRESHOLD) return REVEAL
  if (dx < -THRESHOLD) return -REVEAL
  return 0
}

const clamp = (n: number) => Math.max(-MAX, Math.min(MAX, n))

export type SwipeState = {
  dx: number
  dragging: boolean
  moved: boolean
  bind: {
    onPointerDown: (e: React.PointerEvent) => void
    onPointerMove: (e: React.PointerEvent) => void
    onPointerUp: (e: React.PointerEvent) => void
  }
  reset: () => void
}

/**
 * Drag-to-reveal swipe-hook. `enabled=false` (bv. expanded card) bindt geen
 * gedrag en houdt dx op 0. `moved` onderscheidt een tap van een swipe.
 */
export function useSwipeReveal(enabled = true): SwipeState {
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const start = useRef(0)
  const moved = useRef(false)

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (!enabled) return
    start.current = e.clientX - dx
    moved.current = false
    setDragging(true)
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
  }, [enabled, dx])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!enabled || !dragging) return
    const next = clamp(e.clientX - start.current)
    if (Math.abs(next) > 4) moved.current = true
    setDx(next)
  }, [enabled, dragging])

  const onPointerUp = useCallback(() => {
    if (!enabled) return
    setDragging(false)
    setDx((cur) => resolveSwipe(cur))
  }, [enabled])

  const reset = useCallback(() => setDx(0), [])

  return { dx, dragging, moved: moved.current, bind: { onPointerDown, onPointerMove, onPointerUp }, reset }
}
```

- [ ] **Step 4: Run, expect PASS** — `npm test -- useSwipeReveal`.

- [ ] **Step 5: Commit**

```bash
git add components/dashboard/mobile/useSwipeReveal.ts components/dashboard/mobile/useSwipeReveal.test.ts
git commit -m "feat(mobile): gedeelde useSwipeReveal swipe-hook"
```

---

### Task 0.3: WA-chat tokens in `tokens.css`

**Files:** Modify `styles/tokens.css`

- [ ] **Step 1: Voeg WA-tokenset toe** binnen het bestaande `:root { ... }` (waarden uit handoff README §"WhatsApp palette"):

```css
  /* WhatsApp chat-palette (alleen mobiele Inbox-chat) — light */
  --wa-header:        #075E54;
  --wa-brand:         #25D366;
  --wa-chat-bg:       #ECE5DD;
  --wa-in-bg:         #FFFFFF;   /* klant-bubbel */
  --wa-in-fg:         #111B21;
  --wa-out-bg:        #DCF8C6;   /* owner-bubbel (toekomstig) */
  --wa-surface-bg:    #D7EEFB;   /* Surface-bubbel */
  --wa-surface-fg:    #0B3F5C;
  --wa-surface-accent:#0C7AB8;
  --wa-tick-blue:     #53BDEB;
  --wa-meta:          #667781;
```

- [ ] **Step 2: Voeg dark-overrides toe** binnen het bestaande `.dark { ... }` blok (README dark-kolom):

```css
  --wa-header:        #1F2C33;
  --wa-chat-bg:       #0B141A;
  --wa-in-bg:         #1F2C33;
  --wa-in-fg:         #E9EDEF;
  --wa-out-bg:        #005C4B;
  --wa-surface-bg:    #103E5C;
  --wa-surface-fg:    #A9D6F5;
  --wa-meta:          #8696A0;
```

- [ ] **Step 3: Verify** — `npm run build`. Expected: groen.

- [ ] **Step 4: Commit**

```bash
git add styles/tokens.css
git commit -m "feat(mobile): WhatsApp chat-tokens (light + dark)"
```

---

### Task 0.4: Gedeelde `botStatusForFase` util

Verplaatst de fn die nu privé in `inbox/page.tsx` staat naar een gedeeld bestand, zodat Leads-expand én Inbox 'm delen zonder cross-cluster-afhankelijkheid.

**Files:** Create `lib/dashboard/fase-labels.ts`

- [ ] **Step 1: Implement** (1:1 kopie van de bestaande fn)

```ts
// lib/dashboard/fase-labels.ts
/** Surface-context-zin per gesprek_fase. Gedeeld door mobile Leads-expand + Inbox. */
export function botStatusForFase(fase: string | null | undefined): string {
  const labels: Record<string, string> = {
    info_verzamelen: 'Verzamelt info — wacht op klant-antwoord',
    offerte_besproken: 'Offerte verstuurd — wacht op reactie',
    onderhandelen: 'Onderhandelt — owner-aandacht mogelijk nodig',
    datum_kiezen: 'Datum kiezen — klant kiest afspraak',
    afspraak_bevestigd: 'Afspraak bevestigd — wacht op afronding',
  }
  return fase ? labels[fase] ?? 'Actief in gesprek' : 'Actief in gesprek'
}
```

- [ ] **Step 2: Verify build** — `npm run build`.
- [ ] **Step 3: Commit** — `git commit -m "refactor(dashboard): gedeelde botStatusForFase util"`.

> De vervanging in `inbox/page.tsx` gebeurt in Task 2.0 (Inbox-cluster).

---

# FASE 1 — Leads-cluster (parallel met Fase 2 na Fase 0)

### Task 1.1: Leads data-mappers (pure, server)

**Files:**
- Create: `components/dashboard/mobile/leads/lead-mappers.ts`
- Create: `components/dashboard/mobile/leads/lead-mappers.test.ts`

Types + mapping. `botStatusForFase` wordt verplaatst naar deze module (nu privé in `inbox/page.tsx`) zodat zowel Leads-expand als Inbox 'm delen — zie Task 2.0 voor de inbox-kant; hier definiëren we 'm.

- [ ] **Step 1: Failing test**

```ts
// components/dashboard/mobile/leads/lead-mappers.test.ts
import { describe, it, expect } from 'vitest'
import { leadStage, mapLeadToCard, type RawLead } from './lead-mappers'

const base: RawLead = {
  lead_id: 'L-1', naam: 'Jan de Vries', plaats: 'Delft', m2: 145,
  hoofdcategorie: 'Oprit', sub_diensten: ['invegen', 'beschermlaag'],
  totaal_prijs: null, gesprek_fase: 'info_verzamelen', dashboard_status: 'open',
  bron: 'whatsapp', kanaal: 'whatsapp', afspraak_datum: null, afspraak_starttijd: null,
  aangemaakt: '2026-05-28T11:58:00Z', bijgewerkt: '2026-05-28T11:58:00Z',
  pending_eigenaar_review: false, klus_geblokkeerd: false,
} as RawLead
// kanaal is de betrouwbare bron-indicator: LeadKanaal = 'whatsapp' | 'web'

describe('leadStage', () => {
  it('afgehandeld → klaar (wint van fase)', () => {
    expect(leadStage({ ...base, dashboard_status: 'afgehandeld', gesprek_fase: 'datum_kiezen' })).toBe('klaar')
  })
  it('onderhandelen → review', () => {
    expect(leadStage({ ...base, gesprek_fase: 'onderhandelen' })).toBe('review')
  })
  it('offerte_besproken → uit', () => {
    expect(leadStage({ ...base, gesprek_fase: 'offerte_besproken' })).toBe('uit')
  })
  it('datum_kiezen/afspraak_bevestigd → gepland', () => {
    expect(leadStage({ ...base, gesprek_fase: 'afspraak_bevestigd' })).toBe('gepland')
  })
  it('info_verzamelen/default → gesprek', () => {
    expect(leadStage(base)).toBe('gesprek')
  })
})

describe('mapLeadToCard', () => {
  const now = new Date('2026-05-28T12:00:00Z').getTime()
  it('dienst joint hoofdcategorie + sub_diensten', () => {
    expect(mapLeadToCard(base, now).dienst).toBe('Oprit · invegen + beschermlaag')
  })
  it('kanaal whatsapp → wa', () => {
    expect(mapLeadToCard(base, now).bron).toBe('wa')
  })
  it('kanaal web → form', () => {
    expect(mapLeadToCard({ ...base, kanaal: 'web' }, now).bron).toBe('form')
  })
  it('binnen via shortTimeAgo', () => {
    expect(mapLeadToCard(base, now).binnen).toBe('2m')
  })
  it('urgent als pending_eigenaar_review', () => {
    expect(mapLeadToCard({ ...base, pending_eigenaar_review: true }, now).urgent).toBe(true)
  })
})
```

- [ ] **Step 2: Run, expect FAIL** — `npm test -- lead-mappers`.

- [ ] **Step 3: Implement**

```ts
// components/dashboard/mobile/leads/lead-mappers.ts
import type { LeadListItem } from '@/lib/dashboard/lead-queries'
import { shortTimeAgo } from '@/lib/dashboard/relative-time'
import { botStatusForFase } from '@/lib/dashboard/fase-labels'

export type RawLead = LeadListItem
export type MobileLeadStage = 'gesprek' | 'review' | 'uit' | 'gepland' | 'klaar'

export type MobileLeadCard = {
  id: string
  naam: string
  plaats: string
  m2: number | null
  dienst: string
  stage: MobileLeadStage
  prijs: number | null
  binnen: string
  datum: string | null
  bron: 'wa' | 'form'
  urgent: boolean
  surfaceContext: string
}

/** Eén primaire stage per lead (klaar wint). Spiegelt FilterKey-mapping uit leads/page.tsx. */
export function leadStage(l: RawLead): MobileLeadStage {
  if (l.dashboard_status === 'afgehandeld') return 'klaar'
  switch (l.gesprek_fase) {
    case 'onderhandelen': return 'review'
    case 'offerte_besproken': return 'uit'
    case 'datum_kiezen':
    case 'afspraak_bevestigd': return 'gepland'
    default: return 'gesprek'
  }
}

function dienstLabel(l: RawLead): string {
  const subs = Array.isArray(l.sub_diensten) ? l.sub_diensten.filter(Boolean) : []
  const head = l.hoofdcategorie ?? ''
  return subs.length > 0 ? `${head} · ${subs.join(' + ')}` : head || '—'
}

function datumLabel(l: RawLead): string | null {
  if (!l.afspraak_datum) return null
  const d = new Date(l.afspraak_datum)
  if (Number.isNaN(d.getTime())) return null
  return new Intl.DateTimeFormat('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' }).format(d)
}

export function mapLeadToCard(l: RawLead, now: number = Date.now()): MobileLeadCard {
  return {
    id: l.lead_id,
    naam: l.naam ?? 'Onbekend',
    plaats: l.plaats ?? '',
    m2: l.m2,
    dienst: dienstLabel(l),
    stage: leadStage(l),
    prijs: l.totaal_prijs,
    binnen: shortTimeAgo(l.bijgewerkt ?? l.aangemaakt, now),
    datum: datumLabel(l),
    bron: l.kanaal === 'web' ? 'form' : 'wa',
    urgent: Boolean(l.pending_eigenaar_review) || Boolean(l.klus_geblokkeerd),
    surfaceContext: botStatusForFase(l.gesprek_fase),
  }
}
```

> **Bron-signaal:** `kanaal` is geverifieerd als `LeadKanaal = 'whatsapp' | 'web'` (database.types.ts:1274); de desktop gebruikt `kanaal === 'web'` al voor web-chat. Daarom keyen we wa-vs-form puur op `kanaal`, niet op het rommelige `bron`-veld.

- [ ] **Step 4: Run, expect PASS** — `npm test -- lead-mappers`.

- [ ] **Step 5: Commit**

```bash
git add components/dashboard/mobile/leads/lead-mappers.ts components/dashboard/mobile/leads/lead-mappers.test.ts
git commit -m "feat(mobile/leads): pure lead→card mappers"
```

---

### Task 1.2: `LeadCard` (presentational)

**Files:** Create `LeadCard.tsx` + `LeadCard.module.css`. Port uit handoff README §"LACard (medium density)" + §"LAStagePill" + §"Stage palette"; source `source/leads/LAShared.jsx`.

- [ ] **Step 1: Props-interface + component** (consumeert `MobileLeadCard`)

```tsx
// components/dashboard/mobile/leads/LeadCard.tsx
'use client'
import type { MobileLeadCard, MobileLeadStage } from './lead-mappers'
import styles from './LeadCard.module.css'

const STAGE_LABEL: Record<MobileLeadStage, string> = {
  gesprek: 'In gesprek', review: 'Owner-review', uit: 'Offerte uit', gepland: 'Ingepland', klaar: 'Afgerond',
}

export function LeadCard({ lead }: { lead: MobileLeadCard }) {
  // structuur: top-row (avatar+source-dot · naam+meta · rechter-metric),
  // bottom-row (stage-pill · binnen). Zie README §LACard voor exacte maten.
  // metric-nadruk: prijs (review/uit) | datum (gepland/klaar) | "Nog geen prijs" (gesprek)
  return ( /* ... volledige JSX per README ... */ null as never )
}
```

- [ ] **Step 2: Schrijf `LeadCard.module.css`** met exacte waarden uit README §LACard (surface-bg `var(--surface)`, radius 14, padding 14, naam 15/600, meta 12 `var(--fg-muted)`, prijs 17/800 tabular-nums, datum-blok stage-tint, stage-pill per §Stage palette → map naar tokens: gesprek=`--accent`, review/uit=`--warning`/`#7C3AED`, gepland=`--success`, klaar=`--fg-muted`).

- [ ] **Step 3: Verify build** — `npm run build`. Expected: groen.

- [ ] **Step 4: Commit** — `git commit -m "feat(mobile/leads): LeadCard component"`.

---

### Task 1.3: `SwipeableLeadCard`

**Files:** Create `SwipeableLeadCard.tsx` + `.module.css`. README §"SwipeableCard" + §"Swipe actions". Gebruikt `useSwipeReveal`.

- [ ] **Step 1: Component** — wrapt `LeadCard`; props:

```tsx
type Props = {
  lead: MobileLeadCard
  telefoon: string
  expanded: boolean
  onToggleExpand: (id: string) => void
  onArchive: (id: string) => void
}
```

Gedrag: `useSwipeReveal(!expanded)`. Lades onder de kaart: **links** Bel (`tel:${telefoon}`, accent-gradient) + WA (`https://wa.me/${telefoon}`, `var(--wa-brand)`); **rechts** Archief (`var(--danger)`, roept `onArchive`). Tap (geen `moved`, dx===0) → `onToggleExpand`. Lades verbergen wanneer `expanded`.

- [ ] **Step 2: CSS** per README §"Swipe actions" (knop 14px radius, icon 18 stroke 2.2, label 10.5/700; transform-transition `.25s var(--ease-ios)`).

- [ ] **Step 3: Verify build** — `npm run build`.

- [ ] **Step 4: Commit** — `git commit -m "feat(mobile/leads): SwipeableLeadCard (swipe + tap-expand)"`.

---

### Task 1.4: `LeadsSegmentedChips`

**Files:** Create `LeadsSegmentedChips.tsx` + `.module.css`. README §"Sticky segmented chips".

- [ ] **Step 1: Component**

```tsx
type Chip = { key: 'all' | MobileLeadStage; label: string; count: number; tone: string }
type Props = { active: string; chips: Chip[]; onSelect: (key: string) => void }
```

Horizontaal scrollbare pill-rij `Alles · Gesprek · Review · Offerte · Gepland · Klaar` met counts. Active: `var(--fg)`-bg + `var(--bg)`-tekst. Inactive: `var(--chipBg)` + 6px tone-dot. Hoogte 34, radius 9999, padding 8×13, 13/600.

- [ ] **Step 2: CSS** per README.
- [ ] **Step 3: Verify build** — `npm run build`.
- [ ] **Step 4: Commit** — `git commit -m "feat(mobile/leads): segmented stage-chips"`.

---

### Task 1.5: `LeadExpandedPanel`

**Files:** Create `LeadExpandedPanel.tsx` + `.module.css`. README §"ExpandedPanel". Source `source/leads/LeadsCardInteractive.jsx`.

- [ ] **Step 1: Component**

```tsx
type Props = {
  lead: MobileLeadCard
  onClose: () => void
  onOpenLead: (id: string) => void   // → /leads/[id]
}
```

Structuur per README: kleurstrip (stage-label + sluit), stats-grid (Oppervlak · ~~Foto's~~ · Offerte · Binnen — **Foto's-stat weglaten**, reductie #5), Dienst, Surface-context (`lead.surfaceContext`), actieknoppen (primair per stage: gesprek→"Stuur offerte" → `/leads?nieuwe-offerte=1`; review→"Goedkeuren"; uit→"WhatsApp opvolgen"; gepland→"Open afspraak"; klaar→"Vraag review" — secundaire acties navigeren naar `/leads/[id]` v1), en "Open volledig dossier" → `onOpenLead(id)`. Reveal-animatie `.25s var(--ease-ios)` (opacity + translateY(-6px)).

- [ ] **Step 2: CSS** per README §ExpandedPanel.
- [ ] **Step 3: Verify build** — `npm run build`.
- [ ] **Step 4: Commit** — `git commit -m "feat(mobile/leads): LeadExpandedPanel"`.

---

### Task 1.6: `LeadsFilterSheet`

**Files:** Create `LeadsFilterSheet.tsx` + `.module.css`. README §"Filter Sheet". Source `source/leads/LeadsFilterSheet.jsx`.

- [ ] **Step 1: Component**

```tsx
export type AdvFilter = { stages: Set<MobileLeadStage>; bronnen: Set<'wa' | 'form'>; urgentOnly: boolean; sort: 'binnen' | 'prijs' | 'naam' | 'fase' }
type Props = { open: boolean; value: AdvFilter; resultCount: number; onApply: (f: AdvFilter) => void; onClose: () => void }
```

Bottom-sheet + backdrop (`rgba(0,0,0,.36)`, `lasFade .2s`), sheet slide `.3s var(--ease-ios)` van `110%`. Secties: Fase (multi-select chips), Bron (2-col), Urgent (toggle), Sorteer (2-col). Footer: "Wis" + "Toon X leads".

- [ ] **Step 2: CSS** per README §Filter Sheet.
- [ ] **Step 3: Verify build** — `npm run build`.
- [ ] **Step 4: Commit** — `git commit -m "feat(mobile/leads): LeadsFilterSheet bottom-sheet"`.

---

### Task 1.7: `MobileLeads` composer + page-wiring

**Files:**
- Create: `MobileLeads.tsx` + `.module.css`
- Modify: `app/dashboard/(app)/leads/page.tsx`, `app/dashboard/(app)/leads/page.module.css`

- [ ] **Step 1: `MobileLeads` component**

```tsx
type Props = {
  data: { cards: MobileLeadCard[]; telefoonById: Record<string, string>; chatbotNaam: string }
}
```

State: `filter` · `searchOpen` · `search` · `expandedId` · `sheetOpen` · `advFilter`. Rendert header (titel + `<LiveDot/> X van Y zichtbaar` + zoek/filter/+), `LeadsSegmentedChips`, conditionele filter-strip, en de lijst van `SwipeableLeadCard` + (indien expanded) `LeadExpandedPanel`. Filteren: chip + advFilter + client-side search (naam/plaats/telefoon). Archief-knop roept een client-action aan die `archiveLead(id)` triggert via een server-action-import of `fetch` naar bestaande route; gebruik dezelfde aanroep als de desktop `LeadDangerZone`/`LeadContextPane` (controleer welke van de twee een herbruikbare client-trigger heeft en hergebruik die).

- [ ] **Step 2: CSS** — header/strip per README §Layout. `MobileLeads.module.css`.

- [ ] **Step 3: Wire in `leads/page.tsx`** — wrap de bestaande return-JSX (regel ~125-199) in `<div className={styles.desktopTree}>…</div>`, en voeg daarna toe:

```tsx
{/* Mobile-tree: zelfde server-data, mobiele composition. */}
<div className={styles.mobileTree}>
  <MobileLeads data={{
    cards: displayed.map((l) => mapLeadToCard(l)),
    telefoonById: Object.fromEntries(displayed.map((l) => [l.lead_id, l.telefoon])),
    chatbotNaam,  // uit tenant_settings; voeg de bestaande tenant-fetch toe of hergebruik
  }} />
</div>
```

> Counts voor de chips: hergebruik de al-berekende `counts` (FilterKey) en map keys → chip-keys (`in_gesprek`→gesprek, `review`→review, `offerte_uit`→uit, `ingepland`→gepland, `afgerond`→klaar, `all`→all). Geef ze mee in `data`.

- [ ] **Step 4: CSS-toggle in `leads/page.module.css`** (kopieer het patroon uit `app/dashboard/(app)/page.module.css`):

```css
.desktopTree { display: block; }
.mobileTree { display: none; }
@media (max-width: 640px) {
  .desktopTree { display: none; }
  .mobileTree { display: block; }
}
```

- [ ] **Step 5: Verify build** — `npm run build`. Expected: groen.

- [ ] **Step 6: Visuele verificatie** — `npm run dev`, dan:
  - `node screenshot.mjs http://localhost:3000/leads leads-light`
  - toggle `.dark` (via dashboard ThemeToggle) → `node screenshot.mjs http://localhost:3000/leads leads-dark`
  - Lees beide PNG's uit `temporary screenshots/`; vergelijk met handoff `prototypes/Mobiel - Leads.html`. Check: chips, kaart-spacing, prijs/datum-metric, stage-pill-kleuren.
  - Golden path handmatig (DevTools 402px): chip filteren, swipe links (Bel/WA), swipe rechts (Archief), tap-expand, filter-sheet openen/toepassen.

- [ ] **Step 7: Commit** — `git commit -m "feat(mobile/leads): MobileLeads scherm + page-wiring"`.

---

# FASE 2 — Inbox-cluster (parallel met Fase 1 na Fase 0)

### Task 2.0: Vervang lokale `botStatusForFase` in `inbox/page.tsx`

> De gedeelde util is in Fase 0 (Task 0.4) aangemaakt in `lib/dashboard/fase-labels.ts`. Hier vervangen we de lokale kopie door een import.

**Files:** Modify `app/dashboard/(app)/inbox/page.tsx`

- [ ] **Step 1:** Verwijder de lokale `function botStatusForFase(...)` (regel ~204-213); voeg import toe: `import { botStatusForFase } from '@/lib/dashboard/fase-labels'`. (Pure fn, geen client-only code → veilig in RSC.)
- [ ] **Step 2: Verify build** — `npm run build`.
- [ ] **Step 3: Commit** — `git commit -m "refactor(inbox): hergebruik gedeelde botStatusForFase"`.

---

### Task 2.1: Inbox data-mappers (pure)

**Files:**
- Create: `components/dashboard/mobile/inbox/inbox-mappers.ts`
- Create: `components/dashboard/mobile/inbox/inbox-mappers.test.ts`

- [ ] **Step 1: Failing test**

```ts
// inbox-mappers.test.ts
import { describe, it, expect } from 'vitest'
import { bucketFor, speakerFor } from './inbox-mappers'

describe('bucketFor', () => {
  const now = new Date('2026-05-28T12:00:00Z')
  it('live: < 30 min', () => {
    expect(bucketFor(new Date('2026-05-28T11:45:00Z').toISOString(), now)).toBe('live')
  })
  it('today: zelfde dag, > 30 min', () => {
    expect(bucketFor(new Date('2026-05-28T08:00:00Z').toISOString(), now)).toBe('today')
  })
  it('yest: gisteren', () => {
    expect(bucketFor(new Date('2026-05-27T20:00:00Z').toISOString(), now)).toBe('yest')
  })
  it('older: eerder', () => {
    expect(bucketFor(new Date('2026-05-20T20:00:00Z').toISOString(), now)).toBe('older')
  })
})

describe('speakerFor', () => {
  it('inkomend → klant', () => expect(speakerFor('inkomend')).toBe('klant'))
  it('uitgaand → surface (owner niet te onderscheiden, reductie #1)', () =>
    expect(speakerFor('uitgaand')).toBe('surface'))
})
```

- [ ] **Step 2: Run, expect FAIL** — `npm test -- inbox-mappers`.

- [ ] **Step 3: Implement**

```ts
// inbox-mappers.ts
export type InboxBucket = 'live' | 'today' | 'yest' | 'older'
export type BubbleSpeaker = 'klant' | 'surface'

const TZ = 'Europe/Amsterdam'
const dayKey = (d: Date) =>
  new Intl.DateTimeFormat('nl-NL', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)

export function bucketFor(iso: string, now: Date = new Date()): InboxBucket {
  const t = new Date(iso)
  const mins = (now.getTime() - t.getTime()) / 60000
  if (mins < 30) return 'live'
  const today = dayKey(now)
  const yest = dayKey(new Date(now.getTime() - 86400_000))
  const k = dayKey(t)
  if (k === today) return 'today'
  if (k === yest) return 'yest'
  return 'older'
}

/** richting → bubbel-spreker. Owner-vs-Surface is niet uit data af te leiden (reductie #1). */
export function speakerFor(richting: string): BubbleSpeaker {
  return richting === 'inkomend' ? 'klant' : 'surface'
}
```

- [ ] **Step 4: Run, expect PASS** — `npm test -- inbox-mappers`.
- [ ] **Step 5: Commit** — `git commit -m "feat(mobile/inbox): pure timeline + speaker mappers"`.

---

### Task 2.2: `InboxRow` + `SwipeableInboxRow`

**Files:** Create `InboxRow.tsx`/`.module.css`, `SwipeableInboxRow.tsx`. README §"InboxRow" + §"SwipeableInboxRow".

- [ ] **Step 1: `InboxRow`** — consumeert `ConversationPreview` (uit `lib/dashboard/inbox-queries.ts`). Props: `{ convo: ConversationPreview }`. Avatar 40 (initialen) zonder online-dot (reductie #3), naam (14.5/unread?700:600), timestamp (`shortTimeAgo`), preview (laatste bericht-tekst), unread-badge (afgeleid: laatste inkomend & na `inboxGelezenOp`). Sparkle-prefix bij `richting==='uitgaand'`.
- [ ] **Step 2: `SwipeableInboxRow`** — `useSwipeReveal`; links Bel/WA, rechts Archief (`archiveLead`); tap → `onOpenChat(leadId)` (navigatie naar `/inbox?lead=ID` via `next/link` of `router.push`).
- [ ] **Step 3: CSS** per README.
- [ ] **Step 4: Verify build** — `npm run build`.
- [ ] **Step 5: Commit** — `git commit -m "feat(mobile/inbox): InboxRow + SwipeableInboxRow"`.

---

### Task 2.3: `MobileInboxList` + list-branch wiring

**Files:** Create `MobileInboxList.tsx`/`.module.css`; Modify `inbox/page.tsx` + `inbox/page.module.css`.

- [ ] **Step 1: `MobileInboxList`** — props `{ conversations: ConversationPreview[]; ongelezenCount: number; liveCount: number }`. Groepeert via `bucketFor(c.laatsteBericht.timestamp)` in secties Nu actief / Vandaag / Gisteren / Eerder (lege verbergen). Header met titel + sub + zoekknop (`/inbox?q=` of client-search-overlay). Elke rij = `SwipeableInboxRow`.
- [ ] **Step 2: CSS** per README §"Section header" + §"Section content".
- [ ] **Step 3: Wire `inbox/page.tsx`** — wrap bestaande `<div className={styles.fullBleed}>…</div>` in `.desktopTree`. Voeg `.mobileTree` toe:

```tsx
<div className={styles.mobileTree}>
  {selectedLeadId && leadContext ? (
    <MobileChatDetail
      leadId={selectedLeadId}
      messages={messages}
      lead={leadContext}
      chatbotNaam={chatbotNaam}
    />   // Task 2.6
  ) : (
    <MobileInboxList
      conversations={conversations}
      ongelezenCount={counts.unread}
      liveCount={/* tel buckets 'live' */ conversations.filter(c => bucketFor(c.laatsteBericht.timestamp) === 'live').length}
    />
  )}
</div>
```

> Behoud `<InboxRealtime/>` boven beide trees. `chatbotNaam` uit `tenant_settings.chatbot_naam` (voeg lichte fetch toe of hergebruik bestaande).

- [ ] **Step 4: CSS-toggle in `inbox/page.module.css`** (zelfde `.desktopTree`/`.mobileTree`-media-query als Task 1.7 Step 4).
- [ ] **Step 5: Verify build** — `npm run build`.
- [ ] **Step 6: Screenshot** — `node screenshot.mjs http://localhost:3000/inbox inbox-list-light` + dark. Vergelijk met `prototypes/Mobiel - Inbox.html`.
- [ ] **Step 7: Commit** — `git commit -m "feat(mobile/inbox): MobileInboxList + list-wiring"`.

---

### Task 2.4: `MessageBubble` (+ DaySeparator, SystemBanner)

**Files:** Create `MessageBubble.tsx`/`.module.css`. README §"MessageBubble" + §"DaySeparator" + §"SystemBanner".

- [ ] **Step 1: Components**

```tsx
import type { Bericht } from '@/lib/dashboard/database.types'
export function MessageBubble({ msg }: { msg: Bericht }) { /* speakerFor(msg.richting) → klant links / surface rechts */ }
export function DaySeparator({ label }: { label: string }) { /* gecentreerde pill */ }
export function SystemBanner({ text }: { text: string }) { /* grotere pill */ }
```

Klant: links, `var(--wa-in-bg)`/`--wa-in-fg`, tail-cut top-left. Surface: rechts, `var(--wa-surface-bg)`/`--wa-surface-fg`, Surface-label boven eerste bubbel (`var(--wa-surface-accent)` + sparkle). Tijd uit `msg.timestamp` (HH:MM), tabular-nums. Foto-type (`msg.type` + `msg.foto_url`) → afbeelding in bubbel.

- [ ] **Step 2: CSS** per README (max-width 78%, radius 7.5, shadow, 14.5/1.34, white-space pre-wrap).
- [ ] **Step 3: Verify build** — `npm run build`.
- [ ] **Step 4: Commit** — `git commit -m "feat(mobile/inbox): MessageBubble + day/system separators"`.

---

### Task 2.5: `MobileChatComposer`

**Files:** Create `MobileChatComposer.tsx`/`.module.css`. README §"Composer". Hergebruik de send-logica van desktop `components/dashboard/inbox/WhatsAppComposer.tsx`.

- [ ] **Step 1: Component** — props `{ leadId: string; botPaused: boolean }`. Input-pill + send/mic-knop. Submit → POST `app/api/dashboard/lead/[lead_id]/send-message` (zelfde call als `WhatsAppComposer`). Guard: alleen versturen wanneer `botPaused` (zelfde gedrag als desktop; toon hint "Pauzeer Surface om zelf te reageren" als niet gepauzeerd).
- [ ] **Step 2: CSS** per README §Composer (`var(--wa-header)` send-knop, input-pill radius 22).
- [ ] **Step 3: Verify build** — `npm run build`.
- [ ] **Step 4: Commit** — `git commit -m "feat(mobile/inbox): MobileChatComposer (send-message)"`.

---

### Task 2.6: `MobileLeadInfoSheet`

**Files:** Create `MobileLeadInfoSheet.tsx`/`.module.css`. README §"Lead-Info Bottom Sheet". Consumeert `InboxLeadContext`.

- [ ] **Step 1: Component** — props `{ lead: InboxLeadContext; open: boolean; onClose: () => void }`. Drag-handle, identity-row (avatar 56, naam, `{id} · {plaats}`, stage-pill), stats-grid (Oppervlak/Foto's=`fotosCount`/Offerte/Laatste), Dienst, acties-grid ("Stuur offerte"→`/leads?nieuwe-offerte=1`, "Plan afspraak", "Surface overnemen"→bot-pauzeren, "Archiveer"→`archiveLead`), Sluit. Slide-animatie als Filter-sheet.
- [ ] **Step 2: CSS** per README.
- [ ] **Step 3: Verify build** — `npm run build`.
- [ ] **Step 4: Commit** — `git commit -m "feat(mobile/inbox): MobileLeadInfoSheet"`.

---

### Task 2.7: `MobileChatDetail`

**Files:** Create `MobileChatDetail.tsx`/`.module.css`. README §"Screen B · ChatDetail". Componeert Task 2.4-2.6.

- [ ] **Step 1: Component**

```tsx
type Props = {
  leadId: string
  messages: Bericht[]                 // getMessagesForLead
  lead: import('@/lib/dashboard/inbox-queries').InboxLeadContext
  chatbotNaam: string
}
```

Layout: WA-groene header (terug → `/inbox`, identiteit tik→sheet, bel/menu), Surface-toggle-banner (ON/OFF, bedient `bot-pauzeren` met `lead.botGepauzeerd` als init — hergebruik `InboxBotToggle`-logica), chat-area met `MessageBubble`-mapping over `messages` (+ DaySeparator op datumwissel, SystemBanner bovenaan "Lead binnengekomen via WhatsApp"), `MobileChatComposer`, en `MobileLeadInfoSheet`. Mount ook `<InboxMarkRead leadId={leadId}/>` (bestaand) als read-side-effect.

- [ ] **Step 2: CSS** per README §ChatDetail + §"Chat area" (doodle-overlay optioneel) + §"Surface-toggle banner".
- [ ] **Step 3: Verify build** — `npm run build`.
- [ ] **Step 4: Screenshot** — navigeer `/inbox?lead=<echt-id>`; `node screenshot.mjs "http://localhost:3000/inbox?lead=<id>" chat-light` + dark. Vergelijk met prototype.
- [ ] **Step 5: Golden path** (402px): rij → chat → terug; Surface-toggle aan/uit; bericht typen + versturen (met bot gepauzeerd); header-tik → lead-sheet.
- [ ] **Step 6: Commit** — `git commit -m "feat(mobile/inbox): MobileChatDetail fullscreen WA-view"`.

---

# FASE 3 — Integratie & oplevering

### Task 3.1: BottomNav verbergen op chat-detail

**Files:** Modify `components/dashboard/mobile/MobileShell.tsx`

- [ ] **Step 1:** In `MobileShell`, leid uit `usePathname()` + `useSearchParams()` af of we op `/inbox?lead=…` zitten; zo ja, render `<BottomNav/>` niet (chat is fullscreen). Houd `MeerSheet`/`MobileSearchSheet` ongemoeid.

```tsx
const searchParams = useSearchParams()
const isChatDetail = pathname === '/inbox' && searchParams.get('lead')
// ...
{!isChatDetail && <BottomNav counts={counts} onOpenMeer={() => setMeerOpen(true)} />}
```

> `useSearchParams` vereist dat de component al `'use client'` is (dat is MobileShell). Wrap niet in extra Suspense tenzij build daarom vraagt; los op als de build een CSR-bailout-fout geeft.

- [ ] **Step 2: Verify build** — `npm run build`.
- [ ] **Step 3: Commit** — `git commit -m "feat(mobile): verberg BottomNav op fullscreen chat"`.

---

### Task 3.2: Eind-verificatie + regressie

- [ ] **Step 1: Volledige build + tests** — `npm run build && npm test`. Expected: alles groen.
- [ ] **Step 2: Screenshots-set** (402px, light + dark): `/leads`, `/inbox`, `/inbox?lead=<id>`. Lees alle PNG's en vergelijk met de twee prototype-HTML's. Noteer pixel-afwijkingen (spacing/font/kleur) en fix tot pixel-perfect.
- [ ] **Step 3: Desktop-regressie** — open `/leads` en `/inbox` op ≥641px (DevTools): desktop pipeline/3-koloms-inbox moeten **identiek** zijn aan voor deze sprint. Geen layout-shift.
- [ ] **Step 4: BottomNav-badges** — controleer dat leads/inbox-counts (via `DashboardChrome` `counts`-prop) nog kloppen; pas de count-bron aan indien de nieuwe schermen een afwijkende telling tonen.
- [ ] **Step 5: Commit** (indien fixes) — `git commit -m "fix(mobile): pixel-polish + regressie-fixes Leads/Inbox"`.

---

## Self-Review (uitgevoerd vóór oplevering)

**Spec-dekking:**
- Spec §4 Leads → Tasks 1.1-1.7 ✓ · §5a Inbox-lijst → 2.1-2.3 ✓ · §5b Chat → 2.4-2.7 ✓ · §5c Zoeken → list/chat header (previews) ✓ · §6 mapping → 1.1/2.1 ✓ · §7 acties → 1.3/2.2/2.5/2.6/2.7 ✓ · §8 reducties → expliciet in 1.5(#5)/2.1(#1)/2.2(#3) ✓ · §9 tokens/dark → 0.3 ✓ · §10 bouwvolgorde → fasestructuur ✓ · §11 verificatie → per task + 3.2 ✓.
- **Gap bewust:** §5b "voice-bubbel" niet als aparte task — alleen renderen indien `msg.type` voice aangeeft; meeste data heeft dit niet. Toegevoegd als optionele branch in Task 2.4 (geen eigen task).

**Placeholder-scan:** Visuele port-taken verwijzen bewust naar handoff README-secties i.p.v. elke hex te hertypen (de handoff IS de bron-of-truth, zie plan-header). Alle pure-logica-taken hebben volledige test- + implementatiecode. Geen "TBD"/"handle edge cases".

**Type-consistentie:** `MobileLeadCard`/`MobileLeadStage` (Task 1.1) consistent gebruikt in 1.2-1.7. `ConversationPreview`/`InboxLeadContext`/`Bericht` zijn bestaande types uit `inbox-queries.ts`/`database.types.ts`. `useSwipeReveal`-API (`dx`/`moved`/`bind`/`reset`) consistent in 1.3 + 2.2. `bucketFor`/`speakerFor` consistent in 2.2 → 2.3/2.4.

**Implementatie-risico's gemarkeerd:** herbruikbare archive-client-trigger (1.7/2.2), `useSearchParams` CSR-bailout (3.1) — elk met een "controleer/los-op-indien"-noot. (`bron`/`kanaal`-enum is geverifieerd, geen risico meer.)
