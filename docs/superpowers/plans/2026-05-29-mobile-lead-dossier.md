# Mobile Lead-dossier — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use `- [ ]`.

**Goal:** Build the mobile **Lead-dossier** (route `/leads/[lead_id]`) pixel-matched to the handoff: full-screen (no bottom-nav), with a back-header (avatar + name + stage-pill), a 4-fact KPI strip, a Surface-status strip, a sticky tab bar (Info / Offerte / Foto's / Activiteit), and a sticky glass action bar (Bel / WhatsApp / Stuur offerte).

**Architecture:** Self-contained `'use client'` `MobileLeadDossier` (flex-column, fills the shell `.main`). **v1 ships UI with mock data** (`DOSS`/`DOSS_LEAD`, mirroring real shapes) — wiring to real `getLeadDetail`/`aggregateActivityTimeline` + action-bar intents is the final functional pass. Full-bleed is achieved by teaching `MobileShell` to hide its header + bottom-nav on `/leads/<id>` (same mechanism as the inbox chat detail). Mounted CSS-gated in `leads/[lead_id]/page.tsx` via `.desktopTree`/`.mobileTree`.

**Tech Stack:** Next.js App Router, TS, CSS Modules, tokens, lucide-react, vitest.

---

## Context

- **Full-bleed mechanism:** `MobileShell.tsx` currently hides chrome only for chat detail (`isChatDetail = pathname === '/inbox' && searchParams.get('lead')`). The dossier needs the same. `.main` always reserves bottom padding for the fixed BottomNav (`padding-bottom: calc(--mobile-bottom-nav-h + --mobile-safe-area-bottom)`); when full-bleed (no nav) that padding must be zeroed so the action bar sits at the true bottom. Task 8 adds `isLeadDossier` + a `.main[data-fullbleed]{ padding-bottom:0 }` rule (also applied to chat detail — correct either way: no nav ⇒ no reserved space).
- **Top inset:** when the shell header is hidden, `.main` starts under the notch. The dossier root adds `padding-top: env(safe-area-inset-top, 0px)` so the back button clears the notch. The handoff's `paddingTop: 54` is replaced by this.
- **Mount:** `leads/[lead_id]/page.tsx` is a server component rendering desktop lead-detail. Wrap its `return (<> … </>)` body in `<div className={styles.desktopTree}>` and append `<div className={styles.mobileTree}><MobileLeadDossier /></div>`. `MobileLeadDossier` is self-contained (mock) — no props in v1.
- **v1 data note (flag in code):** mock `DOSS`/`DOSS_LEAD`. The dossier shows the same mock lead regardless of `[lead_id]`. Final pass wires the page's real `getLeadDetail(lead_id)` → a mapper → the dossier, and the action bar to `tel:` / `wa.me` / the existing offerte modal (note: **offerte send is untested end-to-end — guard it**).

## Translation Contract (same as prior screens)

1. No inline theme/layout styles → colocated `.module.css` with tokens. Per-item dynamic values (tones) via CSS custom properties (`--tone`) + `color-mix`.
2. Colors: `DC2.blue→--color-primary`, `DC2.green→--color-success`, `DC2.amber→--color-warning`, `DC2.red→--color-danger`, `DC2.wa→--color-whatsapp`; `t.bg/surface/surface2/fg/fgSoft/fgMuted/border/accent` → `--color-bg/surface/surface-2/text/text-soft/text-muted/border/primary`. `'#9CA3AF'` (neutral dot) → `--color-text-muted`.
3. Icons → lucide: back→`ChevronLeft`, pin→`MapPin`, phone→`Phone`, mail→`Mail`, cam→`Camera`, doc→`FileText`, wa→`MessageCircle`, spark→`Sparkles`, check→`Check`, edit→`Pencil`, pause→`Pause`.
4. Tints: `tone + '24'`(14%)/`'20'`(12%)/`'1c'`(7%)/`'22'`(13%) alpha-hex → `color-mix(in srgb, var(--tone|--color-X) N%, transparent)`.
5. `'use client'` on interactive components; one `.tsx`+`.module.css`; named exports; camelCase; `data-*` variants.
6. Local state + mock; no real wiring in v1.

---

## Task 1: Tokens

**Files:** Modify `styles/tokens.css`.

- [ ] **Step 1:** In `:root` after `--color-toast-bg: #202124;` add:
```css
  --color-glass-bg: rgba(255, 255, 255, 0.92);
  --color-warning-strong: #B45309;
  --color-photo-stripe-a: #E7E9EE;
  --color-photo-stripe-b: #DEE1E7;
```
- [ ] **Step 2:** In `.dark` after `--color-toast-bg: #2C2C2E;` add:
```css
  --color-glass-bg: rgba(28, 28, 30, 0.92);
  --color-warning-strong: #FBBF24;
  --color-photo-stripe-a: #2A2A2D;
  --color-photo-stripe-b: #323237;
```
- [ ] **Step 3:** Commit: `feat(mobile/tokens): glass-bg, warning-strong, photo-stripe tokens`.

---

## Task 2: Mock + helpers (TDD)

**Files:** Create `components/dashboard/mobile/dossier/dossier-mock.ts`, `dossier-helpers.ts` (+ `.test.ts`).

- [ ] **Step 1: Mock** `dossier-mock.ts` — port the handoff `DOSS` (lines 32–65) verbatim (typed) + a `DOSS_LEAD` from the handoff page fallback (line 204): `{ id, naam, plaats, m2, fotos, prijs, stage, binnen }`. Inline `DC2` tones as data hex.

```typescript
/** MOCK — v1 toont deze lead ongeacht [lead_id]. Wiren aan getLeadDetail in de eind-pass. */
const DC2 = { blue: '#1A56FF', green: '#16A34A', amber: '#F59E0B', red: '#DC2626', wa: '#25D366', neutral: '#9CA3AF' }

export type DossierLead = { id: string; naam: string; plaats: string; m2: number; fotos: number; prijs: number | null; stage: string; binnen: string }
export const DOSS_LEAD: DossierLead = { id: 'L-2087', naam: 'Jeroen de Vries', plaats: 'Delft', m2: 145, fotos: 4, prijs: 1872, stage: 'gesprek', binnen: '8 min' }

export type DossBijzonder = { l: string; v: string; tone: string }
export type DossVraag = { q: string; done: boolean }
export type DossRegel = { l: string; detail: string; bedrag: number }
export type DossActity = { icon: 'doc' | 'spark' | 'wa' | 'cam'; tone: string; t: string; time: string }

export const DOSS = {
  telefoon: '06 - 24 96 52 70', email: 'jeroen.devries@gmail.com',
  adres: 'Lindenlaan 14, 2611 GH Delft', afstand: 18,
  hoofd: 'Oprit / terras reiniging', sub: ['Voegen invegen', 'Beschermlaag aanbrengen'],
  surface: 'Vraagt om bevestiging van de m²', fase: 'Info verzamelen',
  bijzonderheden: [
    { l: 'Planten langs de rand', v: 'Ja — afschermen met folie', tone: DC2.amber },
    { l: 'Groene aanslag', v: 'Ja, aanwezig', tone: DC2.amber },
    { l: 'Korstmos', v: 'Nee', tone: DC2.neutral },
    { l: 'Voegzand', v: 'Onkruidwerend · antraciet', tone: DC2.blue },
  ] as DossBijzonder[],
  vragen: [
    { q: 'Foto’s ontvangen', done: true }, { q: 'Voegkleur gekozen', done: true },
    { q: 'Planten afgestemd', done: true }, { q: 'Oppervlakte bevestigd', done: false },
  ] as DossVraag[],
  offerte: {
    status: 'Nog niet verstuurd',
    regels: [
      { l: 'Reiniging oprit', detail: '145 m² × €3,95', bedrag: 572.75 },
      { l: 'Voegen invegen (onkruidwerend)', detail: '145 m² × €4,50', bedrag: 652.5 },
      { l: 'Beschermlaag', detail: '145 m² × €2,10', bedrag: 304.5 },
      { l: 'Planten afschermen', detail: '2 rollen folie × €8,50', bedrag: 17.0 },
    ] as DossRegel[],
    subtotaal: 1546.75, btw: 324.82, totaal: 1871.57,
  },
  fotos_list: [{ tag: 'Oprit · overzicht' }, { tag: 'Probleemgebied' }, { tag: 'Voegen close-up' }, { tag: 'Plantenrand' }],
  activity: [
    { icon: 'doc', tone: DC2.neutral, t: 'Lead binnengekomen via webformulier', time: '09:12' },
    { icon: 'spark', tone: DC2.blue, t: 'Surface stuurde het openingsbericht via WhatsApp', time: '09:12' },
    { icon: 'wa', tone: DC2.wa, t: '“Hoi! Ja, ongeveer 145m² inderdaad.”', time: '09:28' },
    { icon: 'spark', tone: DC2.blue, t: 'Surface vroeg om recente foto’s en voegkleur', time: '09:42' },
    { icon: 'cam', tone: DC2.wa, t: 'Stuurde 4 foto’s', time: '10:08' },
    { icon: 'spark', tone: DC2.blue, t: 'Surface analyseert foto’s — offerte bijna klaar', time: 'nu' },
  ] as DossActity[],
}
```

- [ ] **Step 2: Test** `dossier-helpers.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { dossEur, initials, factStrip } from './dossier-helpers'
import { DOSS_LEAD } from './dossier-mock'

describe('dossEur', () => {
  it('formats euro with nl-NL comma decimals', () => {
    expect(dossEur(1871.57)).toBe('€ 1.871,57')
    expect(dossEur(17)).toBe('€ 17,00')
  })
})
describe('initials', () => {
  it('takes up to 2 uppercase initials', () => {
    expect(initials('Jeroen de Vries')).toBe('JD')
    expect(initials('Anna')).toBe('A')
    expect(initials('')).toBe('L')
  })
})
describe('factStrip', () => {
  it('builds the 4 KPI facts from the lead', () => {
    expect(factStrip(DOSS_LEAD)).toEqual([
      { v: '145 m²', l: 'Oppervlak' },
      { v: '4', l: "Foto's" },
      { v: '€ 1.872', l: 'Offerte' },
      { v: '8 min', l: 'Binnen' },
    ])
  })
  it('shows — for a null offerte price', () => {
    expect(factStrip({ ...DOSS_LEAD, prijs: null })[2]).toEqual({ v: '—', l: 'Offerte' })
  })
})
```

- [ ] **Step 3: Impl** `dossier-helpers.ts`:
```typescript
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
```

- [ ] **Step 4:** `npx vitest run components/dashboard/mobile/dossier/dossier-helpers.test.ts` → PASS. Commit: `feat(mobile/dossier): mock data + tested helpers`.

---

## Task 3: Dossier atoms

**Files:** Create `components/dashboard/mobile/dossier/DossAtoms.tsx` (+ `.module.css`).

Port these handoff atoms per the contract (named exports):
- `DossLabel` (handoff line 67): uppercase section label (12/700 muted, letter-spacing .05em, padding `0 4px 8px`).
- `DossRow` (handoff lines 83–93): contact row — lucide icon (16, muted) + label(11 muted)/value(14/500) + optional 30×30 tinted action button (`--tone` via color-mix 13%). Props: `icon` (lucide name), `label`, `value`, `action?: { icon, tone }`.
- `DossPhoto` (handoff lines 71–80): 120px striped placeholder — `repeating-linear-gradient(135deg, var(--color-photo-stripe-a) 0 9px, var(--color-photo-stripe-b) 9px 18px)` + monospace tag chip bottom-left.
- `DossCheckPill`: check icon + text pill, bg `color-mix(var(--color-primary) 8%, transparent)`, text primary (handoff line 110–111).
- `DossDotRow`: 7×7 rounded dot (`--tone`) + label(flex) + value(12.5 soft), padding `11px 14px` (handoff bijzonderheden).
- `DossCheckbox`: 20×20 circle — done → `--color-success` fill + white Check(12,stroke 3); pending → 1.5px border (handoff vragen).
- `DossTimelineItem`: 28×28 tinted bubble (`--tone`, color-mix 14%) + lucide icon + optional connector line + text(13.5)/time(11 muted) (handoff lines 184–194).

- [ ] **Step 1:** Implement `DossAtoms.tsx` + `.module.css` per the above (lucide icon map for row/timeline/check). Export a `DOSS_LUCIDE` map for the activity/contact icon names.
- [ ] **Step 2:** `npx tsc --noEmit` → clean. Commit: `feat(mobile/dossier): shared atoms (row, photo, pill, dot, checkbox, timeline)`.

---

## Task 4: Top-section components

**Files:** Create (each `.tsx`+`.module.css`): `DossierHeader`, `DossierFactStrip`, `DossierSurfaceStrip`, `DossierTabs`.

- **DossierHeader** (handoff lines 219–236): back button (`ChevronLeft` + "Leads", primary, calls `onBack`) + a row with 50×50 accent-tinted initials avatar + name(21/800) + stage-pill ("In gesprek" — primary dot+text, bg `color-mix(--color-primary 12%, transparent)`) + `{plaats} · {id}`(12 muted). Props: `lead: DossierLead`, `onBack: () => void`.
- **DossierFactStrip** (handoff lines 239–247): a surface card, `display:flex`, 4 equal cells (value 16/800, label 10.5 uppercase muted), `0.5px` left border on cells 2–4. Props: `facts: {v,l}[]`.
- **DossierSurfaceStrip** (handoff lines 251–261): gradient card (`linear-gradient(135deg, color-mix(--color-primary 10%, transparent), color-mix(--accent-2 10%, transparent))`, 1px `color-mix(--color-primary 20%, transparent)` border), 30×30 gradient `Sparkles` bubble, "SURFACE · {fase}"(11/700 primary uppercase) + message(13), + a "Pauze" ghost button (Pause icon). Props: `fase`, `message`. (Pauze is visual-only in v1.)
- **DossierTabs** (handoff lines 265–276): sticky segmented control (`position: sticky; top: 0; z-index: 2; background: var(--color-bg)`), pill track `color-mix(--color-text 8%, transparent)` (or `#E4E4E9` light / rgba white .08 dark via existing `--color-chip-bg`), active button `--color-surface` + shadow. Props: `active`, `tabs: {k,l}[]`, `onSelect`. Use `--color-chip-bg` for the track.

- [ ] **Step 1:** Implement all four per the contract (lucide icons, tokens, `data-active` for tab state).
- [ ] **Step 2:** `npx tsc --noEmit` → clean. Commit: `feat(mobile/dossier): header, fact-strip, surface-strip, sticky tabs`.

---

## Task 5: Tab contents

**Files:** Create (each `.tsx`+`.module.css`): `DossInfo`, `DossOfferte`, `DossFotos`, `DossActiviteit`.

Port the handoff tab bodies per the contract:
- **DossInfo** (handoff lines 82–116 + bijzonderheden/vragen 117–179): three sections — Contact (`DossLabel` + surface card of 3 `DossRow`s: phone w/ wa-action, mail, pin w/ map-action), Dienst (`DOSS.hoofd` 15/700 + `DossCheckPill` per sub + a `{m2} m²` surface-2 pill), Bijzonderheden (`DossDotRow` per item), and "Surface-uitvraag" (surface card of `DossCheckbox` + question rows; done → regular weight, pending → 600). Reads `DOSS` + `lead.m2`.
- **DossOfferte** (handoff offerte tab): amber status badge (`color-mix(--color-warning 16%, transparent)` bg, `--color-warning-strong` text) "Nog niet verstuurd"; surface card of regels (label 13.5/600 + detail 11.5 muted + `dossEur(bedrag)` 13.5/700 tabular); totals (Subtotaal/BTW 21%/Totaal 16/800) via `dossEur`; two buttons row: "Aanpassen" (`Pencil`, bordered) + "PDF-preview" (`FileText`, primary). (Buttons visual-only in v1.)
- **DossFotos** (handoff lines 281–288): `DossLabel` "{fotos} foto's van de klant" + 2-col grid of `DossPhoto`.
- **DossActiviteit** (handoff lines 180–198): `DossLabel` "Tijdlijn" + surface card of `DossTimelineItem` (connector between items).

- [ ] **Step 1:** Implement all four.
- [ ] **Step 2:** `npx tsc --noEmit` → clean. Commit: `feat(mobile/dossier): Info / Offerte / Foto's / Activiteit tabs`.

---

## Task 6: Sticky action bar

**Files:** Create `DossierActionBar.tsx` (+ `.module.css`). Port handoff lines 294–300.

- [ ] **Step 1:** Implement:
```typescript
'use client'

import { Phone, MessageCircle, FileText } from 'lucide-react'
import styles from './DossierActionBar.module.css'

type Props = { onCall?: () => void; onWhatsApp?: () => void; onSendOfferte?: () => void }

export function DossierActionBar({ onCall, onWhatsApp, onSendOfferte }: Props) {
  return (
    <div className={styles.bar}>
      <button type="button" className={styles.iconBtn} onClick={onCall} aria-label="Bel">
        <Phone size={18} aria-hidden="true" />
      </button>
      <button type="button" className={styles.waBtn} onClick={onWhatsApp} aria-label="WhatsApp">
        <MessageCircle size={18} aria-hidden="true" />
      </button>
      <button type="button" className={styles.sendBtn} onClick={onSendOfferte}>
        <FileText size={16} aria-hidden="true" />
        Stuur offerte
      </button>
    </div>
  )
}
```
`DossierActionBar.module.css`:
```css
.bar {
  flex-shrink: 0;
  display: flex;
  gap: 8px;
  background: var(--color-glass-bg);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border-top: 0.5px solid var(--color-border);
  padding: 12px 16px calc(12px + var(--mobile-safe-area-bottom));
}
.iconBtn,
.waBtn {
  width: 48px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 12px;
  cursor: pointer;
}
.iconBtn {
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
}
.waBtn {
  border: none;
  background: color-mix(in srgb, var(--color-whatsapp) 18%, transparent);
  color: var(--color-whatsapp);
}
.sendBtn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 13px;
  border: none;
  border-radius: 12px;
  background: var(--color-primary);
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
}
```
- [ ] **Step 2:** `npx tsc --noEmit` → clean. Commit: `feat(mobile/dossier): sticky glass action bar`.

---

## Task 7: MobileLeadDossier screen

**Files:** Create `components/dashboard/mobile/dossier/MobileLeadDossier.tsx` (+ `.module.css`).

- [ ] **Step 1:** Implement:
```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DossierHeader } from './DossierHeader'
import { DossierFactStrip } from './DossierFactStrip'
import { DossierSurfaceStrip } from './DossierSurfaceStrip'
import { DossierTabs } from './DossierTabs'
import { DossInfo } from './DossInfo'
import { DossOfferte } from './DossOfferte'
import { DossFotos } from './DossFotos'
import { DossActiviteit } from './DossActiviteit'
import { DossierActionBar } from './DossierActionBar'
import { factStrip } from './dossier-helpers'
import { DOSS, DOSS_LEAD } from './dossier-mock'
import styles from './MobileLeadDossier.module.css'

type Tab = 'info' | 'offerte' | 'fotos' | 'activiteit'
const TABS: Array<{ k: Tab; l: string }> = [
  { k: 'info', l: 'Info' }, { k: 'offerte', l: 'Offerte' }, { k: 'fotos', l: "Foto's" }, { k: 'activiteit', l: 'Activiteit' },
]

export function MobileLeadDossier() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('info')
  const lead = DOSS_LEAD // v1 mock — wire getLeadDetail in functional pass

  return (
    <div className={styles.root}>
      <div className={styles.scroll}>
        <DossierHeader lead={lead} onBack={() => router.push('/leads')} />
        <DossierFactStrip facts={factStrip(lead)} />
        <DossierSurfaceStrip fase={DOSS.fase} message={DOSS.surface} />
        <DossierTabs active={tab} tabs={TABS} onSelect={(k) => setTab(k as Tab)} />
        <div className={styles.tabBody}>
          {tab === 'info' && <DossInfo lead={lead} />}
          {tab === 'offerte' && <DossOfferte />}
          {tab === 'fotos' && <DossFotos fotos={lead.fotos} />}
          {tab === 'activiteit' && <DossActiviteit />}
        </div>
      </div>
      <DossierActionBar />
    </div>
  )
}
```
`MobileLeadDossier.module.css`:
```css
.root {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-bg);
  /* Header staat onder de notch wanneer de shell-header verborgen is. */
  padding-top: env(safe-area-inset-top, 0px);
}
.scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.tabBody {
  padding: 0 16px 24px;
}
```
- [ ] **Step 2:** `npx tsc --noEmit` → clean. Commit: `feat(mobile/dossier): MobileLeadDossier screen composition`.

---

## Task 8: MobileShell full-bleed for the dossier

**Files:** Modify `components/dashboard/mobile/MobileShell.tsx` + `MobileShell.module.css`.

- [ ] **Step 1:** In `MobileShell.tsx`, after the `isChatDetail` line add:
```tsx
  // Lead-dossier (/leads/<id>, niet de lijst /leads): full-bleed zoals chat-detail.
  const isLeadDossier = /^\/leads\/[^/]+$/.test(pathname)
  const isFullBleed = isChatDetail || isLeadDossier
```
Replace the header condition `{!isOverzicht && !isChatDetail && (` with `{!isOverzicht && !isFullBleed && (`, the bottom-nav condition `{!isChatDetail && (` with `{!isFullBleed && (`, and the `<main className={styles.main}>` with `<main className={styles.main} data-fullbleed={isFullBleed || undefined}>`.
- [ ] **Step 2:** In `MobileShell.module.css` append:
```css
/* Full-bleed routes (chat-detail, lead-dossier): geen bottom-nav, dus geen
   gereserveerde onderruimte — het scherm vult tot de echte onderkant. */
.main[data-fullbleed] {
  padding-bottom: 0;
}
```
- [ ] **Step 3:** `npx tsc --noEmit` → clean. Commit: `feat(mobile/shell): full-bleed treatment for the lead-dossier route`.

---

## Task 9: Wire into the lead-detail page

**Files:** Modify `app/dashboard/(app)/leads/[lead_id]/page.tsx` + `page.module.css`.

- [ ] **Step 1:** Import `MobileLeadDossier` from `@/components/dashboard/mobile/dossier/MobileLeadDossier`.
- [ ] **Step 2:** Wrap the existing `return (<> … </>)` body in `<div className={styles.desktopTree}> … </div>` and append `<div className={styles.mobileTree}><MobileLeadDossier /></div>`. (Desktop markup unchanged.)
- [ ] **Step 3:** Append to `page.module.css`:
```css
.desktopTree { display: block; }
.mobileTree { display: none; }
@media (max-width: 640px) {
  .desktopTree { display: none; }
  .mobileTree { display: block; }
}
```
- [ ] **Step 4:** `npx tsc --noEmit` → clean (no build — dev server live). Commit: `feat(mobile/dossier): wire MobileLeadDossier into lead page (desktop/mobile split)`.

---

## Task 10: Verify

- [ ] `npx tsc --noEmit` → clean.
- [ ] `npx vitest run components/dashboard/mobile/` → dossier-helpers + all prior tests PASS.
- [ ] (Deferred to end-pass: `npm run build`; on-device check of full-bleed layout, sticky tabs/action bar on iOS, each tab, light/dark; wire real `getLeadDetail` + action intents.)

---

## Self-Review (during planning)

- **Spec coverage:** header (Task 4), fact-strip (4), surface-strip, sticky tabs (Task 4), 4 tab contents (Task 5), sticky glass action bar (Task 6), full-bleed/no-nav (Task 8), mount (Task 9) ✓.
- **Full-bleed correctness:** `isFullBleed` hides header+nav; `.main[data-fullbleed]` zeroes the reserved bottom padding (also fixes any latent chat-detail gap); root adds `env(safe-area-inset-top)`; action bar adds `--mobile-safe-area-bottom`.
- **v1 scope flagged:** mock `DOSS`/`DOSS_LEAD`; same lead regardless of id; action bar + offerte send deferred (with the untested-send guard noted).
- **Type consistency:** `DossierLead`/`Doss*` types from mock consumed by helpers + components; `factStrip`/`dossEur`/`initials` tested; lucide icon names mapped per contract; `MobileShell` regex excludes `/leads` list.
- **Reuse:** no new shared primitives needed (StarRating/MobileToggle/charts not used here); `--color-chip-bg`, `--wa-*`, `--accent-2`, `--mobile-safe-area-bottom` reused.
