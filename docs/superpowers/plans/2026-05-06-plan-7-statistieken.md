# Plan 7 — Statistieken-pagina Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bouw `/dashboard/statistieken` met 8 metrics (counts, conversie, gemiddelden, verdelingen, trend, top-tags) en een globale periode-selector. Read-only, geen schema-changes, geen bot-impact.

**Architecture:** Een Server Component pagina die `searchParams.period` parsed, parallel 8 queries afvuurt en de resultaten aan kleine render-componenten doorgeeft. Charting via CSS-bars en inline SVG — geen externe library.

**Tech Stack:** Next.js 15 Server Components + minimal Client (alleen PeriodSelector), `@supabase/ssr`, CSS Modules, Vitest. Geen nieuwe packages.

**Working directory:** `/Users/christiaantromp/Desktop/Frontlix website new/`

**Schoon-straatje bot wordt niet aangeraakt.** Geen schema-migraties.

---

## File Structure

**Nieuw:**
```
lib/dashboard/
├── period.ts                       — PeriodKey + parsePeriod + periodToRange + periodLabel
├── period.test.ts
├── stats-queries.ts                — 8 query-helpers
└── stats-queries.test.ts

components/dashboard/stats/
├── PeriodSelector.tsx + .module.css            — client, URL-state dropdown
├── KpiCard.tsx + .module.css                   — server, label + waarde
├── DistributionBars.tsx + .module.css          — server, horizontale bars
├── TrendLineChart.tsx + .module.css            — server, inline SVG
└── TopTagsList.tsx + .module.css               — server, top-N lijst
```

**Gewijzigd:**
```
app/dashboard/(app)/statistieken/page.tsx       — vervangt placeholder
```

---

## Approach principles

- **Server-first.** Alleen `PeriodSelector` is client (vanwege `useSearchParams` + URL-replace). De rest is pure Server Components.
- **Geen chart-library.** Bars zijn gewoon `<div style={{width: ...%}}>`-equivalenten via CSS-vars. Trend-line is een handgemaakte `<path>` in een `<svg>`. Saves ~100kb gzipped vs. recharts.
- **JS-aggregation waar PostgREST geen aggregaten heeft.** Voor `avg`/`min` over een join (reactietijd) doen we 2 queries en aggregeren in JS. Acceptabel binnen typical klantvolume (paar honderd leads).
- **TDD** voor `period.ts` (date-math is fout-gevoelig) en `stats-queries.ts` (filter-arguments verifiëren). UI-components testen via end-to-end smoke.
- **YAGNI**: geen vergelijking met vorige periode, geen drill-downs, geen export, geen per-medewerker stats.
- **Frequent commits** — één commit per task.

---

### Task 1: period helpers (TDD)

**Files:**
- Create: `lib/dashboard/period.ts`
- Create: `lib/dashboard/period.test.ts`

- [ ] **Step 1: Schrijf failing tests**

Bestand `lib/dashboard/period.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import {
  parsePeriod,
  periodToRange,
  periodLabel,
  type PeriodKey,
} from './period'

describe('parsePeriod', () => {
  it('returnt deze-maand als default', () => {
    expect(parsePeriod({})).toBe('deze-maand')
  })

  it('parseert geldige period-keys', () => {
    expect(parsePeriod({ period: 'deze-week' })).toBe('deze-week')
    expect(parsePeriod({ period: 'deze-maand' })).toBe('deze-maand')
    expect(parsePeriod({ period: 'dit-kwartaal' })).toBe('dit-kwartaal')
    expect(parsePeriod({ period: 'dit-jaar' })).toBe('dit-jaar')
    expect(parsePeriod({ period: 'all-time' })).toBe('all-time')
  })

  it('valt terug op deze-maand bij ongeldige waarde', () => {
    expect(parsePeriod({ period: 'gibberish' })).toBe('deze-maand')
  })
})

describe('periodToRange', () => {
  // Vaste referentie-datum: dinsdag 5 mei 2026 14:00 UTC
  const NOW = new Date('2026-05-05T14:00:00Z')

  it('deze-week: vanaf maandag 00:00', () => {
    // Maandag 4 mei 2026
    expect(periodToRange('deze-week', NOW).from).toBe('2026-05-04')
  })

  it('deze-maand: vanaf 1e van maand', () => {
    expect(periodToRange('deze-maand', NOW).from).toBe('2026-05-01')
  })

  it('dit-kwartaal: vanaf 1 april (Q2)', () => {
    expect(periodToRange('dit-kwartaal', NOW).from).toBe('2026-04-01')
  })

  it('dit-jaar: vanaf 1 januari', () => {
    expect(periodToRange('dit-jaar', NOW).from).toBe('2026-01-01')
  })

  it('all-time: from is null', () => {
    expect(periodToRange('all-time', NOW).from).toBeNull()
  })

  it('to is altijd het nu-tijdstip als ISO', () => {
    const range = periodToRange('deze-maand', NOW)
    expect(range.to).toBe(NOW.toISOString())
  })

  it('Q1: dit-kwartaal vanaf 1 januari', () => {
    const feb = new Date('2026-02-15T12:00:00Z')
    expect(periodToRange('dit-kwartaal', feb).from).toBe('2026-01-01')
  })

  it('Q3: dit-kwartaal vanaf 1 juli', () => {
    const aug = new Date('2026-08-15T12:00:00Z')
    expect(periodToRange('dit-kwartaal', aug).from).toBe('2026-07-01')
  })

  it('Q4: dit-kwartaal vanaf 1 oktober', () => {
    const dec = new Date('2026-12-15T12:00:00Z')
    expect(periodToRange('dit-kwartaal', dec).from).toBe('2026-10-01')
  })

  it('zondag: deze-week pakt vorige maandag', () => {
    // Zondag 10 mei 2026
    const sun = new Date('2026-05-10T12:00:00Z')
    expect(periodToRange('deze-week', sun).from).toBe('2026-05-04')
  })

  it('maandag: deze-week pakt diezelfde maandag', () => {
    // Maandag 4 mei 2026
    const mon = new Date('2026-05-04T12:00:00Z')
    expect(periodToRange('deze-week', mon).from).toBe('2026-05-04')
  })
})

describe('periodLabel', () => {
  it('returnt menselijke label per key', () => {
    expect(periodLabel('deze-week')).toBe('Deze week')
    expect(periodLabel('deze-maand')).toBe('Deze maand')
    expect(periodLabel('dit-kwartaal')).toBe('Dit kwartaal')
    expect(periodLabel('dit-jaar')).toBe('Dit jaar')
    expect(periodLabel('all-time')).toBe('All-time')
  })
})
```

- [ ] **Step 2: Run tests, verwacht failures**

```bash
npm run test -- lib/dashboard/period.test.ts
```

Verwacht: import-error.

- [ ] **Step 3: Implementeer period.ts**

Bestand `lib/dashboard/period.ts`:

```typescript
export type PeriodKey =
  | 'deze-week'
  | 'deze-maand'
  | 'dit-kwartaal'
  | 'dit-jaar'
  | 'all-time'

const VALID: ReadonlySet<PeriodKey> = new Set([
  'deze-week',
  'deze-maand',
  'dit-kwartaal',
  'dit-jaar',
  'all-time',
])

export interface StatsPeriod {
  from: string | null  // ISO-date (YYYY-MM-DD); null = all-time
  to: string           // ISO-timestamp van "nu"
}

type ParamSource =
  | { [k: string]: string | string[] | undefined }
  | URLSearchParams

function getParam(source: ParamSource, key: string): string | undefined {
  if (source instanceof URLSearchParams) {
    return source.get(key) ?? undefined
  }
  const v = source[key]
  if (Array.isArray(v)) return v[0]
  return v
}

/**
 * Parsest URL-search-param `period` naar een PeriodKey.
 * Default: deze-maand (meest gebruikt door ondernemers).
 */
export function parsePeriod(source: ParamSource): PeriodKey {
  const raw = getParam(source, 'period')
  if (raw && VALID.has(raw as PeriodKey)) {
    return raw as PeriodKey
  }
  return 'deze-maand'
}

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

function toDateString(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

/**
 * Berekent het tijdvenster voor een PeriodKey gegeven een nu-tijdstip.
 * `from` is een ISO-date (YYYY-MM-DD) op 00:00 UTC; queries gebruiken `.gte()`.
 * `to` is de huidige ISO-timestamp.
 *
 * Tijdzone: alle datums werken in UTC. Voor de Nederlandse markt is het
 * verschil met Europe/Amsterdam +1/+2 uur — verwaarloosbaar voor weekly/monthly
 * stats. "Begin van deze week" is maandag 00:00 UTC.
 */
export function periodToRange(key: PeriodKey, now: Date = new Date()): StatsPeriod {
  const to = now.toISOString()

  if (key === 'all-time') {
    return { from: null, to }
  }

  if (key === 'deze-week') {
    // ISO-week: maandag = 1, zondag = 7. JS getUTCDay: zondag = 0.
    const day = now.getUTCDay()
    const diffToMonday = day === 0 ? 6 : day - 1
    const monday = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - diffToMonday
    ))
    return { from: toDateString(monday), to }
  }

  if (key === 'deze-maand') {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    return { from: toDateString(start), to }
  }

  if (key === 'dit-kwartaal') {
    const month = now.getUTCMonth()  // 0-11
    const quarterStartMonth = Math.floor(month / 3) * 3
    const start = new Date(Date.UTC(now.getUTCFullYear(), quarterStartMonth, 1))
    return { from: toDateString(start), to }
  }

  // dit-jaar
  const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1))
  return { from: toDateString(start), to }
}

const LABELS: Record<PeriodKey, string> = {
  'deze-week': 'Deze week',
  'deze-maand': 'Deze maand',
  'dit-kwartaal': 'Dit kwartaal',
  'dit-jaar': 'Dit jaar',
  'all-time': 'All-time',
}

export function periodLabel(key: PeriodKey): string {
  return LABELS[key]
}
```

- [ ] **Step 4: Run tests, verwacht groen**

```bash
npm run test -- lib/dashboard/period.test.ts
```

Verwacht: alle 14 tests groen.

- [ ] **Step 5: Type-check + volledige suite**

```bash
npx tsc --noEmit && npm run test
```

Verwacht: clean.

- [ ] **Step 6: Commit**

```bash
git add lib/dashboard/period.ts lib/dashboard/period.test.ts
git commit -m "feat(dashboard): add period helpers (parse + range + label)"
```

---

### Task 2: stats-queries part 1 — counts + averages (TDD)

**Files:**
- Create: `lib/dashboard/stats-queries.ts`
- Create: `lib/dashboard/stats-queries.test.ts`

- [ ] **Step 1: Schrijf failing tests**

Bestand `lib/dashboard/stats-queries.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { builder, mockFrom } = vi.hoisted(() => {
  type Builder = {
    select: ReturnType<typeof vi.fn>
    eq: ReturnType<typeof vi.fn>
    gte: ReturnType<typeof vi.fn>
    lte: ReturnType<typeof vi.fn>
    in: ReturnType<typeof vi.fn>
    or: ReturnType<typeof vi.fn>
    not: ReturnType<typeof vi.fn>
    order: ReturnType<typeof vi.fn>
    limit: ReturnType<typeof vi.fn>
  }
  const builder = {} as Builder
  builder.select = vi.fn(() => builder)
  builder.eq = vi.fn(() => builder)
  builder.gte = vi.fn(() => builder)
  builder.lte = vi.fn(() => builder)
  builder.in = vi.fn(() => builder)
  builder.or = vi.fn(() => builder)
  builder.not = vi.fn(() => builder)
  builder.order = vi.fn(() => builder)
  builder.limit = vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 }))

  const mockFrom = vi.fn(() => builder)
  return { builder, mockFrom }
})

vi.mock('./supabase-server', () => ({
  getDashboardSupabase: async () => ({ from: mockFrom }),
}))

import {
  countLeads,
  countConverted,
  avgOfferteWaarde,
  avgReactietijdMs,
} from './stats-queries'

const PERIOD_MAY = { from: '2026-05-01', to: '2026-05-31T23:59:59Z' }
const PERIOD_ALL = { from: null, to: '2026-05-31T23:59:59Z' }

function resetBuilder() {
  builder.select.mockClear()
  builder.eq.mockClear()
  builder.gte.mockClear()
  builder.lte.mockClear()
  builder.in.mockClear()
  builder.or.mockClear()
  builder.not.mockClear()
  builder.order.mockClear()
  builder.limit.mockClear()
  mockFrom.mockClear()
  mockFrom.mockReturnValue(builder)
}

describe('countLeads', () => {
  beforeEach(resetBuilder)

  it('met from: filtert op aangemaakt >= from', async () => {
    // Terminal: select().gte() — count komt uit de promise resolution van gte
    builder.gte.mockReturnValueOnce(Promise.resolve({ count: 42, error: null, data: null }))

    const result = await countLeads(PERIOD_MAY)

    expect(mockFrom).toHaveBeenCalledWith('leads')
    expect(builder.select).toHaveBeenCalledWith('*', { count: 'exact', head: true })
    expect(builder.gte).toHaveBeenCalledWith('aangemaakt', '2026-05-01')
    expect(result).toBe(42)
  })

  it('met from=null (all-time): geen gte filter', async () => {
    builder.select.mockReturnValueOnce(Promise.resolve({ count: 200, error: null, data: null }))

    const result = await countLeads(PERIOD_ALL)

    expect(builder.gte).not.toHaveBeenCalled()
    expect(result).toBe(200)
  })

  it('returnt 0 bij error', async () => {
    builder.gte.mockReturnValueOnce(
      Promise.resolve({ count: null, error: { message: 'oops' }, data: null })
    )
    expect(await countLeads(PERIOD_MAY)).toBe(0)
  })
})

describe('countConverted', () => {
  beforeEach(resetBuilder)

  it('filtert op niet-null akkoord_op OR afspraak_geboekt_op binnen periode', async () => {
    builder.gte.mockReturnValueOnce(Promise.resolve({ count: 7, error: null, data: null }))

    const result = await countConverted(PERIOD_MAY)

    expect(builder.or).toHaveBeenCalledWith(
      'akkoord_op.not.is.null,afspraak_geboekt_op.not.is.null'
    )
    expect(builder.gte).toHaveBeenCalledWith('aangemaakt', '2026-05-01')
    expect(result).toBe(7)
  })
})

describe('avgOfferteWaarde', () => {
  beforeEach(resetBuilder)

  it('berekent gemiddelde van totaal_prijs over leads in periode', async () => {
    // Terminal: gte returns data array
    builder.gte.mockReturnValueOnce(
      Promise.resolve({
        data: [
          { totaal_prijs: 100 },
          { totaal_prijs: 200 },
          { totaal_prijs: 300 },
        ],
        error: null,
      })
    )

    const result = await avgOfferteWaarde(PERIOD_MAY)
    expect(result).toBe(200)
  })

  it('negeert null totaal_prijs', async () => {
    builder.gte.mockReturnValueOnce(
      Promise.resolve({
        data: [
          { totaal_prijs: 100 },
          { totaal_prijs: null },
          { totaal_prijs: 300 },
        ],
        error: null,
      })
    )

    expect(await avgOfferteWaarde(PERIOD_MAY)).toBe(200)  // (100+300)/2
  })

  it('returnt null als geen rijen met prijs', async () => {
    builder.gte.mockReturnValueOnce(Promise.resolve({ data: [], error: null }))
    expect(await avgOfferteWaarde(PERIOD_MAY)).toBeNull()
  })
})

describe('avgReactietijdMs', () => {
  beforeEach(resetBuilder)

  it('berekent gemiddelde tijd tussen lead.aangemaakt en eerste uitgaande bericht', async () => {
    // Eerst: leads-query
    const leadsBuilder: any = {
      select: vi.fn(() => leadsBuilder),
      gte: vi.fn(() =>
        Promise.resolve({
          data: [
            { lead_id: 'L1', aangemaakt: '2026-05-01T10:00:00Z' },
            { lead_id: 'L2', aangemaakt: '2026-05-02T10:00:00Z' },
          ],
          error: null,
        })
      ),
    }
    // Daarna: berichten-query
    const berichtenBuilder: any = {
      select: vi.fn(() => berichtenBuilder),
      eq: vi.fn(() => berichtenBuilder),
      in: vi.fn(() =>
        Promise.resolve({
          data: [
            // L1: aangemaakt 10:00, eerste uit 10:30 → 30 min = 1800000ms
            { lead_id: 'L1', timestamp: '2026-05-01T10:30:00Z' },
            { lead_id: 'L1', timestamp: '2026-05-01T11:00:00Z' },
            // L2: aangemaakt 10:00, eerste uit 12:00 → 120 min = 7200000ms
            { lead_id: 'L2', timestamp: '2026-05-02T12:00:00Z' },
          ],
          error: null,
        })
      ),
    }
    mockFrom.mockImplementation((table: string) => {
      if (table === 'leads') return leadsBuilder
      if (table === 'berichten') return berichtenBuilder
      throw new Error(`unexpected table: ${table}`)
    })

    const result = await avgReactietijdMs(PERIOD_MAY)
    // Avg(1800000, 7200000) = 4500000
    expect(result).toBe(4500000)
  })

  it('negeert leads zonder uitgaande bericht', async () => {
    const leadsBuilder: any = {
      select: vi.fn(() => leadsBuilder),
      gte: vi.fn(() =>
        Promise.resolve({
          data: [
            { lead_id: 'L1', aangemaakt: '2026-05-01T10:00:00Z' },
            { lead_id: 'L2', aangemaakt: '2026-05-02T10:00:00Z' },
          ],
          error: null,
        })
      ),
    }
    const berichtenBuilder: any = {
      select: vi.fn(() => berichtenBuilder),
      eq: vi.fn(() => berichtenBuilder),
      in: vi.fn(() =>
        Promise.resolve({
          data: [
            { lead_id: 'L1', timestamp: '2026-05-01T10:30:00Z' },
            // L2 heeft geen uitgaand bericht
          ],
          error: null,
        })
      ),
    }
    mockFrom.mockImplementation((table: string) => {
      if (table === 'leads') return leadsBuilder
      if (table === 'berichten') return berichtenBuilder
      throw new Error(`unexpected: ${table}`)
    })

    const result = await avgReactietijdMs(PERIOD_MAY)
    expect(result).toBe(1800000)  // alleen L1 telt
  })

  it('returnt null als geen leads matchen', async () => {
    const leadsBuilder: any = {
      select: vi.fn(() => leadsBuilder),
      gte: vi.fn(() => Promise.resolve({ data: [], error: null })),
    }
    mockFrom.mockImplementation(() => leadsBuilder)
    expect(await avgReactietijdMs(PERIOD_MAY)).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests, verwacht failures**

```bash
npm run test -- lib/dashboard/stats-queries.test.ts
```

- [ ] **Step 3: Implementeer stats-queries.ts (counts + averages)**

Bestand `lib/dashboard/stats-queries.ts`:

```typescript
import { getDashboardSupabase } from './supabase-server'
import type { StatsPeriod } from './period'

/**
 * Aantal leads in de periode (alle, ongeacht dashboard_archived).
 * Gebruikt count-only query — head:true geeft alleen het totaal terug.
 */
export async function countLeads(period: StatsPeriod): Promise<number> {
  const supabase = await getDashboardSupabase()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
  if (period.from) {
    query = query.gte('aangemaakt', period.from)
  }
  const { count, error } = await query
  if (error) {
    console.error('[countLeads] failed:', error)
    return 0
  }
  return count ?? 0
}

/**
 * Aantal "geconverteerde" leads in de periode — leads met akkoord_op of
 * afspraak_geboekt_op gevuld.
 */
export async function countConverted(period: StatsPeriod): Promise<number> {
  const supabase = await getDashboardSupabase()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .or('akkoord_op.not.is.null,afspraak_geboekt_op.not.is.null')
  if (period.from) {
    query = query.gte('aangemaakt', period.from)
  }
  const { count, error } = await query
  if (error) {
    console.error('[countConverted] failed:', error)
    return 0
  }
  return count ?? 0
}

/**
 * Gemiddelde offerte-waarde over leads in de periode (negeert null).
 * Returnt null als er geen rijen zijn met een prijs.
 */
export async function avgOfferteWaarde(period: StatsPeriod): Promise<number | null> {
  const supabase = await getDashboardSupabase()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase.from('leads').select('totaal_prijs')
  if (period.from) {
    query = query.gte('aangemaakt', period.from)
  }
  const { data, error } = await query
  if (error) {
    console.error('[avgOfferteWaarde] failed:', error)
    return null
  }
  type Row = { totaal_prijs: number | null }
  const prijzen = ((data as Row[] | null) ?? [])
    .map((r) => r.totaal_prijs)
    .filter((p): p is number => p !== null)
  if (prijzen.length === 0) return null
  const sum = prijzen.reduce((a, b) => a + b, 0)
  return sum / prijzen.length
}

/**
 * Gemiddelde reactietijd in milliseconds: tijd tussen leads.aangemaakt en
 * de eerste 'uitgaand' bericht-timestamp voor die lead. Leads zonder
 * uitgaand bericht tellen niet mee. Returnt null als geen lead matcht.
 *
 * Twee queries: leads in periode, dan berichten met richting=uitgaand
 * gefilterd op die lead-ids. Aggregatie gebeurt in JS.
 */
export async function avgReactietijdMs(period: StatsPeriod): Promise<number | null> {
  const supabase = await getDashboardSupabase()

  // 1) Haal leads in periode
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let leadsQuery: any = supabase.from('leads').select('lead_id, aangemaakt')
  if (period.from) {
    leadsQuery = leadsQuery.gte('aangemaakt', period.from)
  }
  const { data: leadsData, error: leadsErr } = await leadsQuery
  if (leadsErr) {
    console.error('[avgReactietijdMs] leads failed:', leadsErr)
    return null
  }
  type LeadRow = { lead_id: string; aangemaakt: string }
  const leads = (leadsData as LeadRow[] | null) ?? []
  if (leads.length === 0) return null

  const leadIds = leads.map((l) => l.lead_id)

  // 2) Haal uitgaande berichten voor die leads
  const { data: berichtenData, error: berichtenErr } = await supabase
    .from('berichten')
    .select('lead_id, timestamp')
    .eq('richting', 'uitgaand')
    .in('lead_id', leadIds)
  if (berichtenErr) {
    console.error('[avgReactietijdMs] berichten failed:', berichtenErr)
    return null
  }

  type BerichtRow = { lead_id: string; timestamp: string }
  const berichten = (berichtenData as BerichtRow[] | null) ?? []

  // Vroegste uitgaande bericht per lead
  const firstOut = new Map<string, number>()
  for (const b of berichten) {
    const t = Date.parse(b.timestamp)
    const prev = firstOut.get(b.lead_id)
    if (prev === undefined || t < prev) {
      firstOut.set(b.lead_id, t)
    }
  }

  // Verschil per lead die tenminste 1 uitgaand bericht heeft
  const diffs: number[] = []
  for (const lead of leads) {
    const first = firstOut.get(lead.lead_id)
    if (first === undefined) continue
    diffs.push(first - Date.parse(lead.aangemaakt))
  }
  if (diffs.length === 0) return null
  return diffs.reduce((a, b) => a + b, 0) / diffs.length
}
```

- [ ] **Step 4: Run tests, verwacht groen**

```bash
npm run test -- lib/dashboard/stats-queries.test.ts
```

Verwacht: alle tests groen.

- [ ] **Step 5: Type-check + suite**

```bash
npx tsc --noEmit && npm run test
```

- [ ] **Step 6: Commit**

```bash
git add lib/dashboard/stats-queries.ts lib/dashboard/stats-queries.test.ts
git commit -m "feat(dashboard): add stats-queries part 1 (counts + averages)"
```

---

### Task 3: stats-queries part 2 — distributions + trends + tags (TDD)

**Files:**
- Modify: `lib/dashboard/stats-queries.ts`
- Modify: `lib/dashboard/stats-queries.test.ts`

- [ ] **Step 1: Voeg failing tests toe aan het einde van stats-queries.test.ts**

Append:

```typescript
import {
  statusVerdeling,
  categorieVerdeling,
  leadsPerDag,
  topTags,
} from './stats-queries'

describe('statusVerdeling', () => {
  beforeEach(resetBuilder)

  it('groepeert leads op dashboard_status, NULL als "Geen status"', async () => {
    builder.gte.mockReturnValueOnce(
      Promise.resolve({
        data: [
          { dashboard_status: 'open' },
          { dashboard_status: 'open' },
          { dashboard_status: 'opgevolgd' },
          { dashboard_status: null },
        ],
        error: null,
      })
    )

    const result = await statusVerdeling(PERIOD_MAY)
    // Sorted DESC by count
    expect(result).toEqual([
      { status: 'open', count: 2 },
      { status: 'opgevolgd', count: 1 },
      { status: null, count: 1 },
    ])
  })

  it('returnt lege array bij geen data', async () => {
    builder.gte.mockReturnValueOnce(Promise.resolve({ data: [], error: null }))
    expect(await statusVerdeling(PERIOD_MAY)).toEqual([])
  })
})

describe('categorieVerdeling', () => {
  beforeEach(resetBuilder)

  it('groepeert op hoofdcategorie, null als "Onbekend"', async () => {
    builder.gte.mockReturnValueOnce(
      Promise.resolve({
        data: [
          { hoofdcategorie: 'kunststof' },
          { hoofdcategorie: 'kunststof' },
          { hoofdcategorie: 'schilderwerk' },
          { hoofdcategorie: null },
        ],
        error: null,
      })
    )

    const result = await categorieVerdeling(PERIOD_MAY)
    expect(result).toEqual([
      { categorie: 'kunststof', count: 2 },
      { categorie: 'schilderwerk', count: 1 },
      { categorie: 'Onbekend', count: 1 },
    ])
  })
})

describe('leadsPerDag', () => {
  beforeEach(resetBuilder)

  it('groepeert leads op dag (laatste 30 dagen), gevuld met 0 voor lege dagen', async () => {
    // Mock returnt 3 leads op 2 verschillende dagen
    builder.gte.mockReturnValueOnce(
      Promise.resolve({
        data: [
          { aangemaakt: '2026-05-05T10:00:00Z' },
          { aangemaakt: '2026-05-05T15:00:00Z' },
          { aangemaakt: '2026-05-04T08:00:00Z' },
        ],
        error: null,
      })
    )

    const fixedNow = new Date('2026-05-05T23:59:59Z')
    const result = await leadsPerDag(fixedNow)

    // 30 entries terug, ASC op datum
    expect(result.length).toBe(30)
    // Laatste entry = vandaag (2026-05-05) met 2 leads
    expect(result[result.length - 1]).toEqual({ date: '2026-05-05', count: 2 })
    // Een-na-laatste = 2026-05-04 met 1 lead
    expect(result[result.length - 2]).toEqual({ date: '2026-05-04', count: 1 })
    // Eerste entry = 30 dagen terug, count 0
    expect(result[0].count).toBe(0)
  })
})

describe('topTags', () => {
  beforeEach(resetBuilder)

  it('telt tag-frequenties via lead_tags JOIN leads, top 10 DESC', async () => {
    // Mock fetcht lead_tags + tag-naam + leads.aangemaakt
    builder.gte.mockReturnValueOnce(
      Promise.resolve({
        data: [
          { tags: { naam: 'hot' }, leads: { aangemaakt: '2026-05-05T10:00:00Z' } },
          { tags: { naam: 'hot' }, leads: { aangemaakt: '2026-05-06T10:00:00Z' } },
          { tags: { naam: 'hot' }, leads: { aangemaakt: '2026-05-07T10:00:00Z' } },
          { tags: { naam: 'spoed' }, leads: { aangemaakt: '2026-05-08T10:00:00Z' } },
        ],
        error: null,
      })
    )

    const result = await topTags(PERIOD_MAY, 10)
    expect(result).toEqual([
      { naam: 'hot', count: 3 },
      { naam: 'spoed', count: 1 },
    ])
  })

  it('respecteert limit', async () => {
    builder.gte.mockReturnValueOnce(
      Promise.resolve({
        data: [
          { tags: { naam: 'a' }, leads: { aangemaakt: '2026-05-05T10:00:00Z' } },
          { tags: { naam: 'b' }, leads: { aangemaakt: '2026-05-06T10:00:00Z' } },
          { tags: { naam: 'c' }, leads: { aangemaakt: '2026-05-07T10:00:00Z' } },
        ],
        error: null,
      })
    )

    expect(await topTags(PERIOD_MAY, 2)).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Run tests, verwacht failures**

```bash
npm run test -- lib/dashboard/stats-queries.test.ts
```

- [ ] **Step 3: Append implementaties aan stats-queries.ts**

Voeg deze functies toe aan het einde van `lib/dashboard/stats-queries.ts`:

```typescript
/**
 * Verdeling per dashboard_status. NULL wordt als label "null" doorgegeven —
 * de UI rendert dit als "Geen status".
 * Resultaat is gesorteerd DESC op count.
 */
export async function statusVerdeling(
  period: StatsPeriod
): Promise<Array<{ status: string | null; count: number }>> {
  const supabase = await getDashboardSupabase()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase.from('leads').select('dashboard_status')
  if (period.from) {
    query = query.gte('aangemaakt', period.from)
  }
  const { data, error } = await query
  if (error) {
    console.error('[statusVerdeling] failed:', error)
    return []
  }
  type Row = { dashboard_status: string | null }
  const counts = new Map<string | null, number>()
  for (const row of (data as Row[] | null) ?? []) {
    counts.set(row.dashboard_status, (counts.get(row.dashboard_status) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count)
}

/**
 * Verdeling per hoofdcategorie. NULL wordt "Onbekend".
 * Sorted DESC op count.
 */
export async function categorieVerdeling(
  period: StatsPeriod
): Promise<Array<{ categorie: string; count: number }>> {
  const supabase = await getDashboardSupabase()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase.from('leads').select('hoofdcategorie')
  if (period.from) {
    query = query.gte('aangemaakt', period.from)
  }
  const { data, error } = await query
  if (error) {
    console.error('[categorieVerdeling] failed:', error)
    return []
  }
  type Row = { hoofdcategorie: string | null }
  const counts = new Map<string, number>()
  for (const row of (data as Row[] | null) ?? []) {
    const key = row.hoofdcategorie ?? 'Onbekend'
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([categorie, count]) => ({ categorie, count }))
    .sort((a, b) => b.count - a.count)
}

/**
 * Leads per dag voor de laatste 30 dagen, ASC op datum.
 * Lege dagen krijgen count 0 zodat de chart een continue x-as heeft.
 *
 * `now` is parameter voor testbaarheid; default = current time.
 */
export async function leadsPerDag(
  now: Date = new Date()
): Promise<Array<{ date: string; count: number }>> {
  const supabase = await getDashboardSupabase()
  // 30 dagen terug op 00:00 UTC
  const start = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - 29
  ))
  const startISO = start.toISOString().slice(0, 10)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: any = supabase
    .from('leads')
    .select('aangemaakt')
    .gte('aangemaakt', startISO)

  const { data, error } = await query
  if (error) {
    console.error('[leadsPerDag] failed:', error)
    return []
  }

  type Row = { aangemaakt: string }
  const counts = new Map<string, number>()
  for (const row of (data as Row[] | null) ?? []) {
    const day = row.aangemaakt.slice(0, 10)  // YYYY-MM-DD uit ISO
    counts.set(day, (counts.get(day) ?? 0) + 1)
  }

  // Vul 30 dagen continu in
  const out: Array<{ date: string; count: number }> = []
  for (let i = 0; i < 30; i++) {
    const d = new Date(Date.UTC(
      start.getUTCFullYear(),
      start.getUTCMonth(),
      start.getUTCDate() + i
    ))
    const key = d.toISOString().slice(0, 10)
    out.push({ date: key, count: counts.get(key) ?? 0 })
  }
  return out
}

/**
 * Top-N tags qua frequentie, gefilterd op leads in de periode.
 * Join via lead_tags → tags + leads.aangemaakt.
 */
export async function topTags(
  period: StatsPeriod,
  limit: number = 10
): Promise<Array<{ naam: string; count: number }>> {
  const supabase = await getDashboardSupabase()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from('lead_tags')
    .select('tags!inner(naam), leads!inner(aangemaakt)')
  if (period.from) {
    query = query.gte('leads.aangemaakt', period.from)
  }
  const { data, error } = await query
  if (error) {
    console.error('[topTags] failed:', error)
    return []
  }
  type Row = { tags: { naam: string }; leads: { aangemaakt: string } }
  const counts = new Map<string, number>()
  for (const row of (data as Row[] | null) ?? []) {
    const naam = row.tags?.naam
    if (!naam) continue
    counts.set(naam, (counts.get(naam) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([naam, count]) => ({ naam, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}
```

- [ ] **Step 4: Run tests, verwacht groen**

```bash
npm run test -- lib/dashboard/stats-queries.test.ts
```

- [ ] **Step 5: Type-check + suite**

```bash
npx tsc --noEmit && npm run test
```

- [ ] **Step 6: Commit**

```bash
git add lib/dashboard/stats-queries.ts lib/dashboard/stats-queries.test.ts
git commit -m "feat(dashboard): add stats-queries part 2 (distributions + trend + tags)"
```

---

### Task 4: PeriodSelector component (client)

**Files:**
- Create: `components/dashboard/stats/PeriodSelector.tsx`
- Create: `components/dashboard/stats/PeriodSelector.module.css`

- [ ] **Step 1: PeriodSelector.tsx**

```tsx
'use client'

import { useTransition } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import type { PeriodKey } from '@/lib/dashboard/period'
import styles from './PeriodSelector.module.css'

const OPTIONS: ReadonlyArray<{ value: PeriodKey; label: string }> = [
  { value: 'deze-week', label: 'Deze week' },
  { value: 'deze-maand', label: 'Deze maand' },
  { value: 'dit-kwartaal', label: 'Dit kwartaal' },
  { value: 'dit-jaar', label: 'Dit jaar' },
  { value: 'all-time', label: 'All-time' },
]

export function PeriodSelector({ value }: { value: PeriodKey }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as PeriodKey
    const params = new URLSearchParams(searchParams.toString())
    if (next === 'deze-maand') params.delete('period')
    else params.set('period', next)
    const qs = params.toString()
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    })
  }

  return (
    <label className={styles.wrap}>
      <span className={styles.label}>Periode</span>
      <select
        className={styles.select}
        value={value}
        onChange={onChange}
        aria-label="Tijdvenster voor statistieken"
      >
        {OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  )
}
```

- [ ] **Step 2: PeriodSelector.module.css**

```css
.wrap {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.label {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.select {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
  font: inherit;
  font-size: var(--text-sm);
  color: var(--color-text);
  cursor: pointer;
}

.select:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: -1px;
}
```

- [ ] **Step 3: Type-check + commit**

```bash
npx tsc --noEmit
git add components/dashboard/stats/PeriodSelector.tsx components/dashboard/stats/PeriodSelector.module.css
git commit -m "feat(dashboard): add PeriodSelector for statistieken page"
```

---

### Task 5: KpiCard + DistributionBars + TopTagsList components

**Files:**
- Create: `components/dashboard/stats/KpiCard.tsx`
- Create: `components/dashboard/stats/KpiCard.module.css`
- Create: `components/dashboard/stats/DistributionBars.tsx`
- Create: `components/dashboard/stats/DistributionBars.module.css`
- Create: `components/dashboard/stats/TopTagsList.tsx`
- Create: `components/dashboard/stats/TopTagsList.module.css`

- [ ] **Step 1: KpiCard.tsx**

```tsx
import styles from './KpiCard.module.css'

export function KpiCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className={styles.card}>
      <div className={styles.label}>{label}</div>
      <div className={styles.value}>{value}</div>
      {hint && <div className={styles.hint}>{hint}</div>}
    </div>
  )
}
```

- [ ] **Step 2: KpiCard.module.css**

```css
.card {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-4);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.label {
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.value {
  font-size: var(--text-3xl);
  font-weight: 700;
  color: var(--color-text);
  line-height: 1.1;
}

.hint {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}
```

- [ ] **Step 3: DistributionBars.tsx**

```tsx
import styles from './DistributionBars.module.css'

export function DistributionBars({
  title,
  rows,
}: {
  title: string
  rows: Array<{ label: string; count: number }>
}) {
  if (rows.length === 0) {
    return (
      <div className={styles.section}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.empty}>Geen data in deze periode.</p>
      </div>
    )
  }
  const total = rows.reduce((a, b) => a + b.count, 0)
  return (
    <div className={styles.section}>
      <h3 className={styles.title}>{title}</h3>
      <ul className={styles.list}>
        {rows.map((row) => {
          const pct = total > 0 ? Math.round((row.count / total) * 100) : 0
          return (
            <li key={row.label} className={styles.row}>
              <div className={styles.rowHeader}>
                <span className={styles.rowLabel}>{row.label}</span>
                <span className={styles.rowMeta}>
                  {row.count} ({pct}%)
                </span>
              </div>
              <div className={styles.barTrack}>
                <div
                  className={styles.barFill}
                  style={{ width: `${pct}%` }}
                  aria-hidden="true"
                />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
```

- [ ] **Step 4: DistributionBars.module.css**

```css
.section {
  padding: var(--space-4);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.title {
  margin: 0 0 var(--space-3);
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--color-text);
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.row {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.rowHeader {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: var(--text-sm);
}

.rowLabel {
  color: var(--color-text);
  font-weight: 500;
}

.rowMeta {
  color: var(--color-text-muted);
  font-size: var(--text-xs);
}

.barTrack {
  height: 6px;
  background: var(--color-surface-2);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.barFill {
  height: 100%;
  background: var(--color-gradient);
  border-radius: var(--radius-full);
  transition: width 0.2s;
}

.empty {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  font-style: italic;
}
```

- [ ] **Step 5: TopTagsList.tsx**

```tsx
import styles from './TopTagsList.module.css'

export function TopTagsList({
  rows,
}: {
  rows: Array<{ naam: string; count: number }>
}) {
  if (rows.length === 0) {
    return (
      <div className={styles.section}>
        <h3 className={styles.title}>Top tags</h3>
        <p className={styles.empty}>Nog geen tags toegekend.</p>
      </div>
    )
  }
  return (
    <div className={styles.section}>
      <h3 className={styles.title}>Top tags</h3>
      <ul className={styles.list}>
        {rows.map((row) => (
          <li key={row.naam} className={styles.row}>
            <span className={styles.naam}>{row.naam}</span>
            <span className={styles.count}>{row.count}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 6: TopTagsList.module.css**

```css
.section {
  padding: var(--space-4);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.title {
  margin: 0 0 var(--space-3);
  font-size: var(--text-base);
  font-weight: 600;
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.row {
  display: flex;
  justify-content: space-between;
  font-size: var(--text-sm);
}

.naam {
  color: var(--color-text);
}

.count {
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}

.empty {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  font-style: italic;
}
```

- [ ] **Step 7: Type-check + commit**

```bash
npx tsc --noEmit
git add components/dashboard/stats/KpiCard.tsx components/dashboard/stats/KpiCard.module.css components/dashboard/stats/DistributionBars.tsx components/dashboard/stats/DistributionBars.module.css components/dashboard/stats/TopTagsList.tsx components/dashboard/stats/TopTagsList.module.css
git commit -m "feat(dashboard): add KpiCard + DistributionBars + TopTagsList stat components"
```

---

### Task 6: TrendLineChart (inline SVG)

**Files:**
- Create: `components/dashboard/stats/TrendLineChart.tsx`
- Create: `components/dashboard/stats/TrendLineChart.module.css`

- [ ] **Step 1: TrendLineChart.tsx**

```tsx
import styles from './TrendLineChart.module.css'

const VIEW_W = 320
const VIEW_H = 100
const PAD_X = 4
const PAD_Y = 8

export function TrendLineChart({
  title,
  points,
}: {
  title: string
  points: Array<{ date: string; count: number }>
}) {
  if (points.length < 2) {
    return (
      <div className={styles.section}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.empty}>Te weinig data voor trend.</p>
      </div>
    )
  }

  const max = Math.max(...points.map((p) => p.count), 1)
  const stepX = (VIEW_W - PAD_X * 2) / (points.length - 1)

  // Bouw "M x,y L x,y L x,y …" path
  const d = points
    .map((p, i) => {
      const x = PAD_X + i * stepX
      const y = VIEW_H - PAD_Y - (p.count / max) * (VIEW_H - PAD_Y * 2)
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  // Highlight de laatste dag (vandaag) met een dot
  const last = points[points.length - 1]
  const lastX = PAD_X + (points.length - 1) * stepX
  const lastY = VIEW_H - PAD_Y - (last.count / max) * (VIEW_H - PAD_Y * 2)

  const total = points.reduce((a, b) => a + b.count, 0)

  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
        <span className={styles.totalLabel}>{total} totaal</span>
      </div>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Trend: ${total} leads over laatste ${points.length} dagen`}
      >
        <path d={d} className={styles.line} fill="none" />
        <circle
          cx={lastX}
          cy={lastY}
          r="3"
          className={styles.dot}
        />
      </svg>
      <div className={styles.axis}>
        <span>{points[0].date}</span>
        <span>{last.date}</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TrendLineChart.module.css**

```css
.section {
  padding: var(--space-4);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: var(--space-3);
}

.title {
  margin: 0;
  font-size: var(--text-base);
  font-weight: 600;
}

.totalLabel {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.svg {
  display: block;
  width: 100%;
  height: 120px;
}

.line {
  stroke: var(--color-primary);
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
}

.dot {
  fill: var(--color-primary);
}

.axis {
  display: flex;
  justify-content: space-between;
  margin-top: var(--space-2);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.empty {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  font-style: italic;
}
```

- [ ] **Step 3: Type-check + commit**

```bash
npx tsc --noEmit
git add components/dashboard/stats/TrendLineChart.tsx components/dashboard/stats/TrendLineChart.module.css
git commit -m "feat(dashboard): add TrendLineChart (inline SVG, no chart-lib)"
```

---

### Task 7: Wire into /statistieken page

**Files:**
- Modify: `app/dashboard/(app)/statistieken/page.tsx`
- Create: `app/dashboard/(app)/statistieken/page.module.css`

Read the current `app/dashboard/(app)/statistieken/page.tsx` first om te zien wat de placeholder bevat.

- [ ] **Step 1: Replace page.tsx**

```tsx
import { Suspense } from 'react'
import { parsePeriod, periodToRange, periodLabel } from '@/lib/dashboard/period'
import {
  countLeads,
  countConverted,
  avgOfferteWaarde,
  avgReactietijdMs,
  statusVerdeling,
  categorieVerdeling,
  leadsPerDag,
  topTags,
} from '@/lib/dashboard/stats-queries'
import { dashboardStatusLabel } from '@/lib/dashboard/format'
import { PeriodSelector } from '@/components/dashboard/stats/PeriodSelector'
import { KpiCard } from '@/components/dashboard/stats/KpiCard'
import { DistributionBars } from '@/components/dashboard/stats/DistributionBars'
import { TrendLineChart } from '@/components/dashboard/stats/TrendLineChart'
import { TopTagsList } from '@/components/dashboard/stats/TopTagsList'
import styles from './page.module.css'

function formatEuro(n: number): string {
  return `€ ${n.toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function formatDuration(ms: number): string {
  const totalMin = Math.round(ms / 60000)
  const hours = Math.floor(totalMin / 60)
  const minutes = totalMin % 60
  if (hours === 0) return `${minutes}m`
  if (minutes === 0) return `${hours}u`
  return `${hours}u ${minutes}m`
}

export default async function StatistiekenPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>
}) {
  const sp = await searchParams
  const periodKey = parsePeriod(sp)
  const range = periodToRange(periodKey)

  const [
    total,
    converted,
    avgOfferte,
    avgReactie,
    statusRows,
    categorieRows,
    perDag,
    tagRows,
  ] = await Promise.all([
    countLeads(range),
    countConverted(range),
    avgOfferteWaarde(range),
    avgReactietijdMs(range),
    statusVerdeling(range),
    categorieVerdeling(range),
    leadsPerDag(),
    topTags(range, 10),
  ])

  const conversiePct = total > 0 ? Math.round((converted / total) * 100) : 0

  return (
    <div>
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
            label: dashboardStatusLabel(r.status as never),
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
  )
}
```

NOTE: `dashboardStatusLabel` accepteert `DashboardStatus | null`. We casten naar `never` om de typing te bypassen — pragmatic, matches het bestaande patroon. Als de implementer een nettere oplossing weet (bv. typeguard), prima.

- [ ] **Step 2: page.module.css**

```css
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-6);
  gap: var(--space-4);
}

.subtitle {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.kpiGrid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-3);
  margin-bottom: var(--space-6);
}

.twoCol {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
  margin-bottom: var(--space-6);
}

@media (max-width: 1024px) {
  .kpiGrid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .kpiGrid {
    grid-template-columns: 1fr;
  }
  .twoCol {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 3: Type-check + build**

```bash
npx tsc --noEmit && npm run build 2>&1 | tail -30
```

Expected: schone build, route `/dashboard/statistieken` listed.

- [ ] **Step 4: Commit**

```bash
git add "app/dashboard/(app)/statistieken/page.tsx" "app/dashboard/(app)/statistieken/page.module.css"
git commit -m "feat(dashboard): wire statistieken page (8 metrics + period selector)"
```

---

### Task 8: Build + smoke test (USER manual)

- [ ] **Step 1: Final test suite**

```bash
cd "/Users/christiaantromp/Desktop/Frontlix website new"
npm run test
```

Expected: alle tests groen (96 baseline + ~25 nieuwe ≈ 121).

- [ ] **Step 2: Build**

```bash
npm run build
```

Expected: schone build.

- [ ] **Step 3: Start dev-server**

```bash
npm run dev
```

- [ ] **Step 4: Browser smoke test**

Op `http://app.localhost:3000/statistieken`:

1. Pagina laadt met "Deze maand" als default periode
2. 4 KPI-cards bovenaan met getallen of `—`
3. Twee bar-charts (status + categorie) met gevulde balken
4. Trend-chart toont een line over 30 dagen + dot op vandaag
5. Top-tags lijst toont gerangschikte tag-namen + counts
6. Klik **Periode** dropdown → kies "Deze week" → URL wordt `?period=deze-week`, alle metrics herrekenen
7. F5 → URL behouden, page consistent
8. Test edge cases: kies "All-time" → grotere getallen verwacht; kies "Deze week" → kleinere getallen
9. Mobile-view: KPI-cards stacken naar 1 kolom onder 640px

- [ ] **Step 5: Smoke check de bot**

`pm2 logs` op de schoon-straatje VPS — geen nieuwe errors verwacht (Plan 7 is alleen reads).

- [ ] **Step 6: Push naar GitHub**

```bash
git push origin main
```

---

## Summary checklist

Aan het einde van Plan 7:

- [ ] `lib/dashboard/period.ts` + tests groen
- [ ] `lib/dashboard/stats-queries.ts` met 8 functies + tests groen
- [ ] `PeriodSelector` (client) werkt met URL-state
- [ ] `KpiCard`, `DistributionBars`, `TopTagsList` (server)
- [ ] `TrendLineChart` (inline SVG, geen lib)
- [ ] `/statistieken` page wired alle 8 metrics
- [ ] `npm run build` slaagt
- [ ] End-to-end smoke test groen
- [ ] Push naar GitHub

Plan 8 (agenda calendar-grid) staat klaar om gestart te worden.
