# Plan 6 — Leads-flow usability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Maakt de bestaande leads-flow snel en live: activity-timeline als 2e tab op de detail-pagina, filterbare/zoekbare leads-lijst met URL-state, realtime updates op detail-pagina.

**Architecture:** Drie features los van elkaar geïmplementeerd. Server-side `getLeadsList` wordt filter-aware (DB-side filtering via `.ilike()` / `.eq()` / `.gte()` / `.lte()` / `.in()`). Activity-timeline hergebruikt bestaande `aggregateActivityTimeline()` uit Plan 4. Realtime via Supabase Realtime + Next.js `router.refresh()` — geen client-side state-sync, server blijft de waarheid.

**Tech Stack:** Next.js 15 App Router, `@supabase/ssr` (browser-client + server-client), CSS Modules, Vitest. Geen nieuwe packages.

**Working directory:** `/Users/christiaantromp/Desktop/Frontlix website new/`

**Schoon-straatje bot wordt niet aangeraakt.** Geen schema-migraties. Eenmalige Supabase Studio-stap: Realtime aanzetten voor `berichten` en `fotos` tabellen — dit is Task 11 (handmatig door de gebruiker).

---

## File Structure

**Nieuw:**
```
lib/dashboard/
├── lead-filters.ts                              — type LeadsFilters + parse/serialize/count helpers
├── lead-filters.test.ts
└── supabase-browser.ts                          — browser-side Supabase client (cookie-session, anon-key)

components/dashboard/leads/
├── LeadActivityTimeline.tsx + .module.css       — verticale tijdlijn-renderer
├── LeadDetailTabs.tsx + .module.css             — tab-switcher Gesprek/Activiteit
├── LeadsFilterBar.tsx + .module.css             — search input + Filters-knop + chips
├── LeadsFilterPanel.tsx + .module.css           — uitklap-paneel met de 4 filter-controls
├── LiveIndicator.tsx + .module.css              — 🟢/⚪ realtime status
└── LeadDetailRealtime.tsx                       — client-component met Realtime subscription
```

**Gewijzigd:**
```
lib/dashboard/lead-queries.ts                    — getLeadsList(filters?) + countAllLeads()
lib/dashboard/lead-queries.test.ts               — uitgebreide tests (refactor mock-builder + filter-cases)
app/dashboard/(app)/leads/page.tsx               — leest searchParams, parst filters, render filter bar
app/dashboard/(app)/leads/page.module.css        — kleine layout-aanpassing
app/dashboard/(app)/leads/[lead_id]/page.tsx     — middenkolom in tabs, Realtime mounten, indicator in linkerkolom
app/api/dashboard/export/leads-csv/route.ts      — accepteert filter-params zodat CSV de gefilterde lijst exporteert
components/dashboard/leads/ExportLeadsButton.tsx — wordt client-component, picks URL-params op
```

---

## Approach principles

- **DB-side filteren, niet client-side.** `getLeadsList(filters)` voegt clauses toe aan de Supabase query. Beperking: tags-AND vereist een 2-staps query (eerst lead_tags scannen, dan leads filteren met `.in('lead_id', ...)`).
- **URL als single source of truth voor filters + tab-state.** Geen `useState` om filterstate vast te houden; alles leeft in de URL. Voordeel: bookmarkbaar, deelbaar, refresh-bestendig. Form-state in het uitklap-paneel is wel lokaal (draft) tot "Toepassen".
- **`router.refresh()` voor realtime.** Geen client-state mutaties — bot pusht via Supabase Realtime, browser ontvangt event, Next fetcht server data opnieuw. Simpel en robust.
- **TDD voor parse/serialize en `getLeadsList(filters)`.** UI-components testen we via end-to-end smoke (zelfde patroon als Plan 5).
- **YAGNI:** geen filter-presets, geen save-as-favorite, geen activity-timeline-filters, geen live-list-updates op `/leads`. Komen later als users erom vragen.
- **Frequent commits**: één commit per task.

---

### Task 1: lead-filters helpers (TDD)

**Files:**
- Create: `lib/dashboard/lead-filters.ts`
- Create: `lib/dashboard/lead-filters.test.ts`

- [ ] **Step 1: Schrijf failing tests**

Bestand `lib/dashboard/lead-filters.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import {
  parseLeadsFilters,
  serializeLeadsFilters,
  countActiveFilters,
  hasActiveFilters,
  normalizePhone,
} from './lead-filters'

describe('parseLeadsFilters', () => {
  it('returnt lege filters voor lege params', () => {
    expect(parseLeadsFilters({})).toEqual({})
  })

  it('parseert alle filters uit volledige params', () => {
    expect(
      parseLeadsFilters({
        q: 'jan',
        status: 'opgevolgd',
        tags: 'hot,vip',
        dateField: 'aangemaakt',
        from: '2026-04-01',
        to: '2026-04-30',
        fase: 'onderhandelen',
      })
    ).toEqual({
      q: 'jan',
      status: 'opgevolgd',
      tags: ['hot', 'vip'],
      dateField: 'aangemaakt',
      from: '2026-04-01',
      to: '2026-04-30',
      fase: 'onderhandelen',
    })
  })

  it('negeert ongeldige status', () => {
    expect(parseLeadsFilters({ status: 'gibberish' })).toEqual({})
  })

  it('negeert ongeldige fase', () => {
    expect(parseLeadsFilters({ fase: 'something_else' })).toEqual({})
  })

  it('negeert ongeldig datum-formaat', () => {
    expect(parseLeadsFilters({ from: 'not-a-date', to: '2026/04/01' })).toEqual({})
  })

  it('negeert ongeldige dateField waarde', () => {
    expect(parseLeadsFilters({ dateField: 'gibberish' })).toEqual({})
  })

  it('negeert lege tags string', () => {
    expect(parseLeadsFilters({ tags: '' })).toEqual({})
  })

  it('strip whitespace en lege segmenten in tags', () => {
    expect(parseLeadsFilters({ tags: ' hot ,, vip ' })).toEqual({ tags: ['hot', 'vip'] })
  })

  it('trimt q whitespace', () => {
    expect(parseLeadsFilters({ q: '  jan  ' })).toEqual({ q: 'jan' })
  })

  it('werkt met URLSearchParams als input', () => {
    const sp = new URLSearchParams('q=piet&status=open')
    expect(parseLeadsFilters(sp)).toEqual({ q: 'piet', status: 'open' })
  })
})

describe('serializeLeadsFilters', () => {
  it('returnt lege string voor lege filters', () => {
    expect(serializeLeadsFilters({})).toBe('')
  })

  it('serialiseert volledige filters', () => {
    const qs = serializeLeadsFilters({
      q: 'jan',
      status: 'opgevolgd',
      tags: ['hot', 'vip'],
      dateField: 'aangemaakt',
      from: '2026-04-01',
      to: '2026-04-30',
      fase: 'onderhandelen',
    })
    // URLSearchParams encodeert ',' als '%2C'
    expect(qs).toContain('q=jan')
    expect(qs).toContain('status=opgevolgd')
    expect(qs).toContain('tags=hot%2Cvip')
    expect(qs).toContain('dateField=aangemaakt')
    expect(qs).toContain('from=2026-04-01')
    expect(qs).toContain('to=2026-04-30')
    expect(qs).toContain('fase=onderhandelen')
  })

  it('skipt undefined velden', () => {
    expect(serializeLeadsFilters({ q: 'jan' })).toBe('q=jan')
  })

  it('skipt lege tags array', () => {
    expect(serializeLeadsFilters({ tags: [] })).toBe('')
  })
})

describe('countActiveFilters', () => {
  it('returnt 0 voor lege filters', () => {
    expect(countActiveFilters({})).toBe(0)
  })

  it('telt elke filter individueel', () => {
    expect(
      countActiveFilters({
        q: 'jan',
        status: 'opgevolgd',
        tags: ['hot'],
        from: '2026-04-01',
        fase: 'onderhandelen',
      })
    ).toBe(5)
  })

  it('telt from+to als 1 datum-filter', () => {
    expect(countActiveFilters({ from: '2026-04-01', to: '2026-04-30' })).toBe(1)
  })

  it('telt alleen-from of alleen-to ook als 1', () => {
    expect(countActiveFilters({ from: '2026-04-01' })).toBe(1)
    expect(countActiveFilters({ to: '2026-04-30' })).toBe(1)
  })

  it('telt lege tags array niet', () => {
    expect(countActiveFilters({ tags: [] })).toBe(0)
  })
})

describe('hasActiveFilters', () => {
  it('false voor leeg', () => {
    expect(hasActiveFilters({})).toBe(false)
  })
  it('true zodra 1 filter actief is', () => {
    expect(hasActiveFilters({ q: 'jan' })).toBe(true)
  })
})

describe('normalizePhone', () => {
  it('strip spaties, plus, dashes en haakjes', () => {
    expect(normalizePhone('+31 (0) 6-12-34 56 78')).toBe('310612345678')
  })
  it('laat alfanumeriek met rust', () => {
    expect(normalizePhone('0612345678')).toBe('0612345678')
  })
})
```

- [ ] **Step 2: Run tests, verwacht failures**

```bash
npm run test -- lib/dashboard/lead-filters.test.ts
```

Verwacht: import-error (module bestaat niet).

- [ ] **Step 3: Implementeer lead-filters.ts**

Bestand `lib/dashboard/lead-filters.ts`:

```typescript
import type { DashboardStatus, GesprekFase } from './database.types'

export type DateField = 'aangemaakt' | 'bijgewerkt'

export interface LeadsFilters {
  q?: string
  status?: DashboardStatus
  tags?: string[]
  dateField?: DateField
  from?: string
  to?: string
  fase?: GesprekFase
}

const VALID_STATUSES: ReadonlySet<DashboardStatus> = new Set([
  'open',
  'opgevolgd',
  'afgehandeld',
  'no_show',
  'geen_interesse',
  'archief',
])

const VALID_FASES: ReadonlySet<GesprekFase> = new Set([
  'info_verzamelen',
  'offerte_besproken',
  'onderhandelen',
  'datum_kiezen',
  'afspraak_bevestigd',
])

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

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
 * Parsest URL-search-params naar een typed LeadsFilters object.
 * Ongeldige waarden worden stilletjes genegeerd zodat een rare URL
 * de page niet crasht — wel logging zou hier later kunnen.
 */
export function parseLeadsFilters(source: ParamSource): LeadsFilters {
  const out: LeadsFilters = {}

  const q = getParam(source, 'q')?.trim()
  if (q) out.q = q

  const status = getParam(source, 'status')
  if (status && VALID_STATUSES.has(status as DashboardStatus)) {
    out.status = status as DashboardStatus
  }

  const tags = getParam(source, 'tags')
  if (tags) {
    const list = tags
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (list.length > 0) out.tags = list
  }

  const dateField = getParam(source, 'dateField')
  if (dateField === 'aangemaakt' || dateField === 'bijgewerkt') {
    out.dateField = dateField
  }

  const from = getParam(source, 'from')
  if (from && ISO_DATE.test(from)) out.from = from

  const to = getParam(source, 'to')
  if (to && ISO_DATE.test(to)) out.to = to

  const fase = getParam(source, 'fase')
  if (fase && VALID_FASES.has(fase as GesprekFase)) {
    out.fase = fase as GesprekFase
  }

  return out
}

/**
 * Serialiseert filters naar een query-string (zonder leading `?`).
 * Lege/ongedefinieerde velden worden weggelaten zodat de URL schoon blijft.
 */
export function serializeLeadsFilters(filters: LeadsFilters): string {
  const params = new URLSearchParams()
  if (filters.q) params.set('q', filters.q)
  if (filters.status) params.set('status', filters.status)
  if (filters.tags && filters.tags.length > 0) {
    params.set('tags', filters.tags.join(','))
  }
  if (filters.dateField) params.set('dateField', filters.dateField)
  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
  if (filters.fase) params.set('fase', filters.fase)
  return params.toString()
}

/**
 * Aantal actieve filter-categorieën (voor de "Filters (3)" badge).
 * Datum-filter (from + to) telt als 1, ook als slechts 1 van de 2 gevuld is.
 */
export function countActiveFilters(filters: LeadsFilters): number {
  let n = 0
  if (filters.q) n++
  if (filters.status) n++
  if (filters.tags && filters.tags.length > 0) n++
  if (filters.from || filters.to) n++
  if (filters.fase) n++
  return n
}

export function hasActiveFilters(filters: LeadsFilters): boolean {
  return countActiveFilters(filters) > 0
}

/**
 * Strip non-numerieke karakters uit een telefoonnummer voor zoek-matching.
 * "06 12 34 56 78" en "+31 (0)6-12345678" worden beide "0612345678" of "310612345678"
 * — partial-match daarop (substring) maakt beide vindbaar.
 */
export function normalizePhone(value: string): string {
  return value.replace(/[\s+\-()]/g, '')
}
```

- [ ] **Step 4: Run tests, verwacht groen**

```bash
npm run test -- lib/dashboard/lead-filters.test.ts
```

Verwacht: alle tests groen (~20 cases).

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add lib/dashboard/lead-filters.ts lib/dashboard/lead-filters.test.ts
git commit -m "feat(dashboard): add lead-filters helpers (parse + serialize + count)"
```

---

### Task 2: getLeadsList(filters) + countAllLeads (TDD update)

**Files:**
- Modify: `lib/dashboard/lead-queries.ts`
- Modify: `lib/dashboard/lead-queries.test.ts`

We refactoren de mock-chain in de bestaande test naar een builder-patroon zodat hij flexibel is voor extra filter-methods (`or`, `gte`, `lte`, `in`). Daarna voegen we filter-tests toe en breiden `getLeadsList` uit.

- [ ] **Step 1: Refactor mock + voeg filter-tests toe**

Vervang de **bovenkant** van `lib/dashboard/lead-queries.test.ts` (van regel 1 t/m de eerste `describe('getLeadsList', ...)` close-brace) door:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { builder, mockFrom } = vi.hoisted(() => {
  // Builder waarvan elke chainable method `self` retourneert,
  // zodat elke combinatie van filters werkt (ilike/or/eq/gte/lte/in/order)
  // en de terminale `limit()` een Promise teruggeeft.
  type Builder = {
    select: ReturnType<typeof vi.fn>
    eq: ReturnType<typeof vi.fn>
    or: ReturnType<typeof vi.fn>
    gte: ReturnType<typeof vi.fn>
    lte: ReturnType<typeof vi.fn>
    in: ReturnType<typeof vi.fn>
    order: ReturnType<typeof vi.fn>
    limit: ReturnType<typeof vi.fn>
  }
  const builder = {} as Builder
  builder.select = vi.fn(() => builder)
  builder.eq = vi.fn(() => builder)
  builder.or = vi.fn(() => builder)
  builder.gte = vi.fn(() => builder)
  builder.lte = vi.fn(() => builder)
  builder.in = vi.fn(() => builder)
  builder.order = vi.fn(() => builder)
  builder.limit = vi.fn(() => Promise.resolve({ data: [], error: null }))

  // Voor multi-table mocks (lead_tags subquery) gebruiken we een handler-map
  // die per table een eigen builder kan teruggeven — getest in tags-cases.
  const mockFrom = vi.fn(() => builder)
  return { builder, mockFrom }
})

vi.mock('./supabase-server', () => ({
  getDashboardSupabase: async () => ({ from: mockFrom }),
}))

import { getLeadsList, countAllLeads } from './lead-queries'

describe('getLeadsList — geen filters', () => {
  beforeEach(() => {
    builder.select.mockClear()
    builder.eq.mockClear()
    builder.or.mockClear()
    builder.gte.mockClear()
    builder.lte.mockClear()
    builder.in.mockClear()
    builder.order.mockClear()
    builder.limit.mockClear()
    builder.limit.mockResolvedValue({ data: [], error: null })
    mockFrom.mockClear()
    mockFrom.mockReturnValue(builder)
  })

  it('queryt leads gesorteerd op aangemaakt DESC, niet-gearchiveerd, max 100', async () => {
    builder.limit.mockResolvedValue({
      data: [{ lead_id: 'L1', naam: 'Jan' }, { lead_id: 'L2', naam: 'Piet' }],
      error: null,
    })

    const result = await getLeadsList()

    expect(mockFrom).toHaveBeenCalledWith('leads')
    expect(builder.eq).toHaveBeenCalledWith('dashboard_archived', false)
    expect(builder.order).toHaveBeenCalledWith('aangemaakt', { ascending: false })
    expect(builder.limit).toHaveBeenCalledWith(100)
    expect(result).toEqual([
      { lead_id: 'L1', naam: 'Jan' },
      { lead_id: 'L2', naam: 'Piet' },
    ])
  })

  it('returnt lege array bij Supabase-error (geen exception)', async () => {
    builder.limit.mockResolvedValue({ data: null, error: { message: 'oops' } })
    expect(await getLeadsList()).toEqual([])
  })

  it('returnt lege array als data null is', async () => {
    builder.limit.mockResolvedValue({ data: null, error: null })
    expect(await getLeadsList()).toEqual([])
  })
})

describe('getLeadsList — met filters', () => {
  beforeEach(() => {
    builder.select.mockClear()
    builder.eq.mockClear()
    builder.or.mockClear()
    builder.gte.mockClear()
    builder.lte.mockClear()
    builder.in.mockClear()
    builder.order.mockClear()
    builder.limit.mockClear()
    builder.limit.mockResolvedValue({ data: [], error: null })
    mockFrom.mockClear()
    mockFrom.mockReturnValue(builder)
  })

  it('met status: voegt eq(dashboard_status, value) toe', async () => {
    await getLeadsList({ status: 'opgevolgd' })
    expect(builder.eq).toHaveBeenCalledWith('dashboard_status', 'opgevolgd')
  })

  it('met fase: voegt eq(gesprek_fase, value) toe', async () => {
    await getLeadsList({ fase: 'onderhandelen' })
    expect(builder.eq).toHaveBeenCalledWith('gesprek_fase', 'onderhandelen')
  })

  it('met q: voegt or-clause op naam+telefoon toe', async () => {
    await getLeadsList({ q: 'jan' })
    expect(builder.or).toHaveBeenCalledTimes(1)
    const arg = builder.or.mock.calls[0][0] as string
    expect(arg).toContain('naam.ilike.%jan%')
    expect(arg).toContain('telefoon.ilike.')
  })

  it('met datum aangemaakt + from + to: voegt gte+lte toe op aangemaakt', async () => {
    await getLeadsList({ dateField: 'aangemaakt', from: '2026-04-01', to: '2026-04-30' })
    expect(builder.gte).toHaveBeenCalledWith('aangemaakt', '2026-04-01')
    expect(builder.lte).toHaveBeenCalledWith('aangemaakt', '2026-04-30T23:59:59.999Z')
  })

  it('met datum bijgewerkt: filtert op de bijgewerkt-kolom', async () => {
    await getLeadsList({ dateField: 'bijgewerkt', from: '2026-04-01' })
    expect(builder.gte).toHaveBeenCalledWith('bijgewerkt', '2026-04-01')
    expect(builder.lte).not.toHaveBeenCalled()
  })

  it('met tags: doet pre-fetch op lead_tags + filter via in(lead_id, ...)', async () => {
    // Tweede tabel-aanroep voor lead_tags subquery
    const tagsBuilder: any = {
      select: vi.fn(() => tagsBuilder),
      in: vi.fn(() =>
        Promise.resolve({
          data: [
            { lead_id: 'L1', tag_id: 'T1' },
            { lead_id: 'L1', tag_id: 'T2' },
            { lead_id: 'L2', tag_id: 'T1' },
          ],
          error: null,
        })
      ),
    }
    mockFrom.mockImplementation((table: string) => {
      if (table === 'lead_tags') return tagsBuilder
      return builder
    })

    await getLeadsList({ tags: ['T1', 'T2'] })

    expect(mockFrom).toHaveBeenCalledWith('lead_tags')
    expect(tagsBuilder.in).toHaveBeenCalledWith('tag_id', ['T1', 'T2'])
    // Alleen L1 heeft beide tags → in(lead_id, ['L1'])
    expect(builder.in).toHaveBeenCalledWith('lead_id', ['L1'])
  })

  it('met tags die geen lead matcht: returnt lege array zonder leads-query', async () => {
    const tagsBuilder: any = {
      select: vi.fn(() => tagsBuilder),
      in: vi.fn(() => Promise.resolve({ data: [], error: null })),
    }
    mockFrom.mockImplementation((table: string) => {
      if (table === 'lead_tags') return tagsBuilder
      return builder
    })

    const result = await getLeadsList({ tags: ['T1'] })
    expect(result).toEqual([])
    // builder.select / order zijn niet aangeroepen voor 'leads' want we
    // shortcutten zodra er geen matchende lead-ids zijn
    expect(builder.select).not.toHaveBeenCalled()
  })
})

describe('countAllLeads', () => {
  it('returnt totaal aantal niet-gearchiveerde leads', async () => {
    const countBuilder: any = {
      select: vi.fn(() => countBuilder),
      eq: vi.fn(() => Promise.resolve({ count: 42, error: null })),
    }
    mockFrom.mockReturnValue(countBuilder)

    expect(await countAllLeads()).toBe(42)
    expect(countBuilder.select).toHaveBeenCalledWith('*', { count: 'exact', head: true })
    expect(countBuilder.eq).toHaveBeenCalledWith('dashboard_archived', false)
  })

  it('returnt 0 bij error', async () => {
    const countBuilder: any = {
      select: vi.fn(() => countBuilder),
      eq: vi.fn(() => Promise.resolve({ count: null, error: { message: 'oops' } })),
    }
    mockFrom.mockReturnValue(countBuilder)
    expect(await countAllLeads()).toBe(0)
  })
})
```

**Belangrijk:** de bestaande `getLeadDetail` en `aggregateActivityTimeline` describe-blocks (regels 59-214 in de huidige test-file) **blijven staan**. Laat ze ongewijzigd na de bovenstaande blocks.

- [ ] **Step 2: Run tests, verwacht failures**

```bash
npm run test -- lib/dashboard/lead-queries.test.ts
```

Verwacht: nieuwe filter-tests falen ("expected ... not called" of import-error voor `countAllLeads`).

- [ ] **Step 3: Update `lib/dashboard/lead-queries.ts` met filter-support + countAllLeads**

Voeg deze import bovenaan toe (samen met bestaande imports):

```typescript
import type { LeadsFilters } from './lead-filters'
import { normalizePhone } from './lead-filters'
```

Vervang de bestaande `getLeadsList`-functie (huidige implementatie van Plan 4 + Plan 5) door:

```typescript
/**
 * Haalt de leads-lijst voor `/leads`. Filtert standaard gearchiveerde
 * leads weg, sorteert op aangemaakt DESC, max 100 resultaten.
 *
 * Met `filters` kan de query verfijnd worden:
 * - q: substring-match op naam OR telefoon (genormaliseerd zonder spaties/+/-/parens)
 * - status / fase: enkele waarde
 * - tags: meerdere tag-ids; lead matcht als hij ALLE tags heeft (AND-semantic)
 * - dateField + from + to: range op aangemaakt of bijgewerkt
 *
 * Tags-AND vereist een 2-staps query: eerst de matchende lead-ids vinden,
 * dan filteren. Acceptabel binnen de .limit(100) hierboven.
 */
export async function getLeadsList(
  filters?: LeadsFilters
): Promise<LeadListItem[]> {
  const supabase = await getDashboardSupabase()

  // Tags pre-filter: vind lead-ids die ALLE opgegeven tags hebben.
  // Bij geen matches direct lege array — voorkomt onnodige leads-query.
  let tagFilteredIds: string[] | null = null
  if (filters?.tags && filters.tags.length > 0) {
    const { data: rows, error } = await supabase
      .from('lead_tags')
      .select('lead_id, tag_id')
      .in('tag_id', filters.tags)

    if (error) {
      console.error('[getLeadsList] tags pre-fetch failed:', error)
      return []
    }

    type Row = { lead_id: string; tag_id: string }
    const counts = new Map<string, number>()
    for (const row of (rows as unknown as Row[] | null) ?? []) {
      counts.set(row.lead_id, (counts.get(row.lead_id) ?? 0) + 1)
    }
    tagFilteredIds = [...counts.entries()]
      .filter(([, n]) => n === filters.tags!.length)
      .map(([leadId]) => leadId)

    if (tagFilteredIds.length === 0) return []
  }

  let query = supabase
    .from('leads')
    .select(LIST_COLUMNS)
    .eq('dashboard_archived', false)

  if (filters?.q) {
    // Substring-match op naam OR telefoon. Voor telefoon strippen we
    // niet-numerieke chars in de input zodat "06 12 34" matcht met "0612345678".
    const qNaam = filters.q
    const qTel = normalizePhone(filters.q)
    query = query.or(
      `naam.ilike.%${qNaam}%,telefoon.ilike.%${qTel}%`
    )
  }

  if (filters?.status) {
    query = query.eq('dashboard_status', filters.status)
  }

  if (filters?.fase) {
    query = query.eq('gesprek_fase', filters.fase)
  }

  if (filters?.from || filters?.to) {
    const col = filters?.dateField ?? 'aangemaakt'
    if (filters.from) query = query.gte(col, filters.from)
    if (filters.to) {
      // Inclusief de hele to-dag: tot 23:59:59.999 op die datum.
      const toEnd = `${filters.to}T23:59:59.999Z`
      query = query.lte(col, toEnd)
    }
  }

  if (tagFilteredIds !== null) {
    query = query.in('lead_id', tagFilteredIds)
  }

  query = query
    .order('aangemaakt', { ascending: false })
    .limit(100)

  const { data, error } = await query

  if (error) {
    console.error('[getLeadsList] query failed:', error)
    return []
  }
  return (data as unknown as LeadListItem[] | null) ?? []
}

/**
 * Telt het totaal aantal niet-gearchiveerde leads (zonder filters).
 * Gebruikt voor de "X gevonden van Y totaal"-tekst boven de tabel zodra
 * er een filter actief is.
 */
export async function countAllLeads(): Promise<number> {
  const supabase = await getDashboardSupabase()
  const { count, error } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('dashboard_archived', false)

  if (error) {
    console.error('[countAllLeads] query failed:', error)
    return 0
  }
  return count ?? 0
}
```

- [ ] **Step 4: Run tests, verwacht groen**

```bash
npm run test -- lib/dashboard/lead-queries.test.ts
```

Verwacht: alle filter-tests + countAllLeads-tests + bestaande getLeadDetail-tests groen.

- [ ] **Step 5: Volledige test-suite + type-check**

```bash
npx tsc --noEmit && npm run test
```

Expected: clean. Totaal nu ~75 tests.

- [ ] **Step 6: Commit**

```bash
git add lib/dashboard/lead-queries.ts lib/dashboard/lead-queries.test.ts
git commit -m "feat(dashboard): add filter support to getLeadsList + countAllLeads"
```

---

### Task 3: LeadActivityTimeline component

**Files:**
- Create: `components/dashboard/leads/LeadActivityTimeline.tsx`
- Create: `components/dashboard/leads/LeadActivityTimeline.module.css`

- [ ] **Step 1: LeadActivityTimeline.tsx**

Bestand `components/dashboard/leads/LeadActivityTimeline.tsx`:

```tsx
import {
  MessageSquare,
  MessageCircle,
  Image as ImageIcon,
  FileText,
  StickyNote,
  ArrowRightCircle,
  Check,
  Calendar,
  Plus,
} from 'lucide-react'
import type { ActivityEvent, ActivityType } from '@/lib/dashboard/lead-queries'
import { formatRelative } from '@/lib/dashboard/format'
import styles from './LeadActivityTimeline.module.css'

const TYPE_ICON: Record<ActivityType, JSX.Element> = {
  bericht_in: <MessageSquare size={14} />,
  bericht_uit: <MessageCircle size={14} />,
  foto_geupload: <ImageIcon size={14} />,
  offerte_verstuurd: <FileText size={14} />,
  notitie_toegevoegd: <StickyNote size={14} />,
  status_gewijzigd: <ArrowRightCircle size={14} />,
  akkoord: <Check size={14} />,
  afspraak_geboekt: <Calendar size={14} />,
  lead_aangemaakt: <Plus size={14} />,
}

const TYPE_DOT_CLASS: Record<ActivityType, string> = {
  bericht_in: styles.dotPrimary,
  bericht_uit: styles.dotAccent,
  foto_geupload: styles.dotAccent,
  offerte_verstuurd: styles.dotPrimary,
  notitie_toegevoegd: styles.dotMuted,
  status_gewijzigd: styles.dotPrimary,
  akkoord: styles.dotPrimary,
  afspraak_geboekt: styles.dotPrimary,
  lead_aangemaakt: styles.dotMuted,
}

export function LeadActivityTimeline({ events }: { events: ActivityEvent[] }) {
  if (events.length === 0) {
    return <p className={styles.empty}>Nog geen activiteit.</p>
  }
  return (
    <ol className={styles.timeline}>
      {events.map((e) => (
        <li key={e.id} className={styles.event}>
          <span
            className={`${styles.dot} ${TYPE_DOT_CLASS[e.type]}`}
            aria-hidden="true"
          >
            {TYPE_ICON[e.type]}
          </span>
          <div className={styles.body}>
            <div className={styles.label}>{e.label}</div>
            {e.details && <div className={styles.details}>{e.details}</div>}
            <time className={styles.time} dateTime={e.timestamp}>
              {formatRelative(e.timestamp)}
            </time>
          </div>
        </li>
      ))}
    </ol>
  )
}
```

- [ ] **Step 2: LeadActivityTimeline.module.css**

```css
.timeline {
  list-style: none;
  margin: 0;
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  position: relative;
}

/* Verticale lijn die de dots verbindt — start onder eerste dot, eindigt boven laatste */
.timeline::before {
  content: '';
  position: absolute;
  left: calc(var(--space-4) + 14px);
  top: var(--space-6);
  bottom: var(--space-6);
  width: 1px;
  background: var(--color-border);
}

.event {
  display: flex;
  gap: var(--space-3);
  align-items: flex-start;
  position: relative;
}

.dot {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  z-index: 1;
}

.dotPrimary {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.dotAccent {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.dotMuted {
  border-color: var(--color-border);
  color: var(--color-text-muted);
}

.body {
  flex: 1;
  min-width: 0;
  padding-bottom: var(--space-2);
}

.label {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text);
}

.details {
  margin-top: var(--space-1);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  white-space: pre-wrap;
}

.time {
  display: block;
  margin-top: var(--space-1);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.empty {
  padding: var(--space-4);
  color: var(--color-text-muted);
  font-style: italic;
  font-size: var(--text-sm);
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/leads/LeadActivityTimeline.tsx components/dashboard/leads/LeadActivityTimeline.module.css
git commit -m "feat(dashboard): add LeadActivityTimeline component"
```

---

### Task 4: LeadDetailTabs component

**Files:**
- Create: `components/dashboard/leads/LeadDetailTabs.tsx`
- Create: `components/dashboard/leads/LeadDetailTabs.module.css`

- [ ] **Step 1: LeadDetailTabs.tsx**

Bestand `components/dashboard/leads/LeadDetailTabs.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { useSearchParams, usePathname } from 'next/navigation'
import styles from './LeadDetailTabs.module.css'

type TabKey = 'gesprek' | 'activiteit'

export function LeadDetailTabs({
  gesprek,
  activiteit,
}: {
  gesprek: React.ReactNode
  activiteit: React.ReactNode
}) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const active: TabKey =
    searchParams.get('tab') === 'activiteit' ? 'activiteit' : 'gesprek'

  // Behoud andere search-params (bv. een toekomstige filter binnen detail)
  const buildHref = (tab: TabKey) => {
    const params = new URLSearchParams(searchParams.toString())
    if (tab === 'gesprek') params.delete('tab')
    else params.set('tab', tab)
    const qs = params.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.tabs} role="tablist">
        <Link
          href={buildHref('gesprek')}
          className={`${styles.tab} ${active === 'gesprek' ? styles.active : ''}`}
          role="tab"
          aria-selected={active === 'gesprek'}
          scroll={false}
        >
          Gesprek
        </Link>
        <Link
          href={buildHref('activiteit')}
          className={`${styles.tab} ${active === 'activiteit' ? styles.active : ''}`}
          role="tab"
          aria-selected={active === 'activiteit'}
          scroll={false}
        >
          Activiteit
        </Link>
      </div>
      <div className={styles.panel} role="tabpanel">
        {active === 'gesprek' ? gesprek : activiteit}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: LeadDetailTabs.module.css**

```css
.wrap {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.tabs {
  display: flex;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg);
  position: sticky;
  top: 0;
  z-index: 1;
}

.tab {
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  text-decoration: none;
  border-bottom: 2px solid transparent;
  transition: color 0.15s, border-color 0.15s;
}

.tab:hover {
  color: var(--color-text);
}

.active {
  color: var(--color-text);
  border-bottom-color: var(--color-primary);
  font-weight: 500;
}

.panel {
  flex: 1;
  overflow-y: auto;
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/leads/LeadDetailTabs.tsx components/dashboard/leads/LeadDetailTabs.module.css
git commit -m "feat(dashboard): add LeadDetailTabs (Gesprek/Activiteit URL-state)"
```

---

### Task 5: Wire timeline + tabs into detail page

**Files:**
- Modify: `app/dashboard/(app)/leads/[lead_id]/page.tsx`

- [ ] **Step 1: Lees huidige detail-page**

```bash
cat "app/dashboard/(app)/leads/[lead_id]/page.tsx"
```

Onthoud welke imports er staan en hoe de middenkolom-JSX er nu uitziet (`LeadConversation` + `LeadPhotos` + `LeadOffertes` + `LeadPrijsregels`).

- [ ] **Step 2: Voeg imports toe**

In de imports-block bovenaan, voeg toe:

```tsx
import { Suspense } from 'react'
import { LeadDetailTabs } from '@/components/dashboard/leads/LeadDetailTabs'
import { LeadActivityTimeline } from '@/components/dashboard/leads/LeadActivityTimeline'
import { aggregateActivityTimeline } from '@/lib/dashboard/lead-queries'
```

- [ ] **Step 3: Bereken timeline-events server-side**

In de `LeadDetailPage`-functie, na de `Promise.all([getLeadDetail, getAllTags, getTagsForLead])` block en na `if (!detail) notFound()`, voeg toe:

```tsx
  const activityEvents = aggregateActivityTimeline(detail)
```

- [ ] **Step 4: Vervang middenkolom door tabs**

Zoek de huidige middenkolom JSX (de `<section className={styles.colMain}>` of vergelijkbare wrapper waarin `LeadConversation` etc. staan). Vervang de **inhoud** van die kolom door:

```tsx
        <Suspense fallback={null}>
          <LeadDetailTabs
            gesprek={
              <>
                <LeadConversation berichten={detail.berichten} />
                <LeadPhotos fotos={detail.fotos} />
                <LeadOffertes offertes={detail.offertes} prijsregels={detail.prijsregels} />
              </>
            }
            activiteit={<LeadActivityTimeline events={activityEvents} />}
          />
        </Suspense>
```

**Let op:** De exacte componenten die in `gesprek={...}` staan moeten matchen wat er momenteel al in de middenkolom wordt gerendered — als de huidige page andere/extra componenten heeft (bv. `LeadPrijsregels` apart, of geen `LeadOffertes`), pas de fragment-inhoud aan zodat exact dezelfde Gesprek-view eruit komt als nu.

Suspense-wrapper is nodig omdat `useSearchParams` (binnen `LeadDetailTabs`) tijdens SSR een Suspense-boundary vereist in Next.js 15.

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Smoke check via dev-server**

```bash
npm run dev
```

Open `http://app.localhost:3000/leads/<bestaande-lead-id>` — verwacht: tabs bovenaan middenkolom, Gesprek default actief. Klik Activiteit → URL wordt `?tab=activiteit`, timeline rendert. F5 = tab blijft.

Stop de dev-server (Ctrl+C).

- [ ] **Step 7: Commit**

```bash
git add "app/dashboard/(app)/leads/[lead_id]/page.tsx"
git commit -m "feat(dashboard): wire activity timeline + tabs into lead detail"
```

---

### Task 6: LeadsFilterPanel component

**Files:**
- Create: `components/dashboard/leads/LeadsFilterPanel.tsx`
- Create: `components/dashboard/leads/LeadsFilterPanel.module.css`

- [ ] **Step 1: LeadsFilterPanel.tsx**

```tsx
'use client'

import { useState } from 'react'
import type { LeadsFilters, DateField } from '@/lib/dashboard/lead-filters'
import type {
  Tag,
  DashboardStatus,
  GesprekFase,
} from '@/lib/dashboard/database.types'
import styles from './LeadsFilterPanel.module.css'

export function LeadsFilterPanel({
  filters,
  allTags,
  onApply,
  onClose,
}: {
  filters: LeadsFilters
  allTags: Tag[]
  onApply: (next: LeadsFilters) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState<LeadsFilters>(filters)

  const setStatus = (status: DashboardStatus | '') =>
    setDraft((d) => ({ ...d, status: status || undefined }))

  const toggleTag = (tagId: string) => {
    const current = new Set(draft.tags ?? [])
    if (current.has(tagId)) current.delete(tagId)
    else current.add(tagId)
    setDraft((d) => ({
      ...d,
      tags: current.size > 0 ? [...current] : undefined,
    }))
  }

  const setDateField = (dateField: DateField) =>
    setDraft((d) => ({ ...d, dateField }))

  const setFrom = (from: string) =>
    setDraft((d) => ({ ...d, from: from || undefined }))
  const setTo = (to: string) =>
    setDraft((d) => ({ ...d, to: to || undefined }))
  const setFase = (fase: GesprekFase | '') =>
    setDraft((d) => ({ ...d, fase: fase || undefined }))

  const reset = () => setDraft({})
  const apply = () => onApply(draft)

  const dateFieldValue: DateField = draft.dateField ?? 'aangemaakt'

  return (
    <div className={styles.panel}>
      <div className={styles.fields}>
        <label className={styles.field}>
          <span className={styles.label}>Dashboard-status</span>
          <select
            className={styles.input}
            value={draft.status ?? ''}
            onChange={(e) => setStatus(e.target.value as DashboardStatus | '')}
          >
            <option value="">Alle</option>
            <option value="open">Open</option>
            <option value="opgevolgd">Opgevolgd</option>
            <option value="afgehandeld">Afgehandeld</option>
            <option value="no_show">No-show</option>
            <option value="geen_interesse">Geen interesse</option>
            <option value="archief">Archief</option>
          </select>
        </label>

        <div className={styles.field}>
          <span className={styles.label}>Tags (alle moeten matchen)</span>
          {allTags.length === 0 ? (
            <p className={styles.empty}>Geen tags gemaakt.</p>
          ) : (
            <div className={styles.tagPicker}>
              {allTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  className={`${styles.tagToggle} ${
                    (draft.tags ?? []).includes(tag.id)
                      ? styles.tagToggleOn
                      : ''
                  }`}
                  onClick={() => toggleTag(tag.id)}
                >
                  {tag.naam}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Datum</span>
          <div className={styles.dateRow}>
            <select
              className={styles.input}
              value={dateFieldValue}
              onChange={(e) => setDateField(e.target.value as DateField)}
              aria-label="Datum-kolom"
            >
              <option value="aangemaakt">Aangemaakt</option>
              <option value="bijgewerkt">Bijgewerkt</option>
            </select>
            <input
              type="date"
              className={styles.input}
              value={draft.from ?? ''}
              onChange={(e) => setFrom(e.target.value)}
              aria-label="Van datum"
            />
            <input
              type="date"
              className={styles.input}
              value={draft.to ?? ''}
              onChange={(e) => setTo(e.target.value)}
              aria-label="T/m datum"
            />
          </div>
        </div>

        <label className={styles.field}>
          <span className={styles.label}>Gesprek-fase</span>
          <select
            className={styles.input}
            value={draft.fase ?? ''}
            onChange={(e) => setFase(e.target.value as GesprekFase | '')}
          >
            <option value="">Alle</option>
            <option value="info_verzamelen">Info verzamelen</option>
            <option value="offerte_besproken">Offerte besproken</option>
            <option value="onderhandelen">Onderhandelen</option>
            <option value="datum_kiezen">Datum kiezen</option>
            <option value="afspraak_bevestigd">Afspraak bevestigd</option>
          </select>
        </label>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.reset}
          onClick={reset}
        >
          Wis filters
        </button>
        <div className={styles.applyGroup}>
          <button
            type="button"
            className={styles.cancel}
            onClick={onClose}
          >
            Annuleren
          </button>
          <button
            type="button"
            className={styles.apply}
            onClick={apply}
          >
            Toepassen
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: LeadsFilterPanel.module.css**

```css
.panel {
  margin-top: var(--space-2);
  padding: var(--space-4);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.fields {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.label {
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.input {
  padding: var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
  font: inherit;
  font-size: var(--text-sm);
  color: var(--color-text);
}

.input:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: -1px;
}

.tagPicker {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.tagToggle {
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--color-text-muted);
  font-size: var(--text-xs);
  cursor: pointer;
}

.tagToggle:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.tagToggleOn {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.empty {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  font-style: italic;
}

.dateRow {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: var(--space-2);
}

.actions {
  margin-top: var(--space-4);
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-2);
}

.reset {
  background: none;
  border: none;
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  cursor: pointer;
  padding: 0;
}

.reset:hover {
  color: var(--color-text);
  text-decoration: underline;
}

.applyGroup {
  display: flex;
  gap: var(--space-2);
}

.cancel {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
  font-size: var(--text-sm);
  color: var(--color-text);
  cursor: pointer;
}

.apply {
  padding: var(--space-2) var(--space-3);
  border: none;
  border-radius: var(--radius-sm);
  background: var(--color-primary);
  color: white;
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
}

.apply:hover {
  filter: brightness(1.05);
}

@media (max-width: 640px) {
  .dateRow {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/leads/LeadsFilterPanel.tsx components/dashboard/leads/LeadsFilterPanel.module.css
git commit -m "feat(dashboard): add LeadsFilterPanel (status/tags/datum/fase controls)"
```

---

### Task 7: LeadsFilterBar component

**Files:**
- Create: `components/dashboard/leads/LeadsFilterBar.tsx`
- Create: `components/dashboard/leads/LeadsFilterBar.module.css`

- [ ] **Step 1: LeadsFilterBar.tsx**

```tsx
'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import {
  parseLeadsFilters,
  serializeLeadsFilters,
  countActiveFilters,
  type LeadsFilters,
} from '@/lib/dashboard/lead-filters'
import {
  dashboardStatusLabel,
  gesprekFaseLabel,
  formatDateNL,
} from '@/lib/dashboard/format'
import type { Tag } from '@/lib/dashboard/database.types'
import { LeadsFilterPanel } from './LeadsFilterPanel'
import styles from './LeadsFilterBar.module.css'

const SEARCH_DEBOUNCE_MS = 300

export function LeadsFilterBar({ allTags }: { allTags: Tag[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const [panelOpen, setPanelOpen] = useState(false)

  const filters = parseLeadsFilters(
    Object.fromEntries(searchParams.entries())
  )
  const [searchValue, setSearchValue] = useState(filters.q ?? '')

  // Debounced search → URL
  useEffect(() => {
    if (searchValue === (filters.q ?? '')) return
    const t = setTimeout(() => {
      updateFilters({ ...filters, q: searchValue || undefined })
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue])

  const updateFilters = (next: LeadsFilters) => {
    const qs = serializeLeadsFilters(next)
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    })
  }

  const removeStatus = () =>
    updateFilters({ ...filters, status: undefined })
  const removeTags = () =>
    updateFilters({ ...filters, tags: undefined })
  const removeDate = () =>
    updateFilters({
      ...filters,
      dateField: undefined,
      from: undefined,
      to: undefined,
    })
  const removeFase = () => updateFilters({ ...filters, fase: undefined })

  const tagsById = new Map(allTags.map((t) => [t.id, t]))
  const count = countActiveFilters(filters)

  return (
    <div className={styles.bar}>
      <div className={styles.row}>
        <div className={styles.searchWrap}>
          <Search size={14} className={styles.searchIcon} aria-hidden="true" />
          <input
            type="search"
            placeholder="Zoek naam of telefoon…"
            className={styles.search}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            aria-label="Zoek leads"
          />
        </div>
        <button
          type="button"
          className={`${styles.filterBtn} ${
            panelOpen ? styles.filterBtnOpen : ''
          }`}
          onClick={() => setPanelOpen((v) => !v)}
          aria-expanded={panelOpen}
        >
          <SlidersHorizontal size={14} />
          Filters{count > 0 && <span className={styles.count}>({count})</span>}
        </button>
      </div>

      {panelOpen && (
        <LeadsFilterPanel
          filters={filters}
          allTags={allTags}
          onApply={(next) => {
            setPanelOpen(false)
            updateFilters(next)
          }}
          onClose={() => setPanelOpen(false)}
        />
      )}

      {count > 0 && (
        <div className={styles.chips}>
          {filters.status && (
            <span className={styles.chip}>
              Status: {dashboardStatusLabel(filters.status)}
              <button
                type="button"
                onClick={removeStatus}
                aria-label="Status-filter verwijderen"
                className={styles.chipRemove}
              >
                <X size={12} />
              </button>
            </span>
          )}
          {filters.tags && filters.tags.length > 0 && (
            <span className={styles.chip}>
              Tags:{' '}
              {filters.tags
                .map((id) => tagsById.get(id)?.naam ?? id)
                .join(', ')}
              <button
                type="button"
                onClick={removeTags}
                aria-label="Tag-filter verwijderen"
                className={styles.chipRemove}
              >
                <X size={12} />
              </button>
            </span>
          )}
          {(filters.from || filters.to) && (
            <span className={styles.chip}>
              {filters.dateField === 'bijgewerkt' ? 'Bijgewerkt' : 'Aangemaakt'}
              {filters.from ? ` van ${formatDateNL(filters.from)}` : ''}
              {filters.to ? ` t/m ${formatDateNL(filters.to)}` : ''}
              <button
                type="button"
                onClick={removeDate}
                aria-label="Datum-filter verwijderen"
                className={styles.chipRemove}
              >
                <X size={12} />
              </button>
            </span>
          )}
          {filters.fase && (
            <span className={styles.chip}>
              Fase: {gesprekFaseLabel(filters.fase)}
              <button
                type="button"
                onClick={removeFase}
                aria-label="Fase-filter verwijderen"
                className={styles.chipRemove}
              >
                <X size={12} />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: LeadsFilterBar.module.css**

```css
.bar {
  margin-bottom: var(--space-4);
}

.row {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}

.searchWrap {
  flex: 1;
  position: relative;
  max-width: 400px;
}

.searchIcon {
  position: absolute;
  left: var(--space-2);
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-muted);
  pointer-events: none;
}

.search {
  width: 100%;
  padding: var(--space-2) var(--space-2) var(--space-2) calc(var(--space-2) + 20px);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
  font: inherit;
  font-size: var(--text-sm);
  color: var(--color-text);
}

.search:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: -1px;
}

.filterBtn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
  color: var(--color-text);
  font-size: var(--text-sm);
  cursor: pointer;
}

.filterBtn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.filterBtnOpen {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.count {
  margin-left: var(--space-1);
  font-weight: 600;
}

.chips {
  margin-top: var(--space-3);
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  background: var(--color-surface-2);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  color: var(--color-text);
}

.chipRemove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: none;
  background: rgba(0, 0, 0, 0.1);
  color: var(--color-text);
  border-radius: 50%;
  cursor: pointer;
  padding: 0;
}

.chipRemove:hover {
  background: rgba(0, 0, 0, 0.2);
}

@media (max-width: 640px) {
  .row {
    flex-direction: column;
    align-items: stretch;
  }
  .searchWrap {
    max-width: none;
  }
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/leads/LeadsFilterBar.tsx components/dashboard/leads/LeadsFilterBar.module.css
git commit -m "feat(dashboard): add LeadsFilterBar (search + chips + URL-state)"
```

---

### Task 8: ExportLeadsButton client + CSV-route filter-aware

**Files:**
- Modify: `components/dashboard/leads/ExportLeadsButton.tsx`
- Modify: `app/api/dashboard/export/leads-csv/route.ts`

- [ ] **Step 1: Vervang ExportLeadsButton.tsx**

We maken de knop een Client Component zodat hij de huidige URL-search-params kan oppikken en doorgeven aan de export-endpoint. Anders zou de export altijd ALLE leads geven, ongeacht actieve filters.

```tsx
'use client'

import { Download } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import styles from './ExportLeadsButton.module.css'

export function ExportLeadsButton() {
  const searchParams = useSearchParams()
  const qs = searchParams.toString()
  const href = qs
    ? `/api/dashboard/export/leads-csv?${qs}`
    : '/api/dashboard/export/leads-csv'
  return (
    <a href={href} className={styles.button} download>
      <Download size={14} />
      Exporteer CSV
    </a>
  )
}
```

- [ ] **Step 2: Update CSV-route om filters te accepteren**

In `app/api/dashboard/export/leads-csv/route.ts`, vervang de `GET`-functie. Voeg eerst een import toe bovenaan:

```typescript
import { parseLeadsFilters } from '@/lib/dashboard/lead-filters'
```

Vervang dan de signature en de body van `GET`:

```typescript
export async function GET(request: Request) {
  // Auth check — alleen approved users mogen exporteren.
  await requireApprovedUser()

  const url = new URL(request.url)
  const filters = parseLeadsFilters(url.searchParams)
  const leads = await getLeadsList(filters)

  const rows: string[] = [CSV_HEADERS.join(',')]
  for (const lead of leads) {
    rows.push(
      [
        csvEscape(lead.lead_id),
        csvEscape(lead.naam),
        csvEscape(lead.telefoon),
        csvEscape(lead.hoofdcategorie),
        csvEscape(lead.m2),
        csvEscape(
          lead.totaal_prijs !== null ? formatEuro(lead.totaal_prijs) : ''
        ),
        csvEscape(lead.status),
        csvEscape(gesprekFaseLabel(lead.gesprek_fase)),
        csvEscape(dashboardStatusLabel(lead.dashboard_status)),
        csvEscape(formatDateTimeNL(lead.aangemaakt)),
        csvEscape(formatDateTimeNL(lead.bijgewerkt)),
      ].join(',')
    )
  }

  const csv = rows.join('\n')
  const filename = `leads-${new Date().toISOString().slice(0, 10)}.csv`

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
```

(De rest van de file — `CSV_HEADERS`, `csvEscape` — blijft ongewijzigd.)

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/leads/ExportLeadsButton.tsx "app/api/dashboard/export/leads-csv/route.ts"
git commit -m "feat(dashboard): CSV-export respecteert actieve filters"
```

---

### Task 9: Wire filters into /leads page

**Files:**
- Modify: `app/dashboard/(app)/leads/page.tsx`
- Modify: `app/dashboard/(app)/leads/page.module.css`

- [ ] **Step 1: Vervang inhoud van page.tsx**

```tsx
import { Suspense } from 'react'
import { getLeadsList, countAllLeads } from '@/lib/dashboard/lead-queries'
import { getAllTags } from '@/lib/dashboard/tag-queries'
import {
  parseLeadsFilters,
  hasActiveFilters,
} from '@/lib/dashboard/lead-filters'
import { LeadsTable } from '@/components/dashboard/leads/LeadsTable'
import { LeadsFilterBar } from '@/components/dashboard/leads/LeadsFilterBar'
import { ExportLeadsButton } from '@/components/dashboard/leads/ExportLeadsButton'
import styles from './page.module.css'

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>
}) {
  const sp = await searchParams
  const filters = parseLeadsFilters(sp)
  const [leads, total, allTags] = await Promise.all([
    getLeadsList(filters),
    countAllLeads(),
    getAllTags(),
  ])
  const active = hasActiveFilters(filters)

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1>Leads</h1>
          <p>
            {active
              ? `${leads.length} gevonden van ${total} totaal.`
              : `${leads.length} ${
                  leads.length === 1 ? 'lead' : 'leads'
                } — niet gearchiveerd, nieuwste eerst.`}
          </p>
        </div>
        <Suspense fallback={null}>
          <ExportLeadsButton />
        </Suspense>
      </div>
      <Suspense fallback={null}>
        <LeadsFilterBar allTags={allTags} />
      </Suspense>
      <LeadsTable leads={leads} />
    </div>
  )
}
```

`Suspense` is nodig rondom `ExportLeadsButton` en `LeadsFilterBar` omdat beide `useSearchParams` gebruiken (Next.js 15 SSR-vereiste).

- [ ] **Step 2: page.module.css blijft gelijk (geen wijziging nodig)**

De bestaande `.header` class uit Plan 5 voldoet. Skip dit als er geen wijziging nodig is. Als de implementer extra spacing wil tussen header en filter-bar:

```css
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-4);
  gap: var(--space-4);
}
```

(Dit is identiek aan de huidige inhoud — niets te doen.)

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Smoke check via dev-server**

```bash
npm run dev
```

Open `http://app.localhost:3000/leads`. Verwacht:
- Zoekbalk + Filters-knop bovenaan
- Tabel toont eerste 100 leads
- Tik in zoekbalk een naam, tabel filtert na 300ms
- Klik Filters → paneel opent → kies status → Toepassen → URL bevat `?status=...`, chip verschijnt, tabel reageert
- Klik op chip-× → filter weg
- Hard-refresh met filter-URL → filters blijven actief

Stop dev-server.

- [ ] **Step 5: Commit**

```bash
git add "app/dashboard/(app)/leads/page.tsx"
git commit -m "feat(dashboard): wire filter-bar + counts into /leads page"
```

---

### Task 10: Browser supabase client + LiveIndicator

**Files:**
- Create: `lib/dashboard/supabase-browser.ts`
- Create: `components/dashboard/leads/LiveIndicator.tsx`
- Create: `components/dashboard/leads/LiveIndicator.module.css`

- [ ] **Step 1: Lees env-var namen uit bestaande supabase-server**

```bash
grep -E "process\.env" lib/dashboard/supabase-server.ts
```

Onthoud welke env-vars gebruikt worden voor URL en anon-key. Waarschijnlijk `NEXT_PUBLIC_DASHBOARD_SUPABASE_URL` en `NEXT_PUBLIC_DASHBOARD_SUPABASE_ANON_KEY` (of vergelijkbaar). De browser-client moet dezelfde keys gebruiken.

- [ ] **Step 2: Maak supabase-browser.ts**

```typescript
'use client'

import { createBrowserClient } from '@supabase/ssr'

/**
 * Browser-side Supabase client met cookie-session voor Realtime.
 * Gebruikt dezelfde env-vars als supabase-server.ts — RLS-policies blijven
 * van kracht omdat de session-cookie wordt meegestuurd.
 *
 * Niet bedoeld voor data-fetching — gebruik daarvoor server components
 * en getDashboardSupabase. Deze client is specifiek voor Realtime channels.
 */
export function getDashboardSupabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_DASHBOARD_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_DASHBOARD_SUPABASE_ANON_KEY!
  )
}
```

**Pas de env-var-namen aan op wat je in Step 1 hebt gevonden** als ze afwijken.

- [ ] **Step 3: LiveIndicator.tsx**

```tsx
'use client'

import styles from './LiveIndicator.module.css'

export function LiveIndicator({ connected }: { connected: boolean }) {
  return (
    <span
      className={`${styles.indicator} ${
        connected ? styles.live : styles.offline
      }`}
      title={connected ? 'Realtime verbonden' : 'Realtime niet verbonden'}
    >
      <span className={styles.dot} aria-hidden="true" />
      {connected ? 'Live' : 'Offline'}
    </span>
  )
}
```

- [ ] **Step 4: LiveIndicator.module.css**

```css
.indicator {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}

.live {
  color: var(--color-primary);
}

.offline {
  color: var(--color-text-muted);
}
```

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add lib/dashboard/supabase-browser.ts components/dashboard/leads/LiveIndicator.tsx components/dashboard/leads/LiveIndicator.module.css
git commit -m "feat(dashboard): add browser Supabase client + LiveIndicator"
```

---

### Task 11: LeadDetailRealtime + wire into detail page (USER: enable Realtime in Supabase Studio)

**Files:**
- Create: `components/dashboard/leads/LeadDetailRealtime.tsx`
- Modify: `app/dashboard/(app)/leads/[lead_id]/page.tsx`

**MANUELE STAP (USER):** Voor deze task functioneert moet **Realtime aan staan** voor de `berichten` en `fotos` tabellen in de schoon-straatje Supabase. Studio → Database → Replication → "Enable" voor beide tabellen. Doe dit voordat je smoke-test (Task 12) draait.

- [ ] **Step 1: LeadDetailRealtime.tsx**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { getDashboardSupabaseBrowser } from '@/lib/dashboard/supabase-browser'
import { LiveIndicator } from './LiveIndicator'

/**
 * Onzichtbaar (qua data-flow) component dat Supabase Realtime abonneert
 * op INSERTs in `berichten` en `fotos` voor het huidige lead_id, en bij
 * elke event `router.refresh()` triggert. Server fetcht opnieuw,
 * page re-rendert — geen client-state-mutations.
 *
 * Rendert wel een kleine LiveIndicator zodat de user de connection-status ziet.
 */
export function LeadDetailRealtime({ leadId }: { leadId: string }) {
  const router = useRouter()
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const supabase = getDashboardSupabaseBrowser()
    const channel: RealtimeChannel = supabase
      .channel(`lead-${leadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'berichten',
          filter: `lead_id=eq.${leadId}`,
        },
        () => router.refresh()
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'fotos',
          filter: `lead_id=eq.${leadId}`,
        },
        () => router.refresh()
      )
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED')
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [leadId, router])

  return <LiveIndicator connected={connected} />
}
```

- [ ] **Step 2: Mount op detail-page**

In `app/dashboard/(app)/leads/[lead_id]/page.tsx`, voeg import toe (in de imports-block):

```tsx
import { LeadDetailRealtime } from '@/components/dashboard/leads/LeadDetailRealtime'
```

In de left-column JSX (de `<aside>` die `LeadHeader` + `LeadStatusBadges` + `LeadTagsEditor` bevat), voeg `<LeadDetailRealtime>` toe **direct na** `<LeadHeader>`:

```tsx
        <aside className={styles.colLeft}>
          <LeadHeader lead={detail.lead} />
          <LeadDetailRealtime leadId={detail.lead.lead_id} />
          <LeadStatusBadges lead={detail.lead} />
          <LeadTagsEditor
            leadId={detail.lead.lead_id}
            leadTags={leadTags}
            allTags={allTags}
          />
        </aside>
```

- [ ] **Step 3: Type-check + build**

```bash
npx tsc --noEmit && npm run build 2>&1 | tail -30
```

Verwacht: schone build, route `/dashboard/leads/[lead_id]` listed.

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/leads/LeadDetailRealtime.tsx "app/dashboard/(app)/leads/[lead_id]/page.tsx"
git commit -m "feat(dashboard): add realtime updates + live-indicator to lead detail"
```

---

### Task 12: Build-verificatie + smoke test (USER manual)

- [ ] **Step 1: `npm run build`**

```bash
cd "/Users/christiaantromp/Desktop/Frontlix website new"
npm run build
```

Verwacht: schone build, geen lint-errors. Als er een unused-variable of vergelijkbare lint-error opduikt: fix en commit als `fix(test): ...` of `fix: ...`.

- [ ] **Step 2: `npm run test`**

Verwacht: alle tests groen — minstens 75 (64 baseline uit Plan 5 + ~11 nieuwe in Task 1 + ~7 nieuwe in Task 2).

- [ ] **Step 3: Realtime aanzetten in Supabase Studio (als nog niet gedaan in Task 11)**

Studio → schoon-straatje project → Database → Replication. Zet **Enable** aan voor `berichten` en `fotos`. (RLS blijft van kracht, dus realtime-events respecteren bestaande policies.)

- [ ] **Step 4: Start dev-server**

```bash
npm run dev
```

- [ ] **Step 5: Smoke test in browser**

Op `http://app.localhost:3000`:

**Filters:**
1. Open `/leads` → tabel rendert + zoekbalk + Filters-knop zichtbaar
2. Tik in zoekbalk "jan" → tabel filtert binnen 300ms; URL bevat `?q=jan`
3. Klik Filters → paneel opent → kies status "Opgevolgd" → Toepassen → chip verschijnt, tabel filtert
4. Tik op de × in de status-chip → status-filter weg, q-filter blijft
5. Datum-range: kies "Aangemaakt", van 2026-04-01, t/m 2026-04-30 → Toepassen → tabel filtert
6. F5 → URL behoudt filters, tabel toont gefilterde resultaten
7. Klik "Exporteer CSV" terwijl een filter actief is → bestand downloadt → controleer dat alleen gefilterde leads erin staan

**Activity-timeline:**
8. Open een lead → middenkolom toont tabs "Gesprek" / "Activiteit", Gesprek default
9. Klik Activiteit → URL wordt `?tab=activiteit` → timeline rendert chronologisch (nieuwste boven), met dots in primair-blauw / cyaan / grijs
10. F5 → timeline blijft

**Realtime:**
11. Open de lead in twee browser-tabs
12. In Supabase Studio: SQL editor →
    ```sql
    INSERT INTO berichten (lead_id, richting, type, bericht, timestamp)
    VALUES ('<jouw-lead-id>', 'inkomend', 'tekst', 'realtime test', now());
    ```
13. Beide tabs moeten binnen 2 seconden de nieuwe bericht tonen in de gespreks-thread
14. LiveIndicator: 🟢 "Live" als verbonden, ⚪ "Offline" anders. Test offline door internet kort uit te schakelen.

**Bot smoke (geen impact):**
15. `pm2 logs` op de schoon-straatje VPS — geen nieuwe errors verwacht

Stop dev-server na alle checks.

- [ ] **Step 6: Push naar GitHub**

```bash
git push origin main
```

---

## Summary checklist

Aan het einde van Plan 6:

- [ ] `lib/dashboard/lead-filters.ts` + tests groen (~20 cases)
- [ ] `getLeadsList(filters)` + `countAllLeads()` met tests groen
- [ ] `LeadActivityTimeline` rendert events met icons + dot-kleuren
- [ ] `LeadDetailTabs` switcht Gesprek/Activiteit via URL `?tab=`
- [ ] Detail-pagina middenkolom in tabs gewikkeld
- [ ] `LeadsFilterPanel` met status/tags/datum/fase controls
- [ ] `LeadsFilterBar` met search-debounce + chips + URL-replace
- [ ] CSV-export accepteert filter-params, ExportLeadsButton geeft ze door
- [ ] `/leads` page leest filters, telt totaal, toont "X van Y" tekst bij actieve filter
- [ ] Browser Supabase client + LiveIndicator
- [ ] `LeadDetailRealtime` mounted op detail-pagina, abonneert op berichten + fotos INSERTs
- [ ] Realtime aan in Supabase Studio voor `berichten` en `fotos`
- [ ] `npm run build` slaagt
- [ ] End-to-end smoke test groen (filters + timeline + realtime)
- [ ] Push naar GitHub

Plan 7 (statistieken + agenda) kan beginnen zodra Plan 6 is gepusht.
