# Plan 8 — Agenda-pagina Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bouw `/dashboard/agenda` als calendar-grid maand-view die alle leads met `afspraak_geboekt_op` toont. Past + future zichtbaar (grijs vs primair-blauw). Klik op afspraak → naar lead-detail. Read-only, geen schema-changes, geen bot-impact.

**Architecture:** Pure Server Components. Server-side date-math en query-aggregatie. Geen client-state nodig — maand-navigatie loopt via URL-search-params (`?month=YYYY-MM`). Tijdzone Europe/Amsterdam voor cel-toewijzing.

**Tech Stack:** Next.js 15 Server Components, `@supabase/ssr`, CSS Modules (CSS Grid voor de 7-koloms layout), Vitest. Geen nieuwe packages.

**Working directory:** `/Users/christiaantromp/Desktop/Frontlix website new/`

**Schoon-straatje bot wordt niet aangeraakt.** Geen schema-migraties.

---

## File Structure

**Nieuw:**
```
lib/dashboard/
├── calendar.ts                     — parseMonthParam + getMonthGrid + buildAppointmentsByDay + toAmsterdamDayKey
├── calendar.test.ts
├── agenda-queries.ts               — getAppointmentsForMonth
└── agenda-queries.test.ts

components/dashboard/agenda/
├── AgendaMonthNav.tsx + .module.css        — server, prev/today/next links + maand-titel
├── AgendaAppointmentBlock.tsx + .module.css — server, klikbaar `<Link>` met past/future-styling
├── AgendaCalendar.tsx + .module.css        — server, 7×N grid
└── AgendaAppointmentList.tsx + .module.css — server, chronologische lijst onder de grid
```

**Gewijzigd:**
```
app/dashboard/(app)/agenda/page.tsx          — vervangt placeholder
```

---

## Approach principles

- **Server-only.** Alle componenten zijn Server Components — geen client-state nodig. Navigatie via gewone `<Link>`.
- **URL-state voor maand.** `?month=2026-05` — bookmarkable, prev/next zijn gewoon andere URLs.
- **Tijdzone Europe/Amsterdam** voor afspraak-naar-cel mapping. We parsen `afspraak_geboekt_op` (UTC ISO) naar een `YYYY-MM-DD`-key in NL-tijdzone via `Intl.DateTimeFormat`.
- **Date-math TDD.** `getMonthGrid` heeft genoeg edge cases (schrikkeljaren, jaargrenzen, Q1-Q4) om te testen.
- **Geen lib voor calendar.** CSS Grid is genoeg voor het 7-koloms layout. Date-math gebruikt native `Date` + `Intl`.
- **YAGNI:** geen drag-and-drop, geen week/day-view, geen iCal-export, geen filtering.
- **Frequent commits** — één commit per task.

---

### Task 1: calendar helpers (TDD)

**Files:**
- Create: `lib/dashboard/calendar.ts`
- Create: `lib/dashboard/calendar.test.ts`

- [ ] **Step 1: Schrijf failing tests**

Bestand `lib/dashboard/calendar.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import {
  parseMonthParam,
  getMonthGrid,
  toAmsterdamDayKey,
  buildAppointmentsByDay,
} from './calendar'

describe('parseMonthParam', () => {
  // Vaste referentie: dinsdag 5 mei 2026
  const NOW = new Date('2026-05-05T14:00:00Z')

  it('returnt huidige maand bij geen param', () => {
    expect(parseMonthParam({}, NOW)).toEqual({ year: 2026, month: 5 })
  })

  it('parseert geldige YYYY-MM', () => {
    expect(parseMonthParam({ month: '2026-03' }, NOW)).toEqual({ year: 2026, month: 3 })
    expect(parseMonthParam({ month: '2025-12' }, NOW)).toEqual({ year: 2025, month: 12 })
  })

  it('valt terug op huidige maand bij ongeldig formaat', () => {
    expect(parseMonthParam({ month: 'abc' }, NOW)).toEqual({ year: 2026, month: 5 })
    expect(parseMonthParam({ month: '2026-13' }, NOW)).toEqual({ year: 2026, month: 5 })
    expect(parseMonthParam({ month: '2026-00' }, NOW)).toEqual({ year: 2026, month: 5 })
    expect(parseMonthParam({ month: '26-05' }, NOW)).toEqual({ year: 2026, month: 5 })
  })
})

describe('getMonthGrid', () => {
  it('mei 2026: start op maandag 27 april (leading), eind op zondag 31 mei = 35 cellen', () => {
    const grid = getMonthGrid(2026, 5)
    expect(grid.cells).toHaveLength(35)
    expect(grid.cells[0].dateKey).toBe('2026-04-27')
    expect(grid.cells[0].isCurrentMonth).toBe(false)
    expect(grid.cells[4].dateKey).toBe('2026-05-01')
    expect(grid.cells[4].isCurrentMonth).toBe(true)
    expect(grid.cells[34].dateKey).toBe('2026-05-31')
    expect(grid.cells[34].isCurrentMonth).toBe(true)
  })

  it('februari 2025 (28 dagen, start zaterdag): 35 cellen', () => {
    const grid = getMonthGrid(2025, 2)
    expect(grid.cells).toHaveLength(35)
    expect(grid.cells[0].dateKey).toBe('2025-01-27')  // maandag
    expect(grid.cells[5].dateKey).toBe('2025-02-01')  // zaterdag
  })

  it('maart 2026 (start zondag): 42 cellen (6 rijen)', () => {
    // 1 maart 2026 = zondag → grid begint maandag 23 feb
    const grid = getMonthGrid(2026, 3)
    expect(grid.cells).toHaveLength(42)
    expect(grid.cells[0].dateKey).toBe('2026-02-23')
    expect(grid.cells[6].dateKey).toBe('2026-03-01')
  })

  it('schrikkeljaar februari 2024 heeft 29 dagen', () => {
    const grid = getMonthGrid(2024, 2)
    const lastInMonth = [...grid.cells].reverse().find((c) => c.isCurrentMonth)
    expect(lastInMonth?.dateKey).toBe('2024-02-29')
  })

  it('markeert vandaag wanneer in zicht', () => {
    const today = new Date('2026-05-15T12:00:00Z')
    const grid = getMonthGrid(2026, 5, today)
    const todayCell = grid.cells.find((c) => c.dateKey === '2026-05-15')
    expect(todayCell?.isToday).toBe(true)
  })

  it('markeert toDate als past wanneer dateKey < today', () => {
    const today = new Date('2026-05-15T12:00:00Z')
    const grid = getMonthGrid(2026, 5, today)
    const earlyCell = grid.cells.find((c) => c.dateKey === '2026-05-10')
    expect(earlyCell?.isPast).toBe(true)
    const lateCell = grid.cells.find((c) => c.dateKey === '2026-05-20')
    expect(lateCell?.isPast).toBe(false)
  })

  it('returnt monthLabel als "mei 2026"', () => {
    const grid = getMonthGrid(2026, 5)
    expect(grid.monthLabel).toBe('mei 2026')
  })

  it('prevMonth en nextMonth crossen jaargrens correct', () => {
    const dec = getMonthGrid(2026, 12)
    expect(dec.prevMonth).toEqual({ year: 2026, month: 11 })
    expect(dec.nextMonth).toEqual({ year: 2027, month: 1 })

    const jan = getMonthGrid(2027, 1)
    expect(jan.prevMonth).toEqual({ year: 2026, month: 12 })
    expect(jan.nextMonth).toEqual({ year: 2027, month: 2 })
  })
})

describe('toAmsterdamDayKey', () => {
  it('UTC midden op de dag → zelfde dag in NL', () => {
    expect(toAmsterdamDayKey('2026-05-05T12:00:00Z')).toBe('2026-05-05')
  })

  it('UTC laat in de avond → volgende dag in NL (zomertijd CEST = UTC+2)', () => {
    // 2026-05-05 23:00 UTC = 2026-05-06 01:00 NL
    expect(toAmsterdamDayKey('2026-05-05T23:00:00Z')).toBe('2026-05-06')
  })

  it('UTC vroeg op de dag in wintertijd (CET = UTC+1)', () => {
    // 2026-01-15 00:30 UTC = 2026-01-15 01:30 NL → zelfde dag
    expect(toAmsterdamDayKey('2026-01-15T00:30:00Z')).toBe('2026-01-15')
  })
})

describe('buildAppointmentsByDay', () => {
  it('groepeert appointments op dag-key', () => {
    const appointments = [
      { lead_id: 'L1', afspraak_geboekt_op: '2026-05-05T10:00:00Z', naam: 'Jan' },
      { lead_id: 'L2', afspraak_geboekt_op: '2026-05-05T15:00:00Z', naam: 'Piet' },
      { lead_id: 'L3', afspraak_geboekt_op: '2026-05-06T09:00:00Z', naam: 'Roos' },
    ] as never

    const map = buildAppointmentsByDay(appointments)
    expect(map.get('2026-05-05')).toHaveLength(2)
    expect(map.get('2026-05-06')).toHaveLength(1)
    expect(map.get('2026-05-07')).toBeUndefined()
  })

  it('sorteert appointments per dag op tijd ASC', () => {
    const appointments = [
      { lead_id: 'L2', afspraak_geboekt_op: '2026-05-05T15:00:00Z', naam: 'Piet' },
      { lead_id: 'L1', afspraak_geboekt_op: '2026-05-05T10:00:00Z', naam: 'Jan' },
    ] as never

    const map = buildAppointmentsByDay(appointments)
    const day = map.get('2026-05-05')!
    expect(day[0].lead_id).toBe('L1')
    expect(day[1].lead_id).toBe('L2')
  })
})
```

- [ ] **Step 2: Run tests, verwacht failures**

```bash
npm run test -- lib/dashboard/calendar.test.ts
```

- [ ] **Step 3: Implementeer calendar.ts**

Bestand `lib/dashboard/calendar.ts`:

```typescript
export interface MonthRef {
  year: number
  month: number  // 1-12
}

export interface GridCell {
  dateKey: string         // YYYY-MM-DD
  dayOfMonth: number       // 1-31
  isCurrentMonth: boolean
  isToday: boolean
  isPast: boolean
}

export interface MonthGrid {
  cells: GridCell[]        // 35 of 42 cellen, ASC
  monthLabel: string       // "mei 2026"
  prevMonth: MonthRef
  nextMonth: MonthRef
  monthStart: string       // YYYY-MM-DD van de 1e
  monthEnd: string         // YYYY-MM-DD van laatste dag
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

const MONTH_PARAM = /^(\d{4})-(\d{2})$/

/**
 * Parsest `?month=YYYY-MM`. Default = de maand van het nu-tijdstip.
 * Ongeldige waarden vallen ook terug op huidige maand.
 */
export function parseMonthParam(
  source: ParamSource,
  now: Date = new Date()
): MonthRef {
  const raw = getParam(source, 'month')
  if (raw) {
    const m = raw.match(MONTH_PARAM)
    if (m) {
      const year = Number(m[1])
      const month = Number(m[2])
      if (month >= 1 && month <= 12) {
        return { year, month }
      }
    }
  }
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 }
}

const NL_MONTH_NAMES = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
]

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

function dateKey(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

/**
 * Build de 7×N grid voor een gegeven maand.
 * Cellen lopen van maandag op of voor de 1e, t/m zondag op of na de laatste dag.
 * Resultaat: 35 of 42 cellen — Maandag-eerste week.
 *
 * `now` is gebruikt om "vandaag" en "isPast" te bepalen.
 */
export function getMonthGrid(
  year: number,
  month: number,
  now: Date = new Date()
): MonthGrid {
  // Eerste dag van de maand op 00:00 UTC
  const monthStart = new Date(Date.UTC(year, month - 1, 1))
  // Laatste dag van de maand
  const monthEnd = new Date(Date.UTC(year, month, 0))  // dag 0 van volgende maand = laatste van deze

  // Maandag op of voor monthStart
  // JS getUTCDay: zondag=0, maandag=1, ..., zaterdag=6
  const startDay = monthStart.getUTCDay()
  const diffToMonday = startDay === 0 ? 6 : startDay - 1
  const gridStart = new Date(Date.UTC(
    year, month - 1, 1 - diffToMonday
  ))

  // Zondag op of na monthEnd
  const endDay = monthEnd.getUTCDay()
  const diffToSunday = endDay === 0 ? 0 : 7 - endDay
  const gridEnd = new Date(Date.UTC(
    year, month - 1, monthEnd.getUTCDate() + diffToSunday
  ))

  // Genereer cellen
  const todayKey = dateKey(now)
  const cells: GridCell[] = []
  const cur = new Date(gridStart)
  while (cur.getTime() <= gridEnd.getTime()) {
    const key = dateKey(cur)
    cells.push({
      dateKey: key,
      dayOfMonth: cur.getUTCDate(),
      isCurrentMonth: cur.getUTCMonth() === month - 1 && cur.getUTCFullYear() === year,
      isToday: key === todayKey,
      isPast: key < todayKey,
    })
    cur.setUTCDate(cur.getUTCDate() + 1)
  }

  // Maand-navigatie refs
  const prevMonth: MonthRef = month === 1
    ? { year: year - 1, month: 12 }
    : { year, month: month - 1 }
  const nextMonth: MonthRef = month === 12
    ? { year: year + 1, month: 1 }
    : { year, month: month + 1 }

  const monthLabel = `${NL_MONTH_NAMES[month - 1]} ${year}`

  return {
    cells,
    monthLabel,
    prevMonth,
    nextMonth,
    monthStart: dateKey(monthStart),
    monthEnd: dateKey(monthEnd),
  }
}

/**
 * Converteert een UTC ISO-timestamp naar een Europe/Amsterdam dag-key (YYYY-MM-DD).
 * Gebruikt Intl.DateTimeFormat — hanteert DST automatisch (CEST in zomer, CET in winter).
 */
export function toAmsterdamDayKey(iso: string): string {
  const date = new Date(iso)
  const formatter = new Intl.DateTimeFormat('nl-NL', {
    timeZone: 'Europe/Amsterdam',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = formatter.formatToParts(date)
  const year = parts.find((p) => p.type === 'year')?.value ?? '0000'
  const month = parts.find((p) => p.type === 'month')?.value ?? '01'
  const day = parts.find((p) => p.type === 'day')?.value ?? '01'
  return `${year}-${month}-${day}`
}

/**
 * Groepeert appointments op Europe/Amsterdam-dag voor O(1) lookup per cel.
 * Sorteert per dag op tijd ASC.
 */
export interface AppointmentLike {
  lead_id: string
  afspraak_geboekt_op: string
  naam: string | null
}

export function buildAppointmentsByDay<T extends AppointmentLike>(
  appointments: T[]
): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const a of appointments) {
    const key = toAmsterdamDayKey(a.afspraak_geboekt_op)
    const list = map.get(key) ?? []
    list.push(a)
    map.set(key, list)
  }
  // Sorteer per dag op tijd ASC
  for (const list of map.values()) {
    list.sort((a, b) => a.afspraak_geboekt_op.localeCompare(b.afspraak_geboekt_op))
  }
  return map
}
```

- [ ] **Step 4: Run tests, verwacht groen**

```bash
npm run test -- lib/dashboard/calendar.test.ts
```

Verwacht: alle tests groen.

- [ ] **Step 5: Type-check + suite**

```bash
npx tsc --noEmit && npm run test
```

- [ ] **Step 6: Commit**

```bash
git add lib/dashboard/calendar.ts lib/dashboard/calendar.test.ts
git commit -m "feat(dashboard): add calendar helpers (parseMonthParam, getMonthGrid, day-key)"
```

---

### Task 2: agenda-queries — getAppointmentsForMonth (TDD)

**Files:**
- Create: `lib/dashboard/agenda-queries.ts`
- Create: `lib/dashboard/agenda-queries.test.ts`

- [ ] **Step 1: Schrijf failing tests**

Bestand `lib/dashboard/agenda-queries.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { builder, mockFrom } = vi.hoisted(() => {
  const builder: any = {}
  builder.select = vi.fn(() => builder)
  builder.gte = vi.fn(() => builder)
  builder.lt = vi.fn(() => builder)
  builder.not = vi.fn(() => builder)
  builder.order = vi.fn(() => Promise.resolve({ data: [], error: null }))
  const mockFrom = vi.fn(() => builder)
  return { builder, mockFrom }
})

vi.mock('./supabase-server', () => ({
  getDashboardSupabase: async () => ({ from: mockFrom }),
}))

import { getAppointmentsForMonth } from './agenda-queries'

function reset() {
  builder.select.mockClear()
  builder.gte.mockClear()
  builder.lt.mockClear()
  builder.not.mockClear()
  builder.order.mockClear()
  builder.order.mockReturnValue(Promise.resolve({ data: [], error: null }))
  mockFrom.mockClear()
  mockFrom.mockReturnValue(builder)
}

describe('getAppointmentsForMonth', () => {
  beforeEach(reset)

  it('queryt leads met afspraak_geboekt_op in de gevraagde maand', async () => {
    builder.order.mockReturnValueOnce(
      Promise.resolve({
        data: [
          {
            lead_id: 'L1',
            naam: 'Jan',
            telefoon: '06-1',
            afspraak_geboekt_op: '2026-05-05T10:00:00Z',
            dashboard_status: 'opgevolgd',
            status: 'akkoord',
          },
        ],
        error: null,
      })
    )

    const result = await getAppointmentsForMonth(2026, 5)

    expect(mockFrom).toHaveBeenCalledWith('leads')
    // Filter: afspraak_geboekt_op IS NOT NULL
    expect(builder.not).toHaveBeenCalledWith('afspraak_geboekt_op', 'is', null)
    // Range filter: gte van 1 mei, lt van 1 juni (exclusief, om june niet mee te tellen)
    expect(builder.gte).toHaveBeenCalledWith('afspraak_geboekt_op', '2026-05-01T00:00:00.000Z')
    expect(builder.lt).toHaveBeenCalledWith('afspraak_geboekt_op', '2026-06-01T00:00:00.000Z')
    expect(builder.order).toHaveBeenCalledWith('afspraak_geboekt_op', { ascending: true })
    expect(result).toHaveLength(1)
    expect(result[0].lead_id).toBe('L1')
  })

  it('december → januari: lt-grens is volgend jaar', async () => {
    await getAppointmentsForMonth(2026, 12)
    expect(builder.gte).toHaveBeenCalledWith('afspraak_geboekt_op', '2026-12-01T00:00:00.000Z')
    expect(builder.lt).toHaveBeenCalledWith('afspraak_geboekt_op', '2027-01-01T00:00:00.000Z')
  })

  it('returnt lege array bij error', async () => {
    builder.order.mockReturnValueOnce(
      Promise.resolve({ data: null, error: { message: 'oops' } })
    )
    expect(await getAppointmentsForMonth(2026, 5)).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests, verwacht failures**

```bash
npm run test -- lib/dashboard/agenda-queries.test.ts
```

- [ ] **Step 3: Implementeer agenda-queries.ts**

Bestand `lib/dashboard/agenda-queries.ts`:

```typescript
import { getDashboardSupabase } from './supabase-server'
import type { Lead } from './database.types'

export type Appointment = Pick<
  Lead,
  | 'lead_id'
  | 'naam'
  | 'telefoon'
  | 'afspraak_geboekt_op'
  | 'dashboard_status'
  | 'status'
>

const SELECT_COLUMNS = [
  'lead_id',
  'naam',
  'telefoon',
  'afspraak_geboekt_op',
  'dashboard_status',
  'status',
].join(', ')

/**
 * Haalt alle leads op met een `afspraak_geboekt_op`-tijdstip in de gevraagde
 * maand. Gebruikt UTC ISO-grenzen (`>= 1e van maand 00:00`, `< 1e van volgende maand 00:00`)
 * — eventuele tijdzone-correctie voor display gebeurt in de UI via toAmsterdamDayKey.
 *
 * Geen filter op dashboard_archived: gearchiveerde leads waarvan de afspraak in
 * de maand viel willen we wel zien voor historisch inzicht.
 */
export async function getAppointmentsForMonth(
  year: number,
  month: number  // 1-12
): Promise<Appointment[]> {
  const supabase = await getDashboardSupabase()

  const monthStart = new Date(Date.UTC(year, month - 1, 1)).toISOString()
  const monthEnd = new Date(Date.UTC(year, month, 1)).toISOString()  // 1e van volgende maand

  const { data, error } = await supabase
    .from('leads')
    .select(SELECT_COLUMNS)
    .not('afspraak_geboekt_op', 'is', null)
    .gte('afspraak_geboekt_op', monthStart)
    .lt('afspraak_geboekt_op', monthEnd)
    .order('afspraak_geboekt_op', { ascending: true })

  if (error) {
    console.error('[getAppointmentsForMonth] failed:', error)
    return []
  }
  return (data as unknown as Appointment[] | null) ?? []
}
```

- [ ] **Step 4: Run tests, verwacht groen**

```bash
npm run test -- lib/dashboard/agenda-queries.test.ts
```

- [ ] **Step 5: Type-check + suite**

```bash
npx tsc --noEmit && npm run test
```

- [ ] **Step 6: Commit**

```bash
git add lib/dashboard/agenda-queries.ts lib/dashboard/agenda-queries.test.ts
git commit -m "feat(dashboard): add agenda-queries (getAppointmentsForMonth)"
```

---

### Task 3: AgendaMonthNav component

**Files:**
- Create: `components/dashboard/agenda/AgendaMonthNav.tsx`
- Create: `components/dashboard/agenda/AgendaMonthNav.module.css`

- [ ] **Step 1: AgendaMonthNav.tsx**

```tsx
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { MonthRef } from '@/lib/dashboard/calendar'
import styles from './AgendaMonthNav.module.css'

function monthHref(ref: MonthRef): string {
  const m = ref.month.toString().padStart(2, '0')
  return `/agenda?month=${ref.year}-${m}`
}

export function AgendaMonthNav({
  prevMonth,
  nextMonth,
  monthLabel,
}: {
  prevMonth: MonthRef
  nextMonth: MonthRef
  monthLabel: string
}) {
  return (
    <div className={styles.nav}>
      <Link
        href={monthHref(prevMonth)}
        className={styles.arrow}
        aria-label="Vorige maand"
      >
        <ChevronLeft size={18} />
        <span className={styles.arrowLabel}>Vorige</span>
      </Link>
      <h1 className={styles.title}>{monthLabel}</h1>
      <div className={styles.right}>
        <Link href="/agenda" className={styles.todayBtn}>
          Vandaag
        </Link>
        <Link
          href={monthHref(nextMonth)}
          className={styles.arrow}
          aria-label="Volgende maand"
        >
          <span className={styles.arrowLabel}>Volgende</span>
          <ChevronRight size={18} />
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: AgendaMonthNav.module.css**

```css
.nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-6);
}

.title {
  margin: 0;
  font-size: var(--text-2xl);
  font-weight: 600;
  color: var(--color-text);
  text-transform: capitalize;
}

.right {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}

.arrow {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  text-decoration: none;
  font-size: var(--text-sm);
}

.arrow:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.arrowLabel {
  font-size: var(--text-sm);
}

.todayBtn {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
  color: var(--color-text);
  font-size: var(--text-sm);
  text-decoration: none;
}

.todayBtn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

@media (max-width: 640px) {
  .arrowLabel {
    display: none;
  }
}
```

- [ ] **Step 3: Type-check + commit**

```bash
npx tsc --noEmit
git add components/dashboard/agenda/AgendaMonthNav.tsx components/dashboard/agenda/AgendaMonthNav.module.css
git commit -m "feat(dashboard): add AgendaMonthNav (prev/today/next + maand-titel)"
```

---

### Task 4: AgendaAppointmentBlock component

**Files:**
- Create: `components/dashboard/agenda/AgendaAppointmentBlock.tsx`
- Create: `components/dashboard/agenda/AgendaAppointmentBlock.module.css`

- [ ] **Step 1: AgendaAppointmentBlock.tsx**

```tsx
import Link from 'next/link'
import type { Appointment } from '@/lib/dashboard/agenda-queries'
import styles from './AgendaAppointmentBlock.module.css'

function formatTime(iso: string): string {
  // HH:MM in Europe/Amsterdam
  return new Date(iso).toLocaleTimeString('nl-NL', {
    timeZone: 'Europe/Amsterdam',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function AgendaAppointmentBlock({
  appointment,
  isPast,
}: {
  appointment: Appointment
  isPast: boolean
}) {
  const naam = appointment.naam ?? 'Onbekend'
  const tijd = formatTime(appointment.afspraak_geboekt_op)
  const title = `${naam} • ${tijd}${
    appointment.dashboard_status ? ` • ${appointment.dashboard_status}` : ''
  }`

  return (
    <Link
      href={`/leads/${appointment.lead_id}`}
      className={`${styles.block} ${isPast ? styles.past : styles.future}`}
      title={title}
    >
      <span className={styles.tijd}>{tijd}</span>
      <span className={styles.naam}>{naam}</span>
    </Link>
  )
}
```

- [ ] **Step 2: AgendaAppointmentBlock.module.css**

```css
.block {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: 2px var(--space-2);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  text-decoration: none;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.future {
  background: var(--color-primary);
  color: white;
}

.future:hover {
  filter: brightness(1.05);
}

.past {
  background: var(--color-surface-2);
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
}

.past:hover {
  border-color: var(--color-text-muted);
  color: var(--color-text);
}

.tijd {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.naam {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}
```

- [ ] **Step 3: Type-check + commit**

```bash
npx tsc --noEmit
git add components/dashboard/agenda/AgendaAppointmentBlock.tsx components/dashboard/agenda/AgendaAppointmentBlock.module.css
git commit -m "feat(dashboard): add AgendaAppointmentBlock (klikbaar past/future)"
```

---

### Task 5: AgendaCalendar component (de grid)

**Files:**
- Create: `components/dashboard/agenda/AgendaCalendar.tsx`
- Create: `components/dashboard/agenda/AgendaCalendar.module.css`

- [ ] **Step 1: AgendaCalendar.tsx**

```tsx
import type { GridCell } from '@/lib/dashboard/calendar'
import type { Appointment } from '@/lib/dashboard/agenda-queries'
import { AgendaAppointmentBlock } from './AgendaAppointmentBlock'
import styles from './AgendaCalendar.module.css'

const WEEKDAYS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']
const MAX_VISIBLE_PER_DAY = 3

export function AgendaCalendar({
  cells,
  appointmentsByDay,
}: {
  cells: GridCell[]
  appointmentsByDay: Map<string, Appointment[]>
}) {
  return (
    <div className={styles.wrap}>
      <div className={styles.weekdays}>
        {WEEKDAYS.map((d) => (
          <div key={d} className={styles.weekday}>
            {d}
          </div>
        ))}
      </div>
      <div className={styles.grid}>
        {cells.map((cell) => {
          const appointments = appointmentsByDay.get(cell.dateKey) ?? []
          const visible = appointments.slice(0, MAX_VISIBLE_PER_DAY)
          const overflow = appointments.length - visible.length

          return (
            <div
              key={cell.dateKey}
              className={`${styles.cell} ${
                cell.isCurrentMonth ? styles.cellInMonth : styles.cellOutOfMonth
              }`}
            >
              <div className={styles.cellHeader}>
                <span
                  className={`${styles.day} ${cell.isToday ? styles.today : ''}`}
                >
                  {cell.dayOfMonth}
                </span>
              </div>
              <div className={styles.events}>
                {visible.map((a) => (
                  <AgendaAppointmentBlock
                    key={a.lead_id}
                    appointment={a}
                    isPast={cell.isPast}
                  />
                ))}
                {overflow > 0 && (
                  <a
                    href="#agenda-list"
                    className={styles.more}
                  >
                    +{overflow} meer
                  </a>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: AgendaCalendar.module.css**

```css
.wrap {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--color-bg);
}

.weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.weekday {
  padding: var(--space-2);
  font-size: var(--text-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
  text-align: center;
}

.grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-auto-rows: minmax(120px, auto);
}

.cell {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-2);
  border-right: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
  min-width: 0;
}

.cell:nth-child(7n) {
  border-right: none;
}

.cellInMonth {
  background: var(--color-bg);
}

.cellOutOfMonth {
  background: var(--color-surface);
  color: var(--color-text-muted);
}

.cellHeader {
  display: flex;
  justify-content: flex-end;
}

.day {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  font-size: var(--text-sm);
  font-variant-numeric: tabular-nums;
  color: var(--color-text-muted);
}

.cellInMonth .day {
  color: var(--color-text);
}

.today {
  background: var(--color-primary);
  color: white !important;
  border-radius: 50%;
  font-weight: 600;
}

.events {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.more {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  text-decoration: none;
  padding: 2px var(--space-1);
}

.more:hover {
  color: var(--color-primary);
  text-decoration: underline;
}

@media (max-width: 768px) {
  .grid {
    grid-auto-rows: minmax(80px, auto);
  }
  .weekday {
    padding: var(--space-1);
  }
}
```

NOTE: De `.today` class gebruikt `!important` om de cell-color override te beat. Acceptabel hier — er is geen elegantere CSS-way om een ringel-cirkel rond een nested span te krijgen zonder de specificity-strijd.

Wait — CLAUDE.md verbiedt `!important`. Vervang door specificity-trick: `.cellInMonth .day.today` ipv `!important`.

Actually, replace the rule:
```css
.today {
  background: var(--color-primary);
  color: white !important;
  ...
}
```

With:
```css
.cellInMonth .today,
.cellOutOfMonth .today {
  color: white;
}

.today {
  background: var(--color-primary);
  border-radius: 50%;
  font-weight: 600;
}
```

That's cleaner. Update the CSS in Step 2:

```css
.today {
  background: var(--color-primary);
  border-radius: 50%;
  font-weight: 600;
}

/* Override de muted/text color van de cel voor de today-cirkel zelf */
.cellInMonth .today,
.cellOutOfMonth .today {
  color: white;
}
```

- [ ] **Step 3: Type-check + commit**

```bash
npx tsc --noEmit
git add components/dashboard/agenda/AgendaCalendar.tsx components/dashboard/agenda/AgendaCalendar.module.css
git commit -m "feat(dashboard): add AgendaCalendar (7×N grid met past/future styling)"
```

---

### Task 6: AgendaAppointmentList component (overflow lijst)

**Files:**
- Create: `components/dashboard/agenda/AgendaAppointmentList.tsx`
- Create: `components/dashboard/agenda/AgendaAppointmentList.module.css`

- [ ] **Step 1: AgendaAppointmentList.tsx**

```tsx
import Link from 'next/link'
import type { Appointment } from '@/lib/dashboard/agenda-queries'
import { toAmsterdamDayKey } from '@/lib/dashboard/calendar'
import { dashboardStatusLabel } from '@/lib/dashboard/format'
import styles from './AgendaAppointmentList.module.css'

const NL_WEEKDAYS = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag']

function formatDayHeader(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  const weekday = NL_WEEKDAYS[date.getUTCDay()]
  return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)} ${d}`
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('nl-NL', {
    timeZone: 'Europe/Amsterdam',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function AgendaAppointmentList({
  appointments,
  monthLabel,
}: {
  appointments: Appointment[]
  monthLabel: string
}) {
  if (appointments.length === 0) {
    return (
      <div id="agenda-list" className={styles.section}>
        <h2 className={styles.heading}>Alle afspraken — {monthLabel}</h2>
        <p className={styles.empty}>Geen afspraken in deze maand.</p>
      </div>
    )
  }

  // Groepeer per dag (Europe/Amsterdam)
  const byDay = new Map<string, Appointment[]>()
  for (const a of appointments) {
    const key = toAmsterdamDayKey(a.afspraak_geboekt_op)
    const list = byDay.get(key) ?? []
    list.push(a)
    byDay.set(key, list)
  }
  const sortedKeys = [...byDay.keys()].sort()

  return (
    <div id="agenda-list" className={styles.section}>
      <h2 className={styles.heading}>Alle afspraken — {monthLabel}</h2>
      {sortedKeys.map((key) => (
        <div key={key} className={styles.day}>
          <h3 className={styles.dayLabel}>{formatDayHeader(key)}</h3>
          <ul className={styles.list}>
            {byDay.get(key)!.map((a) => (
              <li key={a.lead_id} className={styles.item}>
                <Link href={`/leads/${a.lead_id}`} className={styles.link}>
                  <span className={styles.tijd}>
                    {formatTime(a.afspraak_geboekt_op)}
                  </span>
                  <span className={styles.naam}>{a.naam ?? 'Onbekend'}</span>
                  {a.dashboard_status && (
                    <span className={styles.status}>
                      {dashboardStatusLabel(a.dashboard_status)}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: AgendaAppointmentList.module.css**

```css
.section {
  margin-top: var(--space-6);
  padding: var(--space-4);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.heading {
  margin: 0 0 var(--space-4);
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-text);
}

.day {
  margin-bottom: var(--space-4);
}

.day:last-child {
  margin-bottom: 0;
}

.dayLabel {
  margin: 0 0 var(--space-2);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text);
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.link {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2);
  background: var(--color-surface);
  border-radius: var(--radius-sm);
  text-decoration: none;
  color: var(--color-text);
  font-size: var(--text-sm);
}

.link:hover {
  background: var(--color-surface-2);
}

.tijd {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-muted);
  min-width: 50px;
}

.naam {
  flex: 1;
}

.status {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  padding: 2px var(--space-2);
  background: var(--color-bg);
  border-radius: var(--radius-sm);
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
git add components/dashboard/agenda/AgendaAppointmentList.tsx components/dashboard/agenda/AgendaAppointmentList.module.css
git commit -m "feat(dashboard): add AgendaAppointmentList (chronologische overflow-lijst)"
```

---

### Task 7: Wire into /agenda page

**Files:**
- Modify: `app/dashboard/(app)/agenda/page.tsx`

- [ ] **Step 1: Lees huidige page.tsx**

```bash
cat "app/dashboard/(app)/agenda/page.tsx"
```

Onthoud wat de placeholder bevat (waarschijnlijk een eenvoudige `<h1>Agenda</h1>`).

- [ ] **Step 2: Replace page.tsx**

```tsx
import {
  parseMonthParam,
  getMonthGrid,
  buildAppointmentsByDay,
} from '@/lib/dashboard/calendar'
import { getAppointmentsForMonth } from '@/lib/dashboard/agenda-queries'
import { AgendaMonthNav } from '@/components/dashboard/agenda/AgendaMonthNav'
import { AgendaCalendar } from '@/components/dashboard/agenda/AgendaCalendar'
import { AgendaAppointmentList } from '@/components/dashboard/agenda/AgendaAppointmentList'

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>
}) {
  const sp = await searchParams
  const ref = parseMonthParam(sp)
  const grid = getMonthGrid(ref.year, ref.month)
  const appointments = await getAppointmentsForMonth(ref.year, ref.month)
  const byDay = buildAppointmentsByDay(appointments)

  return (
    <div>
      <AgendaMonthNav
        prevMonth={grid.prevMonth}
        nextMonth={grid.nextMonth}
        monthLabel={grid.monthLabel}
      />
      <AgendaCalendar cells={grid.cells} appointmentsByDay={byDay} />
      <AgendaAppointmentList
        appointments={appointments}
        monthLabel={grid.monthLabel}
      />
    </div>
  )
}
```

- [ ] **Step 3: Type-check + build**

```bash
npx tsc --noEmit && npm run build 2>&1 | tail -30
```

Expected: schone build, route `/dashboard/agenda` listed.

- [ ] **Step 4: Commit**

```bash
git add "app/dashboard/(app)/agenda/page.tsx"
git commit -m "feat(dashboard): wire agenda page (calendar-grid + overflow lijst)"
```

---

### Task 8: Build + smoke test (USER manual)

- [ ] **Step 1: Final test suite**

```bash
cd "/Users/christiaantromp/Desktop/Frontlix website new"
npm run test
```

Expected: alle tests groen.

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

Op `http://app.localhost:3000/agenda`:

1. Pagina toont calendar-grid voor huidige maand met "mei 2026" (of equivalent) als titel
2. Cellen voor leading days van vorige maand zijn gegrijst
3. Vandaag heeft een blauwe cirkel rond het cijfer
4. Afspraken in de toekomst tonen als blauw blokje met `HH:MM Naam`
5. Afspraken in het verleden tonen als grijs blokje
6. Klik op een blokje → navigeert naar `/leads/[lead_id]`
7. Onder de grid: lijst "Alle afspraken — mei 2026" met dag-headers en klikbare rijen
8. Klik **Vorige** → URL wordt `?month=2026-04`, andere maand zichtbaar
9. Klik **Vandaag** → URL terug naar `/agenda`
10. Klik **Volgende** → volgende maand
11. Test jaar-grens: navigeer naar december → klik Volgende → URL `?month=2027-01`, jaar 2027 in titel
12. Test bij dag met >3 afspraken: cel toont "+N meer"-link → klik → page scrollt naar `#agenda-list`
13. Test mobile-view: weekday-labels blijven, cellen kleiner

- [ ] **Step 5: Smoke check de bot**

`pm2 logs` op de schoon-straatje VPS — geen nieuwe errors verwacht.

- [ ] **Step 6: Push naar GitHub**

```bash
git push origin main
```

---

## Summary checklist

Aan het einde van Plan 8:

- [ ] `lib/dashboard/calendar.ts` met parseMonthParam + getMonthGrid + toAmsterdamDayKey + buildAppointmentsByDay; tests groen
- [ ] `lib/dashboard/agenda-queries.ts` met getAppointmentsForMonth; tests groen
- [ ] `AgendaMonthNav` (server) prev/today/next werkt
- [ ] `AgendaAppointmentBlock` (server) past/future-styling correct
- [ ] `AgendaCalendar` (server) 7×N grid met today-highlight
- [ ] `AgendaAppointmentList` (server) chronologische lijst met dag-headers
- [ ] `/agenda` page wired alle componenten met URL-state
- [ ] Tijdzone Europe/Amsterdam correct: late-avond afspraken in NL vallen in juiste cel
- [ ] `npm run build` slaagt
- [ ] End-to-end smoke test groen
- [ ] Push naar GitHub

Met Plan 8 zijn alle 5 features uit de wenslijst geïmplementeerd. Dashboard is nu volledig: leads (Plan 4) + lichte acties (Plan 5) + leads-flow usability (Plan 6) + statistieken (Plan 7) + agenda (Plan 8).
