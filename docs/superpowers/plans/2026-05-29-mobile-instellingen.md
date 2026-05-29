# Mobile Instellingen — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Build the mobile **Instellingen** screen (route `/instellingen`) pixel-matched to the handoff: a hub (search + category cards) that drills into 8 detail screens (Bedrijf, Team, Prijzen w/ wat-als-simulator, Diensten, Openingsbericht WA-preview, Reminders, Notificaties matrix, Tags).

**Architecture:** Self-contained `'use client'` `MobileInstellingen` with internal view-state; hub ↔ detail navigation via the existing `MobileDrilldownLayer` (browser-back integrated). **v1 ships UI with local React state + mock data** (mirroring real shapes) — wiring to real settings server-actions is deferred to the final functional pass (the desktop `/instellingen` already has all those actions working). Mounted CSS-gated in `instellingen/page.tsx` via `.desktopTree`/`.mobileTree`.

**Tech Stack:** Next.js App Router, TypeScript, CSS Modules, design tokens, lucide-react, vitest.

---

## Context

- **Shell shows the "Instellingen" title** (`MobileShellHeader`). So the hub renders **content only** (search + cards), no duplicate big title. The detail view uses `MobileDrilldownLayer`, which overlays its own back-header + section title (covering the shell header) — single header, matches the handoff.
- **`MobileDrilldownLayer` API** (`components/dashboard/mobile/drilldowns/MobileDrilldownLayer.tsx`): props `open: boolean`, `title: string`, `subtitle?: string`, `onClose: () => void`, `children: ReactNode`, `rightAction?: ReactNode`. It pushes history state on open and calls `onClose` on browser-back. Usage: parent holds `open`; tap a card → set it; the layer's back button + popstate → `onClose`.
- **Mount:** desktop `instellingen/page.tsx` is a server component, `?section=`-routed (per-section fetch) with section sub-components. **Do not refactor it.** Wrap its entire `return` body in `<div className={styles.desktopTree}>` and append `<div className={styles.mobileTree}><MobileInstellingen/></div>`. The mobile component is self-contained (no props), so the desktop's per-section fetch is irrelevant to mobile.
- **v1 data note (flag in code):** all detail screens use local state seeded from `instellingen-mock.ts`. Saving/persisting is NOT wired. The final pass connects: `tenant-base-actions` (Bedrijf), team actions (Team), `pricing-actions` + `pricing-impact(-queries)` (Prijzen — replace the hardcoded "+€1.240 / 61%" with `getPricingImpactBaseline` + `computeRevenueDelta`), `service-offerings-actions` (Diensten), `template-actions` (Opening), `reminder-actions` (Reminders), `notifications/prefs-actions` (Notif), `tags-actions` (Tags).

## Translation Contract (EVERY implementer follows this)

The handoff is in-browser-Babel JSX with inline styles, a `t.*` theme object, an `IC` color const, and a custom `InstIcon`. Translate to our conventions:

1. **No inline styles for theming/static layout.** Move everything to a colocated `.module.css` using tokens. Dynamic per-item values (a tint color, a toggle size, a bar %) go through **CSS custom properties injected via `style`** (e.g. `style={{ '--tint': item.tint } as React.CSSProperties}`), never inline colors.
2. **Color map** (`t.*`/`IC.*` → token):
   - `t.bg`→`--color-bg`, `t.surface`→`--color-surface`, `t.surface2`→`--color-surface-2`, `t.fg`→`--color-text`, `t.fgSoft`→`--color-text-soft`, `t.fgMuted`→`--color-text-muted`, `t.border`→`--color-border`
   - `IC.blue`→`--color-primary`, `IC.green`→`--color-success`, `IC.amber`→`--color-warning`, `IC.red`→`--color-danger`, `IC.wa`→`--color-whatsapp`
   - `IC.violet` (#7C3AED) has **no token** → it's a per-item **tint** (data); inject via `--tint` and render bg as `color-mix(in srgb, var(--tint) 12%, transparent)`, fg as `var(--tint)`. (Replaces the handoff's `tint + '20'` alpha-hex trick.)
   - Simulator gradient `linear-gradient(135deg,#1A56FF,#00CFFF)` → `linear-gradient(135deg, var(--color-primary), var(--accent-2))`.
   - Disabled primary `rgba(26,86,255,.4)` → `color-mix(in srgb, var(--color-primary) 40%, transparent)`.
   - WA preview: chat-bg→`--wa-chat-bg`, out-bubble→`--wa-out-bg`, tick→`--wa-tick-blue`, meta text→`--wa-meta`. Amber banner→`--color-warning-bg` bg + `--color-warning` border/text.
3. **Icons → lucide-react** (replace `InstIcon name=...`): building→`Building2`, euro→`Euro`, list→`List`, tag→`Tag`, wa→`MessageCircle`, bell→`Bell`, spark→`Sparkles`, users→`Users`, chev→`ChevronRight`, check→`Check`, x→`X`, plus→`Plus`, minus→`Minus`, mail→`Mail`, phone→`Smartphone`, search→`Search`. (back is provided by `MobileDrilldownLayer`.)
4. **Toggle** → the shared `MobileToggle` (Task 1), not a bespoke button.
5. `'use client'` on every interactive component; named exports; camelCase classes; one `.tsx` + `.module.css` per component.
6. **Local state + mock** from `instellingen-mock.ts`. No server actions in v1.
7. Detail screens render plain content (the drilldown layer provides scroll + header); do **not** add `position:absolute`/status-bar padding (the handoff's full-page wrapper is replaced by the layer).

---

## Task 1: Shared `MobileToggle` primitive

**Files:** Create `components/dashboard/mobile/shared/MobileToggle.tsx` (+ `.module.css`)

(The Fase-0 deferred toggle. Reused by Instellingen + later Agenda.)

- [ ] **Step 1: Component**

`MobileToggle.tsx`:

```typescript
'use client'

import styles from './MobileToggle.module.css'

type Props = {
  on: boolean
  onChange: (next: boolean) => void
  /** Schaalfactor (1 = 40×24px). Notif-matrix gebruikt 0.85. */
  size?: number
  label?: string
}

/** iOS-stijl switch. Groen = aan. Maat via --tg-scale. */
export function MobileToggle({ on, onChange, size = 1, label }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={styles.toggle}
      data-on={on}
      style={{ '--tg-scale': size } as React.CSSProperties}
      onClick={() => onChange(!on)}
    >
      <span className={styles.knob} />
    </button>
  )
}
```

`MobileToggle.module.css`:

```css
.toggle {
  --w: calc(40px * var(--tg-scale, 1));
  --h: calc(24px * var(--tg-scale, 1));
  --k: calc(18px * var(--tg-scale, 1));
  width: var(--w);
  height: var(--h);
  flex-shrink: 0;
  border: none;
  border-radius: 99px;
  padding: 0;
  position: relative;
  cursor: pointer;
  background: rgba(120, 120, 128, 0.32);
  transition: background 0.2s;
}
.toggle[data-on='true'] {
  background: var(--color-success);
}
.knob {
  position: absolute;
  top: calc((var(--h) - var(--k)) / 2);
  left: calc((var(--h) - var(--k)) / 2);
  width: var(--k);
  height: var(--k);
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
  transition: left 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.toggle[data-on='true'] .knob {
  left: calc(var(--w) - var(--k) - (var(--h) - var(--k)) / 2);
}
```

- [ ] **Step 2:** `npx tsc --noEmit` → clean. Commit: `feat(mobile/shared): MobileToggle iOS switch primitive`.

---

## Task 2: Mock data + pure helpers (TDD)

**Files:**
- Create `components/dashboard/mobile/instellingen/instellingen-mock.ts`
- Create `components/dashboard/mobile/instellingen/inst-helpers.ts` (+ `.test.ts`)

- [ ] **Step 1: Mock data**

`instellingen-mock.ts` — port the handoff data constants verbatim (values), typed. (Tints are data hex; `IC` inlined.)

```typescript
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
```

- [ ] **Step 2: Helpers test**

`inst-helpers.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { fillOpening, deltaPct, stepPrice, matchSections } from './inst-helpers'
import { INST_ALL } from './instellingen-mock'

describe('fillOpening', () => {
  it('substitutes every demo variable', () => {
    expect(fillOpening('Hoi {voornaam} van {bedrijf}')).toBe('Hoi Jeroen van Schoon Straatje')
  })
  it('leaves unknown placeholders untouched', () => {
    expect(fillOpening('x {onbekend}')).toBe('x {onbekend}')
  })
})

describe('deltaPct', () => {
  it('rounds the percent change vs base', () => {
    expect(deltaPct(4.5, 3.95)).toBe(14)
    expect(deltaPct(3.95, 3.95)).toBe(0)
    expect(deltaPct(3.0, 4.0)).toBe(-25)
  })
})

describe('stepPrice', () => {
  it('steps by the item step, snaps to 2 decimals, floors at 0', () => {
    expect(stepPrice(3.95, 0.05, 1)).toBe(4.0)
    expect(stepPrice(0.05, 0.05, -1)).toBe(0)
    expect(stepPrice(0, 0.05, -1)).toBe(0)
  })
})

describe('matchSections', () => {
  it('filters by label or subtitle, case-insensitive', () => {
    expect(matchSections(INST_ALL, 'prijz').map((s) => s.k)).toEqual(['prijzen'])
    expect(matchSections(INST_ALL, 'WHATSAPP').map((s) => s.k)).toEqual(['opening'])
    expect(matchSections(INST_ALL, '').length).toBe(INST_ALL.length)
  })
})
```

- [ ] **Step 3: Helpers impl**

`inst-helpers.ts`:

```typescript
import type { InstSection } from './instellingen-mock'

const OPENING_DEMO: Record<string, string> = {
  '{voornaam}': 'Jeroen', '{bedrijf}': 'Schoon Straatje', '{bot_naam}': 'Surface',
  '{hoofddienst}': 'oprit', '{m2}': '145', '{plaats}': 'Delft',
}

/** Vult de demo-variabelen in voor de WA-preview. */
export function fillOpening(txt: string): string {
  return Object.entries(OPENING_DEMO).reduce((a, [k, v]) => a.split(k).join(v), txt)
}

/** Afgerond %-verschil van cur t.o.v. base (0 als base 0). */
export function deltaPct(cur: number, base: number): number {
  if (base === 0) return 0
  return Math.round(((cur - base) / base) * 100)
}

/** Prijs ±step, gesnapt op 2 decimalen, niet onder 0. */
export function stepPrice(current: number, step: number, dir: 1 | -1): number {
  return Math.max(0, +(current + dir * step).toFixed(2))
}

/** Hub-zoekfilter op label of subtitel (case-insensitive). */
export function matchSections(sections: InstSection[], q: string): InstSection[] {
  const needle = q.toLowerCase()
  return sections.filter(
    (s) => s.l.toLowerCase().includes(needle) || s.s.toLowerCase().includes(needle),
  )
}
```

- [ ] **Step 4:** `npx vitest run components/dashboard/mobile/instellingen/inst-helpers.test.ts` → PASS. Commit: `feat(mobile/instellingen): mock data + tested pure helpers`.

---

## Task 3: Inst atoms

**Files:** Create `components/dashboard/mobile/instellingen/InstAtoms.tsx` (+ `.module.css`)

Port the handoff atoms (`InstField`, `InstGroupCard`, `InstPrimaryBtn`, `InstGhostBtn`) per the Translation Contract, plus a `TintIcon` helper that renders a lucide icon in a tinted rounded square (used by hub cards + search rows). Provide a lucide icon mapper.

- [ ] **Step 1: Implement** `InstAtoms.tsx` with named exports:
  - `InstField({ label, value }: { label: string; value: string })` — controlled `useState(value)` text input. ('use client'.)
  - `InstGroupCard({ children })` — `<div className={styles.groupCard}>` (surface, radius 14, overflow hidden).
  - `InstPrimaryBtn({ children, disabled })` — full-width blue button; disabled → `color-mix` faded.
  - `InstGhostBtn({ children })` — full-width bordered-blue ghost button (icon + label via children).
  - `InstSectionIcon({ name, tint, size })` — renders the lucide icon for `name` (use the icon map from the Translation Contract) inside a `<span className={styles.tintIcon} style={{ '--tint': tint }}>`. Export an `INST_LUCIDE` map `Record<InstSection['icon'], LucideIcon>`.
  Match handoff sizes exactly: field input padding 11/12, radius 10, font 14.5, bg surface-2; primary btn padding 14, radius 12, font 15/700; ghost btn padding 13, radius 12, 1px primary border, gap 7; group card radius 14.
- [ ] **Step 2:** `InstAtoms.module.css` with `.field`, `.fieldLabel`, `.fieldInput`, `.groupCard`, `.primaryBtn` (+`:disabled`), `.ghostBtn`, `.tintIcon` (bg `color-mix(in srgb, var(--tint) 12%, transparent)`, color `var(--tint)`, grid place-items center). All tokens.
- [ ] **Step 3:** `npx tsc --noEmit` → clean. Commit: `feat(mobile/instellingen): shared atoms (field, group card, buttons, tint icon)`.

---

## Task 4: Hub (search + category cards)

**Files:** Create `components/dashboard/mobile/instellingen/InstellingenHub.tsx` (+ `.module.css`)

**Handoff source** (`MobileInstellingen.jsx` lines 404–466 — the hub render): search bar (lines 413–422), search-results list card (424–442), and the grouped 2-col card grid (443–463). Port per the contract. **Omit the big "Instellingen" title** (line 409) — the shell header shows it.

- [ ] **Step 1: Implement** `InstellingenHub.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { Search, X, ChevronRight } from 'lucide-react'
import { InstGroupCard, InstSectionIcon } from './InstAtoms'
import { matchSections } from './inst-helpers'
import { INST_GROUPS, INST_ALL, type InstSection } from './instellingen-mock'
import styles from './InstellingenHub.module.css'

export function InstellingenHub({ onOpen }: { onOpen: (key: string) => void }) {
  const [q, setQ] = useState('')
  const matches = matchSections(INST_ALL, q)

  return (
    <div className={styles.hub}>
      <div className={styles.searchWrap}>
        <div className={styles.search}>
          <Search size={16} aria-hidden="true" className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Zoek een instelling…"
          />
          {q && (
            <button type="button" className={styles.clear} onClick={() => setQ('')} aria-label="Wis zoekopdracht">
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {q ? (
        <div className={styles.results}>
          <InstGroupCard>
            {matches.length === 0 && <div className={styles.empty}>Niets gevonden</div>}
            {matches.map((it) => (
              <SearchRow key={it.k} item={it} onOpen={onOpen} />
            ))}
          </InstGroupCard>
        </div>
      ) : (
        INST_GROUPS.map((g) => (
          <section key={g.group} className={styles.group}>
            <h2 className={styles.groupLabel}>{g.group}</h2>
            <div className={styles.grid}>
              {g.items.map((it) => (
                <button key={it.k} type="button" className={styles.card} onClick={() => onOpen(it.k)}>
                  <InstSectionIcon name={it.icon} tint={it.tint} size={19} />
                  <div className={styles.cardText}>
                    <div className={styles.cardTitle}>{it.l}</div>
                    <div className={styles.cardSub}>{it.s}</div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  )
}

function SearchRow({ item, onOpen }: { item: InstSection; onOpen: (k: string) => void }) {
  return (
    <button type="button" className={styles.searchRow} onClick={() => onOpen(item.k)}>
      <InstSectionIcon name={item.icon} tint={item.tint} size={16} small />
      <div className={styles.searchRowText}>
        <div className={styles.cardTitle}>{item.l}</div>
        <div className={styles.cardSub}>{item.s}</div>
      </div>
      <ChevronRight size={16} aria-hidden="true" className={styles.chev} />
    </button>
  )
}
```

(Add an optional `small?: boolean` prop to `InstSectionIcon` in Task 3 → 30×30 radius 8 when small, else 38×38 radius 11.)

- [ ] **Step 2:** `InstellingenHub.module.css` — port exact values: hub padding-top via shell; search wrap `0 16px 16px`; search row surface/radius 12/border; group padding `0 16px 18px`; groupLabel 12/700 uppercase letter-spacing .05em muted; grid `1fr 1fr` gap 10; card surface radius 16 padding 14 min-height 104 column layout (`.cardText { margin-top: auto }`); cardTitle 14.5/700; cardSub 11.5 soft. Search row padding 13/14, 0.5px bottom borders via `:not(:last-child)`.
- [ ] **Step 3:** `npx tsc --noEmit` → clean. Commit: `feat(mobile/instellingen): hub (search + category cards)`.

---

## Task 5: Simple detail screens (Bedrijf, Team, Diensten, Reminders, Tags)

**Files:** Create, each `.tsx` + `.module.css`:
- `InstBedrijf`, `InstTeam`, `InstDiensten`, `InstReminders`, `InstTags` (in `components/dashboard/mobile/instellingen/`)

Each ports its handoff function per the Translation Contract. **Handoff source** for reference:
- **InstBedrijf** = handoff lines 145–161 (a `InstGroupCard`-like surface card with 6 `InstField`s incl. a Postcode/Plaats 110px+1fr grid, + `InstPrimaryBtn`). Outer padding `8px 16px 24px`, gap 14.
- **InstTeam** = lines 163–184: `InstGroupCard` with `INST_TEAM.map` rows (40px tinted-initials avatar via `--tint`, name 14.5/600 + email 12 soft, role pill `padding 3/9 radius 99` tinted), 0.5px row separators; then `InstGhostBtn` (Plus + "Lid uitnodigen").
- **InstDiensten** = lines 254–270: `InstGroupCard` with `INST_DIENSTEN` rows (name flex + `MobileToggle`), local `useState(INST_DIENSTEN)`; `InstGhostBtn` (Plus + "Dienst toevoegen").
- **InstReminders** = lines 306–329: intro paragraph + `INST_REMINDERS.map` cards (42px tinted number badge `i+1` via `--tint`, label 14/600 + sub 12 soft, right column `{dag}d` 17/800 + "na offerte" 10.5 muted, `ChevronRight`).
- **InstTags** = lines 355–374: `InstGroupCard` with `INST_TAGS` rows (tinted pill `--tint` for label, count text "N leads"/"ongebruikt", then `SYS` badge OR `X` icon), 0.5px separators; `InstGhostBtn` (Plus + "Nieuwe tag").

- [ ] **Step 1:** Implement all five `.tsx` + `.module.css`, following the contract (lucide icons, `MobileToggle`, `--tint` injection, tokens, `InstGroupCard`/`InstGhostBtn`/`InstField` reuse, local state where the handoff has it). No `position:absolute` wrappers — render plain content for the drilldown layer.
- [ ] **Step 2:** `npx tsc --noEmit` → clean. Commit: `feat(mobile/instellingen): simple detail screens (bedrijf, team, diensten, reminders, tags)`.

---

## Task 6: Complex detail — Prijzen (wat-als-simulator)

**Files:** Create `InstPrijzen.tsx` (+ `.module.css`). Port handoff lines 195–252.

- [ ] **Step 1:** Implement. Local `useState` map `{ [k]: number }` seeded from `INST_PRICE`; `changed` = any value ≠ base; `step(k, dir)` uses `stepPrice` (Task 2). Each row: label + (if `deltaPct ≠ 0`) a colored "+X% vs nu" line (`--color-success`/`--color-danger` via `data-dir`), then a `[−] €value/unit [+]` stepper (30×30 bordered buttons, value `min-width 80` tabular-nums). Below the list: the **simulator card** — `data-changed` switches background between `--color-surface` and the `linear-gradient(135deg, var(--color-primary), var(--accent-2))` (white text when changed); shows a `Sparkles` icon + "Wat-als simulator" + sub-text; when changed, shows two stats "Omzet-effect +€1.240" and "Gesch. conversie 61%" (**v1 placeholder values** — add a `// TODO: wire to pricing-impact (computeRevenueDelta / getPricingImpactBaseline)` comment). Footer `InstPrimaryBtn disabled={!changed}` "Tarieven opslaan".
- [ ] **Step 2:** `npx tsc --noEmit` → clean. Commit: `feat(mobile/instellingen): Prijzen screen + wat-als simulator (placeholder math)`.

---

## Task 7: Complex detail — Openingsbericht (WA-preview)

**Files:** Create `InstOpening.tsx` (+ `.module.css`). Port handoff lines 272–304.

- [ ] **Step 1:** Implement. Local `useState(INST_OPENING)`. Amber warning banner (`--color-warning-bg`/`--color-warning`). Label "Template-tekst" + `<textarea>` (min-height 150). Variable pills row (`INST_VARS.map` → monospace blue pills; click appends ` {var}` to text). Label "Voorbeeld" + a WhatsApp bubble preview: chat panel `--wa-chat-bg`, a centered "Vandaag" date-pill, an outgoing bubble `--wa-out-bg` with `white-space: pre-wrap` showing `fillOpening(txt)` (Task 2) + a time row "09:14 ✓✓" (ticks `--wa-tick-blue`, meta `--wa-meta`).
- [ ] **Step 2:** `npx tsc --noEmit` → clean. Commit: `feat(mobile/instellingen): Openingsbericht screen + WhatsApp live preview`.

---

## Task 8: Complex detail — Notificaties (matrix)

**Files:** Create `InstNotif.tsx` (+ `.module.css`). Port handoff lines 331–353.

- [ ] **Step 1:** Implement. Local `useState` nested map `{ [typeKey]: { app, push, mail } }` seeded from `INST_NOTIF` defs; `toggle(k, ch)` flips one. Render one card per `INST_NOTIF` type (title 14/600) containing 3 channel rows — each: lucide icon (`Sparkles`/`Smartphone`/`Mail`), label flex, `MobileToggle size={0.85}`.
- [ ] **Step 2:** `npx tsc --noEmit` → clean. Commit: `feat(mobile/instellingen): Notificaties per-channel matrix`.

---

## Task 9: MobileInstellingen shell (hub ↔ drilldown)

**Files:** Create `components/dashboard/mobile/instellingen/MobileInstellingen.tsx` (+ `.module.css`)

- [ ] **Step 1:** Implement:

```typescript
'use client'

import { useState } from 'react'
import { MobileDrilldownLayer } from '../drilldowns/MobileDrilldownLayer'
import { InstellingenHub } from './InstellingenHub'
import { InstBedrijf } from './InstBedrijf'
import { InstTeam } from './InstTeam'
import { InstPrijzen } from './InstPrijzen'
import { InstDiensten } from './InstDiensten'
import { InstOpening } from './InstOpening'
import { InstReminders } from './InstReminders'
import { InstNotif } from './InstNotif'
import { InstTags } from './InstTags'
import { INST_ALL } from './instellingen-mock'
import styles from './MobileInstellingen.module.css'

const DETAIL: Record<string, React.ComponentType> = {
  bedrijf: InstBedrijf, team: InstTeam, prijzen: InstPrijzen, diensten: InstDiensten,
  opening: InstOpening, reminders: InstReminders, notif: InstNotif, tags: InstTags,
}

export function MobileInstellingen() {
  const [view, setView] = useState<string | null>(null)
  const section = view ? INST_ALL.find((s) => s.k === view) : null
  const Detail = view ? DETAIL[view] : null

  return (
    <div className={styles.root}>
      <InstellingenHub onOpen={setView} />
      <MobileDrilldownLayer
        open={view !== null}
        title={section?.l ?? ''}
        onClose={() => setView(null)}
      >
        {Detail && <Detail />}
      </MobileDrilldownLayer>
    </div>
  )
}
```

`MobileInstellingen.module.css`: `.root { padding-bottom: var(--space-4); }`.

- [ ] **Step 2:** `npx tsc --noEmit` → clean. Commit: `feat(mobile/instellingen): MobileInstellingen shell (hub + drilldown)`.

---

## Task 10: Wire into the instellingen page

**Files:** Modify `app/dashboard/(app)/instellingen/page.tsx` + `page.module.css`

- [ ] **Step 1:** Import `MobileInstellingen` from `@/components/dashboard/mobile/instellingen/MobileInstellingen`.
- [ ] **Step 2:** Wrap the existing `return (<> … </>)` body in `<div className={styles.desktopTree}> … </div>` and append `<div className={styles.mobileTree}><MobileInstellingen /></div>` before the closing fragment. (Desktop markup unchanged, just nested.)
- [ ] **Step 3:** Append the toggle CSS to `page.module.css`:

```css
.desktopTree { display: block; }
.mobileTree { display: none; }
@media (max-width: 640px) {
  .desktopTree { display: none; }
  .mobileTree { display: block; }
}
```

- [ ] **Step 4:** `npx tsc --noEmit` → clean (no build — dev server live). Commit: `feat(mobile/instellingen): wire MobileInstellingen into page (desktop/mobile split)`.

---

## Task 11: Verify

- [ ] `npx tsc --noEmit` → clean.
- [ ] `npx vitest run components/dashboard/mobile/` → inst-helpers + all prior tests PASS.
- [ ] (Deferred to end-pass: full `npm run build` + on-device visual check of hub, each detail, the simulator gradient, WA-preview, notif toggles, light/dark.)

---

## Self-Review (during planning)

- **Spec coverage:** hub+search (Task 4), all 8 details (Tasks 5–8), navigation via drilldown (Task 9), mount split (Task 10) ✓. MobileToggle primitive (deferred Fase 0) built (Task 1) ✓.
- **v1 scope flagged:** local-state + mock; real-action wiring + pricing-impact math deferred to functional pass (noted in context + Task 6 TODO).
- **Translation contract** centralizes the token/icon/tint rules so all port tasks are consistent; no inline theme styles, lucide icons, `--tint` via custom property, `color-mix` for tints/disabled.
- **Type consistency:** `instellingen-mock.ts` types (`InstSection`/`PriceItem`/`NotifType`/`Reminder`/`TeamMember`/`Tag`/`Dienst`) consumed across hub + details; `inst-helpers` (`fillOpening`/`deltaPct`/`stepPrice`/`matchSections`) used by Prijzen/Opening/Hub; `MobileDrilldownLayer` props match its real API.
- **Shell-aware:** no duplicate title; drilldown overlays its own header; details render plain content (no absolute wrappers).
