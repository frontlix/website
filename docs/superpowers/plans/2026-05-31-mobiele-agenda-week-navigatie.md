# Mobiele agenda — week-navigatie · Implementatieplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Voeg week-navigatie (vorige/volgende week + "Vandaag") en een werkende dag-strip toe aan de mobiele agenda, zodat de gebruiker verder vooruit/terug in de tijd kan kijken.

**Architecture:** Hergebruikt de bestaande `?week=YYYY-MM-DD`-URL-parameter en server-side fetch (zelfde patroon als de desktop-agenda). `page.tsx` berekent prev/next-week-sleutels + "huidige week?"-vlag en geeft die mee aan een nieuw, klein `AgendaWeekNav`-component. De ongebruikte `onJump`-callback van de dag-strip wordt gekoppeld aan `scrollIntoView`. Alles leeft in de `.mobileTree`; desktop blijft ongewijzigd.

**Tech Stack:** Next.js (App Router, RSC) · TypeScript · CSS Modules · `next/link` · `lucide-react` (iconen) · Vitest (unit-tests).

> **Commit-beleid:** De gebruiker committeert pas op verzoek. Sla de losse commit-stappen over tijdens uitvoering; aan het einde (na groene build) één commit aanbieden. De commit-commando's staan in Task 7.

---

## Bestandsoverzicht

| Bestand | Actie | Verantwoordelijkheid |
|---|---|---|
| `lib/dashboard/agenda-week.ts` | Modify | Nieuwe helper `currentMondayKey()` (maandag-key van vandaag). |
| `lib/dashboard/agenda-week.test.ts` | Create | Unit-tests voor `currentMondayKey` + `shiftWeekKey`. |
| `app/dashboard/(app)/agenda/page.tsx` | Modify | `MobileAgendaData` vullen met `prevWeekKey`/`nextWeekKey`/`isCurrentWeek`. |
| `components/dashboard/mobile/agenda/MobileAgenda.tsx` | Modify | Type uitbreiden + props doorgeven aan `AgendaWeek`. |
| `components/dashboard/mobile/agenda/AgendaWeekNav.tsx` | Create | Navigatiebalk: ‹ · weeklabel · › + "Vandaag". |
| `components/dashboard/mobile/agenda/AgendaWeekNav.module.css` | Create | Styling navigatiebalk (tokens, mobile-first). |
| `components/dashboard/mobile/agenda/AgendaWeek.tsx` | Modify | Nav renderen, subtitle ontdubbelen, `onJump`→scroll koppelen. |
| `components/dashboard/mobile/agenda/AgendaDayGroup.tsx` | Modify | Optionele `id`-prop als scroll-doel. |

---

## Task 1: Helper `currentMondayKey` + tests (TDD)

**Files:**
- Modify: `lib/dashboard/agenda-week.ts`
- Test: `lib/dashboard/agenda-week.test.ts`

- [ ] **Step 1: Schrijf de falende test**

Create `lib/dashboard/agenda-week.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { currentMondayKey, shiftWeekKey } from './agenda-week'

describe('currentMondayKey', () => {
  afterEach(() => vi.useRealTimers())

  it('geeft op zondag de maandag ervoor (ISO-week ma–zo)', () => {
    // Zondag 31 mei 2026 → maandag = 25 mei 2026
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 4, 31, 12, 0, 0))
    expect(currentMondayKey()).toBe('2026-05-25')
  })

  it('geeft op de maandag zelf diezelfde dag', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 4, 25, 9, 0, 0))
    expect(currentMondayKey()).toBe('2026-05-25')
  })

  it('accepteert een expliciete datum (woensdag 3 jun 2026 → ma 1 jun)', () => {
    expect(currentMondayKey(new Date(2026, 5, 3, 8, 0, 0))).toBe('2026-06-01')
  })
})

describe('shiftWeekKey', () => {
  it('schuift een week vooruit', () => {
    expect(shiftWeekKey('2026-05-25', 1)).toBe('2026-06-01')
  })
  it('schuift een week terug', () => {
    expect(shiftWeekKey('2026-05-25', -1)).toBe('2026-05-18')
  })
})
```

- [ ] **Step 2: Run de test, verifieer dat hij faalt**

Run: `npm test -- agenda-week`
Expected: FAIL — `currentMondayKey` is niet geëxporteerd ("currentMondayKey is not a function" / import-fout). (`shiftWeekKey`-tests slagen al.)

- [ ] **Step 3: Implementeer `currentMondayKey`**

In `lib/dashboard/agenda-week.ts`, voeg toe direct ná `shiftWeekKey` (rond regel 115), vóór `buildWeekDays`:

```ts
/** Maandag-key (YYYY-MM-DD) van de week waarin `now` valt. Default: vandaag.
 *  Gebruikt dezelfde lokale-tijd-logica als parseWeekParam's default-week. */
export function currentMondayKey(now: Date = new Date()): string {
  return dateToKey(getMondayOf(now))
}
```

- [ ] **Step 4: Run de test, verifieer dat hij slaagt**

Run: `npm test -- agenda-week`
Expected: PASS (5 tests).

---

## Task 2: `page.tsx` — navigatie-data in `MobileAgendaData`

**Files:**
- Modify: `app/dashboard/(app)/agenda/page.tsx`

> Geen unit-test (RSC met DB-fetch); `npm run build` in Task 7 verifieert de types. `shiftWeekKey` is al geïmporteerd op regel 9; voeg `currentMondayKey` toe aan diezelfde import.

- [ ] **Step 1: Breid de import uit**

Wijzig regel 9:

```ts
import { parseWeekParam, shiftWeekKey, currentMondayKey } from '@/lib/dashboard/agenda-week'
```

- [ ] **Step 2: Vul de navigatie-velden in `mobileData`**

Vervang het `mobileData`-blok (huidig regels 66–72) door:

```tsx
  const mobileData: MobileAgendaData = {
    events: mapAppointmentsToAgendaEvents(mobileAppointments, mobileNow),
    todayDate: amsterdamDayKey(mobileNow.toISOString()),
    nowTime: amsterdamTime(mobileNow.toISOString()),
    weekDays: buildMobileWeekDays(mobileWeek.mondayKey),
    weekLabel: `Week ${mobileWeek.weekNumber} · ${mobileWeek.rangeLabel}`,
    prevWeekKey: shiftWeekKey(mobileWeek.mondayKey, -1),
    nextWeekKey: shiftWeekKey(mobileWeek.mondayKey, 1),
    isCurrentWeek: mobileWeek.mondayKey === currentMondayKey(),
  }
```

---

## Task 3: `MobileAgenda.tsx` — type + prop-doorgifte

**Files:**
- Modify: `components/dashboard/mobile/agenda/MobileAgenda.tsx`

- [ ] **Step 1: Breid het type `MobileAgendaData` uit**

Voeg in de `MobileAgendaData`-type (na `weekLabel`, regel 24) toe:

```ts
  /** Maandag-key (YYYY-MM-DD) van de vorige week. */
  prevWeekKey: string
  /** Maandag-key (YYYY-MM-DD) van de volgende week. */
  nextWeekKey: string
  /** True als de getoonde week de huidige week is (→ "Vandaag" inactief). */
  isCurrentWeek: boolean
```

- [ ] **Step 2: Geef de nieuwe props door aan `AgendaWeek`**

Voeg in de `<AgendaWeek ... />`-aanroep (na `weekLabel={data.weekLabel}`, regel 43) toe:

```tsx
        prevWeekKey={data.prevWeekKey}
        nextWeekKey={data.nextWeekKey}
        isCurrentWeek={data.isCurrentWeek}
```

---

## Task 4: Nieuw component `AgendaWeekNav` + CSS

**Files:**
- Create: `components/dashboard/mobile/agenda/AgendaWeekNav.tsx`
- Create: `components/dashboard/mobile/agenda/AgendaWeekNav.module.css`

- [ ] **Step 1: Maak `AgendaWeekNav.tsx`**

```tsx
'use client'

// AgendaWeekNav — week-navigatie voor de mobiele agenda.
// ‹ (vorige week) · weeklabel · › (volgende week) + "Vandaag"-knop.
// Navigatie via ?week=YYYY-MM-DD (zelfde infra als desktop). "Vandaag" is
// inactief zolang de getoonde week de huidige week is.

import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import styles from './AgendaWeekNav.module.css'

interface AgendaWeekNavProps {
  /** Subtitle, bv. "Week 22 · 25 t/m 31 mei 2026". */
  weekLabel: string
  /** Maandag-key (YYYY-MM-DD) van de vorige week. */
  prevWeekKey: string
  /** Maandag-key (YYYY-MM-DD) van de volgende week. */
  nextWeekKey: string
  /** True → "Vandaag" inactief (we staan al op de huidige week). */
  isCurrentWeek: boolean
}

export function AgendaWeekNav({
  weekLabel,
  prevWeekKey,
  nextWeekKey,
  isCurrentWeek,
}: AgendaWeekNavProps) {
  return (
    <nav className={styles.nav} aria-label="Week-navigatie">
      <Link
        href={`/agenda?week=${prevWeekKey}`}
        className={styles.arrow}
        aria-label="Vorige week"
      >
        <ChevronLeft size={20} aria-hidden="true" />
      </Link>

      <span className={styles.label}>{weekLabel}</span>

      <Link
        href={`/agenda?week=${nextWeekKey}`}
        className={styles.arrow}
        aria-label="Volgende week"
      >
        <ChevronRight size={20} aria-hidden="true" />
      </Link>

      {isCurrentWeek ? (
        <span className={styles.today} data-disabled="true" aria-disabled="true">
          Vandaag
        </span>
      ) : (
        <Link href="/agenda" className={styles.today}>
          Vandaag
        </Link>
      )}
    </nav>
  )
}
```

- [ ] **Step 2: Maak `AgendaWeekNav.module.css`**

```css
/* AgendaWeekNav — week-navigatiebalk (mobiel). Tokens uit tokens.css. */

.nav {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 18px 8px;
}

.arrow {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: var(--color-chip-bg);
  color: var(--color-text);
  display: grid;
  place-items: center;
  flex-shrink: 0;
  text-decoration: none;
}

.label {
  flex: 1;
  min-width: 0;
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.today {
  flex-shrink: 0;
  padding: 7px 12px;
  border-radius: 10px;
  background: var(--color-chip-bg);
  color: var(--color-primary);
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
}

/* Inactief op de huidige week. */
.today[data-disabled='true'] {
  opacity: 0.4;
  pointer-events: none;
  color: var(--color-text-muted);
}
```

---

## Task 5: `AgendaWeek.tsx` — nav renderen + scroll koppelen

**Files:**
- Modify: `components/dashboard/mobile/agenda/AgendaWeek.tsx`

- [ ] **Step 1: Importeer `AgendaWeekNav`**

Voeg toe bij de imports (na regel 14, `AgendaDayJumpStrip`-import):

```ts
import { AgendaWeekNav } from './AgendaWeekNav'
```

- [ ] **Step 2: Breid de props uit**

Voeg in `interface AgendaWeekProps` (na `weekLabel: string`, regel 85) toe:

```ts
  /** Maandag-key vorige week (YYYY-MM-DD). */
  prevWeekKey: string
  /** Maandag-key volgende week (YYYY-MM-DD). */
  nextWeekKey: string
  /** True → "Vandaag" inactief. */
  isCurrentWeek: boolean
```

En in de destructuring van `AgendaWeek({ ... })` (na `weekLabel,`, regel 98):

```ts
  prevWeekKey,
  nextWeekKey,
  isCurrentWeek,
```

- [ ] **Step 3: Voeg de scroll-jump-handler toe**

Voeg toe binnen de component, na de `days`-`useMemo` (na regel 148, vóór `const totalEv`):

```ts
  // Tik op een dag in de strip → scroll naar de bijbehorende dag-groep.
  // De scroll-container is .root (overflow-y:auto); scrollIntoView scrollt
  // de dichtstbijzijnde scrollbare ancestor.
  const handleJump = (date: string) => {
    document
      .getElementById(`agday-${date}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
```

- [ ] **Step 4: Ontdubbel de subtitle (weeklabel verhuist naar de nav)**

Vervang het `<p className={styles.subtitle}>`-blok (regels 159–161):

```tsx
          <p className={styles.subtitle}>
            {totalEv} {totalEv === 1 ? 'afspraak' : 'afspraken'}
          </p>
```

- [ ] **Step 5: Render de nav-balk onder de titleBar**

Voeg direct ná de sluitende `</header>` van de titleBar (na regel 181) en vóór `<AgendaFilterPills ... />` toe:

```tsx
      {/* Week-navigatie */}
      <AgendaWeekNav
        weekLabel={weekLabel}
        prevWeekKey={prevWeekKey}
        nextWeekKey={nextWeekKey}
        isCurrentWeek={isCurrentWeek}
      />
```

- [ ] **Step 6: Koppel `onJump` aan de dag-strip**

Wijzig de `<AgendaDayJumpStrip ... />`-regel (regel 187):

```tsx
      <AgendaDayJumpStrip days={weekDays} events={events} todayDate={todayDate} onJump={handleJump} />
```

- [ ] **Step 7: Geef elke dag-groep een scroll-`id`**

Voeg in de `<AgendaDayGroup ... >`-aanroep (binnen `days.map`, na `key={d.date}`, regel 215) toe:

```tsx
          id={`agday-${d.date}`}
```

---

## Task 6: `AgendaDayGroup.tsx` — optionele `id`-prop

**Files:**
- Modify: `components/dashboard/mobile/agenda/AgendaDayGroup.tsx`

- [ ] **Step 1: Voeg `id` toe aan de props**

In `interface AgendaDayGroupProps` (na `children?: ReactNode`, regel 25):

```ts
  /** Optioneel DOM-id, gebruikt als scroll-doel vanuit de dag-strip. */
  id?: string
```

En in de destructuring (na `children,`, regel 35): voeg `id,` toe.

- [ ] **Step 2: Zet `id` op de buitenste div**

Wijzig regel 44:

```tsx
    <div className={styles.group} id={id}>
```

- [ ] **Step 3: Run de unit-tests (regressie)**

Run: `npm test -- agenda-week`
Expected: PASS (5 tests) — UI-wijzigingen breken de helper-tests niet.

---

## Task 7: Verificatie (lint, build, seed, real-device)

**Files:** —

- [ ] **Step 1: Lint**

Run: `npm run lint`
Expected: geen nieuwe errors/warnings in de gewijzigde bestanden.

- [ ] **Step 2: Type-check / build**

Run: `npm run build`
Expected: build slaagt zonder TypeScript-fouten.

- [ ] **Step 3: Seed-data voor zichtbare navigatie**

Maak (los) een paar test-afspraken in verschillende weken in de dashboard-DB
(huidige week, +1, −1) zodat het vooruit/terug-bladeren echt iets toont. Veilig:
de WhatsApp-bot draait op een andere database (`zsioklwkkhlylqgthnal`) en ziet
deze rijen niet. Gebruik hetzelfde script-patroon als
`tmp/insert-appointment.mjs` met afwijkende `lead_id` en `afspraak_geboekt_op`.

- [ ] **Step 4: Real-device test (telefoon, http://192.168.1.228:3000)**

  - Open de agenda → huidige week (week 22) toont de test-afspraak van 31 mei.
  - `›` → volgende week; correcte afspraken / lege staat.
  - `‹` → terug; "Vandaag" springt naar de huidige week en wordt grijs/inactief.
  - Tik een dag in de strip → de lijst scrollt naar die dag-groep.

- [ ] **Step 5: Desktop-regressie (kort)**

Open de agenda in een breed venster: week/maand/routekaart-views werken
ongewijzigd (de mobiele wijzigingen zitten in `.mobileTree`).

- [ ] **Step 6: Commit (alleen op verzoek van de gebruiker)**

```bash
git add lib/dashboard/agenda-week.ts lib/dashboard/agenda-week.test.ts \
        "app/dashboard/(app)/agenda/page.tsx" \
        components/dashboard/mobile/agenda/MobileAgenda.tsx \
        components/dashboard/mobile/agenda/AgendaWeekNav.tsx \
        components/dashboard/mobile/agenda/AgendaWeekNav.module.css \
        components/dashboard/mobile/agenda/AgendaWeek.tsx \
        components/dashboard/mobile/agenda/AgendaDayGroup.tsx \
        docs/superpowers/specs/2026-05-31-mobiele-agenda-week-navigatie-design.md \
        docs/superpowers/plans/2026-05-31-mobiele-agenda-week-navigatie.md
git commit -m "feat(mobile/agenda): week-navigatie (‹ › + Vandaag) en werkende dag-strip"
```

---

## Self-review (uitgevoerd)

- **Spec-dekking:** week-knoppen ‹ › (Task 4/5), "Vandaag" + inactief op huidige week (Task 1/2/4), onbeperkt vooruit/terug (shiftWeekKey, geen grens — Task 2), dag-strip-scroll (Task 5/6), mobile-only (nav in `.mobileTree`), edge case lege week (bestaande tekst blijft), Amsterdam-tijdzone (ongewijzigd). Alle spec-punten gedekt.
- **Placeholders:** geen TBD/TODO; alle code volledig uitgeschreven.
- **Type-consistentie:** `prevWeekKey`/`nextWeekKey`/`isCurrentWeek` identiek benoemd in `page.tsx` → `MobileAgendaData` → `AgendaWeek` props → `AgendaWeekNav` props. `onJump(date: string)` matcht de bestaande `AgendaDayJumpStrip`-signatuur. `id`-prop matcht `agday-${date}` in beide richtingen.
