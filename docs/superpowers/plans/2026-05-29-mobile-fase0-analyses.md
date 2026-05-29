# Mobile Fase 0 (tokens + chart-kit) + Analyses — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the mobile **Analyses** screen (route `/statistieken`) pixel-matched to the design handoff, plus the shared design-tokens and inline-SVG chart-kit it depends on, wired to live Supabase data where it exists.

**Architecture:** Follow the established mobile house-style — server component fetches via `lib/dashboard/stats-queries.ts`, passes a plain data object to a `'use client'` `MobileAnalyses` component rendered inside the existing `.mobileTree` (CSS-gated at `max-width:640px`, mirroring `app/dashboard/(app)/leads/page.tsx`). A pure mapper (`analyse-mappers.ts`, vitest-tested) turns raw query results into a view-model; presentational sub-components consume it. Charts are token-aware inline-SVG components reusing the existing ring math from `HeroKpiCard`.

**Tech Stack:** Next.js App Router, TypeScript, CSS Modules, design tokens in `styles/tokens.css`, Supabase (`getDashboardSupabase`), vitest.

---

## Context the engineer needs

- **Mobile activation is CSS-only at `max-width:640px`.** The page renders in BOTH the desktop chrome and the mobile shell (`app/dashboard/(app)/layout.tsx:62` + `:87` pass `children` twice). Each page does its own `.desktopTree`/`.mobileTree` split; CSS hides the irrelevant half. See `app/dashboard/(app)/leads/page.tsx` for the proven pattern.
- **The shell already renders the page title + header.** On `/statistieken`, `MobileShellHeader` shows the title **"Statistieken"** + search/offerte/notif actions (`components/dashboard/mobile/MobileShellHeader.tsx:22`). `MobileShell` wraps content in `<main>` with bottom-nav padding (`MobileShell.tsx:69`). **Therefore `MobileAnalyses` must NOT render its own big title or top status-bar padding** — it starts at the period toggle. (The handoff's big "Analyses" title is replaced by the shell header, consistent with Leads/Inbox.)
- **Styling rules:** one `.tsx` + colocated `.module.css` per component; `'use client'` on interactive/SVG components; named exports; camelCase classes; variants via `data-*` selectors (never className concatenation); all color/spacing/radius via `var(--token)`. No inline styles for theming.
- **`.dark` class** drives dark mode in `styles/tokens.css` (`:root` = light, `.dark` = overrides).
- **Existing ring reference:** `components/dashboard/mobile/overzicht/HeroKpiCard.tsx:56-131` already draws an SVG donut ring (`circumference = 2πr`, `dashOffset = c*(1-pct/100)`, `rotate(-90)`, `<linearGradient>` with CSS-var stops). The chart-kit generalizes this.

## Data reality (read before Task 4 — flagged decisions)

Verified against `lib/dashboard/stats-queries.ts`:

| Analyses element | Source | Status |
|---|---|---|
| Funnel: Leads / Offertes / Akkoord | `countLeads`, `countOffertesVerstuurd`, `countConverted` | ✅ existing |
| KPI Conversie | `countConverted / countLeads` | ✅ existing |
| KPI ⌀ Offerte | `avgOfferteWaarde` | ✅ existing |
| KPI ⌀ Reactietijd | `avgReactietijdMs` | ✅ existing |
| Hero omzet total | **new** `omzetTotaal` | ➕ Task 4 |
| Omzet-trend (area chart, 12 mnd) | **new** `omzetTrendMaandelijks` | ➕ Task 4 |
| Omzet per dienst | **new** `omzetPerCategorie` | ➕ Task 4 |
| Goal ring | **new** `getOmzetDoelMaand` (reads `tenant_settings.omzet_doel_maand`) | ➕ Task 4 |
| **4th KPI** | handoff's "Bot zelf af" has **no query/definition** → **swapped** for **"Offertes verstuurd"** (`countOffertesVerstuurd`, real) | ⚠️ swap |
| **Delta badges** ("+€3,1k vs vorig") | needs prev-period fetch | ⚠️ **v1: omitted** (structure present, hidden when no delta). Follow-up. |
| **Per-KPI sparkline history** | no per-metric time series | ⚠️ **v1: sparklines fed from the real 12-mnd omzet trend as an indicative shape**; true per-metric history is a follow-up. |

These three ⚠️ items are intentional v1 scope cuts — confirm with the user before/at review.

---

## Task 1: Design tokens

**Files:**
- Modify: `styles/tokens.css` (`:root` block + `.dark` block)

- [ ] **Step 1: Add the 5 missing tokens to the light `:root` block**

In `styles/tokens.css`, find the light semantic line `  --color-whatsapp: #25D366;` and add directly after it:

```css
  /* Mobiele app — aanvullende tokens (Fase 0).
     --color-elev: verhoogd oppervlak t.o.v. --color-surface (sheets, hero-cards).
     --accent-2:   tweede gradient-stop (primary → accent-2). */
  --accent-2: #00CFFF;
  --color-warning: #F59E0B;
  --color-warning-bg: rgba(245, 158, 11, 0.10);
  --color-elev: #FFFFFF;
  --color-chip-bg: rgba(0, 0, 0, 0.04);
  --color-border-soft: rgba(0, 0, 0, 0.06);
```

- [ ] **Step 2: Add the dark overrides to the `.dark` block**

In `styles/tokens.css`, find the dark line `  --color-backdrop: rgba(0, 0, 0, 0.6);` (inside `.dark { }`) and add directly after it:

```css
  --color-warning: #FBBF24;
  --color-warning-bg: rgba(251, 191, 36, 0.12);
  --color-elev: #161B25;
  --color-chip-bg: rgba(255, 255, 255, 0.06);
  --color-border-soft: rgba(255, 255, 255, 0.05);
```

(`--accent-2` is light/dark-agnostic; no dark override needed — matches how `--color-accent` is handled.)

- [ ] **Step 3: Verify the build still compiles**

Run: `npm run build`
Expected: build succeeds (CSS is not type-checked, but this confirms no syntax break).

- [ ] **Step 4: Commit**

```bash
git add styles/tokens.css
git commit -m "feat(mobile/tokens): add elev/warning/chip-bg/border-soft/accent-2 tokens"
```

---

## Task 2: Chart math (pure functions, TDD)

**Files:**
- Create: `components/dashboard/mobile/shared/charts/chart-math.ts`
- Test: `components/dashboard/mobile/shared/charts/chart-math.test.ts`

- [ ] **Step 1: Write the failing test**

Create `components/dashboard/mobile/shared/charts/chart-math.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { scaleSeries, toLinePath, toAreaPath, ringGeometry } from './chart-math'

describe('scaleSeries', () => {
  it('maps first/last x across full width and inverts y (svg origin top-left)', () => {
    const pts = scaleSeries([0, 10], { w: 100, h: 50, pad: 0 })
    expect(pts[0]).toEqual([0, 50]) // min value → bottom (y=h)
    expect(pts[1]).toEqual([100, 0]) // max value → top (y=0)
  })

  it('handles a flat series without dividing by zero', () => {
    const pts = scaleSeries([5, 5, 5], { w: 100, h: 50, pad: 4 })
    expect(pts.every(([, y]) => Number.isFinite(y))).toBe(true)
    expect(pts.map(([x]) => Math.round(x))).toEqual([0, 50, 100])
  })
})

describe('toLinePath / toAreaPath', () => {
  it('builds an M..L line path', () => {
    expect(toLinePath([[0, 50], [100, 0]])).toBe('M0.0 50.0 L100.0 0.0')
  })
  it('closes the area down to the baseline', () => {
    expect(toAreaPath([[0, 50], [100, 0]], 100, 60)).toBe(
      'M0.0 50.0 L100.0 0.0 L 100 60 L 0 60 Z',
    )
  })
})

describe('ringGeometry', () => {
  it('computes radius, circumference and dashoffset for a percentage', () => {
    const g = ringGeometry({ size: 62, stroke: 7, pct: 0 })
    expect(g.r).toBeCloseTo(27.5)
    expect(g.dashOffset).toBeCloseTo(g.circumference) // 0% → fully offset
    const half = ringGeometry({ size: 62, stroke: 7, pct: 50 })
    expect(half.dashOffset).toBeCloseTo(half.circumference / 2)
  })
  it('clamps pct to 0..100', () => {
    expect(ringGeometry({ size: 62, stroke: 7, pct: 150 }).dashOffset).toBeCloseTo(0)
    expect(ringGeometry({ size: 62, stroke: 7, pct: -10 }).dashOffset).toBeCloseTo(
      ringGeometry({ size: 62, stroke: 7, pct: 0 }).circumference,
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/dashboard/mobile/shared/charts/chart-math.test.ts`
Expected: FAIL — cannot find module `./chart-math`.

- [ ] **Step 3: Write the implementation**

Create `components/dashboard/mobile/shared/charts/chart-math.ts`:

```typescript
/**
 * Pure SVG-chart geometry helpers (geen React, geen DOM) — los te testen.
 * Overgenomen uit het design-prototype (MobileAnalyses MaArea/MaDonut) en
 * gegeneraliseerd. Coördinaten in SVG-ruimte: y=0 is boven.
 */

export type Point = [number, number]

export type ScaleOpts = { w: number; h: number; pad?: number }

/** Schaal een getallenreeks naar [x,y]-punten binnen w×h (met verticale pad). */
export function scaleSeries(data: number[], { w, h, pad = 0 }: ScaleOpts): Point[] {
  if (data.length === 0) return []
  const min = Math.min(...data)
  const max = Math.max(...data)
  const span = Math.max(1, max - min)
  const dx = data.length > 1 ? w / (data.length - 1) : 0
  return data.map((v, i) => {
    const x = i * dx
    const y = h - pad - ((v - min) / span) * (h - pad * 2)
    return [x, y]
  })
}

/** 'M x y L x y L …' lijn-pad. */
export function toLinePath(pts: Point[]): string {
  if (pts.length === 0) return ''
  return 'M' + pts.map((p) => p.map((n) => n.toFixed(1)).join(' ')).join(' L')
}

/** Lijn-pad gesloten naar de baseline (gevuld vlak). */
export function toAreaPath(pts: Point[], w: number, h: number): string {
  const line = toLinePath(pts)
  if (!line) return ''
  return `${line} L ${w} ${h} L 0 ${h} Z`
}

export type RingOpts = { size: number; stroke: number; pct: number }
export type RingGeometry = {
  r: number
  circumference: number
  dashOffset: number
  center: number
}

/** Donut/voortgangsring-geometrie. pct wordt geclampt naar 0..100. */
export function ringGeometry({ size, stroke, pct }: RingOpts): RingGeometry {
  const clamped = Math.max(0, Math.min(100, pct))
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  return {
    r,
    circumference,
    dashOffset: circumference * (1 - clamped / 100),
    center: size / 2,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/dashboard/mobile/shared/charts/chart-math.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add components/dashboard/mobile/shared/charts/chart-math.ts components/dashboard/mobile/shared/charts/chart-math.test.ts
git commit -m "feat(mobile/charts): pure SVG chart-math helpers + tests"
```

---

## Task 3: Chart-kit components (AreaChart, DonutRing, Sparkline, BarRow)

**Files:**
- Create: `components/dashboard/mobile/shared/charts/AreaChart.tsx` (+ `.module.css`)
- Create: `components/dashboard/mobile/shared/charts/DonutRing.tsx` (+ `.module.css`)
- Create: `components/dashboard/mobile/shared/charts/Sparkline.tsx`
- Create: `components/dashboard/mobile/shared/charts/BarRow.tsx` (+ `.module.css`)

Unique SVG gradient IDs: use React's `useId()` (stable across SSR/CSR) instead of the prototype's `maNextId` counter.

- [ ] **Step 1: AreaChart**

Create `components/dashboard/mobile/shared/charts/AreaChart.tsx`:

```typescript
'use client'

import { useId } from 'react'
import { scaleSeries, toLinePath, toAreaPath } from './chart-math'
import styles from './AreaChart.module.css'

type Props = {
  data: number[]
  /** Stroke + gradient color. Default: primary→accent gradient via tokens. */
  color?: string
  width?: number
  height?: number
}

/** Responsieve area-chart (preserveAspectRatio=none, non-scaling-stroke). */
export function AreaChart({ data, color = 'var(--color-primary)', width = 320, height = 84 }: Props) {
  const id = useId()
  const pad = 4
  const pts = scaleSeries(data, { w: width, h: height, pad })
  if (pts.length === 0) return null
  const line = toLinePath(pts)
  const area = toAreaPath(pts, width, height)
  const last = pts[pts.length - 1]

  return (
    <svg
      className={styles.svg}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.26" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={last[0]} cy={last[1]} r="3.5" fill={color} vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
```

Create `components/dashboard/mobile/shared/charts/AreaChart.module.css`:

```css
.svg {
  display: block;
  width: 100%;
  height: 84px;
}
```

- [ ] **Step 2: DonutRing**

Create `components/dashboard/mobile/shared/charts/DonutRing.tsx`:

```typescript
'use client'

import { useId } from 'react'
import { ringGeometry } from './chart-math'
import styles from './DonutRing.module.css'

type Props = {
  pct: number
  size?: number
  stroke?: number
  /** Center overlay (bv. "74%"). */
  children?: React.ReactNode
}

/** Voortgangsring met gradient-stroke (primary→accent-2) + center-overlay. */
export function DonutRing({ pct, size = 62, stroke = 7, children }: Props) {
  const id = useId()
  const { r, circumference, dashOffset, center } = ringGeometry({ size, stroke, pct })

  return (
    <div className={styles.wrap} style={{ width: size, height: size }}>
      <svg width={size} height={size} className={styles.svg} aria-hidden="true">
        <defs>
          <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-primary)" />
            <stop offset="100%" stopColor="var(--accent-2)" />
          </linearGradient>
        </defs>
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke="var(--color-track-bg)"
          strokeWidth={stroke}
        />
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </svg>
      {children != null && <div className={styles.center}>{children}</div>}
    </div>
  )
}
```

Create `components/dashboard/mobile/shared/charts/DonutRing.module.css`:

```css
.wrap {
  position: relative;
  display: inline-grid;
  place-items: center;
}
.svg {
  display: block;
}
.center {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--color-text);
}
```

- [ ] **Step 3: Sparkline**

Create `components/dashboard/mobile/shared/charts/Sparkline.tsx`:

```typescript
'use client'

import { scaleSeries, toLinePath } from './chart-math'

type Props = {
  data: number[]
  color?: string
  width?: number
  height?: number
}

/** Mini-lijn zonder assen — voor KPI-kaarten. */
export function Sparkline({ data, color = 'var(--color-primary)', width = 48, height = 20 }: Props) {
  const pts = scaleSeries(data, { w: width, h: height, pad: 2 })
  if (pts.length < 2) return null
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <path
        d={toLinePath(pts)}
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
```

- [ ] **Step 4: BarRow**

Create `components/dashboard/mobile/shared/charts/BarRow.tsx`:

```typescript
import styles from './BarRow.module.css'

type Props = {
  label: string
  /** Rechts-uitgelijnde waarde (count of bedrag). */
  value: string
  /** 0..100 */
  pct: number
  /** Bar color (CSS color of var()). Default primary. */
  color?: string
  /** 10px (funnel) of 8px (diensten). */
  thickness?: number
}

/** Label + waarde-rij met horizontale voortgangsbalk. */
export function BarRow({ label, value, pct, color = 'var(--color-primary)', thickness = 10 }: Props) {
  return (
    <div className={styles.row}>
      <div className={styles.top}>
        <span className={styles.label}>{label}</span>
        <span className={styles.value}>{value}</span>
      </div>
      <div className={styles.track} style={{ height: thickness }}>
        <div
          className={styles.fill}
          style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color }}
        />
      </div>
    </div>
  )
}
```

Create `components/dashboard/mobile/shared/charts/BarRow.module.css`:

```css
.row {
  display: flex;
  flex-direction: column;
}
.top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 5px;
}
.label {
  font-size: 12.5px;
  color: var(--color-text);
}
.value {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-muted);
}
.track {
  width: 100%;
  border-radius: 99px;
  background: var(--color-track-bg);
  overflow: hidden;
}
.fill {
  height: 100%;
  border-radius: 99px;
}
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors in the new files.

- [ ] **Step 6: Commit**

```bash
git add components/dashboard/mobile/shared/charts/
git commit -m "feat(mobile/charts): AreaChart, DonutRing, Sparkline, BarRow components"
```

---

## Task 4: New stats queries (omzet)

**Files:**
- Modify: `lib/dashboard/stats-queries.ts` (append 4 functions)

Mirror the exact patterns already in the file (`getDashboardSupabase()`, `period.from`/`period.to` filtering, `console.error` + safe fallback). All omzet aggregation sums `leads.totaal_prijs`.

- [ ] **Step 1: Append `omzetTotaal`, `omzetPerCategorie`, `omzetTrendMaandelijks`, `getOmzetDoelMaand`**

Append to the end of `lib/dashboard/stats-queries.ts`:

```typescript
/**
 * Totale omzet in de periode = som van totaal_prijs over leads die
 * akkoord gaven (akkoord_op binnen het venster). Negeert null-prijzen.
 */
export async function omzetTotaal(period: StatsPeriod): Promise<number> {
  const supabase = await getDashboardSupabase()
  let query = supabase.from('leads').select('totaal_prijs').not('akkoord_op', 'is', null)
  if (period.from) query = query.gte('akkoord_op', period.from)
  if (period.to) query = query.lt('akkoord_op', period.to)
  const { data, error } = await query
  if (error) {
    console.error('[omzetTotaal] failed:', error)
    return 0
  }
  type Row = { totaal_prijs: number | null }
  return ((data as Row[] | null) ?? []).reduce((sum, r) => sum + (r.totaal_prijs ?? 0), 0)
}

/**
 * Omzet per hoofdcategorie in de periode (som totaal_prijs over akkoord-leads).
 * NULL-categorie wordt "Onbekend". DESC op omzet.
 */
export async function omzetPerCategorie(
  period: StatsPeriod,
): Promise<Array<{ categorie: string; omzet: number }>> {
  const supabase = await getDashboardSupabase()
  let query = supabase
    .from('leads')
    .select('hoofdcategorie, totaal_prijs')
    .not('akkoord_op', 'is', null)
  if (period.from) query = query.gte('akkoord_op', period.from)
  if (period.to) query = query.lt('akkoord_op', period.to)
  const { data, error } = await query
  if (error) {
    console.error('[omzetPerCategorie] failed:', error)
    return []
  }
  type Row = { hoofdcategorie: string | null; totaal_prijs: number | null }
  const sums = new Map<string, number>()
  for (const row of (data as Row[] | null) ?? []) {
    const key = row.hoofdcategorie ?? 'Onbekend'
    sums.set(key, (sums.get(key) ?? 0) + (row.totaal_prijs ?? 0))
  }
  return [...sums.entries()]
    .map(([categorie, omzet]) => ({ categorie, omzet }))
    .sort((a, b) => b.omzet - a.omzet)
}

/**
 * Maandelijkse omzet-reeks voor de laatste N maanden (default 12), ASC.
 * Buckets op akkoord_op-maand; lege maanden krijgen 0. Voor de area-chart.
 */
export async function omzetTrendMaandelijks(
  now: Date = new Date(),
  months: number = 12,
): Promise<Array<{ maand: string; omzet: number }>> {
  const supabase = await getDashboardSupabase()
  const span = Math.max(1, Math.floor(months))
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (span - 1), 1))
  const startISO = start.toISOString()

  const { data, error } = await supabase
    .from('leads')
    .select('akkoord_op, totaal_prijs')
    .not('akkoord_op', 'is', null)
    .gte('akkoord_op', startISO)
  if (error) {
    console.error('[omzetTrendMaandelijks] failed:', error)
    return []
  }
  type Row = { akkoord_op: string; totaal_prijs: number | null }
  const sums = new Map<string, number>()
  for (const row of (data as Row[] | null) ?? []) {
    const key = row.akkoord_op.slice(0, 7) // YYYY-MM
    sums.set(key, (sums.get(key) ?? 0) + (row.totaal_prijs ?? 0))
  }
  const out: Array<{ maand: string; omzet: number }> = []
  for (let i = 0; i < span; i++) {
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1))
    const key = d.toISOString().slice(0, 7)
    out.push({ maand: key, omzet: sums.get(key) ?? 0 })
  }
  return out
}

/**
 * Maandelijks omzet-doel uit tenant_settings (of null als niet ingesteld).
 * Reader-tegenhanger van saveOmzetDoelMaand in omzet-doel-actions.ts.
 */
export async function getOmzetDoelMaand(): Promise<number | null> {
  const supabase = await getDashboardSupabase()
  const { data, error } = await supabase
    .from('tenant_settings')
    .select('omzet_doel_maand')
    .limit(1)
    .maybeSingle()
  if (error) {
    console.error('[getOmzetDoelMaand] failed:', error)
    return null
  }
  const row = data as { omzet_doel_maand: number | null } | null
  return row?.omzet_doel_maand ?? null
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/dashboard/stats-queries.ts
git commit -m "feat(dashboard/stats): omzetTotaal/omzetPerCategorie/omzetTrendMaandelijks/getOmzetDoelMaand queries"
```

---

## Task 5: Analyses mapper (pure, TDD)

**Files:**
- Create: `components/dashboard/mobile/analyses/analyse-mappers.ts`
- Test: `components/dashboard/mobile/analyses/analyse-mappers.test.ts`

Defines the server→client contract (`AnalyseServerData`), the view-model (`MobileAnalyseView`), and the pure mapping. The page (Task 8) fetches and passes `AnalyseServerData`; `MobileAnalyses` (Task 7) calls `mapAnalyse()` in `useMemo`.

- [ ] **Step 1: Write the failing test**

Create `components/dashboard/mobile/analyses/analyse-mappers.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { eur, pctOf, mapAnalyse, type AnalyseServerData } from './analyse-mappers'

const base: AnalyseServerData = {
  periodKey: 'deze-maand',
  omzet: 18420,
  omzetDoelMaand: 25000,
  trend: [
    { maand: '2025-06', omzet: 8400 },
    { maand: '2025-07', omzet: 9200 },
    { maand: '2025-08', omzet: 23100 },
  ],
  leadsTotaal: 142,
  offertesVerstuurd: 98,
  converted: 63,
  avgOfferte: 847,
  avgReactieMs: 47000,
  diensten: [
    { categorie: 'Terras reinigen', omzet: 24300 },
    { categorie: 'Oprit & paden', omzet: 17100 },
  ],
}

describe('eur', () => {
  it('formats with nl-NL thousands separator, no decimals', () => {
    expect(eur(18420)).toBe('€ 18.420')
    expect(eur(0)).toBe('€ 0')
  })
})

describe('pctOf', () => {
  it('rounds part/whole to a percentage, 0 when whole is 0', () => {
    expect(pctOf(63, 142)).toBe(44)
    expect(pctOf(5, 0)).toBe(0)
  })
})

describe('mapAnalyse', () => {
  const v = mapAnalyse(base)

  it('hero shows formatted omzet + goal pct (maand: omzet/doel)', () => {
    expect(v.hero.omzetLabel).toBe('€ 18.420')
    expect(v.hero.goalPct).toBe(74) // 18420 / 25000
  })

  it('scales the monthly goal for kwartaal (×3) and jaar (×12)', () => {
    expect(mapAnalyse({ ...base, periodKey: 'dit-kwartaal' }).hero.goalPct)
      .toBe(pctOf(18420, 75000))
    expect(mapAnalyse({ ...base, periodKey: 'dit-jaar' }).hero.goalPct)
      .toBe(pctOf(18420, 300000))
  })

  it('builds the 3-step funnel with pct relative to leads', () => {
    expect(v.funnel.map((f) => [f.label, f.value, f.pct])).toEqual([
      ['Leads', '142', 100],
      ['Offertes', '98', 69],
      ['Akkoord', '63', 44],
    ])
  })

  it('builds 4 KPIs incl. the real "Offertes verstuurd" swap (no "Bot zelf af")', () => {
    expect(v.kpis.map((k) => k.label)).toEqual([
      'Conversie',
      'Offertes verstuurd',
      '⌀ Offerte',
      '⌀ Reactietijd',
    ])
    expect(v.kpis[0].value).toBe('44%')
    expect(v.kpis[2].value).toBe('€ 847')
    expect(v.kpis[3].value).toBe('47s')
  })

  it('renders "—" for null KPI values', () => {
    const n = mapAnalyse({ ...base, avgOfferte: null, avgReactieMs: null })
    expect(n.kpis[2].value).toBe('—')
    expect(n.kpis[3].value).toBe('—')
  })

  it('computes diensten pct relative to the largest', () => {
    expect(v.diensten.map((d) => [d.label, d.valueLabel, d.pct])).toEqual([
      ['Terras reinigen', '€ 24.300', 100],
      ['Oprit & paden', '€ 17.100', 70],
    ])
  })

  it('exposes the raw trend series for the area chart', () => {
    expect(v.trendSeries).toEqual([8400, 9200, 23100])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/dashboard/mobile/analyses/analyse-mappers.test.ts`
Expected: FAIL — cannot find module `./analyse-mappers`.

- [ ] **Step 3: Write the implementation**

Create `components/dashboard/mobile/analyses/analyse-mappers.ts`:

```typescript
import type { PeriodKey } from '@/lib/dashboard/period'

/** Ruwe data die de server-page aanlevert (Task 8). */
export type AnalyseServerData = {
  periodKey: PeriodKey
  omzet: number
  omzetDoelMaand: number | null
  trend: Array<{ maand: string; omzet: number }>
  leadsTotaal: number
  offertesVerstuurd: number
  converted: number
  avgOfferte: number | null
  avgReactieMs: number | null
  diensten: Array<{ categorie: string; omzet: number }>
}

export type AnalyseKpi = {
  label: string
  value: string
  /** Indicatieve sparkline-reeks (v1: afgeleid van de omzet-trend). */
  spark: number[]
  tone: 'blue' | 'green' | 'teal' | 'amber' | 'violet'
}

export type AnalyseBar = { label: string; value: string; pct: number; tone: string }

export type MobileAnalyseView = {
  hero: { omzetLabel: string; goalPct: number; periodLabel: string }
  trendSeries: number[]
  kpis: AnalyseKpi[]
  funnel: AnalyseBar[]
  diensten: AnalyseBar[]
}

/** Bar/tint-kleuren afgeleid van het prototype (MA_C), nu als tokens/hex. */
const TONE: Record<string, string> = {
  blue: 'var(--color-primary)',
  teal: '#0891B2',
  green: 'var(--color-success)',
  amber: 'var(--color-warning)',
  violet: '#7C3AED',
}
export const toneColor = (t: string): string => TONE[t] ?? TONE.blue

export function eur(n: number): string {
  return `€ ${Math.round(n).toLocaleString('nl-NL')}`
}

export function pctOf(part: number, whole: number): number {
  if (whole <= 0) return 0
  return Math.round((part / whole) * 100)
}

function reactieLabel(ms: number | null): string {
  if (ms === null) return '—'
  const totalSec = Math.round(ms / 1000)
  if (totalSec < 60) return `${totalSec}s`
  const min = Math.round(totalSec / 60)
  if (min < 60) return `${min}m`
  return `${Math.floor(min / 60)}u ${min % 60}m`
}

/** Maandelijks doel → periode-doel (maand ×1, kwartaal ×3, jaar ×12). */
function goalForPeriod(doelMaand: number | null, periodKey: PeriodKey): number {
  if (!doelMaand) return 0
  if (periodKey === 'dit-kwartaal') return doelMaand * 3
  if (periodKey === 'dit-jaar') return doelMaand * 12
  return doelMaand
}

const PERIOD_LABEL: Record<PeriodKey, string> = {
  'deze-week': 'deze week',
  'deze-maand': 'deze maand',
  'dit-kwartaal': 'dit kwartaal',
  'dit-jaar': 'dit jaar',
  'all-time': 'totaal',
}

export function mapAnalyse(d: AnalyseServerData): MobileAnalyseView {
  const trendSeries = d.trend.map((t) => t.omzet)
  const goal = goalForPeriod(d.omzetDoelMaand, d.periodKey)

  const conversie = pctOf(d.converted, d.leadsTotaal)

  const kpis: AnalyseKpi[] = [
    { label: 'Conversie', value: d.leadsTotaal > 0 ? `${conversie}%` : '—', spark: trendSeries, tone: 'green' },
    { label: 'Offertes verstuurd', value: String(d.offertesVerstuurd), spark: trendSeries, tone: 'blue' },
    { label: '⌀ Offerte', value: d.avgOfferte !== null ? eur(d.avgOfferte) : '—', spark: trendSeries, tone: 'teal' },
    { label: '⌀ Reactietijd', value: reactieLabel(d.avgReactieMs), spark: trendSeries, tone: 'amber' },
  ]

  const funnel: AnalyseBar[] = [
    { label: 'Leads', value: String(d.leadsTotaal), pct: 100, tone: 'blue' },
    { label: 'Offertes', value: String(d.offertesVerstuurd), pct: pctOf(d.offertesVerstuurd, d.leadsTotaal), tone: 'teal' },
    { label: 'Akkoord', value: String(d.converted), pct: pctOf(d.converted, d.leadsTotaal), tone: 'green' },
  ]

  const maxDienst = Math.max(1, ...d.diensten.map((x) => x.omzet))
  const dienstTones = ['blue', 'teal', 'green', 'amber', 'violet']
  const diensten: AnalyseBar[] = d.diensten.map((x, i) => ({
    label: x.categorie,
    value: eur(x.omzet),
    pct: pctOf(x.omzet, maxDienst),
    tone: dienstTones[i % dienstTones.length],
  }))

  return {
    hero: { omzetLabel: eur(d.omzet), goalPct: pctOf(d.omzet, goal), periodLabel: PERIOD_LABEL[d.periodKey] },
    trendSeries,
    kpis,
    funnel,
    diensten,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/dashboard/mobile/analyses/analyse-mappers.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add components/dashboard/mobile/analyses/analyse-mappers.ts components/dashboard/mobile/analyses/analyse-mappers.test.ts
git commit -m "feat(mobile/analyses): view-model mapper + tests"
```

---

## Task 6: Analyses presentational sub-components

**Files:**
- Create: `components/dashboard/mobile/analyses/PeriodToggle.tsx` (+ `.module.css`)
- Create: `components/dashboard/mobile/analyses/OmzetHeroCard.tsx` (+ `.module.css`)
- Create: `components/dashboard/mobile/analyses/AnalyseKpiGrid.tsx` (+ `.module.css`)
- Create: `components/dashboard/mobile/analyses/AnalyseSectionCard.tsx` (+ `.module.css`)

Visual values (spacing/size/weight) are taken from the handoff (`mobile-app-handoff/src/screens/MobileAnalyses.jsx`) — keep that file open as the pixel reference. Colors map to tokens.

- [ ] **Step 1: PeriodToggle**

Period switching is URL-driven (consistent with the desktop `PeriodSelector`). The three mobile options map to existing `PeriodKey`s: Maand=`deze-maand`, Kwartaal=`dit-kwartaal`, Jaar=`dit-jaar`.

Create `components/dashboard/mobile/analyses/PeriodToggle.tsx`:

```typescript
'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { PeriodKey } from '@/lib/dashboard/period'
import styles from './PeriodToggle.module.css'

const OPTIONS: Array<{ label: string; key: PeriodKey }> = [
  { label: 'Maand', key: 'deze-maand' },
  { label: 'Kwartaal', key: 'dit-kwartaal' },
  { label: 'Jaar', key: 'dit-jaar' },
]

export function PeriodToggle({ value }: { value: PeriodKey }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const select = (key: PeriodKey) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('periode', key)
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <div className={styles.toggle} role="tablist" aria-label="Periode">
      {OPTIONS.map((o) => (
        <button
          key={o.key}
          type="button"
          role="tab"
          aria-selected={value === o.key}
          className={styles.btn}
          data-active={value === o.key}
          onClick={() => select(o.key)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
```

> **Before coding:** confirm the URL param name `periode` matches what `parsePeriod` reads. Open `lib/dashboard/period.ts` → check the `ParamSource` key used by `parsePeriod` (and `PeriodSelector`). Use that exact key here.

Create `components/dashboard/mobile/analyses/PeriodToggle.module.css`:

```css
.toggle {
  display: flex;
  gap: 6px;
  margin: 0 var(--mobile-content-pad) var(--space-3);
  padding: 3px;
  background: var(--color-chip-bg);
  border-radius: 10px;
}
.btn {
  flex: 1;
  padding: 8px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--color-text-muted);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}
.btn[data-active='true'] {
  background: var(--color-elev);
  color: var(--color-text);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}
```

- [ ] **Step 2: OmzetHeroCard**

Create `components/dashboard/mobile/analyses/OmzetHeroCard.tsx`:

```typescript
import { AreaChart } from '../shared/charts/AreaChart'
import { DonutRing } from '../shared/charts/DonutRing'
import styles from './OmzetHeroCard.module.css'

type Props = {
  omzetLabel: string
  goalPct: number
  periodLabel: string
  trend: number[]
  monthLabels: string[]
}

export function OmzetHeroCard({ omzetLabel, goalPct, periodLabel, trend, monthLabels }: Props) {
  return (
    <section className={styles.card}>
      <div className={styles.top}>
        <div>
          <p className={styles.kicker}>Omzet · {periodLabel}</p>
          <p className={styles.amount}>{omzetLabel}</p>
        </div>
        <DonutRing pct={goalPct}>
          <span className={styles.ringPct}>{goalPct}%</span>
        </DonutRing>
      </div>
      <div className={styles.chart}>
        <AreaChart data={trend} color="var(--color-primary)" />
        <div className={styles.months} aria-hidden="true">
          {monthLabels.map((m, i) => (
            <span key={i}>{m}</span>
          ))}
        </div>
      </div>
    </section>
  )
}
```

Create `components/dashboard/mobile/analyses/OmzetHeroCard.module.css`:

```css
.card {
  margin: 0 var(--mobile-content-pad) var(--space-3);
  padding: 18px;
  background: var(--color-elev);
  border: 1px solid var(--color-border-soft);
  border-radius: 18px;
}
.top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.kicker {
  margin: 0;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--color-text-muted);
}
.amount {
  margin: 5px 0 0;
  font-size: 34px;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1;
  color: var(--color-text);
}
.ringPct {
  font-size: 13px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--color-text);
}
.chart {
  margin-top: 14px;
}
.months {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  font-size: 10px;
  color: var(--color-text-muted);
}
```

- [ ] **Step 3: AnalyseKpiGrid**

Create `components/dashboard/mobile/analyses/AnalyseKpiGrid.tsx`:

```typescript
import { Sparkline } from '../shared/charts/Sparkline'
import { toneColor, type AnalyseKpi } from './analyse-mappers'
import styles from './AnalyseKpiGrid.module.css'

export function AnalyseKpiGrid({ kpis }: { kpis: AnalyseKpi[] }) {
  return (
    <div className={styles.grid}>
      {kpis.map((k) => (
        <div key={k.label} className={styles.tile}>
          <p className={styles.value}>{k.value}</p>
          <div className={styles.bottom}>
            <span className={styles.label}>{k.label}</span>
            <Sparkline data={k.spark} color={toneColor(k.tone)} />
          </div>
        </div>
      ))}
    </div>
  )
}
```

Create `components/dashboard/mobile/analyses/AnalyseKpiGrid.module.css`:

```css
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin: 0 var(--mobile-content-pad) var(--space-4);
}
.tile {
  padding: 13px;
  background: var(--color-elev);
  border: 1px solid var(--color-border-soft);
  border-radius: 14px;
}
.value {
  margin: 0;
  font-size: 21px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--color-text);
}
.bottom {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-top: 9px;
}
.label {
  font-size: 11px;
  color: var(--color-text-muted);
}
```

- [ ] **Step 4: AnalyseSectionCard (shared wrapper for funnel + diensten)**

Create `components/dashboard/mobile/analyses/AnalyseSectionCard.tsx`:

```typescript
import styles from './AnalyseSectionCard.module.css'

type Props = {
  title: string
  /** Optionele rechter-badge (bv. "44% akkoord"). */
  badge?: string
  children: React.ReactNode
}

export function AnalyseSectionCard({ title, badge, children }: Props) {
  return (
    <section className={styles.card}>
      <div className={styles.head}>
        <h2 className={styles.title}>{title}</h2>
        {badge && <span className={styles.badge}>{badge}</span>}
      </div>
      <div className={styles.body}>{children}</div>
    </section>
  )
}
```

Create `components/dashboard/mobile/analyses/AnalyseSectionCard.module.css`:

```css
.card {
  margin: 0 var(--mobile-content-pad) var(--space-4);
  padding: 16px;
  background: var(--color-elev);
  border: 1px solid var(--color-border-soft);
  border-radius: 16px;
}
.head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 14px;
}
.title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text);
}
.badge {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-success);
}
.body {
  display: flex;
  flex-direction: column;
  gap: 13px;
}
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add components/dashboard/mobile/analyses/PeriodToggle.* components/dashboard/mobile/analyses/OmzetHeroCard.* components/dashboard/mobile/analyses/AnalyseKpiGrid.* components/dashboard/mobile/analyses/AnalyseSectionCard.*
git commit -m "feat(mobile/analyses): period toggle, hero, KPI grid, section card"
```

---

## Task 7: MobileAnalyses screen (compose)

**Files:**
- Create: `components/dashboard/mobile/analyses/MobileAnalyses.tsx` (+ `.module.css`)

- [ ] **Step 1: Compose the screen**

Create `components/dashboard/mobile/analyses/MobileAnalyses.tsx`:

```typescript
'use client'

import { useMemo } from 'react'
import { mapAnalyse, toneColor, type AnalyseServerData } from './analyse-mappers'
import { PeriodToggle } from './PeriodToggle'
import { OmzetHeroCard } from './OmzetHeroCard'
import { AnalyseKpiGrid } from './AnalyseKpiGrid'
import { AnalyseSectionCard } from './AnalyseSectionCard'
import { BarRow } from '../shared/charts/BarRow'
import styles from './MobileAnalyses.module.css'

const MONTH_LABELS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']

export function MobileAnalyses({ data }: { data: AnalyseServerData }) {
  const v = useMemo(() => mapAnalyse(data), [data])
  const akkoordPct = v.funnel[v.funnel.length - 1]?.pct ?? 0

  return (
    <div className={styles.root}>
      <PeriodToggle value={data.periodKey} />

      <OmzetHeroCard
        omzetLabel={v.hero.omzetLabel}
        goalPct={v.hero.goalPct}
        periodLabel={v.hero.periodLabel}
        trend={v.trendSeries}
        monthLabels={MONTH_LABELS.slice(0, v.trendSeries.length)}
      />

      <AnalyseKpiGrid kpis={v.kpis} />

      <AnalyseSectionCard title="Conversie-trechter" badge={`${akkoordPct}% akkoord`}>
        {v.funnel.map((f) => (
          <BarRow key={f.label} label={f.label} value={f.value} pct={f.pct} color={toneColor(f.tone)} thickness={10} />
        ))}
      </AnalyseSectionCard>

      <AnalyseSectionCard title="Omzet per dienst">
        {v.diensten.length === 0 ? (
          <p className={styles.empty}>Nog geen omzet in deze periode.</p>
        ) : (
          v.diensten.map((d) => (
            <BarRow key={d.label} label={d.label} value={d.value} pct={d.pct} color={toneColor(d.tone)} thickness={8} />
          ))
        )}
      </AnalyseSectionCard>
    </div>
  )
}
```

Create `components/dashboard/mobile/analyses/MobileAnalyses.module.css`:

```css
.root {
  padding-top: var(--space-3);
  /* Onderpadding voor de bottom-nav levert MobileShell .main al;
     hier alleen wat extra ademruimte onder de laatste kaart. */
  padding-bottom: var(--space-4);
}
.empty {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-muted);
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/mobile/analyses/MobileAnalyses.tsx components/dashboard/mobile/analyses/MobileAnalyses.module.css
git commit -m "feat(mobile/analyses): MobileAnalyses screen composition"
```

---

## Task 8: Wire into the statistieken page

**Files:**
- Modify: `app/dashboard/(app)/statistieken/page.tsx`
- Modify: `app/dashboard/(app)/statistieken/page.module.css`

- [ ] **Step 1: Add imports + new query calls**

In `app/dashboard/(app)/statistieken/page.tsx`, extend the import from stats-queries (lines 3-12) to add the new functions, and add the MobileAnalyses import:

Replace the stats-queries import block with:

```typescript
import {
  countLeads,
  countConverted,
  countOffertesVerstuurd,
  avgOfferteWaarde,
  avgReactietijdMs,
  statusVerdeling,
  categorieVerdeling,
  leadsPerDag,
  topTags,
  omzetTotaal,
  omzetPerCategorie,
  omzetTrendMaandelijks,
  getOmzetDoelMaand,
} from '@/lib/dashboard/stats-queries'
import { MobileAnalyses } from '@/components/dashboard/mobile/analyses/MobileAnalyses'
```

- [ ] **Step 2: Fetch the new data in the existing `Promise.all`**

Replace the `Promise.all` destructuring (lines 43-61) with:

```typescript
  const [
    total,
    converted,
    offertesVerstuurd,
    avgOfferte,
    avgReactie,
    statusRows,
    categorieRows,
    perDag,
    tagRows,
    omzet,
    omzetDoelMaand,
    omzetTrend,
    omzetDiensten,
  ] = await Promise.all([
    countLeads(range),
    countConverted(range),
    countOffertesVerstuurd(range),
    avgOfferteWaarde(range),
    avgReactietijdMs(range),
    statusVerdeling(range),
    categorieVerdeling(range),
    leadsPerDag(),
    topTags(range, 10),
    omzetTotaal(range),
    getOmzetDoelMaand(),
    omzetTrendMaandelijks(),
    omzetPerCategorie(range),
  ])
```

- [ ] **Step 3: Wrap desktop in `.desktopTree` + add the `.mobileTree`**

Replace the entire `return ( … )` block (lines 65-117) with the following. The desktop markup is unchanged except it's now wrapped in `<div className={styles.desktopTree}>`; the mobile tree renders `<MobileAnalyses>`.

```tsx
  return (
    <>
      <div className={styles.desktopTree}>
        <div className={styles.header}>
          <div>
            <h1>Statistieken</h1>
            <p className={styles.subtitle}>Periode: {periodLabel(periodKey)}</p>
          </div>
          <Suspense fallback={null}>
            <PeriodSelector value={periodKey} />
          </Suspense>
        </div>

        <div className={styles.kpiGrid}>
          <KpiCard label="Totaal leads" value={String(total)} />
          <KpiCard
            label="Conversie"
            value={total > 0 ? `${conversiePct}%` : '—'}
            hint={total > 0 ? `${converted} van ${total}` : undefined}
          />
          <KpiCard
            label="⌀ Offerte"
            value={avgOfferte !== null ? formatEuro(avgOfferte) : '—'}
          />
          <KpiCard
            label="⌀ Reactietijd"
            value={avgReactie !== null ? formatDuration(avgReactie) : '—'}
          />
        </div>

        <div className={styles.twoCol}>
          <DistributionBars
            title="Verdeling per status"
            rows={statusRows.map((r) => ({
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              label: dashboardStatusLabel(r.status as any),
              count: r.count,
            }))}
          />
          <DistributionBars
            title="Verdeling per categorie"
            rows={categorieRows.map((r) => ({
              label: r.categorie,
              count: r.count,
            }))}
          />
        </div>

        <div className={styles.twoCol}>
          <TrendLineChart title="Leads per dag (30d)" points={perDag} />
          <TopTagsList rows={tagRows} />
        </div>
      </div>

      <div className={styles.mobileTree}>
        <MobileAnalyses
          data={{
            periodKey,
            omzet,
            omzetDoelMaand,
            trend: omzetTrend,
            leadsTotaal: total,
            offertesVerstuurd,
            converted,
            avgOfferte,
            avgReactieMs: avgReactie,
            diensten: omzetDiensten,
          }}
        />
      </div>
    </>
  )
```

- [ ] **Step 4: Add the tree-toggle CSS**

Append to `app/dashboard/(app)/statistieken/page.module.css`:

```css
/* ── Desktop / mobile tree toggle (mirror leads/page.module.css) ──────────── */
.desktopTree { display: block; }
.mobileTree { display: none; }

@media (max-width: 640px) {
  .desktopTree { display: none; }
  .mobileTree { display: block; }
}
```

- [ ] **Step 5: Type-check + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors. (If lint flags the `periode` param mismatch from Task 6 Step 1, fix the param name now.)

- [ ] **Step 6: Commit**

```bash
git add "app/dashboard/(app)/statistieken/page.tsx" "app/dashboard/(app)/statistieken/page.module.css"
git commit -m "feat(mobile/analyses): wire MobileAnalyses into statistieken page (desktop/mobile split)"
```

---

## Task 9: Verify end-to-end

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run components/dashboard/mobile/`
Expected: chart-math + analyse-mappers tests PASS; existing mobile tests still PASS.

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: build succeeds with no TypeScript errors.

- [ ] **Step 3: Visual check at mobile width**

Start dev server (`npm run dev`), then in the dashboard host (auth-gated `app.localhost:3000`) open `/statistieken` and shrink to ≤640px (or use a 390px device viewport). Compare against `mobile-app-handoff/src/screens/MobileAnalyses.jsx` rendered in `mobile-app-handoff/Mobiele App - Demo.html`. Check, per the project screenshot workflow: period toggle (active-state shadow), hero card (omzet size 34/weight 800, ring), KPI grid 2×2 with sparklines, funnel bars (10px), diensten bars (8px), spacing/radius, light + dark (`.dark`).

Note findings as a bullet list; fix any spacing/size/color deviations in the relevant `.module.css`, then re-run build.

- [ ] **Step 4: Final commit (if visual fixes were made)**

```bash
git add -A
git commit -m "fix(mobile/analyses): pixel-match polish vs handoff"
```

---

## Self-Review (completed during planning)

- **Spec coverage:** Fase 0 tokens (Task 1) + chart-kit (Tasks 2-3) ✓; Analyses period toggle, hero+ring, 2×2 KPIs+sparklines, funnel, omzet/dienst (Tasks 5-8) ✓; live data wiring (Task 4, 8) ✓; desktop/mobile split (Task 8) ✓. **Deferred from the master spec's "Fase 0 = all primitives":** `MobileDetailNavBar`, `MobileToggle`, `MobileStickyActionBar`, `StarRating` are intentionally NOT built here (YAGNI — no consumer yet; they'll be built in the plan of the first screen that needs them). Flagged.
- **Data gaps:** the 3 ⚠️ items (delta badges omitted, "Bot zelf af"→"Offertes verstuurd" swap, sparklines fed from omzet-trend) are explicit and listed for user confirmation.
- **Type consistency:** `AnalyseServerData` (Task 5) ↔ page props (Task 8) match field-for-field; `mapAnalyse`/`eur`/`pctOf`/`toneColor` names consistent across Tasks 5-7; chart-math `scaleSeries`/`toLinePath`/`toAreaPath`/`ringGeometry` consistent across Tasks 2-3.
- **Open verification baked into steps:** the `periode` URL-param name must be confirmed against `parsePeriod` (Task 6 Step 1 note + Task 8 Step 5).
- **No placeholders:** every code step contains full code.
