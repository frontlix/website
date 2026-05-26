# Mobile Overzicht Shell Make-over Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pixel-perfect mobiele app-shell (≤640px) met nieuwe MobileOverzicht-pagina + 3 drilldowns, gebaseerd op `mobile-overzicht-handoff/`, gevoed door bestaande SSR-data, met fallback voor alle andere routes.

**Architecture:** Client-wrapper `<DashboardChrome>` in dashboard-layout monteert beide chromes in DOM; CSS-media-query toggelt zichtbaarheid (zonder hydration-mismatch). MobileShell wraps `{children}` met dunne `<MobileShellHeader>` voor non-`/dashboard` routes en rijke `<MobileOverzichtHeader>` voor `/dashboard`. Drilldowns (Wat nu / Vandaag / Activiteit) zijn interne state met `history.pushState`-trick voor browser-back.

**Tech Stack:** Next.js App Router + TypeScript, CSS Modules + CSS custom properties (`styles/tokens.css`), Supabase server queries (`lib/dashboard/*`), bestaande hooks (`useMediaQuery`), Vitest voor unit tests.

**Spec:** [docs/superpowers/specs/2026-05-26-mobile-overzicht-shell-makeover-design.md](../specs/2026-05-26-mobile-overzicht-shell-makeover-design.md)

---

## Parallelization Map (voor sub-agent dispatch)

| Fase | Parallel-veilige tasks | Sequential check |
|---|---|---|
| 0 — Voorwerk | 0a, 0b, 0c, 0d, 0e, 0f, 0g (alle 7 onafhankelijk) | Check na fase: desktop draait, build groen, migratie ge-deployed |
| 1 — Mobile shell | 1a, 1b, 1c, 1d (alle 4 parallel) | 1e (integratie) **sequentieel** na 1a-d |
| 2 — Overzicht widgets | 2a, 2b, 2c, 2d, 2e, 2f, 2g (alle 7 parallel) | 2h (page-integratie) **sequentieel** na 2a-g |
| 3 — Drilldowns | 3a **eerst** (foundation), dan 3b, 3c, 3d parallel | 3e (binding) **sequentieel** na 3a-d |
| 4 — Sheets | 4a, 4b parallel | — |
| 5 — Cleanup | Sequentieel, met user-confirmation per delete | — |

**Dependencies tussen tasks:**
- Task 1a (HeaderActions) heeft Task 4a (MobileNotificationsSheet) als zachte dependency — placeholder OK tot 4a klaar is.
- Task 1d (MobileShellHeader) heeft Task 1a (HeaderActions) nodig.
- Task 2a (MobileOverzichtHeader) heeft Task 1a (HeaderActions) nodig.
- Task 3b/3c/3d (drilldown-views) hebben Task 3a (MobileDrilldownLayer) nodig.

---

## File Structure

**Nieuw:**
- `components/dashboard/mobile/DashboardChrome.tsx` + `.module.css` — client-wrapper, kiest zichtbare chrome op CSS-niveau
- `components/dashboard/mobile/MobileShell.tsx` + `.module.css` — header + main + BottomNav
- `components/dashboard/mobile/MobileShellHeader.tsx` + `.module.css` — dunne default header (titel + HeaderActions)
- `components/dashboard/mobile/HeaderActions.tsx` + `.module.css` — shared 🔍/➕/🔔 trio
- `components/dashboard/mobile/BottomNav.tsx` + `.module.css` — 5-tabs
- `components/dashboard/mobile/MeerSheet.tsx` + `.module.css` — slide-up sheet
- `components/dashboard/mobile/MobileNotificationsSheet.tsx` + `.module.css`
- `components/dashboard/mobile/overzicht/MobileOverzicht.tsx` + `.module.css`
- `components/dashboard/mobile/overzicht/MobileOverzichtHeader.tsx` + `.module.css`
- `components/dashboard/mobile/overzicht/AiBriefCard.tsx` + `.module.css`
- `components/dashboard/mobile/overzicht/HeroKpiCard.tsx` + `.module.css`
- `components/dashboard/mobile/overzicht/MiniKpiGrid.tsx` + `.module.css`
- `components/dashboard/mobile/overzicht/UrgentBlock.tsx` + `.module.css`
- `components/dashboard/mobile/overzicht/VandaagBlock.tsx` + `.module.css`
- `components/dashboard/mobile/overzicht/ActivityFeedBlock.tsx` + `.module.css`
- `components/dashboard/mobile/drilldowns/MobileDrilldownLayer.tsx` + `.module.css`
- `components/dashboard/mobile/drilldowns/WatNuView.tsx` + `.module.css`
- `components/dashboard/mobile/drilldowns/VandaagView.tsx` + `.module.css`
- `components/dashboard/mobile/drilldowns/ActiviteitView.tsx` + `.module.css`
- `hooks/useIsMobile.ts` + `useIsMobile.test.ts`
- `hooks/useBodyScrollLock.ts` + `useBodyScrollLock.test.ts`
- `lib/dashboard/surface-summary.ts` + `surface-summary.test.ts` (extract uit `SurfaceDailySummary.tsx`)
- Supabase migratie: `tenant_settings.omzet_doel_maand numeric NULL`

**Te wijzigen:**
- `app/dashboard/(app)/layout.tsx` — wrap met `<DashboardChrome>`
- `app/dashboard/(app)/page.tsx` — voed zowel desktop-view als `<MobileOverzicht>` met dezelfde server-prefetch
- `app/dashboard/(app)/instellingen/page.tsx` — input voor `omzet_doel_maand`
- `lib/dashboard/lead-queries.ts` — nieuwe export `leadsArrivedTodayAndTomorrow()`
- `lib/dashboard/stats-queries.ts` — export `sumOmzetMaand()` (als 'ie nog niet exported is)
- `components/dashboard/overzicht/SurfaceDailySummary.tsx` — importeer `buildSummary` uit nieuwe locatie
- `styles/tokens.css` — nieuwe mobile-tokens

**Te verwijderen (fase 5, na confirmation):**
- Mobile Overzicht-specifieke `@media (max-width: 640px)`-blokken in `KpiHeroCard.module.css`, `KpiMiniCard.module.css`, `KpiTabs.module.css`, etc.
- `Sidebar.module.css` `@media (max-width: 768px)` drawer
- `Topbar.module.css` mobile-blokken
- Hamburger-knop in `Topbar.tsx`

---

## Phase 0 — Voorwerk (alles parallel)

### Task 0a: Supabase migratie `tenant_settings.omzet_doel_maand`

**Files:**
- Run: SQL via Supabase MCP (of dashboard SQL editor)

- [ ] **Step 1: Inspect huidige schema**

```bash
# Via project Supabase MCP of dashboard query:
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'tenant_settings'
ORDER BY ordinal_position;
```

Expected: lijst kolommen; `omzet_doel_maand` mag nog niet bestaan.

- [ ] **Step 2: Migratie draaien**

```sql
ALTER TABLE tenant_settings
  ADD COLUMN omzet_doel_maand numeric NULL;

COMMENT ON COLUMN tenant_settings.omzet_doel_maand IS
  'Maand-omzet-doel in euros voor de Hero KPI ring op MobileOverzicht.';
```

- [ ] **Step 3: Verifieer**

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'tenant_settings' AND column_name = 'omzet_doel_maand';
```

Expected: 1 rij, `numeric`, `YES`.

- [ ] **Step 4: Commit een migratiebestand voor traceerbaarheid**

```bash
mkdir -p supabase/migrations
cat > "supabase/migrations/$(date -u +%Y%m%d%H%M%S)_add_omzet_doel_maand.sql" <<'EOF'
alter table tenant_settings
  add column if not exists omzet_doel_maand numeric null;

comment on column tenant_settings.omzet_doel_maand is
  'Maand-omzet-doel in euros voor de Hero KPI ring op MobileOverzicht.';
EOF
git add supabase/migrations
git commit -m "chore(db): add tenant_settings.omzet_doel_maand"
```

---

### Task 0b: `useIsMobile` hook + test

**Files:**
- Create: `hooks/useIsMobile.ts`
- Create: `hooks/useIsMobile.test.ts`

- [ ] **Step 1: Schrijf de failing test**

```ts
// hooks/useIsMobile.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useIsMobile } from './useIsMobile'

describe('useIsMobile', () => {
  let listeners: Array<(e: MediaQueryListEvent) => void> = []

  beforeEach(() => {
    listeners = []
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('640') && (window.innerWidth ?? 1024) <= 640,
      media: query,
      addEventListener: (_: string, cb: any) => listeners.push(cb),
      removeEventListener: (_: string, cb: any) => {
        listeners = listeners.filter((l) => l !== cb)
      },
      dispatchEvent: () => true,
      addListener: () => {},
      removeListener: () => {},
      onchange: null,
    }))
  })

  it('returns false initially (SSR-safe)', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true })
    const { result } = renderHook(() => useIsMobile())
    // useEffect zet 'm direct na mount op de echte waarde — die is false op 1024px.
    expect(result.current).toBe(false)
  })

  it('returns true op <=640px', () => {
    Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true })
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })
})
```

- [ ] **Step 2: Run test om te falen**

```bash
npx vitest run hooks/useIsMobile.test.ts
```

Expected: FAIL — file niet gevonden.

- [ ] **Step 3: Schrijf minimale implementatie**

```ts
// hooks/useIsMobile.ts
'use client'
import { useMediaQuery } from './useMediaQuery'

export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 640px)')
}
```

- [ ] **Step 4: Run test om te passen**

```bash
npx vitest run hooks/useIsMobile.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add hooks/useIsMobile.ts hooks/useIsMobile.test.ts
git commit -m "feat(mobile): useIsMobile hook (≤640px)"
```

---

### Task 0c: `useBodyScrollLock` hook + test

**Files:**
- Create: `hooks/useBodyScrollLock.ts`
- Create: `hooks/useBodyScrollLock.test.ts`

- [ ] **Step 1: Schrijf de failing test**

```ts
// hooks/useBodyScrollLock.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useBodyScrollLock } from './useBodyScrollLock'

describe('useBodyScrollLock', () => {
  beforeEach(() => {
    document.body.style.overflow = ''
  })

  it('lockt body.overflow als active=true', () => {
    renderHook(() => useBodyScrollLock(true))
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('houdt body.overflow leeg als active=false', () => {
    renderHook(() => useBodyScrollLock(false))
    expect(document.body.style.overflow).toBe('')
  })

  it('restored bij unmount', () => {
    const { unmount } = renderHook(() => useBodyScrollLock(true))
    expect(document.body.style.overflow).toBe('hidden')
    unmount()
    expect(document.body.style.overflow).toBe('')
  })
})
```

- [ ] **Step 2: Run om te falen**

```bash
npx vitest run hooks/useBodyScrollLock.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implementatie**

```ts
// hooks/useBodyScrollLock.ts
'use client'
import { useEffect } from 'react'

/**
 * Lockt body-scroll wanneer een sheet of modal openstaat.
 * Identiek patroon als ManualOfferteModal — gecentraliseerd
 * zodat MeerSheet, MobileNotificationsSheet, MobileSearchSheet
 * 't allemaal hergebruiken.
 */
export function useBodyScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [active])
}
```

- [ ] **Step 4: Run om te passen**

```bash
npx vitest run hooks/useBodyScrollLock.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add hooks/useBodyScrollLock.ts hooks/useBodyScrollLock.test.ts
git commit -m "feat(mobile): useBodyScrollLock hook voor sheets/modals"
```

---

### Task 0d: Extract `buildSurfaceSummary` uit `SurfaceDailySummary.tsx`

**Files:**
- Create: `lib/dashboard/surface-summary.ts`
- Create: `lib/dashboard/surface-summary.test.ts`
- Modify: `components/dashboard/overzicht/SurfaceDailySummary.tsx`

- [ ] **Step 1: Lees huidige `buildSummary` uit de component**

Bekijk `components/dashboard/overzicht/SurfaceDailySummary.tsx` regel 65-104. Kopieer `buildSummary`, `plural`, `formatEuro` (en eventuele types die ze nodig hebben — `SurfaceSummaryStats`).

- [ ] **Step 2: Schrijf de failing test**

```ts
// lib/dashboard/surface-summary.test.ts
import { describe, it, expect } from 'vitest'
import { buildSurfaceSummary, type SurfaceSummaryStats } from './surface-summary'

describe('buildSurfaceSummary', () => {
  it('produceert dezelfde tekst als de bestaande SurfaceDailySummary', () => {
    const stats: SurfaceSummaryStats = {
      newLeadsToday: 14,
      pendingOffertes: 2,
      longestWaitHours: 4,
      longestWaitName: 'Bakker',
    }
    const text = buildSurfaceSummary(stats)
    expect(text).toContain('14')
    expect(text).toContain('Bakker')
  })

  it('produceert geldige tekst bij lege stats', () => {
    const text = buildSurfaceSummary({
      newLeadsToday: 0,
      pendingOffertes: 0,
      longestWaitHours: 0,
    })
    expect(typeof text).toBe('string')
    expect(text.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 3: Maak `lib/dashboard/surface-summary.ts`**

Kopieer de geëxtraheerde functies. Exporteer `buildSurfaceSummary` (renamed van `buildSummary` voor duidelijkheid) en het type `SurfaceSummaryStats`. Pas testdata aan op de echte signature van de bestaande functie.

- [ ] **Step 4: Update `SurfaceDailySummary.tsx`**

Verwijder de inline `buildSummary` definitie. Importeer:

```tsx
import { buildSurfaceSummary } from '@/lib/dashboard/surface-summary'
```

Vervang lokale aanroep naar `buildSurfaceSummary(...)`. Desktop UI mag visueel niet wijzigen.

- [ ] **Step 5: Run tests + build**

```bash
npx vitest run lib/dashboard/surface-summary.test.ts
npm run build
```

Expected: PASS + build groen.

- [ ] **Step 6: Commit**

```bash
git add lib/dashboard/surface-summary.ts lib/dashboard/surface-summary.test.ts components/dashboard/overzicht/SurfaceDailySummary.tsx
git commit -m "refactor(dashboard): extract buildSurfaceSummary naar lib voor mobile reuse"
```

---

### Task 0e: `leadsArrivedTodayAndTomorrow()` query

**Files:**
- Modify: `lib/dashboard/lead-queries.ts`
- Create: `lib/dashboard/lead-queries.test.ts` (als 'ie nog niet bestaat — anders extend)

- [ ] **Step 1: Bestudeer bestaande patroon**

```bash
grep -n "export async function" lib/dashboard/lead-queries.ts
```

Kijk naar de signature van een bestaande functie als template (typisch: `(supabase: SupabaseClient) => Promise<...>`).

- [ ] **Step 2: Schrijf de test (mock-based)**

```ts
// lib/dashboard/lead-queries.test.ts (vul aan of nieuw)
import { describe, it, expect, vi } from 'vitest'
import { leadsArrivedTodayAndTomorrow } from './lead-queries'

function mockSupabase(counts: { today: number; tomorrow: number }) {
  return {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockImplementation(function (this: any, _col: string, val: string) {
      // 2e .lt() call (morgen-range einde) — return 'tomorrow' count.
      const callCount = this.lt.mock.calls.length
      return Promise.resolve({
        count: callCount === 1 ? counts.today : counts.tomorrow,
        error: null,
      })
    }),
  } as any
}

describe('leadsArrivedTodayAndTomorrow', () => {
  it('telt vandaag + morgen', async () => {
    const sb = mockSupabase({ today: 14, tomorrow: 4 })
    const result = await leadsArrivedTodayAndTomorrow(sb)
    expect(result).toEqual({ today: 14, tomorrow: 4 })
  })
})
```

> Note: pas de mock aan op het echte Supabase chain-patroon dat in `lead-queries.ts` gebruikt wordt — gebruik bestaande tests in `lib/dashboard/*.test.ts` als referentie.

- [ ] **Step 3: Implementatie toevoegen aan `lib/dashboard/lead-queries.ts`**

```ts
/**
 * Counts leads die vandaag binnen zijn gekomen en die morgen verwacht/ingepland zijn.
 * Voor de subline op MobileOverzichtHeader ("14 leads vandaag · 4 morgen").
 *
 * Gebruikt `created_at` (= binnenkomst-tijdstip in `leads`). Dag-grens is UTC-gebaseerd
 * omdat Supabase-timestamps in UTC staan. Voor strict-NL-tijdzone zou je hier
 * Europe/Amsterdam moeten toepassen — voorlopig overlapt UTC voldoende met NL-werkdag.
 */
export async function leadsArrivedTodayAndTomorrow(
  supabase: ReturnType<typeof import('@/lib/dashboard/supabase-server').getDashboardSupabase> extends Promise<infer T> ? T : never,
): Promise<{ today: number; tomorrow: number }> {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfTomorrow = new Date(startOfToday)
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1)
  const startOfDayAfterTomorrow = new Date(startOfTomorrow)
  startOfDayAfterTomorrow.setDate(startOfDayAfterTomorrow.getDate() + 1)

  const [todayRes, tomorrowRes] = await Promise.all([
    supabase
      .from('leads')
      .select('lead_id', { count: 'exact', head: true })
      .gte('created_at', startOfToday.toISOString())
      .lt('created_at', startOfTomorrow.toISOString()),
    supabase
      .from('leads')
      .select('lead_id', { count: 'exact', head: true })
      .gte('created_at', startOfTomorrow.toISOString())
      .lt('created_at', startOfDayAfterTomorrow.toISOString()),
  ])

  return {
    today: todayRes.count ?? 0,
    tomorrow: tomorrowRes.count ?? 0,
  }
}
```

- [ ] **Step 4: Run test**

```bash
npx vitest run lib/dashboard/lead-queries.test.ts -t "leadsArrivedTodayAndTomorrow"
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/dashboard/lead-queries.ts lib/dashboard/lead-queries.test.ts
git commit -m "feat(dashboard): leadsArrivedTodayAndTomorrow query voor mobile subline"
```

---

### Task 0f: Nieuwe mobile-tokens in `styles/tokens.css`

**Files:**
- Modify: `styles/tokens.css`

- [ ] **Step 1: Voeg tokens toe**

Edit `styles/tokens.css`, voeg in het hoofd-`:root` block toe (na de bestaande `--radius-*` tokens):

```css
  /* Mobile shell — safe-area + chrome heights */
  --mobile-header-h: 56px;
  --mobile-bottom-nav-h: 56px;
  --mobile-safe-area-bottom: env(safe-area-inset-bottom, 0px);
  --mobile-content-pad: var(--space-4);

  /* iOS-stijl easing voor sheets/drilldowns */
  --ease-ios: cubic-bezier(.32, .72, 0, 1);
  --dur-drilldown: 280ms;
  --dur-sheet: 320ms;

  /* Mobile-specifieke radii */
  --radius-card-mobile: 16px;
  --radius-sheet: 20px;
```

- [ ] **Step 2: Build groen?**

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add styles/tokens.css
git commit -m "feat(mobile): tokens voor mobile shell (heights, easing, radii)"
```

---

### Task 0g: Settings-form input voor `omzet_doel_maand`

**Files:**
- Modify: `app/dashboard/(app)/instellingen/page.tsx` (en relevante child-componenten/api-route)

- [ ] **Step 1: Lokaliseer settings-form**

```bash
ls app/dashboard/\(app\)/instellingen/
grep -rn "tenant_settings" app/dashboard/\(app\)/instellingen/ components/dashboard/instellingen/ 2>/dev/null | head -20
```

Bestudeer hoe andere `tenant_settings`-velden worden gerendered en opgeslagen (server-action / API-route). Volg dat patroon.

- [ ] **Step 2: Voeg input + persist toe**

In het juiste bestand (e.g. `components/dashboard/instellingen/AlgemeenForm.tsx` of equivalent), voeg een sectie toe:

```tsx
<label className={styles.field}>
  <span className={styles.fieldLabel}>Maand-omzetdoel</span>
  <span className={styles.fieldHelp}>
    Toont de voortgangsring op je mobiele Overzicht.
    Laat leeg om geen doel te tonen.
  </span>
  <div className={styles.euroInput}>
    <span aria-hidden="true">€</span>
    <input
      type="number"
      name="omzet_doel_maand"
      defaultValue={settings.omzet_doel_maand ?? ''}
      min={0}
      step="100"
      placeholder="25000"
      inputMode="numeric"
    />
  </div>
</label>
```

Update de server-action / API-route die de form-submit verwerkt om `omzet_doel_maand` (gecast naar `number | null`) te persisten in `tenant_settings`.

- [ ] **Step 3: Update read-pad**

Zoek waar `tenant_settings` wordt opgehaald in de settings-page; voeg `omzet_doel_maand` toe aan de `.select(...)` zodat 'ie meekomt.

- [ ] **Step 4: Visuele check + persistence**

Start dev-server, navigeer naar Instellingen, vul "25000" in, save, refresh, controleer dat de waarde blijft staan. Zet leeg, save, refresh, controleer NULL.

```bash
npm run dev
# Browser: http://localhost:3000/dashboard/instellingen
```

- [ ] **Step 5: Build groen**

```bash
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add app/dashboard/\(app\)/instellingen components/dashboard/instellingen
git commit -m "feat(instellingen): input voor maand-omzetdoel (mobile hero-ring)"
```

---

## Phase 1 — Mobile shell (deels parallel)

### Task 1a: `HeaderActions` component (shared 🔍 / ➕ / 🔔)

**Files:**
- Create: `components/dashboard/mobile/HeaderActions.tsx`
- Create: `components/dashboard/mobile/HeaderActions.module.css`

- [ ] **Step 1: Component**

```tsx
// components/dashboard/mobile/HeaderActions.tsx
'use client'

import Link from 'next/link'
import { useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { Search, Plus, Bell } from 'lucide-react'
import type { NotifItem } from '@/components/dashboard/NotificationPanel'
import { MobileNotificationsSheet } from './MobileNotificationsSheet'
import styles from './HeaderActions.module.css'

type Props = {
  notifications?: NotifItem[]
  unreadCount?: number
  onOpenSearch: () => void
}

/**
 * 3 acties die op elke mobile-header zichtbaar zijn: zoek, +offerte, bel.
 * Hergebruikt door zowel <MobileShellHeader> (default) als
 * <MobileOverzichtHeader> (rijke variant op /dashboard).
 */
export function HeaderActions({ notifications = [], unreadCount = 0, onOpenSearch }: Props) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [notifOpen, setNotifOpen] = useState(false)

  const offerteHref = (() => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('nieuwe-offerte', '1')
    return `${pathname}?${params.toString()}`
  })()

  return (
    <>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.iconBtn}
          aria-label="Zoeken"
          onClick={onOpenSearch}
        >
          <Search size={18} />
        </button>

        <Link
          href={offerteHref}
          scroll={false}
          aria-label="Nieuwe offerte"
          className={styles.plusBtn}
        >
          <Plus size={20} strokeWidth={2.6} />
        </Link>

        <button
          type="button"
          className={styles.iconBtn}
          aria-label="Notificaties"
          onClick={() => setNotifOpen(true)}
        >
          <Bell size={18} />
          {unreadCount > 0 && <span className={styles.dot} aria-hidden="true" />}
        </button>
      </div>

      {notifOpen && (
        <MobileNotificationsSheet
          items={notifications}
          unreadCount={unreadCount}
          onClose={() => setNotifOpen(false)}
        />
      )}
    </>
  )
}
```

- [ ] **Step 2: CSS**

```css
/* components/dashboard/mobile/HeaderActions.module.css */
.actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.iconBtn {
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  background: var(--surface-2, var(--color-surface-2));
  border: 1px solid var(--color-border);
  display: grid;
  place-items: center;
  color: var(--color-text);
  cursor: pointer;
  transition: background 0.15s ease;
}
.iconBtn:hover { background: var(--color-surface); }
.iconBtn:active { transform: scale(0.96); }

.plusBtn {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  background: var(--color-gradient);
  color: white;
  display: grid;
  place-items: center;
  box-shadow: 0 4px 14px rgb(26 86 255 / 0.25);
  transition: transform 0.15s ease;
}
.plusBtn:active { transform: scale(0.96); }

.dot {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  background: #ef4444;
  border: 2px solid var(--color-bg);
}
```

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/mobile/HeaderActions.tsx components/dashboard/mobile/HeaderActions.module.css
git commit -m "feat(mobile): HeaderActions component (🔍/➕/🔔)"
```

> Note: `MobileNotificationsSheet` wordt in Task 4a gebouwd — tot dan importeert dit een nog-niet-bestaande file. Dat is OK voor agentic parallel work: deze task heeft 4a als dependency in fase 1's link-stap. Voor solo-build: bouw eerst een lege placeholder MobileNotificationsSheet die alleen `onClose` ontvangt en `null` rendert.

---

### Task 1b: `BottomNav` component

**Files:**
- Create: `components/dashboard/mobile/BottomNav.tsx`
- Create: `components/dashboard/mobile/BottomNav.module.css`

- [ ] **Step 1: Component**

```tsx
// components/dashboard/mobile/BottomNav.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ClipboardList, Inbox, Calendar, Menu } from 'lucide-react'
import styles from './BottomNav.module.css'

type Counts = {
  leads?: number
  inbox?: number
  meer?: boolean  // dot indicator
}

type Tab = 'home' | 'leads' | 'inbox' | 'cal' | 'meer'

const PAGE_TO_TAB: Record<string, Tab> = {
  '/dashboard': 'home',
  '/leads': 'leads',
  '/inbox': 'inbox',
  '/agenda': 'cal',
  '/reviews': 'meer',
  '/statistieken': 'meer',
  '/veldwerk': 'meer',
  '/instellingen': 'meer',
}

function activeTab(pathname: string): Tab {
  // Match op prefix zodat sub-routes correct gehighlight worden.
  for (const [path, tab] of Object.entries(PAGE_TO_TAB)) {
    if (pathname === path || pathname.startsWith(`${path}/`)) return tab
  }
  return 'home'
}

type Props = {
  counts?: Counts
  onOpenMeer: () => void
}

export function BottomNav({ counts = {}, onOpenMeer }: Props) {
  const pathname = usePathname()
  const active = activeTab(pathname)

  return (
    <nav className={styles.nav} aria-label="Hoofdnavigatie">
      <Link href="/dashboard" className={`${styles.tab} ${active === 'home' ? styles.active : ''}`}>
        <Home size={20} aria-hidden="true" />
        <span className={styles.label}>Overzicht</span>
      </Link>

      <Link href="/leads" className={`${styles.tab} ${active === 'leads' ? styles.active : ''}`}>
        <span className={styles.iconWrap}>
          <ClipboardList size={20} aria-hidden="true" />
          {counts.leads ? <span className={styles.badge}>{counts.leads}</span> : null}
        </span>
        <span className={styles.label}>Leads</span>
      </Link>

      <Link href="/inbox" className={`${styles.tab} ${active === 'inbox' ? styles.active : ''}`}>
        <span className={styles.iconWrap}>
          <Inbox size={20} aria-hidden="true" />
          {counts.inbox ? <span className={styles.badge}>{counts.inbox}</span> : null}
        </span>
        <span className={styles.label}>Inbox</span>
      </Link>

      <Link href="/agenda" className={`${styles.tab} ${active === 'cal' ? styles.active : ''}`}>
        <Calendar size={20} aria-hidden="true" />
        <span className={styles.label}>Agenda</span>
      </Link>

      <button
        type="button"
        className={`${styles.tab} ${active === 'meer' ? styles.active : ''}`}
        onClick={onOpenMeer}
        aria-label="Meer opties"
      >
        <span className={styles.iconWrap}>
          <Menu size={20} aria-hidden="true" />
          {counts.meer && <span className={styles.dotIndicator} />}
        </span>
        <span className={styles.label}>Meer</span>
      </button>
    </nav>
  )
}
```

- [ ] **Step 2: CSS**

```css
/* components/dashboard/mobile/BottomNav.module.css */
.nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: calc(var(--mobile-bottom-nav-h) + var(--mobile-safe-area-bottom));
  padding-bottom: var(--mobile-safe-area-bottom);
  background: var(--color-bg);
  border-top: 1px solid var(--color-border);
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  z-index: 50;
}

.tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: var(--space-2);
  color: var(--color-text-muted);
  background: none;
  border: none;
  cursor: pointer;
  text-decoration: none;
}

.tab.active {
  color: var(--color-primary);
}

.iconWrap {
  position: relative;
  display: grid;
  place-items: center;
}

.label {
  font-size: var(--text-xs);
  font-weight: 500;
}

.badge {
  position: absolute;
  top: -6px;
  right: -10px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: var(--radius-full);
  background: #ef4444;
  color: white;
  font-size: 10px;
  font-weight: 600;
  display: grid;
  place-items: center;
}

.dotIndicator {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  background: #ef4444;
}
```

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/mobile/BottomNav.tsx components/dashboard/mobile/BottomNav.module.css
git commit -m "feat(mobile): BottomNav met 5 tabs + active-state mapping"
```

---

### Task 1c: `MeerSheet` component

**Files:**
- Create: `components/dashboard/mobile/MeerSheet.tsx`
- Create: `components/dashboard/mobile/MeerSheet.module.css`

- [ ] **Step 1: Component**

```tsx
// components/dashboard/mobile/MeerSheet.tsx
'use client'

import Link from 'next/link'
import { Star, BarChart3, Truck } from 'lucide-react'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { ThemeToggle } from '@/components/dashboard/ui/ThemeToggle' // zie note onder
import styles from './MeerSheet.module.css'

type Props = {
  open: boolean
  onClose: () => void
  bedrijfsnaam: string
  userInitials: string
  userName: string
  userRole?: string
  reviewsCount?: number
}

export function MeerSheet({
  open,
  onClose,
  bedrijfsnaam,
  userInitials,
  userName,
  userRole = 'Owner',
  reviewsCount,
}: Props) {
  useBodyScrollLock(open)

  if (!open) return null

  return (
    <div className={styles.root} role="dialog" aria-modal="true" aria-label="Meer opties">
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />

      <div className={styles.sheet}>
        <div className={styles.dragHandle} aria-hidden="true" />

        <div className={styles.head}>
          <span className={styles.headLabel}>MEER</span>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            Sluit
          </button>
        </div>

        <Link href="/reviews" className={styles.row} onClick={onClose}>
          <span className={styles.rowIcon} data-tone="amber">
            <Star size={18} />
          </span>
          <span className={styles.rowText}>
            <span className={styles.rowTitle}>Reviews</span>
            <span className={styles.rowSub}>
              {reviewsCount ? `${reviewsCount} nieuwe deze week` : 'Beheer je reviews'}
            </span>
          </span>
          {reviewsCount ? <span className={styles.rowBadge}>{reviewsCount}</span> : null}
          <span className={styles.chevron}>›</span>
        </Link>

        <Link href="/statistieken" className={styles.row} onClick={onClose}>
          <span className={styles.rowIcon} data-tone="violet">
            <BarChart3 size={18} />
          </span>
          <span className={styles.rowText}>
            <span className={styles.rowTitle}>Analyses</span>
            <span className={styles.rowSub}>Conversie, omzet, bot-prestaties</span>
          </span>
          <span className={styles.chevron}>›</span>
        </Link>

        <Link href="/veldwerk" className={styles.row} onClick={onClose}>
          <span className={styles.rowIcon} data-tone="blue">
            <Truck size={18} />
          </span>
          <span className={styles.rowText}>
            <span className={styles.rowTitle}>Veldwerk</span>
            <span className={styles.rowSub}>Voor onderweg</span>
          </span>
          <span className={styles.tag}>PWA</span>
          <span className={styles.chevron}>›</span>
        </Link>

        <div className={styles.themeBlock}>
          <ThemeToggle variant="inline" />
        </div>

        <div className={styles.profileStrip}>
          <span className={styles.avatar} aria-hidden="true">{userInitials}</span>
          <div className={styles.profileText}>
            <div className={styles.profileName}>{userName}</div>
            <div className={styles.profileSub}>{userRole} · {bedrijfsnaam}</div>
          </div>
          <Link
            href="/instellingen"
            className={styles.profileBtn}
            onClick={onClose}
          >
            Instellingen
          </Link>
        </div>

        <Link href="/dashboard/logout" className={styles.logout}>
          Uitloggen
        </Link>
      </div>
    </div>
  )
}
```

> Note: `ThemeToggle` met `variant="inline"` mag een nieuwe prop op de bestaande `ThemeToggle` zijn als die nog niet bestaat — alternatief is een mobile-eigen wrapper. Als de bestaande `ThemeToggle` zich slecht laat inpassen, maak `MeerThemeToggle.tsx` lokaal in `components/dashboard/mobile/`.

- [ ] **Step 2: CSS**

```css
/* components/dashboard/mobile/MeerSheet.module.css */
.root {
  position: fixed;
  inset: 0;
  z-index: 100;
}

.backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.36);
  animation: fadeIn var(--dur-sheet) var(--ease-ios);
}

.sheet {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--color-bg);
  border-radius: var(--radius-sheet) var(--radius-sheet) 0 0;
  padding: var(--space-3) var(--space-4) calc(var(--mobile-safe-area-bottom) + var(--space-4));
  transform: translateY(0);
  animation: slideUp var(--dur-sheet) var(--ease-ios);
  max-height: 85vh;
  overflow-y: auto;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateY(110%); }
  to   { transform: translateY(0); }
}

.dragHandle {
  width: 40px;
  height: 4px;
  border-radius: 2px;
  background: var(--color-border);
  margin: 0 auto var(--space-4);
}

.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-4);
}
.headLabel {
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--color-text-muted);
}
.closeBtn {
  background: none;
  border: none;
  font-size: var(--text-base);
  color: var(--color-primary);
  font-weight: 500;
  cursor: pointer;
}

.row {
  display: grid;
  grid-template-columns: 40px 1fr auto auto;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--color-border);
  min-height: 60px;
  text-decoration: none;
  color: var(--color-text);
}

.rowIcon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  display: grid;
  place-items: center;
}
.rowIcon[data-tone="amber"]  { background: #fef3c7; color: #d97706; }
.rowIcon[data-tone="violet"] { background: #ede9fe; color: #7c3aed; }
.rowIcon[data-tone="blue"]   { background: #dbeafe; color: var(--color-primary); }

.rowText { display: flex; flex-direction: column; min-width: 0; }
.rowTitle { font-weight: 600; }
.rowSub { font-size: var(--text-sm); color: var(--color-text-muted); }

.rowBadge {
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: var(--radius-full);
  background: #ef4444;
  color: white;
  font-size: 12px;
  font-weight: 600;
  display: grid;
  place-items: center;
}

.tag {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  padding: 3px 6px;
  border-radius: var(--radius-sm);
  background: var(--color-surface-2);
  color: var(--color-text-muted);
}

.chevron {
  color: var(--color-text-muted);
  font-size: 20px;
}

.themeBlock {
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--color-border);
}

.profileStrip {
  display: grid;
  grid-template-columns: 40px 1fr auto;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-3);
  margin-top: var(--space-4);
  background: var(--color-surface);
  border-radius: var(--radius-lg);
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  background: var(--color-gradient);
  color: white;
  font-weight: 700;
  display: grid;
  place-items: center;
}
.profileName { font-weight: 600; }
.profileSub { font-size: var(--text-sm); color: var(--color-text-muted); }

.profileBtn {
  background: var(--color-primary);
  color: white;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: 500;
  text-decoration: none;
}

.logout {
  display: block;
  text-align: center;
  padding: var(--space-4) 0 0;
  color: #ef4444;
  font-weight: 500;
  text-decoration: none;
}
```

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/mobile/MeerSheet.tsx components/dashboard/mobile/MeerSheet.module.css
git commit -m "feat(mobile): MeerSheet slide-up bottom-sheet"
```

---

### Task 1d: `MobileShellHeader` component

**Files:**
- Create: `components/dashboard/mobile/MobileShellHeader.tsx`
- Create: `components/dashboard/mobile/MobileShellHeader.module.css`

- [ ] **Step 1: Component**

```tsx
// components/dashboard/mobile/MobileShellHeader.tsx
'use client'

import { usePathname } from 'next/navigation'
import { HeaderActions } from './HeaderActions'
import type { NotifItem } from '@/components/dashboard/NotificationPanel'
import styles from './MobileShellHeader.module.css'

const PAGE_TITLES: Record<string, string> = {
  '/leads': 'Leads',
  '/inbox': 'Inbox',
  '/agenda': 'Agenda',
  '/reviews': 'Reviews',
  '/statistieken': 'Statistieken',
  '/veldwerk': 'Veldwerk',
  '/instellingen': 'Instellingen',
}

function titleFor(pathname: string): string {
  for (const [path, title] of Object.entries(PAGE_TITLES)) {
    if (pathname === path || pathname.startsWith(`${path}/`)) return title
  }
  return 'Dashboard'
}

type Props = {
  notifications?: NotifItem[]
  unreadCount?: number
  onOpenSearch: () => void
}

export function MobileShellHeader({ notifications, unreadCount, onOpenSearch }: Props) {
  const pathname = usePathname()
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>{titleFor(pathname)}</h1>
      <HeaderActions
        notifications={notifications}
        unreadCount={unreadCount}
        onOpenSearch={onOpenSearch}
      />
    </header>
  )
}
```

- [ ] **Step 2: CSS**

```css
/* components/dashboard/mobile/MobileShellHeader.module.css */
.header {
  position: sticky;
  top: 0;
  z-index: 30;
  background: var(--color-bg);
  border-bottom: 1px solid var(--color-border);
  height: var(--mobile-header-h);
  padding: 0 var(--mobile-content-pad);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.title {
  font-size: var(--text-xl);
  font-weight: 700;
  margin: 0;
}
```

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/mobile/MobileShellHeader.tsx components/dashboard/mobile/MobileShellHeader.module.css
git commit -m "feat(mobile): MobileShellHeader (dunne default header)"
```

---

### Task 1e: `MobileShell` + `DashboardChrome` (integratie)

**Files:**
- Create: `components/dashboard/mobile/MobileShell.tsx` + `.module.css`
- Create: `components/dashboard/mobile/DashboardChrome.tsx` + `.module.css`
- Modify: `app/dashboard/(app)/layout.tsx`

- [ ] **Step 1: `MobileShell` component**

```tsx
// components/dashboard/mobile/MobileShell.tsx
'use client'

import { ReactNode, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { MobileShellHeader } from './MobileShellHeader'
import { BottomNav } from './BottomNav'
import { MeerSheet } from './MeerSheet'
import type { NotifItem } from '@/components/dashboard/NotificationPanel'
import styles from './MobileShell.module.css'

type Props = {
  children: ReactNode
  bedrijfsnaam: string
  userInitials: string
  userName: string
  notifications?: NotifItem[]
  unreadCount?: number
  counts?: { leads?: number; inbox?: number; meer?: boolean }
}

export function MobileShell({
  children,
  bedrijfsnaam,
  userInitials,
  userName,
  notifications,
  unreadCount,
  counts,
}: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [meerOpen, setMeerOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  // Op /dashboard rendert MobileOverzicht z'n eigen rijke header.
  // Anders monteren wij de dunne MobileShellHeader.
  const isOverzicht = pathname === '/dashboard'

  return (
    <div className={styles.shell}>
      {!isOverzicht && (
        <MobileShellHeader
          notifications={notifications}
          unreadCount={unreadCount}
          onOpenSearch={() => setSearchOpen(true)}
        />
      )}

      <main className={styles.main}>
        {children}
      </main>

      <BottomNav counts={counts} onOpenMeer={() => setMeerOpen(true)} />

      <MeerSheet
        open={meerOpen}
        onClose={() => setMeerOpen(false)}
        bedrijfsnaam={bedrijfsnaam}
        userInitials={userInitials}
        userName={userName}
      />

      {/* MobileSearchSheet komt in fase 4 — voor nu inline placeholder, of importeren als 'ie al bestaat. */}
      {searchOpen && (
        <SearchSheetMount onSubmit={(q) => {
          setSearchOpen(false)
          if (q.trim()) router.push(`/leads?q=${encodeURIComponent(q.trim())}`)
        }} onClose={() => setSearchOpen(false)} />
      )}
    </div>
  )
}

// Tijdelijke wrapper — wordt vervangen in fase 4 door de definitieve MobileSearchSheet.
function SearchSheetMount({ onSubmit, onClose }: { onSubmit: (q: string) => void; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.36)', zIndex: 100 }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        background: 'var(--color-bg)', padding: '16px',
        boxShadow: '0 4px 20px rgba(0,0,0,.1)',
      }}>
        <form onSubmit={(e) => { e.preventDefault(); const q = (new FormData(e.currentTarget).get('q') as string) ?? ''; onSubmit(q); }}>
          <input name="q" autoFocus placeholder="Zoek leads, adressen, telefoon…" style={{ width: '100%', height: 44, padding: '0 12px', borderRadius: 8, border: '1px solid var(--color-border)' }} />
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: `MobileShell.module.css`**

```css
/* components/dashboard/mobile/MobileShell.module.css */
.shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--color-bg);
  color: var(--color-text);
}

.main {
  flex: 1;
  padding-bottom: calc(var(--mobile-bottom-nav-h) + var(--mobile-safe-area-bottom));
  overflow-y: auto;
}
```

- [ ] **Step 3: `DashboardChrome` component**

```tsx
// components/dashboard/mobile/DashboardChrome.tsx
'use client'

import { ReactNode } from 'react'
import { MobileShell } from './MobileShell'
import type { NotifItem } from '@/components/dashboard/NotificationPanel'
import styles from './DashboardChrome.module.css'

type Props = {
  children: ReactNode
  desktop: ReactNode               // de bestaande Sidebar+Topbar+main markup als ReactNode
  bedrijfsnaam: string
  userInitials: string
  userName: string
  notifications?: NotifItem[]
  unreadCount?: number
  counts?: { leads?: number; inbox?: number; meer?: boolean }
}

/**
 * Mount beide chromes; CSS toggle bepaalt zichtbaarheid op viewport-niveau.
 * Geen JS-gated mount/unmount → geen hydration mismatch.
 *
 * Performance-noot: hoewel beide chromes in DOM staan, hebben ze geen
 * onafhankelijke data-fetches. Server-side render is identiek; client-side
 * doet React effectief alleen werk voor de zichtbare boom (browsers skippen
 * layout/paint voor display:none subtrees).
 */
export function DashboardChrome({
  children,
  desktop,
  bedrijfsnaam,
  userInitials,
  userName,
  notifications,
  unreadCount,
  counts,
}: Props) {
  return (
    <>
      <div className={styles.desktopOnly}>
        {desktop}
      </div>
      <div className={styles.mobileOnly}>
        <MobileShell
          bedrijfsnaam={bedrijfsnaam}
          userInitials={userInitials}
          userName={userName}
          notifications={notifications}
          unreadCount={unreadCount}
          counts={counts}
        >
          {children}
        </MobileShell>
      </div>
    </>
  )
}
```

- [ ] **Step 4: `DashboardChrome.module.css`**

```css
/* components/dashboard/mobile/DashboardChrome.module.css */
.desktopOnly { display: block; }
.mobileOnly  { display: none; }

@media (max-width: 640px) {
  .desktopOnly { display: none; }
  .mobileOnly  { display: block; }
}
```

- [ ] **Step 5: Refactor `app/dashboard/(app)/layout.tsx`**

```tsx
// app/dashboard/(app)/layout.tsx
import { requireApprovedUser } from '@/lib/dashboard/require-approved-user'
import { getDashboardSupabase } from '@/lib/dashboard/supabase-server'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { TopbarServer } from '@/components/dashboard/TopbarServer'
import { ManualOfferteController } from '@/components/dashboard/offerte/ManualOfferteController'
import { OnboardingWizard } from '@/components/dashboard/OnboardingWizard'
import { ExportsModal } from '@/components/dashboard/ExportsModal'
import { DashboardChrome } from '@/components/dashboard/mobile/DashboardChrome'
import styles from './layout.module.css'
import '@/styles/dashboard.css'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireApprovedUser()
  const supabase = await getDashboardSupabase()

  const [settingsRes, openLeadsRes, upcomingApptsRes] = await Promise.all([
    supabase
      .from('tenant_settings')
      .select('bedrijfsnaam')
      .limit(1)
      .maybeSingle(),
    supabase
      .from('leads')
      .select('lead_id', { count: 'exact', head: true })
      .eq('dashboard_archived', false)
      .neq('dashboard_status', 'afgehandeld'),
    supabase
      .from('leads')
      .select('lead_id', { count: 'exact', head: true })
      .not('afspraak_geboekt_op', 'is', null)
      .gte('afspraak_geboekt_op', new Date().toISOString()),
  ])

  const settings = settingsRes.data as { bedrijfsnaam: string | null } | null
  const bedrijfsnaam = settings?.bedrijfsnaam ?? profile.bedrijfsnaam ?? 'Dashboard'
  const userName = profile.naam ?? (user.email?.split('@')[0] ?? 'Gebruiker')
  const userInitials = (profile.naam ?? user.email ?? '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')

  const counts = {
    leads: openLeadsRes.count ?? 0,
    agenda: upcomingApptsRes.count ?? 0,
  }

  const desktopChrome = (
    <div className={`${styles.shell} density-cozy`}>
      <Sidebar bedrijfsnaam={bedrijfsnaam} email={user.email ?? ''} counts={counts} />
      <div className={styles.main}>
        <TopbarServer />
        <main className={styles.content}>
          <div className={styles.contentInner}>{children}</div>
        </main>
      </div>
    </div>
  )

  return (
    <>
      <DashboardChrome
        desktop={desktopChrome}
        bedrijfsnaam={bedrijfsnaam}
        userInitials={userInitials}
        userName={userName}
        counts={{ leads: counts.leads }}
      >
        {children}
      </DashboardChrome>
      <ManualOfferteController />
      <ExportsModal />
      {!profile.onboarding_voltooid_op && <OnboardingWizard />}
    </>
  )
}
```

> Note: `profile.naam` is een aanname; check `requireApprovedUser`'s return-shape. Als de profile-types `voornaam` of `display_name` heten, pas aan.

- [ ] **Step 6: Run build**

```bash
npm run build
```

Expected: PASS (geen TypeScript-fouten).

- [ ] **Step 7: Visuele check — DevTools mobile mode**

```bash
npm run dev
```

- Open `localhost:3000/dashboard` in DevTools, zet viewport op 375px breed.
- Verwacht: geen sidebar, geen topbar, bottom-nav onderaan (5 tabs), `{children}` toont nog de oude desktop-Overzicht (dat wordt fase 2).
- Zet viewport op 800px breed. Verwacht: bestaande desktop-UX onveranderd.
- Tab tussen Overzicht/Leads/Inbox/Agenda — werkt.
- Tab "Meer" — opent sheet, sluit via Sluit/backdrop, navigeer via een rij.

- [ ] **Step 8: Commit**

```bash
git add components/dashboard/mobile/MobileShell.tsx components/dashboard/mobile/MobileShell.module.css \
        components/dashboard/mobile/DashboardChrome.tsx components/dashboard/mobile/DashboardChrome.module.css \
        app/dashboard/\(app\)/layout.tsx
git commit -m "feat(mobile): MobileShell + DashboardChrome integratie in dashboard-layout"
```

---

## Phase 2 — Mobile Overzicht widgets (alle widgets parallel, dan integratie)

Voor alle widgets in deze fase: visuele referentie = handoff `mobile-overzicht-handoff/AOverzicht.jsx` (zoek per widget op naam) + screenshot 1.

### Task 2a: `MobileOverzichtHeader`

**Files:**
- Create: `components/dashboard/mobile/overzicht/MobileOverzichtHeader.tsx`
- Create: `components/dashboard/mobile/overzicht/MobileOverzichtHeader.module.css`

- [ ] **Step 1: Component**

```tsx
// components/dashboard/mobile/overzicht/MobileOverzichtHeader.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { HeaderActions } from '../HeaderActions'
import type { NotifItem } from '@/components/dashboard/NotificationPanel'
import styles from './MobileOverzichtHeader.module.css'

type Props = {
  greeting: string                // bv. "Goedemiddag"
  voornaam?: string
  leadsToday: number
  leadsTomorrow: number
  notifications?: NotifItem[]
  unreadCount?: number
}

export function MobileOverzichtHeader({
  greeting,
  voornaam,
  leadsToday,
  leadsTomorrow,
  notifications,
  unreadCount,
}: Props) {
  const router = useRouter()
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <header className={styles.header}>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>{greeting}{voornaam ? `, ${voornaam}` : ''}</h1>
        <HeaderActions
          notifications={notifications}
          unreadCount={unreadCount}
          onOpenSearch={() => setSearchOpen(true)}
        />
      </div>
      <div className={styles.subline}>
        <span className={styles.statusDot} aria-hidden="true" />
        {leadsToday} {leadsToday === 1 ? 'lead' : 'leads'} vandaag · {leadsTomorrow} morgen
      </div>

      {searchOpen && (
        <SearchOverlay
          onSubmit={(q) => {
            setSearchOpen(false)
            if (q.trim()) router.push(`/leads?q=${encodeURIComponent(q.trim())}`)
          }}
          onClose={() => setSearchOpen(false)}
        />
      )}
    </header>
  )
}

function SearchOverlay({ onSubmit, onClose }: { onSubmit: (q: string) => void; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.36)', zIndex: 100 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ position: 'fixed', top: 0, left: 0, right: 0, background: 'var(--color-bg)', padding: 16 }}>
        <form onSubmit={(e) => { e.preventDefault(); const q = (new FormData(e.currentTarget).get('q') as string) ?? ''; onSubmit(q); }}>
          <input name="q" autoFocus placeholder="Zoek leads, adressen, telefoon…" style={{ width: '100%', height: 44, padding: '0 12px', borderRadius: 8, border: '1px solid var(--color-border)' }} />
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: CSS**

```css
/* components/dashboard/mobile/overzicht/MobileOverzichtHeader.module.css */
.header {
  padding: var(--space-4) var(--mobile-content-pad) var(--space-3);
  background: var(--color-bg);
}

.titleRow {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
}

.title {
  font-size: 2rem;
  font-weight: 800;
  line-height: 1.1;
  margin: 0;
  letter-spacing: -0.02em;
}

.subline {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.statusDot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  background: #22c55e;
}
```

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/mobile/overzicht/MobileOverzichtHeader.tsx components/dashboard/mobile/overzicht/MobileOverzichtHeader.module.css
git commit -m "feat(mobile,overzicht): MobileOverzichtHeader (greeting + subline + actions)"
```

---

### Task 2b: `AiBriefCard`

**Files:**
- Create: `components/dashboard/mobile/overzicht/AiBriefCard.tsx`
- Create: `components/dashboard/mobile/overzicht/AiBriefCard.module.css`

- [ ] **Step 1: Component**

```tsx
// components/dashboard/mobile/overzicht/AiBriefCard.tsx
'use client'

import { useState } from 'react'
import { Sparkles, ArrowRight } from 'lucide-react'
import styles from './AiBriefCard.module.css'

type Props = {
  title: string                      // bv. "Drie dingen voor de koffie"
  summary: string                    // de tekst uit buildSurfaceSummary
  primaryCtaLabel?: string           // bv. "Open de 2 wachtenden"
  onPrimaryCta?: () => void
}

export function AiBriefCard({ title, summary, primaryCtaLabel, onPrimaryCta }: Props) {
  const [hidden, setHidden] = useState(false)
  if (hidden) return null

  return (
    <section className={styles.card}>
      <div className={styles.row}>
        <span className={styles.iconBox} aria-hidden="true">
          <Sparkles size={20} />
        </span>
        <div className={styles.body}>
          <div className={styles.eyebrow}>SURFACE · SAMENVATTING</div>
          <div className={styles.title}>{title}</div>
          <div className={styles.summary}>{summary}</div>
          <div className={styles.actions}>
            {primaryCtaLabel && onPrimaryCta && (
              <button type="button" className={styles.primary} onClick={onPrimaryCta}>
                {primaryCtaLabel}
                <ArrowRight size={16} />
              </button>
            )}
            <button type="button" className={styles.secondary} onClick={() => setHidden(true)}>
              Verberg
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: CSS**

```css
/* components/dashboard/mobile/overzicht/AiBriefCard.module.css */
.card {
  margin: 0 var(--mobile-content-pad) var(--space-4);
  background: linear-gradient(135deg, rgba(26, 86, 255, 0.06), rgba(0, 207, 255, 0.06));
  border: 1px solid rgba(26, 86, 255, 0.18);
  border-radius: var(--radius-card-mobile);
  padding: var(--space-4);
}

.row {
  display: grid;
  grid-template-columns: 44px 1fr;
  gap: var(--space-3);
}

.iconBox {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  background: var(--color-gradient);
  color: white;
  display: grid;
  place-items: center;
}

.eyebrow {
  font-size: 11px;
  letter-spacing: 0.08em;
  font-weight: 700;
  color: var(--color-primary);
  margin-bottom: 4px;
}

.title {
  font-size: var(--text-lg);
  font-weight: 700;
  margin-bottom: var(--space-2);
}

.summary {
  font-size: var(--text-base);
  color: var(--color-text);
  margin-bottom: var(--space-3);
  line-height: 1.4;
}

.actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.primary {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-sm);
  font-weight: 500;
  min-height: 36px;
  cursor: pointer;
}

.secondary {
  background: none;
  border: none;
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  cursor: pointer;
  padding: 0;
}
```

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/mobile/overzicht/AiBriefCard.tsx components/dashboard/mobile/overzicht/AiBriefCard.module.css
git commit -m "feat(mobile,overzicht): AiBriefCard (Surface · Samenvatting)"
```

---

### Task 2c: `HeroKpiCard` met SVG goal-ring

**Files:**
- Create: `components/dashboard/mobile/overzicht/HeroKpiCard.tsx`
- Create: `components/dashboard/mobile/overzicht/HeroKpiCard.module.css`

- [ ] **Step 1: Component**

```tsx
// components/dashboard/mobile/overzicht/HeroKpiCard.tsx
'use client'

import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import styles from './HeroKpiCard.module.css'

type Props = {
  omzet: number
  doel: number | null
  delta?: { value: number; label: string }   // bv. +€3.1k vs week
  werkdagenLeft?: number
}

function formatEuro(n: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

export function HeroKpiCard({ omzet, doel, delta, werkdagenLeft }: Props) {
  if (doel === null) {
    return (
      <section className={styles.card}>
        <div className={styles.col}>
          <div className={styles.label}>Omzet deze maand</div>
          <div className={styles.value}>{formatEuro(omzet)}</div>
          {delta && (
            <div className={styles.delta}>
              <ArrowUpRight size={14} />
              {delta.value > 0 ? '+' : ''}{formatEuro(delta.value)} {delta.label}
            </div>
          )}
          <Link href="/instellingen?focus=omzet-doel" className={styles.setGoal}>
            Stel je maanddoel in →
          </Link>
        </div>
      </section>
    )
  }

  const pct = doel > 0 ? Math.min(100, Math.round((omzet / doel) * 100)) : 0
  // SVG ring: stroke-dasharray trick.
  const radius = 42
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - pct / 100)

  return (
    <section className={styles.card}>
      <div className={styles.col}>
        <div className={styles.label}>Omzet deze maand</div>
        <div className={styles.value}>{formatEuro(omzet)}</div>
        {delta && (
          <div className={styles.delta}>
            <ArrowUpRight size={14} />
            {delta.value > 0 ? '+' : ''}{formatEuro(delta.value)} {delta.label}
          </div>
        )}
      </div>

      <svg className={styles.ring} width="110" height="110" viewBox="0 0 110 110" aria-hidden="true">
        <defs>
          <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-primary)" />
            <stop offset="100%" stopColor="var(--color-accent)" />
          </linearGradient>
        </defs>
        <circle cx="55" cy="55" r={radius} stroke="var(--color-surface-2)" strokeWidth="8" fill="none" />
        <circle
          cx="55"
          cy="55"
          r={radius}
          stroke="url(#ringGradient)"
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 55 55)"
        />
        <text x="55" y="50" textAnchor="middle" className={styles.ringValue}>{pct}</text>
        <text x="55" y="68" textAnchor="middle" className={styles.ringUnit}>%</text>
      </svg>

      <div className={styles.footer}>
        <span>Doel: <strong>{formatEuro(doel)}</strong></span>
        {werkdagenLeft != null && (
          <span className={styles.left}>nog {werkdagenLeft} werkdagen</span>
        )}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: CSS**

```css
/* components/dashboard/mobile/overzicht/HeroKpiCard.module.css */
.card {
  margin: 0 var(--mobile-content-pad) var(--space-4);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card-mobile);
  padding: var(--space-4);
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto auto;
  gap: var(--space-3);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.col {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.label {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.value {
  font-size: 2.5rem;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.02em;
}

.delta {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #dcfce7;
  color: #15803d;
  font-size: var(--text-sm);
  font-weight: 500;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  align-self: flex-start;
}

.setGoal {
  font-size: var(--text-sm);
  color: var(--color-primary);
  text-decoration: none;
  font-weight: 500;
}

.ring { display: block; }
.ringValue { font-size: 24px; font-weight: 800; fill: var(--color-text); }
.ringUnit { font-size: 12px; fill: var(--color-text-muted); }

.footer {
  grid-column: 1 / -1;
  display: flex;
  justify-content: space-between;
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}
.left { color: var(--color-text-muted); }
```

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/mobile/overzicht/HeroKpiCard.tsx components/dashboard/mobile/overzicht/HeroKpiCard.module.css
git commit -m "feat(mobile,overzicht): HeroKpiCard met SVG goal-ring + placeholder"
```

---

### Task 2d: `MiniKpiGrid` (2×2 grid)

**Files:**
- Create: `components/dashboard/mobile/overzicht/MiniKpiGrid.tsx`
- Create: `components/dashboard/mobile/overzicht/MiniKpiGrid.module.css`

- [ ] **Step 1: Component**

```tsx
// components/dashboard/mobile/overzicht/MiniKpiGrid.tsx
'use client'

import type { ReactNode } from 'react'
import { Inbox, Percent, Clock, FileText } from 'lucide-react'
import styles from './MiniKpiGrid.module.css'

type TileData = {
  icon: ReactNode
  iconTone: 'blue' | 'green' | 'amber' | 'violet'
  label: string
  value: string                   // pre-geformatteerd: "14", "64", "47", "7"
  unit?: string                   // bv. "%", "s"
  delta?: { value: string; positive: boolean }   // bv. "+22%" of "+8 pt"
}

type Props = {
  tiles: [TileData, TileData, TileData, TileData]   // exact 4
}

export function MiniKpiGrid({ tiles }: Props) {
  return (
    <div className={styles.grid}>
      {tiles.map((tile, i) => (
        <article key={i} className={styles.tile}>
          <div className={styles.head}>
            <span className={styles.iconBox} data-tone={tile.iconTone}>{tile.icon}</span>
            {tile.delta && (
              <span className={styles.delta} data-positive={tile.delta.positive}>
                {tile.delta.value}
              </span>
            )}
          </div>
          <div className={styles.valueRow}>
            <span className={styles.value}>{tile.value}</span>
            {tile.unit && <span className={styles.unit}>{tile.unit}</span>}
          </div>
          <div className={styles.label}>{tile.label}</div>
        </article>
      ))}
    </div>
  )
}

// Helper: convenience exports voor de iconen die de Overzicht-pagina nodig heeft.
export const MiniKpiIcons = { Inbox, Percent, Clock, FileText }
```

- [ ] **Step 2: CSS**

```css
/* components/dashboard/mobile/overzicht/MiniKpiGrid.module.css */
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
  margin: 0 var(--mobile-content-pad) var(--space-4);
}

.tile {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card-mobile);
  padding: var(--space-3);
  min-height: 86px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.head { display: flex; justify-content: space-between; align-items: center; }

.iconBox {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  display: grid;
  place-items: center;
}
.iconBox[data-tone="blue"]   { background: #dbeafe; color: var(--color-primary); }
.iconBox[data-tone="green"]  { background: #dcfce7; color: #15803d; }
.iconBox[data-tone="amber"]  { background: #fef3c7; color: #d97706; }
.iconBox[data-tone="violet"] { background: #ede9fe; color: #7c3aed; }

.delta {
  font-size: var(--text-xs);
  font-weight: 500;
}
.delta[data-positive="true"]  { color: #15803d; }
.delta[data-positive="false"] { color: #ef4444; }

.valueRow {
  display: flex;
  align-items: baseline;
  gap: 2px;
}
.value {
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}
.unit {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.label {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}
```

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/mobile/overzicht/MiniKpiGrid.tsx components/dashboard/mobile/overzicht/MiniKpiGrid.module.css
git commit -m "feat(mobile,overzicht): MiniKpiGrid (2×2 grid)"
```

---

### Task 2e: `UrgentBlock` (Wat nu preview)

**Files:**
- Create: `components/dashboard/mobile/overzicht/UrgentBlock.tsx`
- Create: `components/dashboard/mobile/overzicht/UrgentBlock.module.css`

- [ ] **Step 1: Component**

```tsx
// components/dashboard/mobile/overzicht/UrgentBlock.tsx
'use client'

import { ChevronRight, Clock } from 'lucide-react'
import styles from './UrgentBlock.module.css'

export type UrgentItem = {
  id: string
  naam: string
  initials: string
  subline: string              // bv. "€736 · korstmos"  of "86 km · Utrecht · €998"
  context: string              // bv. "Wacht 4u 12m op owner-review"
  badge?: { tone: 'amber' | 'red'; label: string }   // bv. {tone:'amber', label:'4u 12m'}
}

type Props = {
  items: UrgentItem[]
  totalCount?: number          // gebruikt voor de "Alles" knop label
  onOpenAll: () => void
  onOpenItem?: (id: string) => void
}

export function UrgentBlock({ items, totalCount, onOpenAll, onOpenItem }: Props) {
  return (
    <section className={styles.block}>
      <div className={styles.head}>
        <h2 className={styles.title}>Wat nu</h2>
        <button type="button" onClick={onOpenAll} className={styles.allLink}>
          Alles {totalCount != null && `(${totalCount})`} <ChevronRight size={14} />
        </button>
      </div>
      {items.length === 0 ? (
        <p className={styles.empty}>Niks urgent — koffiepauze.</p>
      ) : (
        <ul className={styles.list}>
          {items.slice(0, 3).map((item) => (
            <li key={item.id} className={styles.row} onClick={() => onOpenItem?.(item.id)}>
              <span className={styles.avatar} aria-hidden="true">{item.initials}</span>
              <span className={styles.text}>
                <span className={styles.name}>{item.naam}</span>
                <span className={styles.sub}>{item.subline}</span>
              </span>
              {item.badge && (
                <span className={styles.badge} data-tone={item.badge.tone}>
                  <Clock size={12} />
                  {item.badge.label}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
```

- [ ] **Step 2: CSS**

```css
/* components/dashboard/mobile/overzicht/UrgentBlock.module.css */
.block {
  margin: 0 var(--mobile-content-pad) var(--space-4);
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-3);
}
.title {
  font-size: var(--text-lg);
  font-weight: 700;
  margin: 0;
}
.allLink {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  background: none;
  border: none;
  color: var(--color-primary);
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
}

.empty {
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  padding: var(--space-4);
  text-align: center;
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card-mobile);
  overflow: hidden;
}

.row {
  display: grid;
  grid-template-columns: 40px 1fr auto;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  min-height: 56px;
  cursor: pointer;
  border-bottom: 1px solid var(--color-border);
}
.row:last-child { border-bottom: 0; }

.avatar {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-full);
  background: var(--color-surface-2);
  color: var(--color-text-muted);
  display: grid;
  place-items: center;
  font-weight: 600;
  font-size: var(--text-sm);
}

.text { display: flex; flex-direction: column; min-width: 0; }
.name { font-weight: 600; }
.sub { font-size: var(--text-sm); color: var(--color-text-muted); }

.badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: var(--text-xs);
  font-weight: 500;
  padding: 4px 8px;
  border-radius: var(--radius-full);
}
.badge[data-tone="amber"] { background: #fef3c7; color: #b45309; }
.badge[data-tone="red"]   { background: #fee2e2; color: #b91c1c; }
```

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/mobile/overzicht/UrgentBlock.tsx components/dashboard/mobile/overzicht/UrgentBlock.module.css
git commit -m "feat(mobile,overzicht): UrgentBlock (Wat nu preview)"
```

---

### Task 2f: `VandaagBlock` (Vandaag preview)

**Files:**
- Create: `components/dashboard/mobile/overzicht/VandaagBlock.tsx`
- Create: `components/dashboard/mobile/overzicht/VandaagBlock.module.css`

- [ ] **Step 1: Component**

```tsx
// components/dashboard/mobile/overzicht/VandaagBlock.tsx
'use client'

import { ChevronRight, MapPin } from 'lucide-react'
import styles from './VandaagBlock.module.css'

export type VandaagItem = {
  id: string
  tijd: string                  // "10:30"
  duur: string                  // "45m"
  type: 'PLAATSBEZOEK' | 'KLUS' | 'AFSPRAAK'
  naam: string
  adres: string                 // "Wilhelminapark 12 · Utrecht"
  status: 'NU' | 'VOLGENDE' | 'LATER'
}

type Props = {
  items: VandaagItem[]
  totalKm?: number
  totalDuur?: string
  onOpenAll: () => void
}

export function VandaagBlock({ items, totalKm, totalDuur, onOpenAll }: Props) {
  return (
    <section className={styles.block}>
      <div className={styles.head}>
        <h2 className={styles.title}>Vandaag</h2>
        <button type="button" onClick={onOpenAll} className={styles.allLink}>
          Alles ({items.length}) <ChevronRight size={14} />
        </button>
      </div>

      {items.length === 0 ? (
        <p className={styles.empty}>Geen afspraken vandaag.</p>
      ) : (
        <>
          {totalKm != null && totalDuur && (
            <div className={styles.totalCard}>
              <span className={styles.totalLabel}>Totaal vandaag</span>
              <span className={styles.totalValue}>{totalKm} km · {totalDuur}</span>
            </div>
          )}
          <ul className={styles.list}>
            {items.slice(0, 3).map((item) => (
              <li key={item.id} className={styles.row}>
                <span className={styles.tijdCol}>
                  <span className={styles.tijd}>{item.tijd}</span>
                  <span className={styles.duur}>{item.duur}</span>
                </span>
                <span className={styles.text}>
                  <span className={styles.statusTag} data-status={item.status}>{item.status}</span>
                  <span className={styles.name}>{item.naam}</span>
                  <span className={styles.adres}>
                    <MapPin size={12} /> {item.adres}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
```

- [ ] **Step 2: CSS**

```css
/* components/dashboard/mobile/overzicht/VandaagBlock.module.css */
.block { margin: 0 var(--mobile-content-pad) var(--space-4); }

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-3);
}
.title { font-size: var(--text-lg); font-weight: 700; margin: 0; }
.allLink {
  display: inline-flex; align-items: center; gap: 2px;
  background: none; border: none;
  color: var(--color-primary); font-size: var(--text-sm); font-weight: 500;
  cursor: pointer;
}

.empty { color: var(--color-text-muted); font-size: var(--text-sm); padding: var(--space-4); text-align: center; }

.totalCard {
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card-mobile);
  background: var(--color-bg);
  margin-bottom: var(--space-3);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.totalLabel { color: var(--color-text-muted); font-size: var(--text-sm); }
.totalValue { font-size: var(--text-base); font-weight: 700; }

.list {
  list-style: none; margin: 0; padding: 0;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card-mobile);
  overflow: hidden;
}

.row {
  display: grid;
  grid-template-columns: 60px 1fr;
  gap: var(--space-3);
  padding: var(--space-3);
  min-height: 56px;
  border-bottom: 1px solid var(--color-border);
}
.row:last-child { border-bottom: 0; }

.tijdCol { display: flex; flex-direction: column; }
.tijd { font-weight: 700; font-size: var(--text-base); }
.duur { font-size: var(--text-xs); color: var(--color-text-muted); }

.text { display: flex; flex-direction: column; gap: 2px; }
.name { font-weight: 600; }
.adres { display: inline-flex; align-items: center; gap: 4px; font-size: var(--text-sm); color: var(--color-text-muted); }

.statusTag {
  align-self: flex-start;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  background: var(--color-surface-2);
  color: var(--color-text-muted);
}
.statusTag[data-status="NU"]       { background: #dcfce7; color: #15803d; }
.statusTag[data-status="VOLGENDE"] { background: #dbeafe; color: var(--color-primary); }
.statusTag[data-status="LATER"]    { background: var(--color-surface-2); color: var(--color-text-muted); }
```

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/mobile/overzicht/VandaagBlock.tsx components/dashboard/mobile/overzicht/VandaagBlock.module.css
git commit -m "feat(mobile,overzicht): VandaagBlock (Vandaag preview)"
```

---

### Task 2g: `ActivityFeedBlock` (Recent feed preview)

**Files:**
- Create: `components/dashboard/mobile/overzicht/ActivityFeedBlock.tsx`
- Create: `components/dashboard/mobile/overzicht/ActivityFeedBlock.module.css`

- [ ] **Step 1: Component**

```tsx
// components/dashboard/mobile/overzicht/ActivityFeedBlock.tsx
'use client'

import { ChevronRight, MessageCircle, User, Calendar, FileText } from 'lucide-react'
import styles from './ActivityFeedBlock.module.css'

export type ActivityItem = {
  id: string
  type: 'WHATSAPP' | 'NIEUWE_LEAD' | 'AFSPRAAK' | 'OFFERTE'
  naam: string
  description: string
  timeAgo: string                  // "2m", "12m", "1u"
}

type Props = {
  items: ActivityItem[]
  onOpenAll: () => void
}

const ICONS = {
  WHATSAPP: MessageCircle,
  NIEUWE_LEAD: User,
  AFSPRAAK: Calendar,
  OFFERTE: FileText,
}

const LABELS = {
  WHATSAPP: 'WHATSAPP',
  NIEUWE_LEAD: 'NIEUWE LEAD',
  AFSPRAAK: 'AFSPRAAK',
  OFFERTE: 'OFFERTE',
}

export function ActivityFeedBlock({ items, onOpenAll }: Props) {
  return (
    <section className={styles.block}>
      <div className={styles.head}>
        <h2 className={styles.title}>Recent</h2>
        <button type="button" onClick={onOpenAll} className={styles.allLink}>
          Alles bekijken <ChevronRight size={14} />
        </button>
      </div>

      {items.length === 0 ? (
        <p className={styles.empty}>Nog geen activiteit vandaag.</p>
      ) : (
        <ul className={styles.list}>
          {items.slice(0, 3).map((item) => {
            const Icon = ICONS[item.type]
            return (
              <li key={item.id} className={styles.row}>
                <span className={styles.iconBox} data-type={item.type}>
                  <Icon size={18} />
                </span>
                <span className={styles.text}>
                  <span className={styles.name}>{item.naam}</span>
                  <span className={styles.desc}>{item.description}</span>
                  <span className={styles.label} data-type={item.type}>{LABELS[item.type]}</span>
                </span>
                <span className={styles.time}>{item.timeAgo}</span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
```

- [ ] **Step 2: CSS**

```css
/* components/dashboard/mobile/overzicht/ActivityFeedBlock.module.css */
.block { margin: 0 var(--mobile-content-pad) var(--space-4); }

.head { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-3); }
.title { font-size: var(--text-lg); font-weight: 700; margin: 0; }
.allLink { display: inline-flex; align-items: center; gap: 2px; background: none; border: none; color: var(--color-primary); font-size: var(--text-sm); font-weight: 500; cursor: pointer; }

.empty { color: var(--color-text-muted); font-size: var(--text-sm); padding: var(--space-4); text-align: center; }

.list { list-style: none; margin: 0; padding: 0; background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-card-mobile); overflow: hidden; }

.row { display: grid; grid-template-columns: 40px 1fr auto; gap: var(--space-3); padding: var(--space-3); min-height: 56px; border-bottom: 1px solid var(--color-border); }
.row:last-child { border-bottom: 0; }

.iconBox { width: 36px; height: 36px; border-radius: var(--radius-md); display: grid; place-items: center; }
.iconBox[data-type="WHATSAPP"]    { background: #dcfce7; color: #15803d; }
.iconBox[data-type="NIEUWE_LEAD"] { background: #dbeafe; color: var(--color-primary); }
.iconBox[data-type="AFSPRAAK"]    { background: #dcfce7; color: #15803d; }
.iconBox[data-type="OFFERTE"]     { background: #fef3c7; color: #d97706; }

.text { display: flex; flex-direction: column; gap: 2px; }
.name { font-weight: 600; }
.desc { font-size: var(--text-sm); color: var(--color-text-muted); }
.label { font-size: 10px; font-weight: 700; letter-spacing: 0.05em; }
.label[data-type="WHATSAPP"]    { color: #15803d; }
.label[data-type="NIEUWE_LEAD"] { color: var(--color-primary); }
.label[data-type="AFSPRAAK"]    { color: #15803d; }
.label[data-type="OFFERTE"]     { color: #d97706; }

.time { font-size: var(--text-sm); color: var(--color-text-muted); align-self: flex-start; }
```

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/mobile/overzicht/ActivityFeedBlock.tsx components/dashboard/mobile/overzicht/ActivityFeedBlock.module.css
git commit -m "feat(mobile,overzicht): ActivityFeedBlock (Recent feed preview)"
```

---

### Task 2h: `MobileOverzicht` integratie (composer)

**Files:**
- Create: `components/dashboard/mobile/overzicht/MobileOverzicht.tsx`
- Create: `components/dashboard/mobile/overzicht/MobileOverzicht.module.css`
- Modify: `app/dashboard/(app)/page.tsx`

- [ ] **Step 1: `MobileOverzicht` composer**

```tsx
// components/dashboard/mobile/overzicht/MobileOverzicht.tsx
'use client'

import { useState } from 'react'
import { MobileOverzichtHeader } from './MobileOverzichtHeader'
import { AiBriefCard } from './AiBriefCard'
import { HeroKpiCard } from './HeroKpiCard'
import { MiniKpiGrid, MiniKpiIcons } from './MiniKpiGrid'
import { UrgentBlock, type UrgentItem } from './UrgentBlock'
import { VandaagBlock, type VandaagItem } from './VandaagBlock'
import { ActivityFeedBlock, type ActivityItem } from './ActivityFeedBlock'
import type { NotifItem } from '@/components/dashboard/NotificationPanel'
import styles from './MobileOverzicht.module.css'

export type MobileOverzichtData = {
  greeting: string
  voornaam?: string
  leadsToday: number
  leadsTomorrow: number
  aiBrief: { title: string; summary: string; ctaLabel?: string; ctaCount?: number }
  omzet: number
  omzetDoel: number | null
  omzetDelta?: { value: number; label: string }
  werkdagenLeft?: number
  miniKpis: {
    nieuweLeads: { value: number; delta?: { value: string; positive: boolean } }
    conversie: { value: number; delta?: { value: string; positive: boolean } }
    reactietijd: { value: number; delta?: { value: string; positive: boolean } }
    offertesOpen: { value: number; delta?: { value: string; positive: boolean } }
  }
  urgent: { items: UrgentItem[]; totalCount: number }
  vandaag: { items: VandaagItem[]; totalKm?: number; totalDuur?: string }
  activity: ActivityItem[]
  notifications?: NotifItem[]
  unreadCount?: number
}

type Props = {
  data: MobileOverzichtData
  onOpenDrilldown?: (view: 'watnu' | 'vandaag' | 'feed') => void
}

export function MobileOverzicht({ data, onOpenDrilldown }: Props) {
  // Drilldown-state komt in fase 3 — voor nu local placeholder.
  const [activeSub, setActiveSub] = useState<null | 'watnu' | 'vandaag' | 'feed'>(null)

  const handleOpenDrilldown = (view: 'watnu' | 'vandaag' | 'feed') => {
    if (onOpenDrilldown) onOpenDrilldown(view)
    else setActiveSub(view)  // fallback voor fase 2 alleen-render
  }

  return (
    <div className={styles.root}>
      <MobileOverzichtHeader
        greeting={data.greeting}
        voornaam={data.voornaam}
        leadsToday={data.leadsToday}
        leadsTomorrow={data.leadsTomorrow}
        notifications={data.notifications}
        unreadCount={data.unreadCount}
      />

      <AiBriefCard
        title={data.aiBrief.title}
        summary={data.aiBrief.summary}
        primaryCtaLabel={data.aiBrief.ctaLabel}
        onPrimaryCta={() => handleOpenDrilldown('watnu')}
      />

      <HeroKpiCard
        omzet={data.omzet}
        doel={data.omzetDoel}
        delta={data.omzetDelta}
        werkdagenLeft={data.werkdagenLeft}
      />

      <MiniKpiGrid
        tiles={[
          {
            icon: <MiniKpiIcons.Inbox size={18} />,
            iconTone: 'blue',
            label: 'Nieuwe leads',
            value: String(data.miniKpis.nieuweLeads.value),
            delta: data.miniKpis.nieuweLeads.delta,
          },
          {
            icon: <MiniKpiIcons.Percent size={18} />,
            iconTone: 'green',
            label: 'Conversie',
            value: String(data.miniKpis.conversie.value),
            unit: '%',
            delta: data.miniKpis.conversie.delta,
          },
          {
            icon: <MiniKpiIcons.Clock size={18} />,
            iconTone: 'amber',
            label: 'Reactietijd',
            value: String(data.miniKpis.reactietijd.value),
            unit: 's',
            delta: data.miniKpis.reactietijd.delta,
          },
          {
            icon: <MiniKpiIcons.FileText size={18} />,
            iconTone: 'violet',
            label: 'Offertes open',
            value: String(data.miniKpis.offertesOpen.value),
            delta: data.miniKpis.offertesOpen.delta,
          },
        ]}
      />

      <UrgentBlock
        items={data.urgent.items}
        totalCount={data.urgent.totalCount}
        onOpenAll={() => handleOpenDrilldown('watnu')}
      />

      <VandaagBlock
        items={data.vandaag.items}
        totalKm={data.vandaag.totalKm}
        totalDuur={data.vandaag.totalDuur}
        onOpenAll={() => handleOpenDrilldown('vandaag')}
      />

      <ActivityFeedBlock
        items={data.activity}
        onOpenAll={() => handleOpenDrilldown('feed')}
      />

      {/* Drilldowns mount in fase 3 — voor nu een lege debug-state. */}
      {activeSub && process.env.NODE_ENV === 'development' && (
        <div style={{ position: 'fixed', bottom: 80, left: 16, padding: 8, background: '#000', color: '#fff', borderRadius: 8, zIndex: 50 }}>
          drilldown: {activeSub} (komt fase 3)
          <button onClick={() => setActiveSub(null)} style={{ marginLeft: 8 }}>x</button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: `MobileOverzicht.module.css`**

```css
/* components/dashboard/mobile/overzicht/MobileOverzicht.module.css */
.root {
  display: flex;
  flex-direction: column;
  padding-top: var(--space-2);
  background: var(--color-surface);
  min-height: 100%;
}
```

- [ ] **Step 3: Page integratie in `app/dashboard/(app)/page.tsx`**

In de bestaande page (Server Component), bereken een `mobileData: MobileOverzichtData` object uit dezelfde queries die al draaien. Render onderaan:

```tsx
// Aan einde van page.tsx, NA de bestaande desktop-render:
import { MobileOverzicht, type MobileOverzichtData } from '@/components/dashboard/mobile/overzicht/MobileOverzicht'
import { buildSurfaceSummary } from '@/lib/dashboard/surface-summary'
import { leadsArrivedTodayAndTomorrow } from '@/lib/dashboard/lead-queries'

// In de body van OverzichtPage:
//   - voeg 'leadsRange' toe aan parallel-fetches
//   - voeg 'tenantOmzetDoel' toe aan settings-query

const [
  /* bestaande resultaten */,
  leadsRange,
  tenantSettingsForDoel,
] = await Promise.all([
  /* ... bestaande Promise.all entries ... */,
  leadsArrivedTodayAndTomorrow(supabase),
  supabase.from('tenant_settings').select('omzet_doel_maand').limit(1).maybeSingle(),
])

const omzetDoel = (tenantSettingsForDoel.data as { omzet_doel_maand: number | null } | null)?.omzet_doel_maand ?? null

const mobileData: MobileOverzichtData = {
  greeting: greeting,                         // bestaand
  voornaam: voornaam,                         // bestaand
  leadsToday: leadsRange.today,
  leadsTomorrow: leadsRange.tomorrow,
  aiBrief: {
    title: 'Drie dingen voor de koffie',
    summary: buildSurfaceSummary({
      newLeadsToday: leadsRange.today,
      pendingOffertes: kpiMetrics.openOffertes,
      longestWaitHours: /* uit dagrapport of activity-feed */ 4,
      longestWaitName: /* idem */ 'Bakker',
    }),
    ctaLabel: kpiMetrics.openOffertes > 0 ? `Open de ${kpiMetrics.openOffertes} wachtenden` : undefined,
    ctaCount: kpiMetrics.openOffertes,
  },
  omzet: kpiMetrics.omzetMaand,
  omzetDoel,
  omzetDelta: kpiMetrics.omzetDeltaWeek ? {
    value: kpiMetrics.omzetDeltaWeek,
    label: 'vs week',
  } : undefined,
  werkdagenLeft: /* berekend uit huidige datum tot maand-eind */ 5,
  miniKpis: {
    nieuweLeads: { value: kpiMetrics.nieuweLeads, delta: kpiMetrics.nieuweLeadsDelta },
    conversie:   { value: kpiMetrics.conversie,   delta: kpiMetrics.conversieDelta },
    reactietijd: { value: kpiMetrics.reactietijdSec, delta: kpiMetrics.reactietijdDelta },
    offertesOpen:{ value: kpiMetrics.openOffertes, delta: kpiMetrics.offertesDelta },
  },
  urgent: { items: mapToUrgentItems(activityFeed, leadsList), totalCount: deriveActions(...).length },
  vandaag: { items: mapToVandaagItems(upcomingApptsToday), totalKm: /* … */, totalDuur: /* … */ },
  activity: mapToActivityItems(activityFeed),
  notifications: notificationsFromLayout,    // als beschikbaar via topbar-server flow; anders weglaten
  unreadCount: unreadCountFromLayout,
}
```

> **Belangrijk:** de exacte source van velden zoals `kpiMetrics.omzetMaand`, `nieuweLeadsDelta`, etc. moet je halen uit het bestaande `buildKpiMetrics()` resultaat. Lees `lib/dashboard/overzicht-data.ts` zorgvuldig en map velden 1-op-1. Gebruik NIET de exacte field-namen hierboven als ze niet bestaan — pas aan op de bestaande shape.

```tsx
// In de JSX-return van page.tsx, OMRING de bestaande markup met een wrapper waarin de mobile-view alleen op mobile zichtbaar is.
// Optie A: voeg een client-island toe dat <MobileOverzicht> rendert; de bestaande server-markup zit binnen <div className="desktop-only">.
// Optie B: refactor zodat de hele page.tsx altijd <DesktopOverzicht /> + <MobileOverzicht /> rendert; DashboardChrome's CSS zorgt voor zichtbaarheid.

// We kiezen Optie B — past bij de DashboardChrome-aanpak uit Task 1e.

return (
  <>
    <div className={pageStyles.desktopOnly}>
      {/* bestaande JSX */}
    </div>
    <div className={pageStyles.mobileOnly}>
      <MobileOverzicht data={mobileData} />
    </div>
  </>
)
```

In `page.module.css` voeg toe:

```css
.desktopOnly { display: block; }
.mobileOnly  { display: none; }

@media (max-width: 640px) {
  .desktopOnly { display: none; }
  .mobileOnly  { display: block; }
}
```

- [ ] **Step 4: Visuele check**

```bash
npm run dev
```

- DevTools 375px viewport, navigeer naar `/dashboard`.
- Verwacht: nieuwe MobileOverzicht zichtbaar met echte data; geen drilldowns nog (placeholder-debug bottom-left als je een "Alles bekijken" tikt).
- 800px viewport: desktop UX onveranderd.

Vergelijk visueel met screenshot 1 — als er afwijkingen zijn, vergelijk per element (afstanden, font-sizes, kleuren). Pas CSS aan.

- [ ] **Step 5: Build**

```bash
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add components/dashboard/mobile/overzicht/MobileOverzicht.tsx components/dashboard/mobile/overzicht/MobileOverzicht.module.css app/dashboard/\(app\)/page.tsx app/dashboard/\(app\)/page.module.css
git commit -m "feat(mobile,overzicht): MobileOverzicht compositie + page-integratie"
```

---

## Phase 3 — Drilldowns

### Task 3a: `MobileDrilldownLayer` (transitie + history-handling)

**Files:**
- Create: `components/dashboard/mobile/drilldowns/MobileDrilldownLayer.tsx`
- Create: `components/dashboard/mobile/drilldowns/MobileDrilldownLayer.module.css`

- [ ] **Step 1: Component**

```tsx
// components/dashboard/mobile/drilldowns/MobileDrilldownLayer.tsx
'use client'

import { useEffect, ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import styles from './MobileDrilldownLayer.module.css'

type Props = {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  rightAction?: ReactNode
}

export function MobileDrilldownLayer({ open, title, subtitle, onClose, children, rightAction }: Props) {
  // Browser-back integratie: bij open pushState; bij popstate (back) zonder
  // drilldown-vlag → trigger onClose. Voorkomt loops door zelf NIET .back()
  // te roepen wanneer popstate al de drilldown-state heeft verlaten.
  useEffect(() => {
    if (!open) return
    history.pushState({ drilldown: true }, '', window.location.href)

    const onPop = (e: PopStateEvent) => {
      if (!e.state?.drilldown) onClose()
    }
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
    }
  }, [open, onClose])

  const handleClose = () => {
    if (history.state?.drilldown) {
      history.back()  // triggert popstate-handler die onClose roept
    } else {
      onClose()
    }
  }

  return (
    <div className={`${styles.layer} ${open ? styles.open : ''}`} aria-hidden={!open}>
      <header className={styles.navbar}>
        <button type="button" onClick={handleClose} className={styles.backBtn}>
          <ChevronLeft size={20} />
          Terug
        </button>
        <div className={styles.titleBlock}>
          <h2 className={styles.title}>{title}</h2>
          {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
        </div>
        <div className={styles.rightSlot}>{rightAction}</div>
      </header>

      <div className={styles.content}>{children}</div>
    </div>
  )
}
```

- [ ] **Step 2: CSS**

```css
/* components/dashboard/mobile/drilldowns/MobileDrilldownLayer.module.css */
.layer {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: var(--mobile-bottom-nav-h);
  background: var(--color-surface);
  z-index: 40;
  transform: translateX(100%);
  transition: transform var(--dur-drilldown) var(--ease-ios);
  display: flex;
  flex-direction: column;
}

.layer.open {
  transform: translateX(0);
}

.navbar {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--color-bg);
  border-bottom: 1px solid var(--color-border);
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: var(--space-3);
  padding: 0 var(--space-3);
  height: var(--mobile-header-h);
}

.backBtn {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  background: none;
  border: none;
  color: var(--color-primary);
  font-size: var(--text-base);
  font-weight: 500;
  cursor: pointer;
  padding: 0;
}

.titleBlock { text-align: center; }
.title { font-size: var(--text-base); font-weight: 700; margin: 0; }
.subtitle { font-size: var(--text-xs); color: var(--color-text-muted); }

.rightSlot { min-width: 28px; }

.content {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-4) var(--mobile-content-pad);
}
```

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/mobile/drilldowns/MobileDrilldownLayer.tsx components/dashboard/mobile/drilldowns/MobileDrilldownLayer.module.css
git commit -m "feat(mobile,drilldown): MobileDrilldownLayer (iOS-stijl transitie + history-back)"
```

---

### Task 3b: `WatNuView`

**Files:**
- Create: `components/dashboard/mobile/drilldowns/WatNuView.tsx`
- Create: `components/dashboard/mobile/drilldowns/WatNuView.module.css`

- [ ] **Step 1: Component**

```tsx
// components/dashboard/mobile/drilldowns/WatNuView.tsx
'use client'

import { useState } from 'react'
import { MobileDrilldownLayer } from './MobileDrilldownLayer'
import { Clock, MessageCircle } from 'lucide-react'
import type { UrgentItem } from '../overzicht/UrgentBlock'
import styles from './WatNuView.module.css'

type Filter = 'alle' | 'urgent' | 'wachtend' | 'buiten-radius'

type Props = {
  open: boolean
  onClose: () => void
  items: UrgentItem[]
  groupedByCategory?: {
    vandaagEerst: UrgentItem[]      // bovenste sectie
    wachtendOpOpvolgen: UrgentItem[] // onderste sectie
  }
  counts?: { alle: number; urgent: number; wachtend: number; buitenRadius: number }
}

export function WatNuView({ open, onClose, items, groupedByCategory, counts }: Props) {
  const [filter, setFilter] = useState<Filter>('alle')

  const filtered = filterItems(items, filter)
  const grouped = groupedByCategory ?? splitByGroup(filtered)

  return (
    <MobileDrilldownLayer
      open={open}
      title="Wat nu"
      subtitle={`${counts?.alle ?? items.length} acties wachten op jou`}
      onClose={onClose}
    >
      <div className={styles.chips}>
        <Chip active={filter === 'alle'} onClick={() => setFilter('alle')}>
          Alle <span className={styles.chipCount}>{counts?.alle ?? items.length}</span>
        </Chip>
        <Chip active={filter === 'urgent'} onClick={() => setFilter('urgent')}>
          Urgent <span className={styles.chipCount}>{counts?.urgent ?? 0}</span>
        </Chip>
        <Chip active={filter === 'wachtend'} onClick={() => setFilter('wachtend')}>
          Wachtend <span className={styles.chipCount}>{counts?.wachtend ?? 0}</span>
        </Chip>
        <Chip active={filter === 'buiten-radius'} onClick={() => setFilter('buiten-radius')}>
          Buiten radius
        </Chip>
      </div>

      {grouped.vandaagEerst.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>VANDAAG EERST</h3>
          {grouped.vandaagEerst.map((it) => <ItemRow key={it.id} item={it} />)}
        </section>
      )}

      {grouped.wachtendOpOpvolgen.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>WACHTEND OP OPVOLGEN</h3>
          {grouped.wachtendOpOpvolgen.map((it) => <ItemRow key={it.id} item={it} />)}
        </section>
      )}
    </MobileDrilldownLayer>
  )
}

function Chip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`${styles.chip} ${active ? styles.chipActive : ''}`}>
      {children}
    </button>
  )
}

function ItemRow({ item }: { item: UrgentItem }) {
  return (
    <article className={styles.card}>
      <div className={styles.cardHead}>
        <span className={styles.avatar} aria-hidden="true">{item.initials}</span>
        <div className={styles.cardText}>
          <div className={styles.cardName}>{item.naam}</div>
          <div className={styles.cardSub}>{item.subline}</div>
        </div>
        {item.badge && (
          <span className={styles.badge} data-tone={item.badge.tone}>
            <Clock size={12} />
            {item.badge.label}
          </span>
        )}
      </div>
      <div className={styles.context}>{item.context}</div>
      <div className={styles.actions}>
        <button type="button" className={styles.primary}>Open offerte</button>
        <button type="button" className={styles.secondary}>
          <MessageCircle size={14} /> Chat
        </button>
      </div>
    </article>
  )
}

function filterItems(items: UrgentItem[], filter: Filter): UrgentItem[] {
  if (filter === 'alle') return items
  if (filter === 'urgent')  return items.filter(i => i.badge?.tone === 'red')
  if (filter === 'wachtend') return items.filter(i => i.badge?.tone === 'amber')
  return items // buiten-radius logica volgt uit data-laag
}

function splitByGroup(items: UrgentItem[]) {
  return {
    vandaagEerst: items.filter(i => i.badge?.tone === 'red' || i.badge?.tone === 'amber'),
    wachtendOpOpvolgen: items.filter(i => !i.badge),
  }
}
```

- [ ] **Step 2: CSS**

```css
/* components/dashboard/mobile/drilldowns/WatNuView.module.css */
.chips {
  display: flex;
  gap: var(--space-2);
  overflow-x: auto;
  margin: 0 calc(-1 * var(--mobile-content-pad)) var(--space-4);
  padding: 0 var(--mobile-content-pad);
  scrollbar-width: none;
}
.chips::-webkit-scrollbar { display: none; }

.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: var(--radius-full);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  min-height: 32px;
}
.chipActive {
  background: var(--color-text);
  color: var(--color-bg);
  border-color: var(--color-text);
}

.chipCount {
  font-size: var(--text-xs);
  opacity: 0.7;
}

.section { margin-bottom: var(--space-6); }
.sectionTitle {
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #ef4444;
  margin: 0 0 var(--space-3);
}
.section:nth-child(3) .sectionTitle { color: var(--color-text-muted); }

.card {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card-mobile);
  padding: var(--space-3);
  margin-bottom: var(--space-3);
}
.cardHead { display: grid; grid-template-columns: 40px 1fr auto; gap: var(--space-3); align-items: center; }
.avatar { width: 40px; height: 40px; border-radius: var(--radius-full); background: var(--color-surface-2); display: grid; place-items: center; font-weight: 600; font-size: var(--text-sm); }
.cardText { display: flex; flex-direction: column; }
.cardName { font-weight: 600; }
.cardSub { font-size: var(--text-sm); color: var(--color-text-muted); }
.badge { display: inline-flex; align-items: center; gap: 3px; padding: 4px 8px; border-radius: var(--radius-full); font-size: var(--text-xs); font-weight: 500; }
.badge[data-tone="amber"] { background: #fef3c7; color: #b45309; }
.badge[data-tone="red"]   { background: #fee2e2; color: #b91c1c; }

.context { font-size: var(--text-sm); color: var(--color-text); padding: var(--space-3) 0; border-bottom: 1px solid var(--color-border); }

.actions { display: grid; grid-template-columns: 1fr auto; gap: var(--space-2); padding-top: var(--space-3); }
.primary { background: var(--color-primary); color: white; border: none; border-radius: var(--radius-md); padding: var(--space-3); font-weight: 500; cursor: pointer; min-height: 40px; }
.secondary { display: inline-flex; align-items: center; gap: 6px; justify-content: center; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-3); font-weight: 500; cursor: pointer; min-height: 40px; }
```

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/mobile/drilldowns/WatNuView.tsx components/dashboard/mobile/drilldowns/WatNuView.module.css
git commit -m "feat(mobile,drilldown): WatNuView (Alle/Urgent/Wachtend/Buiten radius)"
```

---

### Task 3c: `VandaagView`

**Files:**
- Create: `components/dashboard/mobile/drilldowns/VandaagView.tsx`
- Create: `components/dashboard/mobile/drilldowns/VandaagView.module.css`

- [ ] **Step 1: Component**

```tsx
// components/dashboard/mobile/drilldowns/VandaagView.tsx
'use client'

import { MapPin, Phone, FileText } from 'lucide-react'
import { MobileDrilldownLayer } from './MobileDrilldownLayer'
import type { VandaagItem } from '../overzicht/VandaagBlock'
import styles from './VandaagView.module.css'

type Props = {
  open: boolean
  onClose: () => void
  items: VandaagItem[]
  totalKm: number
  totalDuur: string             // "7u 25m"
  dayLabel: string              // "don 28 nov · 10:30 – 17:30"
  route: string                 // "Bilthoven → Zeist → Utrecht"
}

export function VandaagView({ open, onClose, items, totalKm, totalDuur, dayLabel, route }: Props) {
  return (
    <MobileDrilldownLayer
      open={open}
      title={`Vandaag · ${items.length} stops`}
      subtitle={dayLabel}
      onClose={onClose}
      rightAction={<button type="button" className={styles.mapBtn}>Kaart</button>}
    >
      <section className={styles.totalCard}>
        <div className={styles.mapIcon} aria-hidden="true">📍</div>
        <div>
          <div className={styles.totalLabel}>Totaal vandaag</div>
          <div className={styles.totalValue}>{totalKm} km · {totalDuur}</div>
          <div className={styles.route}>{route}</div>
        </div>
      </section>

      <h3 className={styles.sectionTitle}>STOPS</h3>

      <ol className={styles.timeline}>
        {items.map((item, i) => (
          <li key={item.id} className={styles.stop}>
            <span className={styles.dot} data-status={item.status} />
            {i < items.length - 1 && <span className={styles.line} />}

            <article className={styles.stopCard}>
              <div className={styles.stopHead}>
                <span className={styles.stopTag} data-status={item.status}>{item.status}</span>
                <span className={styles.stopTime}>{item.tijd}</span>
                <span className={styles.stopDuration}>· {item.duur}</span>
                <span className={styles.stopType}>{item.type}</span>
              </div>
              <div className={styles.stopName}>{item.naam}</div>
              <div className={styles.stopAdres}><MapPin size={12} /> {item.adres}</div>
              <div className={styles.stopActions}>
                <button type="button" className={styles.actionBtn}><MapPin size={14} /> Navigatie</button>
                <button type="button" className={styles.actionBtn}><Phone size={14} /> Bellen</button>
                <button type="button" className={styles.actionBtn}><FileText size={14} /> Lead</button>
              </div>
            </article>
          </li>
        ))}
      </ol>
    </MobileDrilldownLayer>
  )
}
```

- [ ] **Step 2: CSS**

```css
/* components/dashboard/mobile/drilldowns/VandaagView.module.css */
.mapBtn {
  background: none;
  border: none;
  color: var(--color-primary);
  font-weight: 500;
  cursor: pointer;
}

.totalCard {
  display: grid;
  grid-template-columns: 64px 1fr;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card-mobile);
  margin-bottom: var(--space-6);
  align-items: center;
}
.mapIcon { width: 64px; height: 64px; border-radius: var(--radius-md); background: var(--color-surface); display: grid; place-items: center; font-size: 28px; }
.totalLabel { color: var(--color-text-muted); font-size: var(--text-sm); }
.totalValue { font-size: var(--text-2xl); font-weight: 800; letter-spacing: -0.02em; }
.route { color: var(--color-text-muted); font-size: var(--text-sm); }

.sectionTitle { font-size: var(--text-xs); font-weight: 700; letter-spacing: 0.08em; color: var(--color-text); margin: 0 0 var(--space-3); }

.timeline { list-style: none; margin: 0; padding: 0; }
.stop { position: relative; padding-left: 28px; margin-bottom: var(--space-4); }

.dot {
  position: absolute;
  left: 0;
  top: 8px;
  width: 14px;
  height: 14px;
  border-radius: var(--radius-full);
  background: var(--color-bg);
  border: 2px solid var(--color-text-muted);
}
.dot[data-status="NU"] { border-color: #22c55e; background: #22c55e; }
.dot[data-status="VOLGENDE"] { border-color: var(--color-primary); }
.dot[data-status="LATER"] { border-color: var(--color-text-muted); }

.line {
  position: absolute;
  left: 6px;
  top: 22px;
  bottom: -16px;
  width: 2px;
  background: var(--color-border);
}

.stopCard {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card-mobile);
  padding: var(--space-3);
}

.stopHead { display: flex; align-items: center; gap: 6px; margin-bottom: var(--space-2); flex-wrap: wrap; }
.stopTag { font-size: 10px; font-weight: 700; letter-spacing: 0.05em; padding: 2px 6px; border-radius: var(--radius-sm); }
.stopTag[data-status="NU"] { background: #dcfce7; color: #15803d; }
.stopTag[data-status="VOLGENDE"] { background: #dbeafe; color: var(--color-primary); }
.stopTag[data-status="LATER"] { background: var(--color-surface-2); color: var(--color-text-muted); }

.stopTime { font-weight: 700; }
.stopDuration { color: var(--color-text-muted); font-size: var(--text-sm); }
.stopType { margin-left: auto; font-size: 10px; font-weight: 700; letter-spacing: 0.05em; padding: 2px 6px; border-radius: var(--radius-sm); background: var(--color-surface); color: var(--color-text-muted); }

.stopName { font-weight: 700; font-size: var(--text-lg); margin-bottom: 4px; }
.stopAdres { display: inline-flex; align-items: center; gap: 4px; color: var(--color-text-muted); font-size: var(--text-sm); margin-bottom: var(--space-3); }

.stopActions { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: var(--space-2); }
.actionBtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-2);
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  min-height: 40px;
}
```

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/mobile/drilldowns/VandaagView.tsx components/dashboard/mobile/drilldowns/VandaagView.module.css
git commit -m "feat(mobile,drilldown): VandaagView (route + stops timeline)"
```

---

### Task 3d: `ActiviteitView`

**Files:**
- Create: `components/dashboard/mobile/drilldowns/ActiviteitView.tsx`
- Create: `components/dashboard/mobile/drilldowns/ActiviteitView.module.css`

- [ ] **Step 1: Component**

```tsx
// components/dashboard/mobile/drilldowns/ActiviteitView.tsx
'use client'

import { useState } from 'react'
import { MobileDrilldownLayer } from './MobileDrilldownLayer'
import { MessageCircle, User, Calendar, FileText, Filter } from 'lucide-react'
import type { ActivityItem } from '../overzicht/ActivityFeedBlock'
import styles from './ActiviteitView.module.css'

type FilterKey = 'alles' | 'leads' | 'offertes' | 'whatsapp' | 'afspraken'

type Props = {
  open: boolean
  onClose: () => void
  items: ActivityItem[]            // gegroepeerd per tijdsblok (NET BINNEN, EERDER VANDAAG)
}

const ICONS = { WHATSAPP: MessageCircle, NIEUWE_LEAD: User, AFSPRAAK: Calendar, OFFERTE: FileText }
const LABEL = { WHATSAPP: 'WHATSAPP', NIEUWE_LEAD: 'NIEUWE LEAD', AFSPRAAK: 'AFSPRAAK', OFFERTE: 'OFFERTE' }

export function ActiviteitView({ open, onClose, items }: Props) {
  const [filter, setFilter] = useState<FilterKey>('alles')

  const filtered = items.filter((it) => {
    if (filter === 'alles') return true
    if (filter === 'leads') return it.type === 'NIEUWE_LEAD'
    if (filter === 'offertes') return it.type === 'OFFERTE'
    if (filter === 'whatsapp') return it.type === 'WHATSAPP'
    if (filter === 'afspraken') return it.type === 'AFSPRAAK'
    return true
  })

  // Groep op tijd: items met timeAgo < 60m → NET BINNEN, anders EERDER VANDAAG.
  const isRecent = (t: string) => /^\d+m$/.test(t)
  const netBinnen = filtered.filter((it) => isRecent(it.timeAgo))
  const eerderVandaag = filtered.filter((it) => !isRecent(it.timeAgo))

  return (
    <MobileDrilldownLayer
      open={open}
      title="Activiteit"
      subtitle={`live · ${items.length} events`}
      onClose={onClose}
      rightAction={<button type="button" className={styles.filterBtn}><Filter size={20} /></button>}
    >
      <div className={styles.chips}>
        <Chip active={filter === 'alles'} onClick={() => setFilter('alles')}>Alles</Chip>
        <Chip active={filter === 'leads'} onClick={() => setFilter('leads')}>Leads</Chip>
        <Chip active={filter === 'offertes'} onClick={() => setFilter('offertes')}>Offertes</Chip>
        <Chip active={filter === 'whatsapp'} onClick={() => setFilter('whatsapp')}>WhatsApp</Chip>
        <Chip active={filter === 'afspraken'} onClick={() => setFilter('afspraken')}>Afspraken</Chip>
      </div>

      {netBinnen.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>NET BINNEN</h3>
          {netBinnen.map((it) => <Row key={it.id} item={it} />)}
        </section>
      )}

      {eerderVandaag.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>EERDER VANDAAG</h3>
          {eerderVandaag.map((it) => <Row key={it.id} item={it} />)}
        </section>
      )}
    </MobileDrilldownLayer>
  )
}

function Chip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`${styles.chip} ${active ? styles.chipActive : ''}`}>
      {children}
    </button>
  )
}

function Row({ item }: { item: ActivityItem }) {
  const Icon = ICONS[item.type]
  return (
    <article className={styles.row}>
      <span className={styles.iconBox} data-type={item.type}>
        <Icon size={18} />
      </span>
      <div className={styles.text}>
        <div className={styles.name}>{item.naam}</div>
        <div className={styles.desc}>{item.description}</div>
        <div className={styles.label} data-type={item.type}>{LABEL[item.type]}</div>
      </div>
      <span className={styles.time}>{item.timeAgo}</span>
    </article>
  )
}
```

- [ ] **Step 2: CSS**

```css
/* components/dashboard/mobile/drilldowns/ActiviteitView.module.css */
.filterBtn { background: none; border: none; color: var(--color-primary); cursor: pointer; padding: 8px; }

.chips {
  display: flex;
  gap: var(--space-2);
  overflow-x: auto;
  margin: 0 calc(-1 * var(--mobile-content-pad)) var(--space-4);
  padding: 0 var(--mobile-content-pad);
  scrollbar-width: none;
}
.chips::-webkit-scrollbar { display: none; }

.chip { padding: 6px 14px; border-radius: var(--radius-full); background: var(--color-surface); border: 1px solid var(--color-border); color: var(--color-text); font-size: var(--text-sm); font-weight: 500; cursor: pointer; white-space: nowrap; min-height: 32px; }
.chipActive { background: var(--color-text); color: var(--color-bg); border-color: var(--color-text); }

.section { margin-bottom: var(--space-6); }
.sectionTitle { font-size: var(--text-xs); font-weight: 700; letter-spacing: 0.08em; margin: 0 0 var(--space-3); color: var(--color-text); }

.row {
  display: grid;
  grid-template-columns: 40px 1fr auto;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card-mobile);
  margin-bottom: var(--space-2);
}

.iconBox { width: 36px; height: 36px; border-radius: var(--radius-md); display: grid; place-items: center; }
.iconBox[data-type="WHATSAPP"]    { background: #dcfce7; color: #15803d; }
.iconBox[data-type="NIEUWE_LEAD"] { background: #dbeafe; color: var(--color-primary); }
.iconBox[data-type="AFSPRAAK"]    { background: #dcfce7; color: #15803d; }
.iconBox[data-type="OFFERTE"]     { background: #fef3c7; color: #d97706; }

.text { display: flex; flex-direction: column; gap: 2px; }
.name { font-weight: 600; }
.desc { font-size: var(--text-sm); color: var(--color-text-muted); }
.label { font-size: 10px; font-weight: 700; letter-spacing: 0.05em; }
.label[data-type="WHATSAPP"]    { color: #15803d; }
.label[data-type="NIEUWE_LEAD"] { color: var(--color-primary); }
.label[data-type="AFSPRAAK"]    { color: #15803d; }
.label[data-type="OFFERTE"]     { color: #d97706; }

.time { font-size: var(--text-sm); color: var(--color-text-muted); }
```

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/mobile/drilldowns/ActiviteitView.tsx components/dashboard/mobile/drilldowns/ActiviteitView.module.css
git commit -m "feat(mobile,drilldown): ActiviteitView (filter chips + grouped feed)"
```

---

### Task 3e: Bind drilldowns aan `MobileOverzicht`

**Files:**
- Modify: `components/dashboard/mobile/overzicht/MobileOverzicht.tsx`
- Modify: `components/dashboard/mobile/overzicht/MobileOverzicht.module.css`

- [ ] **Step 1: Voeg drilldown-state toe + render drilldown-layers**

Vervang de placeholder-debug-state in `MobileOverzicht.tsx` met echte drilldown-mounts:

```tsx
// In MobileOverzicht.tsx, top:
import { WatNuView } from '../drilldowns/WatNuView'
import { VandaagView } from '../drilldowns/VandaagView'
import { ActiviteitView } from '../drilldowns/ActiviteitView'

// Vervang useState<null | 'watnu' | 'vandaag' | 'feed'>(null)-block met:
const [sub, setSub] = useState<null | 'watnu' | 'vandaag' | 'feed'>(null)

const openDrilldown = (view: 'watnu' | 'vandaag' | 'feed') => setSub(view)
const closeDrilldown = () => setSub(null)

// Vervang `handleOpenDrilldown` met `openDrilldown` (zonder onOpenDrilldown prop fallback — die schrappen we).

// In de JSX-return, ZET de base-content in een <div className={styles.base} data-collapsed={sub !== null}> wrapper:
return (
  <div className={styles.root}>
    <div className={styles.base} data-collapsed={sub !== null}>
      {/* alle bestaande blocks: header, AiBrief, HeroKpi, MiniKpi, Urgent, Vandaag, Activity */}
    </div>

    <WatNuView
      open={sub === 'watnu'}
      onClose={closeDrilldown}
      items={data.urgent.items}
      counts={/* afgeleid uit data */}
    />

    <VandaagView
      open={sub === 'vandaag'}
      onClose={closeDrilldown}
      items={data.vandaag.items}
      totalKm={data.vandaag.totalKm ?? 0}
      totalDuur={data.vandaag.totalDuur ?? ''}
      dayLabel={/* afgeleid uit huidige datum */ ''}
      route={/* afgeleid uit items */ ''}
    />

    <ActiviteitView
      open={sub === 'feed'}
      onClose={closeDrilldown}
      items={data.activity}
    />
  </div>
)
```

- [ ] **Step 2: CSS — base-collapse animatie**

In `MobileOverzicht.module.css`:

```css
.base {
  transition: transform var(--dur-drilldown) var(--ease-ios), opacity var(--dur-drilldown) var(--ease-ios);
}

.base[data-collapsed="true"] {
  transform: translateX(-20%) scale(0.96);
  opacity: 0;
  pointer-events: none;
}
```

- [ ] **Step 3: Visuele check**

```bash
npm run dev
```

- 375px viewport, `/dashboard`.
- Tap "Alles bekijken" naast Wat nu: drilldown schuift in van rechts, base schuift weg + faded.
- Tap "Terug": drilldown schuift weg, base komt terug.
- Browser back-knop in DevTools: sluit de drilldown.
- Tap Vandaag → Activiteit drilldowns: idem.
- Tab tussen Overzicht/Leads in bottom-nav tijdens open drilldown: tab werkt (geen onverwacht gedrag).

- [ ] **Step 4: Build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add components/dashboard/mobile/overzicht/MobileOverzicht.tsx components/dashboard/mobile/overzicht/MobileOverzicht.module.css
git commit -m "feat(mobile,overzicht): drilldowns gemount + base-collapse animatie"
```

---

## Phase 4 — Sheets (parallel)

### Task 4a: `MobileNotificationsSheet`

**Files:**
- Create: `components/dashboard/mobile/MobileNotificationsSheet.tsx`
- Create: `components/dashboard/mobile/MobileNotificationsSheet.module.css`

- [ ] **Step 1: Component**

```tsx
// components/dashboard/mobile/MobileNotificationsSheet.tsx
'use client'

import { X } from 'lucide-react'
import type { NotifItem } from '@/components/dashboard/NotificationPanel'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import styles from './MobileNotificationsSheet.module.css'

type Props = {
  items: NotifItem[]
  unreadCount: number
  onClose: () => void
}

export function MobileNotificationsSheet({ items, unreadCount, onClose }: Props) {
  useBodyScrollLock(true)

  return (
    <div className={styles.root} role="dialog" aria-modal="true">
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />
      <div className={styles.sheet}>
        <header className={styles.head}>
          <h2 className={styles.title}>
            Notificaties {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
          </h2>
          <button type="button" onClick={onClose} className={styles.closeBtn} aria-label="Sluit">
            <X size={20} />
          </button>
        </header>
        <div className={styles.list}>
          {items.length === 0 ? (
            <p className={styles.empty}>Geen notificaties.</p>
          ) : (
            items.map((item, i) => (
              <article key={i} className={styles.item}>
                {/* Render based on shape van NotifItem — gebruik dezelfde renderfunctie als NotificationPanel als die exported is, anders inline */}
                {(item as any).title ?? (item as any).message ?? JSON.stringify(item)}
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
```

> Note: lees `components/dashboard/NotificationPanel.tsx` voor de echte `NotifItem`-shape en de rendering-logica. Hergebruik die rendering hier door óf de relevante helper te exporteren uit NotificationPanel óf de logica te dupliceren met dezelfde key-naming.

- [ ] **Step 2: CSS**

```css
/* components/dashboard/mobile/MobileNotificationsSheet.module.css */
.root { position: fixed; inset: 0; z-index: 100; }
.backdrop { position: absolute; inset: 0; background: rgba(0, 0, 0, 0.36); animation: fadeIn var(--dur-sheet) var(--ease-ios); }
.sheet {
  position: absolute;
  inset: 0;
  background: var(--color-bg);
  display: flex;
  flex-direction: column;
  animation: slideUp var(--dur-sheet) var(--ease-ios);
}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--mobile-content-pad);
  border-bottom: 1px solid var(--color-border);
}
.title { font-size: var(--text-lg); font-weight: 700; margin: 0; }
.badge { display: inline-grid; place-items: center; min-width: 22px; height: 22px; padding: 0 6px; border-radius: var(--radius-full); background: var(--color-primary); color: white; font-size: 12px; font-weight: 600; margin-left: var(--space-2); }

.closeBtn { background: none; border: none; cursor: pointer; padding: 8px; }

.list { flex: 1; overflow-y: auto; padding: var(--space-3) var(--mobile-content-pad); }
.empty { color: var(--color-text-muted); text-align: center; padding: var(--space-12) 0; }
.item { padding: var(--space-3) 0; border-bottom: 1px solid var(--color-border); }
.item:last-child { border-bottom: 0; }
```

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/mobile/MobileNotificationsSheet.tsx components/dashboard/mobile/MobileNotificationsSheet.module.css
git commit -m "feat(mobile): MobileNotificationsSheet (wrapper rond NotificationPanel-lijst)"
```

---

### Task 4b: Vervang search-overlay door bestaande `MobileSearchSheet`

**Files:**
- Modify: `components/dashboard/mobile/MobileShell.tsx`
- Modify: `components/dashboard/mobile/overzicht/MobileOverzichtHeader.tsx`

- [ ] **Step 1: Lokaliseer bestaande `MobileSearchSheet`**

```bash
find . -name "MobileSearchSheet*" -not -path "./node_modules/*" 2>/dev/null
```

Bestudeer de huidige API. Verwacht: een component dat `onClose: () => void` en wellicht `defaultValue: string` accepteert, intern de zoek-input rendert en op submit `router.push('/leads?q=...')` doet. Als de API matcht: importeer en gebruik 'm direct.

- [ ] **Step 2: Vervang `SearchSheetMount` in `MobileShell.tsx`**

```tsx
// Top van bestand:
import { MobileSearchSheet } from '@/components/dashboard/MobileSearchSheet'   // pad-pas

// Vervang de tijdelijke <SearchSheetMount> in de JSX met:
{searchOpen && <MobileSearchSheet onClose={() => setSearchOpen(false)} />}
```

(Schrap het lokale `function SearchSheetMount(...)`-stuk.)

- [ ] **Step 3: Idem in `MobileOverzichtHeader.tsx`**

Vervang de inline `SearchOverlay` met dezelfde `MobileSearchSheet`.

- [ ] **Step 4: Visuele check**

```bash
npm run dev
```

- 375px, tap 🔍 in header → MobileSearchSheet opent.
- Type "Bakker", submit → navigeert naar `/leads?q=Bakker`.
- Sheet sluit bij Esc / X / backdrop / na submit.

- [ ] **Step 5: Build + commit**

```bash
npm run build
git add components/dashboard/mobile/MobileShell.tsx components/dashboard/mobile/overzicht/MobileOverzichtHeader.tsx
git commit -m "refactor(mobile): gebruik bestaande MobileSearchSheet ipv inline overlay"
```

---

## Phase 5 — Opschoning (sequentieel, met confirmation per delete)

### Task 5a: Inventariseer dode mobile-CSS in Overzicht-componenten

**Files:**
- Read: `components/dashboard/overzicht/*.module.css`

- [ ] **Step 1: Vind alle Overzicht-mobile-blokken**

```bash
grep -ln "max-width.*640\|max-width.*480\|max-width.*768" components/dashboard/overzicht/*.module.css
```

- [ ] **Step 2: Per bestand, identificeer welke `@media`-blokken alleen actief waren op de desktop-Overzicht en dus dood zijn nu MobileOverzicht overneemt op ≤640px.**

Maak een lijst:

```
KpiHeroCard.module.css:
  - @media (max-width: 640px) — block lines XX-YY

KpiMiniCard.module.css:
  - @media (max-width: 640px) — block lines XX-YY

KpiTabs.module.css:
  - @media (max-width: 640px) — block lines XX-YY

…
```

- [ ] **Step 3: Vraag user confirmation per bestand voor delete**

> **STOP voor agent:** spreek de user aan met "Mag ik de @media (max-width: 640px) blokken in `<bestand>` verwijderen? Deze CSS-regels worden nooit meer gevuurd omdat de desktop-Overzicht-componenten alleen renderen op ≥641px (binnen DesktopChrome). Wel: regel X-Y / niet: regel A-B [als je twijfels hebt]". Wacht op antwoord.

- [ ] **Step 4: Voer goedgekeurde deletes uit**

```bash
# Per bestand een aparte commit:
git add components/dashboard/overzicht/KpiHeroCard.module.css
git commit -m "chore(dashboard): remove dead mobile-CSS in KpiHeroCard"
```

---

### Task 5b: Inventariseer Sidebar / Topbar mobile-CSS

**Files:**
- Read: `components/dashboard/Sidebar.module.css`, `Topbar.module.css`, `Topbar.tsx`

- [ ] **Step 1: Lijst**

```bash
grep -n "max-width.*768\|max-width.*640" components/dashboard/Sidebar.module.css components/dashboard/Topbar.module.css
```

- [ ] **Step 2: Verifieer dat deze blokken alleen door mobile-viewport getriggerd zouden worden**

Open `app/dashboard/(app)/layout.tsx` — DashboardChrome zorgt dat de desktop-chrome NIET rendert op ≤640px. Dus `@media (max-width: 640px)` in Sidebar / Topbar matters niet. Maar `@media (max-width: 768px)` zou nog wel kunnen vuren op 641-768px (tablet). Daar geldt het desktop-chrome WEL.

Bepaal per `@media` of 'ie weg kan:
- `@media (max-width: 640px)`: weg (chrome niet zichtbaar op deze viewport)
- `@media (max-width: 768px)`: BEHOUDEN (chrome wel zichtbaar op 641-768px)

- [ ] **Step 3: Vraag user confirmation, voer goedgekeurde deletes uit**

```bash
git add components/dashboard/Sidebar.module.css
git commit -m "chore(dashboard): remove dead ≤640 sidebar-CSS"
```

---

### Task 5c: Hamburger-knop in Topbar

**Files:**
- Read: `components/dashboard/Topbar.tsx`

- [ ] **Step 1: Check**

De hamburger opent (op desktop, op smalle browser) de sidebar-drawer. Met DashboardChrome rendert de desktop-chrome niet meer op ≤640px, dus hamburger is alleen nog zichtbaar op 641-1024px (en daar opent 'ie de drawer-Sidebar). Op 641-768 is dat nog zinvol, dus **hamburger BEHOUDEN**.

- [ ] **Step 2: Geen actie. Document de keuze in een korte commit-bericht:**

```bash
git commit --allow-empty -m "chore: hamburger in Topbar behouden (functioneel op 641-1024px)"
```

---

### Task 5d: Build + lint + Puppeteer-vergelijking

- [ ] **Step 1: Build + lint**

```bash
npm run lint
npm run build
```

Expected: beide groen. Fix wat fails.

- [ ] **Step 2: Puppeteer-screenshots maken voor visuele vergelijking**

```bash
# Start dev-server
npm run dev &
sleep 5

# Mobile viewport screenshot
node screenshot.mjs http://localhost:3000/dashboard mobile-overzicht
node screenshot.mjs http://localhost:3000/leads mobile-leads
```

> Note: `screenshot.mjs` is in project root. Bepaal of 'ie viewport-resize-args ondersteunt; zo niet, voeg een puppeteer-snippet toe die `page.setViewport({ width: 390, height: 844 })` doet vóór de capture.

- [ ] **Step 3: Vergelijk visueel met screenshots in `mobile-overzicht-handoff/` referentie of de oorspronkelijk meegegeven mockups.**

Lijst afwijkingen op. Voor elke afwijking: schrijf een korte fix, voer door, commit.

- [ ] **Step 4: Eindcommit**

```bash
git add .
git commit -m "fix(mobile): pixel-pure tuning na visuele review" --allow-empty
```

---

## Acceptatie-test (handmatig)

- [ ] DevTools 390×844 (iPhone 14 Pro), `/dashboard`: bottom-nav 5 tabs, MobileOverzichtHeader rijke variant, alle 6 widgets render met echte data, geen errors in console.
- [ ] Tab Leads/Inbox/Agenda: dunne MobileShellHeader met titel + 🔍/➕/🔔. Content = bestaande responsive-CSS.
- [ ] Tap Meer-tab: sheet opent, navigeer naar /reviews via een rij, sheet sluit. Idem voor /statistieken, /veldwerk, /instellingen, /dashboard/logout.
- [ ] Tap ☀️ in Meer-sheet: thema wisselt; alle mobile-widgets renderen correct in dark mode.
- [ ] `/dashboard`: tap "Alles bekijken" op Wat nu → drilldown schuift in. Tap Terug → terug naar Overzicht. Browser-back-knop sluit drilldown.
- [ ] Tap "Alles bekijken" op Vandaag → VandaagView opent met route + stops timeline.
- [ ] Tap "Alles bekijken" op Recent → ActiviteitView opent met filter-chips.
- [ ] Tap 🔍 in header: search-sheet opent, type "test" + submit → /leads?q=test.
- [ ] Tap 🔔: notificaties-sheet opent (zelfs als items leeg, geen crash).
- [ ] Tap ➕: ManualOfferteModal opent (URL bevat ?nieuwe-offerte=1).
- [ ] Settings: vul "25000" in maand-doel, save, terug naar `/dashboard` → ring toont ~74%.
- [ ] Settings: leeg maand-doel, save, terug → "Stel je maanddoel in" placeholder.
- [ ] 800px viewport: desktop UX identiek aan vóór deze sprint.
- [ ] `npm run lint` groen.
- [ ] `npm run build` groen.

---

## Belangrijke notes voor agentic uitvoering

1. **Inline styles in MobileShell + MobileOverzichtHeader (tijdelijk in fase 2)**: deze worden in fase 4 (Task 4b) vervangen door de bestaande `MobileSearchSheet`. Niet vergeten.

2. **Mock-data tijdens fase 2-build**: agent mag tijdens widget-bouwfase de page-integratie ÉÉN keer uitvoeren met dummy-data om te zien dat de widget-tree compileert, maar de echte data-mapping in `page.tsx` (Task 2h Step 3) is verplicht voor merge.

3. **Pixel-perfect**: bij twijfel over een visueel detail, OPEN de handoff JSX (`mobile-overzicht-handoff/AOverzicht.jsx` of `ADrilldowns.jsx`) en map JS-inline-styles naar de equivalente CSS-vars. Documenteer afwijkingen in commit-messages.

4. **Geen breaking changes desktop**: na elke fase, draai `npm run dev`, zet viewport op 1280px, navigeer naar `/dashboard`, `/leads`, `/inbox`. Geen regressies = OK om door te gaan.

5. **TypeScript strict**: project gebruikt `strict: true`. Vermijd `any`; gebruik `unknown` + type-guards waar nodig.

6. **CLAUDE.md regel**: vraag user-confirmation vóór file-deletes. Houd je daar strikt aan in fase 5.
