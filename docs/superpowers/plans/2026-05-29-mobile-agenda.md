# Mobile Agenda — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use `- [ ]`.

**Goal:** Build the mobile **Agenda** (route `/agenda`) pixel-matched to the handoff: a week-list (filter pills, day-jump strip, live "bezig" banner, day-groups of appointment rows) that drills into job/site-visit detail flows, with a reschedule sheet, a completion flow, and a new-appointment sheet.

**Architecture:** Self-contained `'use client'` `MobileAgenda` controller. The week-list stays at `/agenda` (shell header + bottom-nav visible — `cal` tab). Tapping an event opens a **detail flow** (FlowKlus / FlowPlaatsbezoek) via the existing `MobileDrilldownLayer`. From there, **Herplannen** and **Nieuwe afspraak** open bottom-sheets, and **Klus afronden** opens a full-height completion sheet. **v1 ships UI with mock data (`AG_EVENTS`) + local state.** All write paths (reschedule, complete, photo upload, conflict-resolution persistence) are the final functional pass — the read side has live `agenda-queries.ts`, but **no appointment write/server-actions exist yet** (the functional pass must create them, likely with new schema for completion/time-tracking).

**Tech Stack:** Next.js App Router, TS, CSS Modules, tokens, lucide-react, vitest.

---

## Context

- **No shell change needed:** `/agenda` is the `cal` bottom-nav tab; it keeps the shell header + nav. The detail flows are in-component (drilldown layer + sheets), not route changes — the shell stays mounted. (The lead-dossier already added the only full-bleed route.)
- **Drilldown for detail, sheets for overlays:** Use `MobileDrilldownLayer` (props `open`, `title`, `subtitle?`, `onClose`, `children`, `rightAction?`) for FlowKlus/FlowPlaatsbezoek and the full-height FlowAfronden. Use the established bottom-sheet pattern (parent `useState` + conditional render + backdrop + `onClose`, slide-up via `--ease-ios`/`--dur-sheet`; see `leads/LeadsFilterSheet`) for **Herplannen** and **Nieuwe afspraak**. This replaces the handoff's bespoke translateX-stack — same UX, our primitives.
- **Mount:** `agenda/page.tsx` renders desktop. Wrap its `return` body in `.desktopTree`, append `.mobileTree` with `<MobileAgenda/>`. Use the **inbox `.mobileTree` pattern** (`flex:1; min-height:0`, `display:flex; flex-direction:column` at ≤640px) since the week-list scrolls full-height. `MobileAgenda` is self-contained (mock) — no props v1.
- **Data (read) reference (for the functional pass):** `lib/dashboard/agenda-queries.ts` — `getAppointmentsForRange(queryStart, queryEnd)`, `getAppointmentsForMonth(year, month)` → `Appointment[]` (from `leads.afspraak_geboekt_op`, Amsterdam TZ). No write-actions — flag in code.

## Translation Contract (same conventions as prior screens)

1. No inline theme/layout styles → colocated `.module.css` + tokens; per-item dynamic colors via `--tone` custom property + `color-mix`.
2. Color map: handoff `t.accent`→`--color-primary`, `t.success`→`--color-success`, `t.warning`→`--color-warning`, `t.danger`→`--color-danger`, `t.wa`→`--color-whatsapp`, `t.fg/fgSoft/fgMuted`→`--color-text/-soft/-muted`, `t.bg/surface/surface2`→`--color-bg/surface/surface-2`, `t.border`→`--color-border`, `t.borderSoft`→`--color-border-soft`, `t.chipBg`→`--color-chip-bg`. Live-banner gradient `c+'15'→c+'06'` → `linear-gradient(135deg, color-mix(in srgb, var(--color-success) 15%, transparent), color-mix(in srgb, var(--color-success) 6%, transparent))`, border `color-mix(--color-success 40%, transparent)`.
3. **`eventTone`** (kind → color), `durStr`, `dateLabel` are **ported from the handoff `ABShared.jsx`** by the helpers implementer (Task 2). The kind→token map: `plaatsbezoek→--color-warning`, `klus→--color-primary`, `bel→--color-whatsapp`, `eigen→--color-text-muted` (confirm against ABShared's `eventTone`; keep its mapping, swap hex→tokens). Tones flow to components via `--tone`.
4. Icons → lucide: search→`Search`, plus→`Plus`, chevron→`ChevronRight`, back→(layer), check→`Check`, clock→`Clock`, bolt→`Zap`, pin→`MapPin`, phone→`Phone`, wa→`MessageCircle`, foto/cam→`Camera`, route→`Route`, edit→`Pencil`, euro→`Euro`, star→`Star`, bell→`Bell`, spark→`Sparkles`.
5. `'use client'` on interactive components; one `.tsx`+`.module.css`; named exports; camelCase; `data-*` variants.
6. Local state + mock; **no real wiring v1** (flag write-handlers with `// TODO: functional pass — server action`).

---

## Task 1: Mock + helpers (TDD)

**Files:** Create `components/dashboard/mobile/agenda/agenda-mock.ts`, `agenda-mobile-helpers.ts` (+ `.test.ts`).

- [ ] **Step 1: Mock** — port `AG_EVENTS` + the day grouping from handoff `src/mobile-agenda/AgendaShared.jsx` and `src/agenda-b/ABShared.jsx` (read them). Type each event: `{ id, kind: 'plaatsbezoek'|'klus'|'bel'|'eigen', naam, adres, start, end, date, m2?, prijs?, dienst?, klant?, lead?, materialen? }` (match the handoff fields). Export `AG_EVENTS`, the `NOW_ID` (the live event, `'C1'`), and any day/week grouping data. Add a header comment: `// MOCK v1 — vervang door getAppointmentsForRange in de functionele pass`.
- [ ] **Step 2: Test** `agenda-mobile-helpers.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { durStr, minutesBetween, slotConflict } from './agenda-mobile-helpers'

describe('minutesBetween / durStr', () => {
  it('computes minutes between HH:MM times', () => {
    expect(minutesBetween('09:00', '12:45')).toBe(225)
    expect(minutesBetween('10:00', '10:30')).toBe(30)
  })
  it('formats a duration as "Xu Ym" / "Ym"', () => {
    expect(durStr('09:00', '12:45')).toBe('3u 45m')
    expect(durStr('10:00', '10:30')).toBe('30m')
    expect(durStr('09:00', '11:00')).toBe('2u')
  })
})

describe('slotConflict', () => {
  // A new slot starting at `start` lasting `durMin` conflicts if it overlaps any busy [s,e).
  const busy = [{ start: '10:00', end: '11:30' }]
  it('detects an overlap', () => {
    expect(slotConflict('09:30', 180, busy)).toEqual({ conflict: true, with: busy[0] })
  })
  it('no conflict when the slot ends before a busy block', () => {
    expect(slotConflict('08:00', 60, busy)).toEqual({ conflict: false })
  })
  it('no conflict when the slot starts after a busy block', () => {
    expect(slotConflict('12:00', 60, busy)).toEqual({ conflict: false })
  })
})
```
- [ ] **Step 3: Impl** `agenda-mobile-helpers.ts`:
```typescript
export type TimeBlock = { start: string; end: string }

/** Minuten tussen twee 'HH:MM'-tijden (zelfde dag). */
export function minutesBetween(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return eh * 60 + em - (sh * 60 + sm)
}

/** Duur als 'Xu Ym' / 'Xu' / 'Ym'. */
export function durStr(start: string, end: string): string {
  const total = minutesBetween(start, end)
  const u = Math.floor(total / 60)
  const m = total % 60
  if (u === 0) return `${m}m`
  if (m === 0) return `${u}u`
  return `${u}u ${m}m`
}

/** Botst een nieuw slot (start + duur in min) met een bestaand bezet-blok? */
export function slotConflict(
  start: string,
  durMin: number,
  busy: TimeBlock[],
): { conflict: true; with: TimeBlock } | { conflict: false } {
  const [sh, sm] = start.split(':').map(Number)
  const s = sh * 60 + sm
  const e = s + durMin
  for (const b of busy) {
    const bs = minutesBetween('00:00', b.start)
    const be = minutesBetween('00:00', b.end)
    if (s < be && e > bs) return { conflict: true, with: b }
  }
  return { conflict: false }
}

// eventTone / dateLabel: zie agenda-mock.ts (geport uit ABShared).
```
Also port `eventTone(kind): string` (returns a CSS var per the contract map) + `dateLabel(date): string` from handoff `ABShared.jsx` into this file (or the mock); the implementer reads ABShared for the exact mapping/format.
- [ ] **Step 4:** `npx vitest run components/dashboard/mobile/agenda/agenda-mobile-helpers.test.ts` → PASS. Commit: `feat(mobile/agenda): mock data + tested time/conflict helpers`.

---

## Task 2: Flow atoms (FlowShared port)

**Files:** Create `components/dashboard/mobile/agenda/FlowAtoms.tsx` (+ `.module.css`). Port `src/agenda-b/flow/FlowShared.jsx`.

- [ ] **Step 1:** Port these named exports per the contract: `FNav` (back + title + sub + right action — note: when used inside `MobileDrilldownLayer` the layer already provides back+title, so `FNav` is only for the full-height Afronden sheet; for drilldown content omit it), `FHero` (event-tone gradient banner + name + kind badge + time/duration), `FDetailCard` (`{ icon, title, right?, dense?, children }`), `FKV` (`{ k, v, last? }`), `FCheckRow` (`{ done, label, time?, indeterminate?, last? }` — circular checkbox states), `FBigAction` (`{ icon, label, primary? }`), `FMiniMap` (SVG route preview + distance label). lucide icons; `--tone` for event color; tokens throughout.
- [ ] **Step 2:** `npx tsc --noEmit` → clean. Commit: `feat(mobile/agenda): flow atoms (nav, hero, detail-card, kv, check-row, big-action, mini-map)`.

---

## Task 3: Week-list (ABMain port)

**Files:** Create (each `.tsx`+`.module.css`): `AgendaFilterPills`, `AgendaDayJumpStrip`, `AgendaLiveBanner`, `AgendaDayGroup`, `AgendaEventRow`, `AgendaWeek`. Port `src/agenda-b/ABMain.jsx` + `ABShared.jsx` atoms.

- [ ] **Step 1:** Implement per the contract:
  - `AgendaFilterPills` (`{ active, onPick, items }`): segmented pills (Vandaag/Deze week/Volgende week/Eigen werk), `data-active`.
  - `AgendaDayJumpStrip`: 7-col mini week — wday(9/700 upper) + day(15/800 tabular) + up-to-3 event dots; `data-today`/`data-past`.
  - `AgendaLiveBanner` (`{ ev, onOpen, onAfronden, onFoto, onWhatsApp }`): green gradient banner, pulsing dot, "BEZIG · NU {time}" + remaining, name·address, "Invegen · 62m² · €640", mini action buttons.
  - `AgendaDayGroup` (`{ date, label, summary, hours, children }`): 46×50 date pill (`data-today`), label(15/700) + summary(12 muted) + hours(right).
  - `AgendaEventRow` (`{ ev, state: 'now'|'idle'|'done', onClick }`): time column + 3px color rail (`--tone`) + content (type badge, m², "Bezig" red badge if now, name, address w/ pin) + chevron; `data-state` (now → tinted bg, done → 0.55 opacity + line-through).
  - `AgendaWeek` (`{ events, onOpenEvent, onNew, onOpenSearch }`): composes the large title ("Agenda" 30/800 + "Week 20 · N afspraken · Xu werk" + search/+ buttons) + filter pills (local `filter` state) + day-jump-strip + live-banner + grouped `AgendaDayGroup`s of `AgendaEventRow`s. Uses `AG_EVENTS`/`NOW_ID` from the mock, `eventTone`/`durStr` from helpers.
- [ ] **Step 2:** `npx tsc --noEmit` → clean. Commit: `feat(mobile/agenda): week-list (filter pills, day-jump, live banner, day groups, event rows)`.

---

## Task 4: Detail flows — Klus + Plaatsbezoek

**Files:** Create `FlowKlus.tsx` (+css) + `FlowPlaatsbezoek.tsx` (+css). Port `flow/FKlus.jsx` + `flow/FPlaatsbezoek.jsx`.

- [ ] **Step 1:** Implement as drilldown **content** (no own FNav — the `MobileDrilldownLayer` provides the header; pass the title via the controller). Props: `{ ev, onHerplan, onAfronden, onStartOfferte }`.
  - `FlowKlus`: FHero (now/planned badge via `ev.id === NOW_ID`), time-tracking strip (live 3-col if now else start/dur/reistijd), FBigAction row (Route/Bel/WA/Foto), FCheckRow checklist (5 steps; `indeterminate` on the in-progress step when now), klant+adres card + FMiniMap, dienst FKV details, footer buttons: "Herplannen" (`onHerplan`) + "Klus afronden" (`onAfronden`, primary success). Read-only data from `ev`/mock.
  - `FlowPlaatsbezoek`: FHero (intake/warning badge), klant card + WA-context callout, adres + FMiniMap, intake FCheckRow checklist (5, local toggle state), offerte-basis FKV, Surface-tip callout (accent), footer "Herplannen" + "Offerte starten" (`onStartOfferte`, primary). Checklist toggles use local `useState`.
  - Mark `onHerplan`/`onAfronden`/`onStartOfferte` wiring with `// TODO: functional pass`.
- [ ] **Step 2:** `npx tsc --noEmit` → clean. Commit: `feat(mobile/agenda): Klus + Plaatsbezoek detail flows`.

---

## Task 5: Completion flow — Afronden

**Files:** Create `FlowAfronden.tsx` (+css). Port `flow/FAfronden.jsx`.

- [ ] **Step 1:** Implement as a **full-height sheet** content (rendered by the controller in a full-screen sheet; include its own `FNav` "Klus afronden" + customer/location + close). Sections: green time-summary hero (Start/Klaar/Gewerkt 3-col), photos `FDetailCard` (4-col grid of gradient `PhotoTile`s with "1/3" labels + a dashed "+" add tile — local `photos` state, upload deferred), notes `FDetailCard` (editable textarea pre-filled "Surface vulde dit in"), materials `FDetailCard` (FKV actual-vs-expected, editable), next-steps `FDetailCard` (rows: euro/star/bell icon + title + sub + `MobileToggle` — local state), footer "Markeer als afgerond" (`onDone`, success). `PhotoTile` gradient tones inline as data (3 gradients). Mark `onDone` with `// TODO: functional pass — complete-job server action + photo upload`.
- [ ] **Step 2:** `npx tsc --noEmit` → clean. Commit: `feat(mobile/agenda): Afronden completion flow`.

---

## Task 6: Sheets — Herplannen + Nieuwe afspraak

**Files:** Create `AgendaHerplanSheet.tsx` (+css) + `AgendaNewSheet.tsx` (+css). Port `flow/FHerplannen.jsx` + `ABNew.jsx`.

- [ ] **Step 1:** Implement as bottom-sheets (backdrop + slide-up panel, `onClose`):
  - `AgendaHerplanSheet` (`{ ev, open, onClose, onConfirm }`): grabber + header (Annuleren / "Herplannen" / Bevestig), "NU GEPLAND" current-slot chip, `DayPicker` (5-day mini calendar, busy-dot red/orange/green via `--tone`, active day highlighted — local `active`), `SlotsGrid` (3-col, 12 slots 08:00–15:00; free/busy/conflict — busy faded+strikethrough+label; selected free slot → local `selectedSlot`), a **conflict banner** computed via `slotConflict(selectedSlot, durMin, busy)` (Task 1) showing "{slot} botst met {with}", and a WA-notify row with `MobileToggle` (default on). "Bevestig" disabled while a conflict is selected. `onConfirm` → `// TODO: functional pass — reschedule server action`.
  - `AgendaNewSheet` (`{ open, onClose, onSave }`): max-height 88% scrollable sheet, grabber + header (Annuleren / "Nieuwe afspraak" / Opslaan), `FieldGroup`/`FieldRow` sections — Klant (avatar+name+lead row, chevron), Wanneer (Datum / Tijd+duur / Reminder chips), Type (kind chips — selected → `eventTone` bg), Adres+Dienst, Notitie (textarea). All local state; `onSave` → `// TODO: functional pass — create-appointment server action`.
- [ ] **Step 2:** `npx tsc --noEmit` → clean. Commit: `feat(mobile/agenda): Herplannen + Nieuwe-afspraak sheets`.

---

## Task 7: MobileAgenda controller

**Files:** Create `components/dashboard/mobile/agenda/MobileAgenda.tsx` (+ `.module.css`).

- [ ] **Step 1:** Implement the state machine wiring the week-list + flows + sheets:
```typescript
'use client'

import { useState } from 'react'
import { MobileDrilldownLayer } from '../drilldowns/MobileDrilldownLayer'
import { AgendaWeek } from './AgendaWeek'
import { FlowKlus } from './FlowKlus'
import { FlowPlaatsbezoek } from './FlowPlaatsbezoek'
import { FlowAfronden } from './FlowAfronden'
import { AgendaHerplanSheet } from './AgendaHerplanSheet'
import { AgendaNewSheet } from './AgendaNewSheet'
import { AG_EVENTS } from './agenda-mock'
import type { AgendaEvent } from './agenda-mock'
import styles from './MobileAgenda.module.css'

export function MobileAgenda() {
  const [detail, setDetail] = useState<AgendaEvent | null>(null)
  const [herplan, setHerplan] = useState<AgendaEvent | null>(null)
  const [afronden, setAfronden] = useState<AgendaEvent | null>(null)
  const [newOpen, setNewOpen] = useState(false)

  const isKlus = detail?.kind === 'klus'
  const detailTitle = detail ? (isKlus ? 'Klus' : 'Plaatsbezoek') : ''

  return (
    <div className={styles.root}>
      <AgendaWeek
        events={AG_EVENTS}
        onOpenEvent={(ev) => setDetail(ev)}
        onNew={() => setNewOpen(true)}
      />

      <MobileDrilldownLayer open={detail !== null} title={detailTitle} onClose={() => setDetail(null)}>
        {detail && isKlus && (
          <FlowKlus ev={detail} onHerplan={() => setHerplan(detail)} onAfronden={() => setAfronden(detail)} />
        )}
        {detail && !isKlus && (
          <FlowPlaatsbezoek ev={detail} onHerplan={() => setHerplan(detail)} onStartOfferte={() => { /* TODO functional pass */ }} />
        )}
      </MobileDrilldownLayer>

      {herplan && <AgendaHerplanSheet ev={herplan} open onClose={() => setHerplan(null)} onConfirm={() => setHerplan(null)} />}
      {afronden && (
        <FlowAfronden ev={afronden} open onClose={() => setAfronden(null)} onDone={() => { setAfronden(null); setDetail(null) }} />
      )}
      <AgendaNewSheet open={newOpen} onClose={() => setNewOpen(false)} onSave={() => setNewOpen(false)} />
    </div>
  )
}
```
`MobileAgenda.module.css`: `.root { display: flex; flex-direction: column; flex: 1; min-height: 0; }`.
(Adjust the `FlowAfronden`/`AgendaHerplanSheet`/`AgendaNewSheet` prop shapes to match Tasks 5–6 exactly during implementation.)
- [ ] **Step 2:** `npx tsc --noEmit` → clean. Commit: `feat(mobile/agenda): MobileAgenda controller (week-list + flows + sheets)`.

---

## Task 8: Wire into the agenda page

**Files:** Modify `app/dashboard/(app)/agenda/page.tsx` + `page.module.css`.

- [ ] **Step 1:** Import `MobileAgenda`. Wrap the existing `return` body in `<div className={styles.desktopTree}> … </div>`; append `<div className={styles.mobileTree}><MobileAgenda /></div>`.
- [ ] **Step 2:** Append (inbox full-height pattern, since the week-list scrolls):
```css
.desktopTree { display: block; flex: 1; min-height: 0; }
.mobileTree { display: none; flex: 1; min-height: 0; }
@media (max-width: 640px) {
  .desktopTree { display: none; }
  .mobileTree { display: flex; flex-direction: column; }
}
```
- [ ] **Step 3:** `npx tsc --noEmit` → clean (no build — dev server live). Commit: `feat(mobile/agenda): wire MobileAgenda into agenda page (desktop/mobile split)`.

---

## Task 9: Verify

- [ ] `npx tsc --noEmit` → clean.
- [ ] `npx vitest run components/dashboard/mobile/` → agenda helpers + all prior tests PASS.
- [ ] (Deferred to end-pass: full `npm run build`; on-device check of week-list, live banner, each flow/sheet, conflict banner, light/dark; wire real `getAppointmentsForRange` + the write server-actions [reschedule/complete/new/photo] + conflict logic + possible schema.)

---

## Self-Review (during planning)

- **Spec coverage:** week-list + filter/jump/live/groups/rows (Task 3), flow atoms (Task 2), Klus/Plaatsbezoek (Task 4), Afronden (Task 5), Herplannen + New sheets (Task 6), controller (Task 7), mount (Task 8), mock + tested helpers incl. real `slotConflict` (Task 1) ✓.
- **v1 scope flagged:** mock `AG_EVENTS`, local state; every write path carries a `// TODO: functional pass` (reschedule/complete/new/photo/conflict + new server-actions/schema). Read-side `agenda-queries` noted for wiring.
- **Nav model:** drilldown for detail flows, bottom-sheets for Herplannen/New, full-height sheet for Afronden — uses existing primitives (`MobileDrilldownLayer`, sheet pattern, `MobileToggle`), no shell change (week-list keeps header+nav as the `cal` tab).
- **Type consistency:** `AgendaEvent` from mock consumed by week-list + flows + sheets + controller; `durStr`/`minutesBetween`/`slotConflict`/`eventTone`/`dateLabel` from helpers; `MobileDrilldownLayer`/`MobileToggle` reused.
- **Mount:** inbox full-height `.mobileTree` pattern (not the simple block toggle) since the week-list fills the screen.
