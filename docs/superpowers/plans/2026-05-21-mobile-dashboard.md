# Mobile Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Maak het Frontlix dashboard (`app.frontlix.com`) volwaardig bruikbaar op telefoons (320–480 px), via een gedeeld fundament + per-pagina passes.

**Architecture:** Eerst fundament (breakpoint-tokens, tap-min, density, 3 herbruikbare React-componenten: `MobileSheet`, `TableToCards`, `SplitView`) + fixes globale chrome. Daarna pagina-passes in 3 vervolgsprints. Geen aparte mobile-routes; alles responsive via CSS Modules + tokens.

**Tech Stack:** Next.js 15 (App Router, RSC), TypeScript 5, CSS Modules, CSS custom properties, lucide-react, Vitest (node-env, alleen pure logic), Puppeteer (`screenshot.mjs`) voor visual verification.

**Spec:** [`docs/superpowers/specs/2026-05-21-mobile-dashboard-design.md`](../specs/2026-05-21-mobile-dashboard-design.md)

---

## Scope van dit plan

Dit plan dekt **Sprint 1 (Fundament)** in detail. Sprints 2–4 (pagina-passes) staan onderaan in outline en krijgen eigen detail-plannen ná Sprint 1. Reden: implementatie-details van pagina-passes hangen af van de definitieve API's van `MobileSheet`/`TableToCards`/`SplitView` — die fixeren we tijdens Sprint 1, niet vooraf.

**Test-strategie:**
- Vitest (`environment: node`) — voor pure logic (hooks, utils)
- Screenshot via `node screenshot.mjs <url> <label>` — voor visual layout validatie
- `npm run build` + `npm run lint` — voor type-check & code-style na elke task
- Dev-server moet draaien: `npm run dev` (poort 3000). Start dat eenmalig in een ander terminal-venster.

**Branch-strategie:** Werk op feature-branch `mobile-dashboard`. Squash-merge naar `main` na Sprint 1 acceptatie. Commit-stijl: `feat(mobile): …`, `fix(mobile): …`, `chore(mobile): …`.

---

## File Structure — Sprint 1

Nieuwe bestanden:
- `components/dashboard/ui/MobileSheet.tsx` + `MobileSheet.module.css`
- `components/dashboard/ui/TableToCards.tsx` + `TableToCards.module.css`
- `components/dashboard/ui/SplitView.tsx` + `SplitView.module.css`
- `hooks/useMediaQuery.ts`
- `hooks/useMediaQuery.test.ts`
- `components/dashboard/ui/MobileSearchSheet.tsx` + `.module.css`

Te wijzigen:
- `styles/tokens.css` — breakpoint-tokens + `--tap-min` + mobile-density media query
- `styles/dashboard.css` — touch-target helper + mobile-only utilities
- `components/dashboard/NotificationPanel.module.css` — viewport-cap
- `components/dashboard/Topbar.tsx` + `.module.css` — search wordt sheet-trigger op mobile
- `components/dashboard/Sidebar.module.css` — drawer-width `min(280px, calc(100vw - 32px))`
- `components/dashboard/OnboardingWizard.module.css` — mobile padding
- `components/dashboard/ExportsModal.module.css` — tap-area check

---

## Task 1: Mobiele breakpoint- en tap-tokens toevoegen

**Files:**
- Modify: `styles/tokens.css`

- [ ] **Step 1: Voeg breakpoint- en tap-tokens toe**

Voeg toe na de bestaande `--sidebar-w: 240px;` (regel 85), nog binnen `:root { … }`:

```css
  /* ─────────────────────────────────────────────────────────
     Mobile — breakpoint-set (documentatie + JS-toegang)
     CSS @media kan custom-properties nog niet evalueren, dus
     deze tokens zijn alleen leidend, niet bindend. Bij elke
     media query in de codebase deze waarden hardcoderen.
     ───────────────────────────────────────────────────────── */
  --bp-sm: 480px;
  --bp-md: 640px;
  --bp-lg: 768px;
  --bp-xl: 1100px;

  /* Tap-target minimum — WCAG 2.5.5 (Target Size). */
  --tap-min: 44px;

  /* Mobile-density override op --content-pad (zie media query onder). */
  --content-pad: var(--content-pad, 24px);
```

- [ ] **Step 2: Voeg mobile-density media query toe**

Onderaan `styles/tokens.css`, ná de `.density-roomy { … }` regel, plak:

```css
/* Mobile density override — content-padding krimpt op kleinere viewports.
   Werkt op elk element dat var(--content-pad) gebruikt (dashboard-layout).
   Wins van .density-cozy class omdat media query meer-specifiek is. */
@media (max-width: 768px) {
  .density-cozy, .density-roomy { --content-pad: 16px; }
}
@media (max-width: 480px) {
  .density-cozy, .density-roomy { --content-pad: 12px; }
}
```

- [ ] **Step 3: Verifieer build slaagt**

Run: `npm run build`
Expected: build succeeds, geen TypeScript- of CSS-fouten.

- [ ] **Step 4: Commit**

```bash
git checkout -b mobile-dashboard
git add styles/tokens.css
git commit -m "feat(mobile): voeg breakpoint-, tap- en density-tokens toe"
```

---

## Task 2: `useMediaQuery` hook bouwen (TDD)

**Files:**
- Create: `hooks/useMediaQuery.ts`
- Create: `hooks/useMediaQuery.test.ts`

- [ ] **Step 1: Schrijf falende test**

Maak `hooks/useMediaQuery.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook } from './__test-utils__/renderHook'
import { useMediaQuery } from './useMediaQuery'

describe('useMediaQuery', () => {
  beforeEach(() => {
    const listeners = new Set<(e: MediaQueryListEvent) => void>()
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('max-width: 640px'),
      media: query,
      addEventListener: (_: string, l: (e: MediaQueryListEvent) => void) => listeners.add(l),
      removeEventListener: (_: string, l: (e: MediaQueryListEvent) => void) => listeners.delete(l),
      dispatchEvent: () => true,
    }))
  })

  it('geeft true terug als query matcht', () => {
    const { result } = renderHook(() => useMediaQuery('(max-width: 640px)'))
    expect(result.current).toBe(true)
  })

  it('geeft false terug als query niet matcht', () => {
    const { result } = renderHook(() => useMediaQuery('(max-width: 320px)'))
    expect(result.current).toBe(false)
  })
})
```

Omdat we node-env gebruiken zonder jsdom, schrijf een mini renderHook:

Create `hooks/__test-utils__/renderHook.ts`:

```typescript
// Mini renderHook voor node-env. Voert de hook synchroon uit en geeft
// result.current terug. Voldoende voor zuivere logic-hooks zonder
// React-rendering. Niet geschikt voor hooks met effects/state-updates.
import * as React from 'react'

export function renderHook<T>(callback: () => T): { result: { current: T } } {
  let current: T
  const Wrapper = () => {
    current = callback()
    return null
  }
  // React 19 RSC-friendly: gebruik een fake renderer
  React.createElement(Wrapper)
  current = callback()
  return { result: { get current() { return current } } }
}
```

- [ ] **Step 2: Run de test — verifieer dat hij faalt**

Run: `npm run test -- hooks/useMediaQuery.test.ts`
Expected: FAIL — module `./useMediaQuery` not found.

- [ ] **Step 3: Implementeer de hook**

Create `hooks/useMediaQuery.ts`:

```typescript
'use client'
import { useEffect, useState } from 'react'

/**
 * Reactive CSS media-query hook.
 * SSR-safe: retourneert `false` tijdens server-render om hydration-
 * mismatch te voorkomen. Pas na mount checkt hij de echte viewport.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches)
    setMatches(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}
```

- [ ] **Step 4: Run de test — verifieer pass**

Run: `npm run test -- hooks/useMediaQuery.test.ts`
Expected: PASS, 2 tests groen.

- [ ] **Step 5: Commit**

```bash
git add hooks/useMediaQuery.ts hooks/useMediaQuery.test.ts hooks/__test-utils__/renderHook.ts
git commit -m "feat(mobile): voeg useMediaQuery hook toe met tests"
```

---

## Task 3: `MobileSheet` component (bottom-sheet modal)

**Files:**
- Create: `components/dashboard/ui/MobileSheet.tsx`
- Create: `components/dashboard/ui/MobileSheet.module.css`

- [ ] **Step 1: Schrijf CSS**

Create `components/dashboard/ui/MobileSheet.module.css`:

```css
/* MobileSheet — bottom-sheet variant van modal.
   Op <768px: slide-up vanaf onderkant, fullwidth.
   Op ≥768px: gecentreerde modal (fallback voor desktop). */

.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 200;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
}
.backdropOpen {
  opacity: 1;
  pointer-events: auto;
}

.sheet {
  position: fixed;
  z-index: 201;
  background: var(--bg);
  color: var(--fg);
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-nav);
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

/* Mobile: bottom-sheet */
.sheet {
  left: 0;
  right: 0;
  bottom: 0;
  max-height: 92vh;
  border-radius: 16px 16px 0 0;
  transform: translateY(100%);
}
.sheetOpen {
  transform: translateY(0);
}

/* Tablet+: gecentreerde modal */
@media (min-width: 768px) {
  .sheet {
    top: 50%;
    left: 50%;
    right: auto;
    bottom: auto;
    width: min(560px, calc(100vw - 32px));
    max-height: 80vh;
    border-radius: 16px;
    transform: translate(-50%, calc(-50% + 16px));
    opacity: 0;
  }
  .sheetOpen {
    transform: translate(-50%, -50%);
    opacity: 1;
  }
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
  min-height: var(--tap-min);
  flex-shrink: 0;
}
.title {
  font: 600 16px/1.2 var(--font-heading);
  color: var(--fg);
}
.close {
  width: var(--tap-min);
  height: var(--tap-min);
  display: grid;
  place-items: center;
  border: none;
  background: transparent;
  color: var(--fg-muted);
  border-radius: 8px;
  cursor: pointer;
}
.close:hover {
  background: var(--card-hover-bg);
  color: var(--fg);
}

.handle {
  /* Klein draggable-balkje bovenaan — alleen op mobile zichtbaar.
     Pure visuele indicator; geen drag-functionaliteit (YAGNI). */
  display: block;
  width: 36px;
  height: 4px;
  background: var(--border-strong);
  border-radius: 2px;
  margin: 8px auto 0;
}
@media (min-width: 768px) {
  .handle { display: none; }
}

.body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  -webkit-overflow-scrolling: touch;
}

.footer {
  border-top: 1px solid var(--border);
  padding: 12px 16px;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  flex-shrink: 0;
}
```

- [ ] **Step 2: Schrijf component**

Create `components/dashboard/ui/MobileSheet.tsx`:

```typescript
'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import styles from './MobileSheet.module.css'

export interface MobileSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  footer?: React.ReactNode
  /** Optioneel: backdrop-click sluit niet (voor dwingende sheets). */
  dismissible?: boolean
}

export function MobileSheet({
  open,
  onClose,
  title,
  children,
  footer,
  dismissible = true,
}: MobileSheetProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissible) onClose()
    }
    document.addEventListener('keydown', onKey)
    // Body-scroll lock voorkomt dat de achtergrond scrolt terwijl
    // de sheet openstaat. Restored on close.
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, dismissible, onClose])

  return (
    <>
      <div
        className={`${styles.backdrop} ${open ? styles.backdropOpen : ''}`}
        onClick={dismissible ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        className={`${styles.sheet} ${open ? styles.sheetOpen : ''}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
      >
        <span className={styles.handle} aria-hidden="true" />
        <div className={styles.header}>
          <div className={styles.title}>{title ?? ''}</div>
          {dismissible && (
            <button
              type="button"
              className={styles.close}
              onClick={onClose}
              aria-label="Sluiten"
            >
              <X size={18} />
            </button>
          )}
        </div>
        <div className={styles.body}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </>
  )
}
```

- [ ] **Step 3: Maak een dev-only test-pagina voor visual verification**

Create `app/dashboard/(app)/_dev/mobile-sheet/page.tsx`:

```typescript
'use client'
import { useState } from 'react'
import { MobileSheet } from '@/components/dashboard/ui/MobileSheet'

export default function DevMobileSheetPage() {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ padding: 24 }}>
      <h1>Dev: MobileSheet</h1>
      <button type="button" onClick={() => setOpen(true)}>Open sheet</button>
      <MobileSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Voorbeeld-sheet"
        footer={
          <>
            <button type="button" onClick={() => setOpen(false)}>Annuleer</button>
            <button type="button" onClick={() => setOpen(false)}>Bevestig</button>
          </>
        }
      >
        <p>Dit is de sheet-inhoud. Scroll-test:</p>
        {Array.from({ length: 30 }, (_, i) => (
          <p key={i}>Regel {i + 1}</p>
        ))}
      </MobileSheet>
    </div>
  )
}
```

- [ ] **Step 4: Type-check + build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Visual verificatie via screenshot (closed + open op 320px)**

Zorg dat dev-server draait (`npm run dev` in apart venster). Dan:

```bash
node screenshot.mjs http://localhost:3000/dashboard/_dev/mobile-sheet mobile-sheet-closed
```

Open de sheet handmatig in een browser op viewport 320×568 en maak nogmaals een screenshot:

```bash
# Manual: Chrome devtools, set viewport to 320×568, click "Open sheet", screenshot
node screenshot.mjs http://localhost:3000/dashboard/_dev/mobile-sheet mobile-sheet-open
```

Verifieer: sheet slide-upt vanaf bottom, sluit-knop is 44×44, handle is zichtbaar, scrollt netjes.

- [ ] **Step 6: Commit**

```bash
git add components/dashboard/ui/MobileSheet.tsx components/dashboard/ui/MobileSheet.module.css app/dashboard/\(app\)/_dev/mobile-sheet
git commit -m "feat(mobile): voeg MobileSheet component toe"
```

---

## Task 4: `TableToCards` component

**Files:**
- Create: `components/dashboard/ui/TableToCards.tsx`
- Create: `components/dashboard/ui/TableToCards.module.css`

- [ ] **Step 1: Schrijf CSS**

Create `components/dashboard/ui/TableToCards.module.css`:

```css
/* Desktop: standaard tabel. */
.tableWrap {
  width: 100%;
  overflow-x: auto;
}
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
.table th,
.table td {
  text-align: left;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border);
}
.table th {
  font-weight: 600;
  font-size: 12px;
  color: var(--fg-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.row {
  cursor: pointer;
  transition: background 0.1s ease;
}
.row:hover {
  background: var(--card-hover-bg);
}

/* Mobile: cards i.p.v. tabel. */
.cards {
  display: none;
  flex-direction: column;
  gap: 8px;
}
.card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  min-height: var(--tap-min);
  cursor: pointer;
  text-decoration: none;
  color: inherit;
}
.cardPrimaryRow {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}
.cardPrimary {
  font: 600 15px/1.3 var(--font-body);
  color: var(--fg);
}
.cardSecondaryGrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 16px;
}
.cardSecondaryItem {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.cardSecondaryLabel {
  font-size: 11px;
  color: var(--fg-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.cardSecondaryValue {
  font-size: 13px;
  color: var(--fg);
}

@media (max-width: 640px) {
  .tableWrap {
    display: none;
  }
  .cards {
    display: flex;
  }
}
```

- [ ] **Step 2: Schrijf component**

Create `components/dashboard/ui/TableToCards.tsx`:

```typescript
'use client'

import Link from 'next/link'
import styles from './TableToCards.module.css'

export type MobilePriority = 'primary' | 'secondary' | 'hidden'

export interface Column<T> {
  key: string
  label: string
  /** Custom render-functie (default: `String(row[key])`). */
  render?: (row: T) => React.ReactNode
  /** Op mobile: primary = grote regel bovenaan, secondary = grid eronder, hidden = niet getoond. */
  mobile?: MobilePriority
  /** Optionele rechter-uitlijning (bv. bedragen). */
  align?: 'left' | 'right'
}

export interface TableToCardsProps<T> {
  columns: Array<Column<T>>
  rows: T[]
  keyField: keyof T
  /** Maakt elke rij een Next.js Link naar deze href (rij krijgt dan rowHref(row)). */
  rowHref?: (row: T) => string
  emptyState?: React.ReactNode
}

export function TableToCards<T extends Record<string, unknown>>({
  columns,
  rows,
  keyField,
  rowHref,
  emptyState,
}: TableToCardsProps<T>) {
  if (rows.length === 0 && emptyState) {
    return <>{emptyState}</>
  }

  return (
    <>
      {/* Desktop: tabel */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} style={col.align === 'right' ? { textAlign: 'right' } : undefined}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const key = String(row[keyField])
              const cells = columns.map((col) => (
                <td key={col.key} style={col.align === 'right' ? { textAlign: 'right' } : undefined}>
                  {col.render ? col.render(row) : String(row[col.key] ?? '')}
                </td>
              ))
              if (rowHref) {
                return (
                  <tr key={key} className={styles.row}>
                    {cells.map((cell, i) => (
                      // Wrappen per cel zou complex zijn; gebruik onClick-handler.
                      <td key={i} onClick={() => { window.location.href = rowHref(row) }}>{cell}</td>
                    ))}
                  </tr>
                )
              }
              return <tr key={key} className={styles.row}>{cells}</tr>
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile: cards */}
      <div className={styles.cards}>
        {rows.map((row) => {
          const key = String(row[keyField])
          const primaries = columns.filter((c) => c.mobile === 'primary')
          const secondaries = columns.filter((c) => c.mobile === 'secondary' || c.mobile === undefined)
          const inner = (
            <>
              {primaries.length > 0 && (
                <div className={styles.cardPrimaryRow}>
                  {primaries.map((col) => (
                    <div key={col.key} className={styles.cardPrimary}>
                      {col.render ? col.render(row) : String(row[col.key] ?? '')}
                    </div>
                  ))}
                </div>
              )}
              {secondaries.length > 0 && (
                <div className={styles.cardSecondaryGrid}>
                  {secondaries.map((col) => (
                    <div key={col.key} className={styles.cardSecondaryItem}>
                      <div className={styles.cardSecondaryLabel}>{col.label}</div>
                      <div className={styles.cardSecondaryValue}>
                        {col.render ? col.render(row) : String(row[col.key] ?? '')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )
          return rowHref ? (
            <Link key={key} href={rowHref(row)} className={styles.card}>
              {inner}
            </Link>
          ) : (
            <div key={key} className={styles.card}>{inner}</div>
          )
        })}
      </div>
    </>
  )
}
```

- [ ] **Step 3: Maak dev-pagina voor visual verification**

Create `app/dashboard/(app)/_dev/table-to-cards/page.tsx`:

```typescript
import { TableToCards } from '@/components/dashboard/ui/TableToCards'

type Row = { id: string; name: string; status: string; m2: number; date: string }

const ROWS: Row[] = [
  { id: '1', name: 'Jan Jansen', status: 'Open', m2: 84, date: '2026-05-20' },
  { id: '2', name: 'Klaas de Vries', status: 'Offerte verstuurd', m2: 120, date: '2026-05-18' },
  { id: '3', name: 'Sophie Bakker', status: 'Afspraak ingepland', m2: 64, date: '2026-05-15' },
]

export default function DevTableToCardsPage() {
  return (
    <div style={{ padding: 24 }}>
      <h1>Dev: TableToCards</h1>
      <TableToCards<Row>
        keyField="id"
        rows={ROWS}
        rowHref={(r) => `/dashboard/_dev/table-to-cards?row=${r.id}`}
        columns={[
          { key: 'name', label: 'Naam', mobile: 'primary' },
          { key: 'status', label: 'Status', mobile: 'primary' },
          { key: 'm2', label: 'm²', mobile: 'secondary', align: 'right' },
          { key: 'date', label: 'Datum', mobile: 'secondary' },
        ]}
      />
    </div>
  )
}
```

- [ ] **Step 4: Build + visual verifie­ren**

Run: `npm run build`
Expected: build succeeds.

Screenshot op 1280px en 320px:

```bash
node screenshot.mjs http://localhost:3000/dashboard/_dev/table-to-cards table-to-cards-desktop
# Chrome devtools → 320×568 → screenshot via:
node screenshot.mjs http://localhost:3000/dashboard/_dev/table-to-cards table-to-cards-mobile
```

Verifieer: desktop toont tabel met 4 kolommen, mobile toont 3 cards met naam + status bovenaan, m² + datum eronder in 2-kolom grid.

- [ ] **Step 5: Commit**

```bash
git add components/dashboard/ui/TableToCards.tsx components/dashboard/ui/TableToCards.module.css app/dashboard/\(app\)/_dev/table-to-cards
git commit -m "feat(mobile): voeg TableToCards component toe"
```

---

## Task 5: `SplitView` component

**Files:**
- Create: `components/dashboard/ui/SplitView.tsx`
- Create: `components/dashboard/ui/SplitView.module.css`

- [ ] **Step 1: Schrijf CSS**

Create `components/dashboard/ui/SplitView.module.css`:

```css
/* Desktop: 2-koloms lijst | detail. */
.split {
  display: grid;
  grid-template-columns: minmax(280px, 1fr) minmax(0, 2fr);
  gap: 16px;
  height: 100%;
  min-height: 0;
}
.list,
.detail {
  min-height: 0;
  overflow: auto;
}

/* Mobile: één kolom, lijst is default, detail wordt zichtbaar via prop. */
@media (max-width: 768px) {
  .split {
    grid-template-columns: 1fr;
  }
  .list {
    display: block;
  }
  .detail {
    display: none;
  }
  .detailVisible .list {
    display: none;
  }
  .detailVisible .detail {
    display: block;
  }
}

.backButton {
  display: none;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  min-height: var(--tap-min);
  background: transparent;
  border: none;
  color: var(--primary);
  font: 600 14px/1 var(--font-body);
  cursor: pointer;
  border-radius: 8px;
}
.backButton:hover {
  background: var(--card-hover-bg);
}
@media (max-width: 768px) {
  .detailVisible .backButton {
    display: inline-flex;
  }
}
```

- [ ] **Step 2: Schrijf component**

Create `components/dashboard/ui/SplitView.tsx`:

```typescript
'use client'

import { ChevronLeft } from 'lucide-react'
import styles from './SplitView.module.css'

export interface SplitViewProps {
  list: React.ReactNode
  detail: React.ReactNode
  /** Op mobile: of de detail-pane zichtbaar is. Op desktop genegeerd. */
  detailVisible: boolean
  onBack: () => void
  backLabel?: string
}

export function SplitView({
  list,
  detail,
  detailVisible,
  onBack,
  backLabel = 'Terug naar lijst',
}: SplitViewProps) {
  return (
    <div className={`${styles.split} ${detailVisible ? styles.detailVisible : ''}`}>
      <div className={styles.list}>{list}</div>
      <div className={styles.detail}>
        <button type="button" onClick={onBack} className={styles.backButton}>
          <ChevronLeft size={16} />
          <span>{backLabel}</span>
        </button>
        {detail}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Dev-pagina voor verificatie**

Create `app/dashboard/(app)/_dev/split-view/page.tsx`:

```typescript
'use client'
import { useState } from 'react'
import { SplitView } from '@/components/dashboard/ui/SplitView'

export default function DevSplitViewPage() {
  const [selected, setSelected] = useState<string | null>(null)
  return (
    <div style={{ padding: 24, height: 'calc(100vh - 60px)' }}>
      <SplitView
        list={
          <div>
            <h2>Items</h2>
            {['A', 'B', 'C'].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setSelected(item)}
                style={{ display: 'block', padding: 12, width: '100%', textAlign: 'left' }}
              >
                Item {item}
              </button>
            ))}
          </div>
        }
        detail={
          <div>
            <h2>Detail: {selected ?? '—'}</h2>
            <p>Detail van item {selected}.</p>
          </div>
        }
        detailVisible={selected !== null}
        onBack={() => setSelected(null)}
      />
    </div>
  )
}
```

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Visual verifie­ren**

Verifieer: op desktop staan list + detail naast elkaar. Op 320px is alleen list zichtbaar; na klik op item verschijnt detail met back-button bovenaan; klik back → lijst weer.

- [ ] **Step 6: Commit**

```bash
git add components/dashboard/ui/SplitView.tsx components/dashboard/ui/SplitView.module.css app/dashboard/\(app\)/_dev/split-view
git commit -m "feat(mobile): voeg SplitView component toe"
```

---

## Task 6: NotificationPanel viewport-cap

**Files:**
- Modify: `components/dashboard/NotificationPanel.module.css`

- [ ] **Step 1: Read current file**

Run: `cat components/dashboard/NotificationPanel.module.css | head -40` om huidige `.panel` selector te vinden.

- [ ] **Step 2: Cap panel-breedte op viewport**

Vervang in `components/dashboard/NotificationPanel.module.css` de bestaande `.panel` regel `width: 360px;` (of vergelijkbaar) door:

```css
.panel {
  /* Bestaande positioning blijft, alleen breedte capped op viewport. */
  width: min(360px, calc(100vw - 16px));
  right: 0;
}

@media (max-width: 480px) {
  .panel {
    /* Op kleine telefoons: full-bleed minus 8px margin links/rechts. */
    width: calc(100vw - 16px);
    right: 8px;
    left: 8px;
  }
}
```

(Behoud `position: absolute; top: calc(100% + 6px);` etc.)

- [ ] **Step 3: Build + visual check op 320px**

Run: `npm run build`
Expected: succeeds.

Open dashboard op 320×568, klik bel-icoon. Verifieer: panel valt binnen viewport, geen horizontal-scroll.

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/NotificationPanel.module.css
git commit -m "fix(mobile): cap NotificationPanel-breedte op viewport"
```

---

## Task 7: Sidebar drawer-breedte op kleine schermen

**Files:**
- Modify: `components/dashboard/Sidebar.module.css`

- [ ] **Step 1: Drawer-breedte responsive maken**

In `components/dashboard/Sidebar.module.css`, vervang de bestaande `@media (max-width: 768px)` block (regel 182-201):

```css
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    width: min(280px, calc(100vw - 32px));
    z-index: 100;
    transform: translateX(-100%);
    transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    box-shadow: var(--shadow-nav);
  }
  .sidebarOpen {
    transform: translateX(0);
  }
  .closeBtn,
  .backdrop {
    display: flex;
  }
  /* Tap-target garantie voor nav-items. */
  .navItem {
    min-height: var(--tap-min);
  }
  /* Tenant naam ellipsis bij lange namen op smalle drawer. */
  .tenant {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 200px;
  }
}
```

- [ ] **Step 2: Build + visual check**

Run: `npm run build`
Expected: succeeds.

Verifieer op 320×568: drawer is 288px breed (320-32), nav-items zijn ≥44px hoog, lange tenant-naam wordt afgekapt met ellipsis.

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/Sidebar.module.css
git commit -m "fix(mobile): sidebar drawer-breedte responsive + tap-min op nav-items"
```

---

## Task 8: `MobileSearchSheet` — search-icon vervangt search-veld op mobile

**Files:**
- Create: `components/dashboard/ui/MobileSearchSheet.tsx`
- Create: `components/dashboard/ui/MobileSearchSheet.module.css`
- Modify: `components/dashboard/Topbar.tsx`
- Modify: `components/dashboard/Topbar.module.css`

- [ ] **Step 1: Schrijf search-sheet CSS**

Create `components/dashboard/ui/MobileSearchSheet.module.css`:

```css
.searchBtn {
  display: none;
  width: var(--tap-min);
  height: var(--tap-min);
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  background: transparent;
  border: none;
  color: var(--fg-soft);
  cursor: pointer;
}
.searchBtn:hover {
  background: var(--card-hover-bg);
  color: var(--fg);
}
@media (max-width: 768px) {
  .searchBtn {
    display: inline-flex;
  }
}

.input {
  width: 100%;
  padding: 12px 14px;
  font-size: 16px; /* 16px voorkomt iOS-zoom op focus. */
  background: var(--surface-2);
  border: 1px solid transparent;
  border-radius: 10px;
  color: var(--fg);
  font-family: inherit;
  outline: none;
}
.input:focus {
  border-color: var(--primary);
  background: var(--bg);
}
.inputRow {
  padding: 4px 0 12px;
}
.hint {
  font-size: 13px;
  color: var(--fg-muted);
  padding: 8px 4px;
}
```

- [ ] **Step 2: Schrijf component**

Create `components/dashboard/ui/MobileSearchSheet.tsx`:

```typescript
'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { MobileSheet } from './MobileSheet'
import styles from './MobileSearchSheet.module.css'

export function MobileSearchSheet() {
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const q = (new FormData(e.currentTarget).get('q') as string ?? '').trim()
    setOpen(false)
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    router.push(`/dashboard/leads${params.toString() ? `?${params.toString()}` : ''}`)
  }

  return (
    <>
      <button
        type="button"
        className={styles.searchBtn}
        onClick={() => {
          setOpen(true)
          // Focus na render-tick zodat keyboard direct opent op mobile.
          setTimeout(() => inputRef.current?.focus(), 50)
        }}
        aria-label="Zoek"
      >
        <Search size={18} />
      </button>
      <MobileSheet open={open} onClose={() => setOpen(false)} title="Zoeken">
        <form onSubmit={onSubmit}>
          <div className={styles.inputRow}>
            <input
              ref={inputRef}
              name="q"
              type="search"
              placeholder="Zoek leads, adressen, telefoon…"
              className={styles.input}
              autoComplete="off"
            />
          </div>
          <div className={styles.hint}>Druk op Enter om te zoeken.</div>
        </form>
      </MobileSheet>
    </>
  )
}
```

- [ ] **Step 3: Wijzig Topbar — search-form verbergen op mobile, search-button erbij**

In `components/dashboard/Topbar.tsx`, import `MobileSearchSheet`:

```typescript
import { MobileSearchSheet } from './ui/MobileSearchSheet'
```

In de return-statement, plaats `<MobileSearchSheet />` in de `.actions`-div (naast LeadsViewSwitcher, vóór de andere icon-buttons):

```typescript
      <div className={styles.actions}>
        <MobileSearchSheet />
        <LeadsViewSwitcher />
        <Link href={offerteHref} className={`${styles.newQuoteBtn} ${styles.hideOnSmall}`} scroll={false}>
          <Plus size={14} />
          <span>Nieuwe offerte</span>
        </Link>
        <ThemeToggle />
        <NotificationPanel items={notifications} unreadCount={unreadCount} />
      </div>
```

De bestaande `<form className={styles.search}>` blijft maar wordt al verborgen via `@media (max-width: 768px)` in Topbar.module.css.

- [ ] **Step 4: Topbar.module.css — geef de hamburger ook tap-min**

In `components/dashboard/Topbar.module.css`, in de `.hamburger` regel: vervang `width: 36px; height: 36px;` door:

```css
.hamburger {
  display: none;
  width: var(--tap-min);
  height: var(--tap-min);
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  background: transparent;
  border: none;
  color: var(--fg-soft);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
```

- [ ] **Step 5: Build + visual verify**

Run: `npm run build`
Expected: succeeds.

Op 320×568: hamburger zichtbaar, search-icon zichtbaar, klik op search opent een bottom-sheet met focus op input. Op desktop: hamburger en search-icon verborgen.

- [ ] **Step 6: Commit**

```bash
git add components/dashboard/ui/MobileSearchSheet.tsx components/dashboard/ui/MobileSearchSheet.module.css components/dashboard/Topbar.tsx components/dashboard/Topbar.module.css
git commit -m "feat(mobile): vervang topbar search door MobileSearchSheet op mobile"
```

---

## Task 9: OnboardingWizard mobile padding + tap-area

**Files:**
- Modify: `components/dashboard/OnboardingWizard.module.css`

- [ ] **Step 1: Voeg mobile padding-override toe**

Onderaan `components/dashboard/OnboardingWizard.module.css`, plak:

```css
@media (max-width: 480px) {
  .modal {
    /* Padding aanzienlijk kleiner op smalle schermen — anders eet
       3×28px aan zij-padding ~17% van de 320px viewport op. */
    padding: 20px 16px;
  }
  /* Knoppen krijgen volle tap-min hoogte. */
  .actions button {
    min-height: var(--tap-min);
  }
}
```

(Houd bestaande regels intact.)

- [ ] **Step 2: Build + check**

Run: `npm run build`
Expected: succeeds.

Verifieer (op een fresh-onboarding user) op 320×568: wizard past, padding voelt niet overbodig, knoppen ≥44px.

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/OnboardingWizard.module.css
git commit -m "fix(mobile): kleinere padding en grotere tap-targets in OnboardingWizard"
```

---

## Task 10: ExportsModal tap-area + dashboard.css helpers

**Files:**
- Modify: `components/dashboard/ExportsModal.module.css`
- Modify: `styles/dashboard.css`

- [ ] **Step 1: ExportsModal tap-targets**

Onderaan `components/dashboard/ExportsModal.module.css`:

```css
@media (max-width: 640px) {
  /* Format-kaarten en knoppen krijgen tap-min hoogte. */
  .formatCard,
  .actions button {
    min-height: var(--tap-min);
  }
}
```

- [ ] **Step 2: Voeg utility helpers toe aan dashboard.css**

In `styles/dashboard.css` onderaan:

```css
/* ─────────────────────────────────────────────────────────
   Mobile-utility classes — gebruiken in CSS Modules via
   composes of in JSX className-combos. Houden we klein.
   ───────────────────────────────────────────────────────── */
.dash-tap {
  min-height: var(--tap-min);
  min-width: var(--tap-min);
}
.dash-hide-sm {
  /* Verberg onder 640px (phones). */
}
@media (max-width: 640px) {
  .dash-hide-sm { display: none !important; }
  /* Geen extra !important elders — alleen utility-class. */
}
.dash-show-sm {
  display: none;
}
@media (max-width: 640px) {
  .dash-show-sm { display: block; }
}
```

(Opmerking: CLAUDE.md verbiedt `!important` in component-CSS; utility-helpers in `dashboard.css` zijn de uitzondering, gemarkeerd met `dash-` prefix.)

- [ ] **Step 3: Build + commit**

Run: `npm run build`
Expected: succeeds.

```bash
git add components/dashboard/ExportsModal.module.css styles/dashboard.css
git commit -m "feat(mobile): tap-area helpers in dashboard.css + ExportsModal fix"
```

---

## Task 11: `_dev`-routes uitsluiten van productie + sprint 1 wrap

**Files:**
- Modify: `next.config.ts` of `middleware.ts`

- [ ] **Step 1: Wrap _dev routes met NODE_ENV-check**

Optie A — middleware guard. Voeg in `middleware.ts` een redirect toe voor `_dev` paths in productie:

```typescript
// Bestaande middleware lezen, deze check eraan plakken vóór andere logic:
if (request.nextUrl.pathname.includes('/_dev/') && process.env.NODE_ENV === 'production') {
  return NextResponse.redirect(new URL('/dashboard', request.url))
}
```

(Alleen toevoegen als de bestaande middleware-structuur dit toelaat — anders volstaat een `notFound()` in de page-files met env-check.)

- [ ] **Step 2: Sprint 1 acceptatie-screenshots**

Maak een set screenshots op 320×568, 375×667, 768×1024:

```bash
node screenshot.mjs http://localhost:3000/dashboard sprint1-overzicht-mobile
node screenshot.mjs http://localhost:3000/dashboard/inbox sprint1-inbox-mobile
node screenshot.mjs http://localhost:3000/dashboard/leads sprint1-leads-mobile
node screenshot.mjs http://localhost:3000/dashboard/_dev/mobile-sheet sprint1-sheet-mobile
node screenshot.mjs http://localhost:3000/dashboard/_dev/table-to-cards sprint1-tablecards-mobile
node screenshot.mjs http://localhost:3000/dashboard/_dev/split-view sprint1-split-mobile
```

Verifieer geen horizontale scrollbars op 320px op enige pagina (manual).

- [ ] **Step 3: Lint + final build**

Run: `npm run lint && npm run build`
Expected: beide groen.

- [ ] **Step 4: Sprint 1 done — commit & open PR (lokaal)**

```bash
git add .
git commit -m "chore(mobile): sprint 1 fundament compleet — screenshots in temporary screenshots/"
# Niet pushen — wachten op gebruiker-akkoord. Branch staat klaar lokaal.
```

---

## Sprints 2–4 — Outline (detail volgt na Sprint 1)

> Onderstaande sprints krijgen elk een **eigen `docs/superpowers/plans/`-document** met dezelfde bite-sized task-granulariteit. We schrijven die plannen ná Sprint 1, zodat de exacte API's van `MobileSheet`/`TableToCards`/`SplitView` bekend zijn en de tasks daarop kunnen aansluiten zonder gokken.

### Sprint 2 — Hoge-impact pagina's

1. **Overzicht** (`app/dashboard/(app)/page.tsx`)
   - `.trendStats` grid → `grid-template-columns: repeat(2, 1fr)` @ <640, `1fr` @ <480
   - KPI-cards: stack, behoud grote cijfers (`--text-2xl` op mobile)
   - AreaChart: `width: 100%`, hoogte 200 → 160 op <640
   - Apptlist-cards: tap-min, full-width

2. **Inbox** (`app/dashboard/(app)/inbox/page.tsx`)
   - Refactor naar `<SplitView>` (list=conversaties, detail=thread)
   - Context-pane wordt `<MobileSheet>` triggered via info-button in thread-header
   - Thread-header actions condenseren naar 3-dots overflow-menu op <480
   - Composer sticky bottom met `position: sticky; bottom: 0`

3. **Leads (lijst)** (`components/dashboard/leads/`)
   - `LeadsTable` herschrijven naar `TableToCards`-gebruik
   - `LeadsPipeline`: kolom-width 280px, `scroll-snap-type: x mandatory`
   - View-switcher (Topbar): chips met tap-min, of `MobileSheet`-keuzelijst op <480
   - Filter-row: knop "Filters" → `MobileSheet` met alle filters

### Sprint 3 — Lead-detail + Tools

4. **Lead-detail** (`app/dashboard/(app)/leads/[lead_id]/page.tsx`)
   - `<SplitView>`: tabs links, chat rechts (of als sheet)
   - `LeadDetailHeader`: stack op <640, actions in overflow-menu
   - `LeadTabs`: sticky bovenaan, ellipsis op te lange labels
   - `OfferteRegelsTable`: `TableToCards`-conversie

5. **Offerte-wizard** (`components/dashboard/offerte/`)
   - State-machine ongewijzigd; UI per stap full-screen op <640
   - Sticky footer (`position: sticky; bottom: 0`) met progress-dots + Vorige/Volgende
   - Multi-column forms → 1-kolom via grid-collapse
   - Preview-paneel als `MobileSheet`

6. **Agenda** (`app/dashboard/(app)/agenda/`)
   - View-default per breakpoint: `dag` <640, `week` 640–1100, `maand` ≥1100 (overschrijfbaar via URL-param)
   - Week-view: `overflow-x: auto` + `scroll-snap-type: x mandatory`
   - Maand: tap op dag → `MobileSheet` met dag-detail
   - RouteMap: fullscreen container, sticky filter-bar bovenaan

### Sprint 4 — Polish + verificatie

7. **Reviews** (`app/dashboard/(app)/reviews/page.tsx`)
   - `.reviewsGrid` `minmax(min(380px, 100%), 1fr)`
   - KPI-rij: stack op <640
   - Actie-buttons: overflow-menu

8. **Instellingen** (`app/dashboard/(app)/instellingen/`)
   - `SettingsNav`: chips met tap-min, scroll-snap
   - Notif-tabel: `TableToCards`
   - Editor-modals → `MobileSheet`
   - Toggle-switches: 44×24 min

9. **Statistieken + Veldwerk** — kleine touch-ups (period-selector tap-area, top-tags padding, veldwerk-card chevron)

10. **Verificatie-ronde**
    - Real-device test (iPhone Safari, Android Chrome)
    - Lighthouse mobile + a11y per route (target ≥90)
    - Touch-only media-query audit (`@media (hover: none) and (pointer: coarse)`)
    - PR naar `main` na groen + user-akkoord

---

## Self-Review (Spec-coverage)

Spec-vereiste → Sprint 1-task:
- Breakpoint-set standaardiseren → Task 1
- Touch-target token → Task 1
- Density-systeem mobile-aware → Task 1
- `MobileSheet` → Task 3
- `TableToCards` → Task 4
- `SplitView` → Task 5
- NotificationPanel viewport-cap → Task 6
- Topbar mobile-search → Task 8
- Sidebar drawer fix → Task 7
- OnboardingWizard mobile padding → Task 9
- ExportsModal tap-area → Task 10
- `useMediaQuery` (intern nodig voor toekomstige page-passes) → Task 2

Pagina-passes (Overzicht t/m Veldwerk) → Sprints 2–4, eigen plan per sprint.

Verificatie (Lighthouse, real-device, screenshots) → Sprint 4 task 10 + per-task screenshot-stappen.

**Geen openstaande spec-items zonder task in dit plan-bereik.**
