# Mobile Dashboard — Sprint 2 Implementation Plan

> Vervolg op Sprint 1 (fundament). Pagina-passes voor de drie meest-bezochte routes.

**Goal:** Overzicht, Inbox, en Leads-lijst volledig mobile-bruikbaar op 320–480 px.

**Architecture:** CSS-only polish op Overzicht; React-state-refactor (URL-param) op Inbox via `SplitView`; component-refactor (`LeadsTable` → `TableToCards`) + filters-MobileSheet op Leads.

**Spec:** [`docs/superpowers/specs/2026-05-21-mobile-dashboard-design.md`](../specs/2026-05-21-mobile-dashboard-design.md)

---

## Task A — Overzicht polish

**Files:**
- Modify: `app/dashboard/(app)/page.module.css`
- Modify: `components/dashboard/overzicht/KpiModule.module.css`
- Modify: `components/dashboard/overzicht/KpiHeroCard.module.css`
- Modify: `components/dashboard/overzicht/SurfaceDailySummary.module.css`

**Wijzigingen per file:**

### `app/dashboard/(app)/page.module.css`

Voeg toe onderaan:
```css
@media (max-width: 640px) {
  .trendStats {
    grid-template-columns: repeat(2, 1fr);
  }
  .trendStat {
    padding: 12px 14px;
  }
  .apptList {
    padding: 12px;
  }
  .apptRow {
    gap: 10px;
    padding: 10px;
  }
}
@media (max-width: 380px) {
  .trendStats {
    grid-template-columns: 1fr;
  }
}
```

### `components/dashboard/overzicht/KpiModule.module.css`

Wijzig de bestaande `@media (max-width: 540px)` block om die naar 640px te verhogen, en voeg een 480px override toe:

```css
@media (max-width: 640px) {
  .miniGrid {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  .grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}
```

(Vervang dus de 540px-block met 640px; behoud overige inhoud.)

### `components/dashboard/overzicht/KpiHeroCard.module.css`

Voeg toe net vóór of na de bestaande `@media (max-width: 860px)` block (controleer huidige structuur eerst):

```css
@media (max-width: 640px) {
  .card {
    grid-template-columns: 1fr;
    gap: 16px;
    padding: 16px;
  }
}
```

### `components/dashboard/overzicht/SurfaceDailySummary.module.css`

Onderaan, of in een bestaande mobile-block:

```css
@media (max-width: 640px) {
  .banner {
    grid-template-columns: 1fr;
    gap: 12px;
    padding: 14px 16px;
  }
}
```

**Acceptatie:** op 320 × 568 px geen horizontale page-scroll, KPI-cards stack 1-koloms, trend-stats wrappen naar 2 → 1 kolom.

**Commit:** `feat(mobile): Overzicht responsive op <640px (grids, padding)`

---

## Task B — Inbox SplitView refactor

**Files:**
- Modify: `app/dashboard/(app)/inbox/page.module.css`
- Modify: `app/dashboard/(app)/inbox/page.tsx` (subtiel — voor info-button)
- Modify: `components/dashboard/inbox/LeadContextPane.tsx` (sheet-trigger wrap)
- Create: `components/dashboard/inbox/MobileContextButton.tsx`

**Aanpak:**

De huidige Inbox heeft een **3-koloms CSS-grid** (`page.module.css:18-32`) met media-queries die op 1200 en 800 px panes verbergen. Dat verliest toegang tot de lijst op mobile. Refactor:

1. **CSS** — pas grid aan:
   - `>1200px`: 3-col (`320 / 1fr / 320`)
   - `1200–800px`: 2-col (`280 / 1fr`), context verborgen
   - `<800px`: 1-col, en gebruik `[data-pane="list" | "detail"]` op `.grid` om of de lijst, of de thread te tonen — niet beide tegelijk

Concreet:
```css
/* huidige 800px block vervangen door: */
@media (max-width: 800px) {
  .grid {
    grid-template-columns: 1fr;
  }
  /* Default: toon lijst, verberg thread. */
  .colList {
    display: flex;
  }
  .colThread {
    display: none;
  }
  /* Als er een lead geselecteerd is (server-side data-attribute): toon thread, verberg lijst. */
  .grid[data-pane="detail"] .colList {
    display: none;
  }
  .grid[data-pane="detail"] .colThread {
    display: flex;
  }
}
```

2. **`page.tsx`** — voeg `data-pane` toe aan de outer `.grid` div op basis van `selectedLeadId`:
```tsx
<div className={styles.grid} data-pane={selectedLeadId ? 'detail' : 'list'}>
```

3. **Back-button in thread-head** op mobile:
   - Voeg een `<Link href="/inbox">` (zelfde URL zonder `?lead=`) toe in `.threadHeadLeft`, met `<ChevronLeft size={16} />` icon, alleen zichtbaar op `<800px` (via aparte `.mobileBackBtn` CSS-klasse + `@media (max-width: 800px)` display).
   - Of: gebruik `useRouter().back()` als de URL altijd via `?lead=` werkt.

4. **Context-pane als MobileSheet** op mobile:
   - Maak `components/dashboard/inbox/MobileContextButton.tsx`:
   ```tsx
   'use client'
   import { useState } from 'react'
   import { Info } from 'lucide-react'
   import { MobileSheet } from '@/components/dashboard/ui/MobileSheet'
   import { LeadContextPane, type Props as LCPProps } from './LeadContextPane'
   import styles from './MobileContextButton.module.css'

   export function MobileContextButton(props: LCPProps) {
     const [open, setOpen] = useState(false)
     return (
       <>
         <button
           type="button"
           className={styles.btn}
           onClick={() => setOpen(true)}
           aria-label="Lead-info"
         >
           <Info size={16} />
         </button>
         <MobileSheet open={open} onClose={() => setOpen(false)} title="Lead-info">
           <LeadContextPane {...props} />
         </MobileSheet>
       </>
     )
   }
   ```
   - CSS (`MobileContextButton.module.css`):
   ```css
   .btn {
     display: none;
     width: var(--tap-min);
     height: var(--tap-min);
     align-items: center;
     justify-content: center;
     border-radius: 8px;
     background: transparent;
     border: none;
     color: white;
     cursor: pointer;
   }
   .btn:hover {
     background: rgba(255, 255, 255, 0.15);
   }
   @media (max-width: 1200px) {
     .btn {
       display: inline-flex;
     }
   }
   ```
   - **`page.tsx`:** import `MobileContextButton` en plaats in `.threadHeadRight` (zelfde plaats als InboxBotToggle), naast de andere actions, alleen indien `selectedLeadId` aanwezig.

5. **Composer** — al `flex-shrink: 0`, blijft onderaan. Geen wijziging nodig.

6. **Thread-header truncation** — voeg `min-width: 0; overflow: hidden; text-overflow: ellipsis` toe aan `.threadHead .name` etc. waar relevant.

**Acceptatie:** op 320 × 568 px:
- Lijst is default; tap op een conv → thread vult scherm
- Thread heeft back-button bovenaan
- Info-button rechts in thread-header opent een MobileSheet met context-pane content
- Composer sticky onderaan, full-width

**Commit:** `feat(mobile): Inbox SplitView-gedrag + context-pane als MobileSheet`

---

## Task C — Leads-lijst + Pipeline + Filters

**Files:**
- Modify: `components/dashboard/leads/LeadsTable.tsx` — herschrijven om `TableToCards` te gebruiken (NIET als wrapper bovenop bestaande table — vervang volledig)
- Modify: `components/dashboard/leads/LeadsTable.module.css` — drastisch vereenvoudigen
- Modify: `app/dashboard/(app)/leads/page.module.css` — filter-row mobile
- Modify: `components/dashboard/leads/LeadsViewSwitcher.tsx` + `.module.css` — tap-targets ≥44 px
- Modify: `app/dashboard/(app)/leads/page.tsx` — voeg MobileFilterButton toe
- Create: `components/dashboard/leads/MobileFiltersSheet.tsx` + `.module.css`
- Modify: `styles/dashboard.css` of bijhorende CSS — pipeline kolom-width op mobile

### C1 — `LeadsTable` herschrijven met `TableToCards`

Behoud bestaande props (`rows: LeadListItem[]`) en custom cell-renders. Verwijder de bestaande `<table>` JSX en `useRouter`-row-onclick — gebruik `TableToCards` met `rowHref`.

Schets:
```tsx
import { TableToCards, type Column } from '@/components/dashboard/ui/TableToCards'
import type { LeadListItem } from '@/lib/dashboard/lead-queries'

const columns: Array<Column<LeadListItem>> = [
  {
    key: 'naam',
    label: 'Lead',
    mobile: 'primary',
    render: (row) => (
      <div className={styles.leadCell}>
        <Avatar name={row.naam} size={32} />
        <div>
          <div className={styles.leadName}>{row.naam}</div>
          <div className={styles.leadSub}>#{row.lead_id} · {row.plaats}</div>
        </div>
      </div>
    ),
  },
  {
    key: 'sub_diensten',
    label: 'Dienst',
    mobile: 'secondary',
    render: (row) => row.sub_diensten?.join(', ') ?? '—',
  },
  { key: 'm2', label: 'm²', mobile: 'secondary', align: 'right', render: (row) => row.m2 ? `${row.m2}` : '—' },
  {
    key: 'status',
    label: 'Status',
    mobile: 'primary',
    render: (row) => <Pill tone={pillToneFor(row.status)}>{statusLabel(row.status)}</Pill>,
  },
  {
    key: 'gesprek_fase',
    label: 'Gespreksfase',
    mobile: 'secondary',
    render: (row) => gespreksFaseLabel(row.gesprek_fase),
  },
  {
    key: 'totaal_prijs',
    label: 'Offerte',
    mobile: 'primary',
    align: 'right',
    render: (row) => row.totaal_prijs ? formatEuro(row.totaal_prijs) : '—',
  },
  {
    key: 'bijgewerkt',
    label: 'Laatste actie',
    mobile: 'secondary',
    render: (row) => formatRelative(row.bijgewerkt),
  },
]

return (
  <TableToCards
    keyField="lead_id"
    rows={rows}
    columns={columns}
    rowHref={(r) => `/leads/${r.lead_id}`}
    emptyState={<div className={styles.empty}>Geen leads.</div>}
  />
)
```

**Belangrijk:** behoud de bestaande utility-functies (`pillToneFor`, `statusLabel`, etc.). Als die in dezelfde file stonden, blijven ze daar.

`LeadsTable.module.css` opschonen: behoud `.leadCell`, `.leadName`, `.leadSub`, `.empty`. Verwijder oude `.tableWrap`, `.table` styles (komen nu uit `TableToCards.module.css`).

### C2 — `LeadsViewSwitcher` tap-targets

In `LeadsViewSwitcher.module.css`, geef `.btn` een minimum tap-area van `var(--tap-min)`:

```css
.btn {
  min-height: var(--tap-min);
  min-width: var(--tap-min);
  /* andere bestaande props blijven */
}
```

### C3 — `LeadsPipeline` mobile-kolom

`styles/dashboard.css` (of waar `.dash-pipeline-track` staat) — voeg toe:

```css
@media (max-width: 800px) {
  .dash-pipeline-track {
    grid-auto-flow: column;
    grid-auto-columns: 280px;
    grid-template-columns: none;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    gap: 12px;
    -webkit-overflow-scrolling: touch;
  }
  .dash-pipeline-track > * {
    scroll-snap-align: start;
  }
}
```

(Vervang de bestaande `@media (max-width: 800px) { grid-template-columns: 1fr; }` — die maakte het 1-koloms; we willen juist horizontaal scrollen met snap.)

### C4 — Filter-row → MobileFiltersSheet

Create `components/dashboard/leads/MobileFiltersSheet.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { MobileSheet } from '@/components/dashboard/ui/MobileSheet'
import { LeadsFilterTabs } from './LeadsFilterTabs'
import { WebChatToggle } from './WebChatToggle'
import styles from './MobileFiltersSheet.module.css'

export interface MobileFiltersSheetProps {
  // dezelfde props die LeadsFilterTabs en WebChatToggle nodig hebben
  // (counts, activeFilter, etc.)
}

export function MobileFiltersSheet(props: MobileFiltersSheetProps) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" className={styles.trigger} onClick={() => setOpen(true)} aria-label="Filters">
        <SlidersHorizontal size={16} />
        <span>Filters</span>
      </button>
      <MobileSheet open={open} onClose={() => setOpen(false)} title="Filters">
        <div className={styles.section}>
          <LeadsFilterTabs {...props} />
        </div>
        <div className={styles.section}>
          <WebChatToggle {...props} />
        </div>
      </MobileSheet>
    </>
  )
}
```

(Aanpassen aan exacte props van bestaande components — lees ze eerst.)

CSS:
```css
.trigger {
  display: none;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  min-height: var(--tap-min);
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 9px;
  color: var(--fg);
  font: 600 13px/1 var(--font-body);
  cursor: pointer;
}
@media (max-width: 640px) {
  .trigger {
    display: inline-flex;
  }
}
.section {
  margin-bottom: 16px;
}
.section:last-child {
  margin-bottom: 0;
}
```

In `app/dashboard/(app)/leads/page.tsx`, in de filter-row:
- Op desktop: behoud `<LeadsFilterTabs />` + `<WebChatToggle />`
- Op mobile: gebruik `<MobileFiltersSheet />` (verberg de inline tabs)

CSS-trick: voeg `.hideOnMobile` class toe aan de bestaande tabs-wrapper en `@media (max-width: 640px) { .hideOnMobile { display: none } }`.

### C5 — Page-level filter-row CSS

In `app/dashboard/(app)/leads/page.module.css`:
```css
@media (max-width: 640px) {
  .filterRow {
    gap: 8px;
  }
}
```

**Acceptatie:**
- Tabel-view op 320 px toont cards i.p.v. tabel; alle 3 primary fields zichtbaar (naam, status, prijs)
- Pipeline op 320 px scrollt horizontaal kolom-voor-kolom met snap
- View-switcher knoppen ≥44 px tap
- Filter-knop opent een sheet met tabs + WebChatToggle

**Commit:** `feat(mobile): Leads-lijst, pipeline en filters mobile-vriendelijk`

---

## Volgorde

Tasks A, B, C zijn onafhankelijk (verschillende files) — kunnen parallel.

A is CSS-only en snelst.
B vereist React-state refactor (subtle).
C is de grootste (component-refactor + nieuwe filters-sheet).

Na alle drie: één combined review.
