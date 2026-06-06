# Lead-check-pagina Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publieke wizard-pagina `/lead-check` (6 vragen, lek-score, omzet-band, demo-CTA, mail-capture) plus vindbaarheid via navbar, footer, homepage-teaser en sitemap.

**Architecture:** Pure rekenmodule in `lib/leadCheck.ts` (client én server hergebruikt, vitest-getest). Client-side wizard in `app/(main)/lead-check/` met drie fases (intro, vraag 1 t/m 6, uitslag). Mail-capture POST naar nieuwe route `app/api/lead-check/route.ts` die server-side herberekent en twee mails stuurt via `lib/mail.ts`. PostHog-events direct via `posthog-js`.

**Tech Stack:** Next.js App Router, TypeScript, CSS Modules, tokens uit `styles/tokens.css`, nodemailer (bestaand), posthog-js (bestaand), vitest (bestaand).

**Spec:** `docs/superpowers/specs/2026-06-06-lead-check-pagina-design.md` + basis-spec `2026-06-02-lead-lek-check-spec.md`

**Branch:** `dev`. Copy-regels: geen "AI"-woord, geen streepjes als leesteken in klantgerichte teksten, alles als schatting/band labelen.

---

## File-map

| Actie | Bestand | Verantwoordelijkheid |
|---|---|---|
| Create | `lib/leadCheck.ts` | Pure rekenfuncties + input-parser (geen React) |
| Create | `lib/leadCheck.test.ts` | Unit-tests formule en randgevallen |
| Create | `app/(main)/lead-check/page.tsx` | Server component: metadata + sectie + wizard |
| Create | `app/(main)/lead-check/page.module.css` | Sectie-styling |
| Create | `app/(main)/lead-check/LeadCheckWizard.tsx` | Client: intro + 6 vraagstappen + state |
| Create | `app/(main)/lead-check/LeadCheckWizard.module.css` | Wizard-styling |
| Create | `app/(main)/lead-check/LeadCheckResult.tsx` | Client: gauge, banden, verbeterpunten, CTA's, mail-capture |
| Create | `app/(main)/lead-check/LeadCheckResult.module.css` | Uitslag-styling |
| Create | `app/api/lead-check/route.ts` | POST: valideer, herbereken, 2 mails |
| Modify | `lib/mail.ts` | + `sendLeadCheckAnalysis()` |
| Modify | `components/sections/Navbar.tsx:11-15` | navLinks + Lead-check |
| Modify | `components/sections/Footer.tsx:5-9` | bedrijf-links + Lead-check |
| Create | `components/sections/LeadCheckTeaser.tsx` + `.module.css` | Homepage-teaser |
| Modify | `app/(main)/page.tsx` | Teaser na StepsSection |
| Modify | `app/sitemap.ts` | /lead-check entry |
| Modify | `app/api/form-tracking/route.ts` | whitelist + `lead_check` |
| Modify | `components/sections/ContactForm.tsx` | bericht-prefill via `?bericht=` |

---

### Task 1: Rekenmodule `lib/leadCheck.ts` (TDD)

**Files:**
- Create: `lib/leadCheck.ts`
- Test: `lib/leadCheck.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// lib/leadCheck.test.ts
import { describe, it, expect } from 'vitest'
import { berekenLeadCheck, verbeterpunten, parseLeadCheckInput, type LeadCheckInput } from './leadCheck'

const basis: LeadCheckInput = {
  aanvragenPerWeek: 10,
  speed: 'zelfde_dag',
  afterhours: 'nee',
  conversiePct: 30,
  orderwaarde: 500,
  shoppen: 'meestal',
}

describe('berekenLeadCheck', () => {
  it('rekent het spec-voorbeeld correct door', () => {
    const r = berekenLeadCheck(basis)
    // base 0.30 + bonus 0.12 = 0.42, shop_mult 1.0 → uplift 0.42
    expect(r.uplift).toBeCloseTo(0.42, 5)
    // score = round(0.42 / 0.60 * 100) = 70
    expect(r.score).toBe(70)
    // A_maand = 43.3; klanten = 12.99; gemist = 5.4558
    expect(r.gemisteKlantenMaand).toBeCloseTo(5.4558, 3)
    // omzet hoog = 2727.9; laag = 0.7 * hoog
    expect(r.omzetMaand.hoog).toBeCloseTo(2727.9, 1)
    expect(r.omzetMaand.laag).toBeCloseTo(1909.53, 1)
    expect(r.omzetJaar.hoog).toBeCloseTo(2727.9 * 12, 1)
  })

  it('geeft score 0 en lege bedragen bij supersnelle opvolging', () => {
    const r = berekenLeadCheck({ ...basis, speed: '5min', afterhours: 'altijd' })
    expect(r.score).toBe(0)
    expect(r.omzetMaand.hoog).toBe(0)
  })

  it('geeft alles 0 bij 0 aanvragen per week', () => {
    const r = berekenLeadCheck({ ...basis, aanvragenPerWeek: 0 })
    expect(r.gemisteKlantenMaand).toBe(0)
    expect(r.omzetMaand.hoog).toBe(0)
    // score blijft het gedrag van de opvolging tonen (uplift onafhankelijk van volume)
    expect(r.score).toBe(70)
  })

  it('capt de uplift op 0.60', () => {
    // volgende_dag 0.45 + nee 0.12 = 0.57 → onder cap; forceer cap via grenswaarde
    const r = berekenLeadCheck({ ...basis, speed: 'volgende_dag', afterhours: 'nee' })
    expect(r.uplift).toBeLessThanOrEqual(0.6)
    expect(r.score).toBe(95) // round(0.57/0.60*100)
  })

  it('dempt de uplift als klanten zelden shoppen', () => {
    const r = berekenLeadCheck({ ...basis, shoppen: 'zelden' })
    expect(r.uplift).toBeCloseTo(0.42 * 0.35, 5)
  })
})

describe('verbeterpunten', () => {
  it('geeft maximaal 3 punten en matcht de condities', () => {
    const punten = verbeterpunten(basis)
    expect(punten.length).toBeLessThanOrEqual(3)
    expect(punten[0]).toContain('Sneller reageren')
  })

  it('geeft geen punten bij perfect profiel', () => {
    const punten = verbeterpunten({ ...basis, speed: '5min', afterhours: 'altijd', conversiePct: 40, shoppen: 'zelden' })
    expect(punten).toEqual([])
  })
})

describe('parseLeadCheckInput', () => {
  it('accepteert geldige invoer en klemt grenzen', () => {
    const parsed = parseLeadCheckInput({ ...basis, aanvragenPerWeek: 9999, orderwaarde: -5 })
    expect(parsed).not.toBeNull()
    expect(parsed!.aanvragenPerWeek).toBe(500)
    expect(parsed!.orderwaarde).toBe(0)
  })

  it('weigert ongeldige keuzewaarden', () => {
    expect(parseLeadCheckInput({ ...basis, speed: 'morgen' })).toBeNull()
    expect(parseLeadCheckInput(null)).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/leadCheck.test.ts`
Expected: FAIL ("Cannot find module './leadCheck'")

- [ ] **Step 3: Write the implementation**

```typescript
// lib/leadCheck.ts
/**
 * Pure rekenmodule voor de lead-lek-check.
 * Formule uit docs/superpowers/specs/2026-06-02-lead-lek-check-spec.md.
 * Gedeeld door de wizard (client) en /api/lead-check (server herberekent).
 */

export type Speed = '5min' | '1uur' | 'paar_uur' | 'zelfde_dag' | 'volgende_dag'
export type Afterhours = 'altijd' | 'soms' | 'nee'
export type Shoppen = 'meestal' | 'soms' | 'zelden'

export interface LeadCheckInput {
  aanvragenPerWeek: number
  speed: Speed
  afterhours: Afterhours
  conversiePct: number
  orderwaarde: number
  shoppen: Shoppen
}

export interface OmzetBand {
  laag: number
  hoog: number
}

export interface LeadCheckResultaat {
  score: number
  uplift: number
  gemisteKlantenMaand: number
  omzetMaand: OmzetBand
  omzetJaar: OmzetBand
}

/* Conservatieve factoren uit de spec; bewust niet aanpasbaar via de UI */
const BASE: Record<Speed, number> = {
  '5min': 0,
  '1uur': 0.08,
  paar_uur: 0.18,
  zelfde_dag: 0.3,
  volgende_dag: 0.45,
}
const AFTERHOURS_BONUS: Record<Afterhours, number> = { altijd: 0, soms: 0.05, nee: 0.12 }
const SHOP_MULT: Record<Shoppen, number> = { meestal: 1, soms: 0.65, zelden: 0.35 }
const MAX_UPLIFT = 0.6
const WEKEN_PER_MAAND = 4.33
const BAND_LAAG_FACTOR = 0.7

/* Invoergrenzen, ook server-side afgedwongen */
export const GRENZEN = {
  aanvragenPerWeek: { min: 0, max: 500 },
  conversiePct: { min: 1, max: 100 },
  orderwaarde: { min: 0, max: 100_000 },
} as const

export function berekenLeadCheck(input: LeadCheckInput): LeadCheckResultaat {
  const aanvragenMaand = input.aanvragenPerWeek * WEKEN_PER_MAAND
  const klantenMaand = aanvragenMaand * (input.conversiePct / 100)

  const uplift = Math.min(
    MAX_UPLIFT,
    (BASE[input.speed] + AFTERHOURS_BONUS[input.afterhours]) * SHOP_MULT[input.shoppen]
  )

  const gemisteKlantenMaand = klantenMaand * uplift
  const hoogMaand = gemisteKlantenMaand * input.orderwaarde

  return {
    score: Math.round((uplift / MAX_UPLIFT) * 100),
    uplift,
    gemisteKlantenMaand,
    omzetMaand: { laag: hoogMaand * BAND_LAAG_FACTOR, hoog: hoogMaand },
    omzetJaar: { laag: hoogMaand * BAND_LAAG_FACTOR * 12, hoog: hoogMaand * 12 },
  }
}

/** Conditionele verbeterpunten uit de spec, maximaal 3, copy zonder streepjes. */
export function verbeterpunten(input: LeadCheckInput): string[] {
  const punten: string[] = []
  if (input.speed === 'paar_uur' || input.speed === 'zelfde_dag' || input.speed === 'volgende_dag') {
    punten.push('Sneller reageren is je grootste hefboom: binnen een uur reageren kan je conversie merkbaar verhogen.')
  }
  if (input.afterhours !== 'altijd') {
    punten.push('Aanvragen die in de avond of het weekend binnenkomen liggen tot de volgende werkdag stil. Daar lekt het hardst.')
  }
  if (input.conversiePct < 25) {
    punten.push('Een deel van je aanvragers haakt af voordat er contact is. Snelle, persoonlijke opvolging tilt dit op.')
  }
  if (input.shoppen === 'meestal') {
    punten.push('Je klanten vergelijken meerdere aanbieders. Dan wint wie als eerste een goede offerte stuurt.')
  }
  return punten.slice(0, 3)
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

/** Valideert onbekende invoer (bijv. uit een request-body). Null bij ongeldig. */
export function parseLeadCheckInput(raw: unknown): LeadCheckInput | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>

  const speeds: Speed[] = ['5min', '1uur', 'paar_uur', 'zelfde_dag', 'volgende_dag']
  const afterhoursOpties: Afterhours[] = ['altijd', 'soms', 'nee']
  const shoppenOpties: Shoppen[] = ['meestal', 'soms', 'zelden']

  if (!speeds.includes(r.speed as Speed)) return null
  if (!afterhoursOpties.includes(r.afterhours as Afterhours)) return null
  if (!shoppenOpties.includes(r.shoppen as Shoppen)) return null

  const aanvragen = Number(r.aanvragenPerWeek)
  const conversie = Number(r.conversiePct)
  const order = Number(r.orderwaarde)
  if (!Number.isFinite(aanvragen) || !Number.isFinite(conversie) || !Number.isFinite(order)) return null

  return {
    aanvragenPerWeek: clamp(aanvragen, GRENZEN.aanvragenPerWeek.min, GRENZEN.aanvragenPerWeek.max),
    speed: r.speed as Speed,
    afterhours: r.afterhours as Afterhours,
    conversiePct: clamp(conversie, GRENZEN.conversiePct.min, GRENZEN.conversiePct.max),
    orderwaarde: clamp(order, GRENZEN.orderwaarde.min, GRENZEN.orderwaarde.max),
    shoppen: r.shoppen as Shoppen,
  }
}

/** Euro-weergave zonder decimalen, nl-NL (gedeeld door UI en mails). */
export function euro(n: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Math.round(n))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/leadCheck.test.ts`
Expected: PASS (alle tests groen)

- [ ] **Step 5: Commit**

```bash
git add lib/leadCheck.ts lib/leadCheck.test.ts
git commit -m "feat(lead-check): pure rekenmodule met tests (formule uit spec)"
```

---

### Task 2: Pagina-skelet + wizard met 6 vragen

**Files:**
- Create: `app/(main)/lead-check/page.tsx`
- Create: `app/(main)/lead-check/page.module.css`
- Create: `app/(main)/lead-check/LeadCheckWizard.tsx`
- Create: `app/(main)/lead-check/LeadCheckWizard.module.css`

- [ ] **Step 1: page.tsx (server component, metadata, hero + wizard)**

```tsx
// app/(main)/lead-check/page.tsx
import type { Metadata } from 'next'
import Badge from '@/components/ui/Badge'
import LeadCheckWizard from './LeadCheckWizard'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Lead-lek-check · Frontlix',
  description:
    'Reken in 1 minuut uit hoeveel aanvragen en omzet je misloopt door trage opvolging. Gratis, zonder account.',
}

export default function LeadCheckPage() {
  return (
    <section id="lead-check" className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.intro}>
          <Badge variant="default" dot>
            Gratis check, 1 minuut
          </Badge>
          <h1 className={styles.heading}>
            Hoeveel leads laat <span className={styles.headingAccent}>jij</span> liggen?
          </h1>
          <p className={styles.subtext}>
            Beantwoord 6 korte vragen en zie meteen een eerlijke schatting van je gemiste aanvragen en omzet.
            Geen account nodig.
          </p>
        </div>
        <LeadCheckWizard />
      </div>
    </section>
  )
}
```

- [ ] **Step 2: page.module.css**

```css
/* app/(main)/lead-check/page.module.css — sectie rond de wizard, mobile-first */
.section {
  background: var(--color-bg);
  padding: calc(var(--nav-height-mob) + var(--space-8)) var(--space-4) var(--space-16);
  min-height: 100vh;
}

.inner {
  max-width: 720px;
  margin: 0 auto;
}

.intro {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--space-4);
  margin-bottom: var(--space-8);
}

.heading {
  font-size: clamp(2rem, 6vw, 3rem);
  font-weight: 900;
  letter-spacing: -0.03em;
  line-height: 1.1;
  color: var(--color-text);
}

/* Gradient-accent volgens brand-regel (background-clip op tekst) */
.headingAccent {
  background: var(--color-gradient);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.subtext {
  font-size: var(--text-base);
  color: var(--color-text-muted);
  line-height: 1.7;
  max-width: 520px;
}

@media (min-width: 640px) {
  .section {
    padding: calc(var(--nav-height) + var(--space-12)) var(--space-6) var(--space-24);
  }
  .subtext {
    font-size: var(--text-lg);
  }
}
```

- [ ] **Step 3: LeadCheckWizard.tsx (intro, 6 stappen, voortgang, navigatie)**

```tsx
// app/(main)/lead-check/LeadCheckWizard.tsx
'use client'

import { useState } from 'react'
import posthog from 'posthog-js'
import Button from '@/components/ui/Button'
import { GRENZEN, type Afterhours, type LeadCheckInput, type Shoppen, type Speed } from '@/lib/leadCheck'
import LeadCheckResult from './LeadCheckResult'
import styles from './LeadCheckWizard.module.css'

/* Stap -1 = intro, 0..5 = vragen, 6 = uitslag */
const AANTAL_VRAGEN = 6

type KeuzeOptie<T extends string> = { value: T; label: string }

const SPEED_OPTIES: KeuzeOptie<Speed>[] = [
  { value: '5min', label: 'Binnen 5 minuten' },
  { value: '1uur', label: 'Binnen een uur' },
  { value: 'paar_uur', label: 'Binnen een paar uur' },
  { value: 'zelfde_dag', label: 'Dezelfde dag nog' },
  { value: 'volgende_dag', label: 'De volgende werkdag of later' },
]
const AFTERHOURS_OPTIES: KeuzeOptie<Afterhours>[] = [
  { value: 'altijd', label: 'Ja, vrijwel altijd' },
  { value: 'soms', label: 'Soms' },
  { value: 'nee', label: 'Nee, alleen tijdens werktijd' },
]
const SHOPPEN_OPTIES: KeuzeOptie<Shoppen>[] = [
  { value: 'meestal', label: 'Ja, meestal wel' },
  { value: 'soms', label: 'Soms' },
  { value: 'zelden', label: 'Zelden of nooit' },
]

function track(event: string, props?: Record<string, unknown>) {
  posthog.capture(event, props)
}

export default function LeadCheckWizard() {
  const [stap, setStap] = useState(-1)
  const [aanvragenPerWeek, setAanvragenPerWeek] = useState('')
  const [speed, setSpeed] = useState<Speed | null>(null)
  const [afterhours, setAfterhours] = useState<Afterhours | null>(null)
  const [conversiePct, setConversiePct] = useState(30)
  const [orderwaarde, setOrderwaarde] = useState('')
  const [shoppen, setShoppen] = useState<Shoppen | null>(null)

  const start = () => {
    track('lead_check_start')
    setStap(0)
  }

  const naarStap = (volgende: number) => {
    if (volgende > stap && volgende <= AANTAL_VRAGEN) track('lead_check_step', { stap: volgende })
    setStap(volgende)
  }

  /* Keuzevraag: antwoord opslaan en direct door */
  const kiesEnDoor = <T,>(setter: (v: T) => void, value: T, volgende: number) => {
    setter(value)
    naarStap(volgende)
  }

  const invoer: LeadCheckInput | null =
    speed && afterhours && shoppen
      ? {
          aanvragenPerWeek: Math.min(GRENZEN.aanvragenPerWeek.max, Math.max(0, Number(aanvragenPerWeek) || 0)),
          speed,
          afterhours,
          conversiePct,
          orderwaarde: Math.min(GRENZEN.orderwaarde.max, Math.max(0, Number(orderwaarde) || 0)),
          shoppen,
        }
      : null

  /* ---------- intro ---------- */
  if (stap === -1) {
    return (
      <div className={styles.card}>
        <ul className={styles.introList}>
          <li>6 korte vragen over je aanvragen en opvolging</li>
          <li>Direct je lek-score en een eerlijke omzet-schatting</li>
          <li>Volledig anoniem, je gegevens blijven in je browser</li>
        </ul>
        <Button variant="primary" size="lg" fullWidth onClick={start}>
          Start de check
        </Button>
      </div>
    )
  }

  /* ---------- uitslag ---------- */
  if (stap === AANTAL_VRAGEN && invoer) {
    return <LeadCheckResult invoer={invoer} />
  }

  /* ---------- vragen ---------- */
  return (
    <div className={styles.card}>
      <div className={styles.progress} role="progressbar" aria-valuemin={1} aria-valuemax={AANTAL_VRAGEN} aria-valuenow={stap + 1}>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${((stap + 1) / AANTAL_VRAGEN) * 100}%` }} />
        </div>
        <span className={styles.progressLabel}>
          Vraag {stap + 1} van {AANTAL_VRAGEN}
        </span>
      </div>

      {stap === 0 && (
        <fieldset className={styles.vraag}>
          <legend className={styles.vraagTitel}>Hoeveel aanvragen krijg je per week via je website of formulier?</legend>
          <input
            type="number"
            inputMode="numeric"
            min={GRENZEN.aanvragenPerWeek.min}
            max={GRENZEN.aanvragenPerWeek.max}
            value={aanvragenPerWeek}
            onChange={(e) => setAanvragenPerWeek(e.target.value)}
            className={styles.input}
            placeholder="Bijv. 8"
            aria-label="Aanvragen per week"
          />
          <Button variant="primary" size="lg" fullWidth disabled={aanvragenPerWeek === ''} onClick={() => naarStap(1)}>
            Volgende
          </Button>
        </fieldset>
      )}

      {stap === 1 && (
        <fieldset className={styles.vraag}>
          <legend className={styles.vraagTitel}>Hoe snel reageer je meestal op een nieuwe aanvraag?</legend>
          <div className={styles.opties}>
            {SPEED_OPTIES.map((o) => (
              <button key={o.value} type="button" className={`${styles.optie} ${speed === o.value ? styles.optieActief : ''}`} onClick={() => kiesEnDoor(setSpeed, o.value, 2)}>
                {o.label}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {stap === 2 && (
        <fieldset className={styles.vraag}>
          <legend className={styles.vraagTitel}>Reageer je ook in de avond en het weekend?</legend>
          <div className={styles.opties}>
            {AFTERHOURS_OPTIES.map((o) => (
              <button key={o.value} type="button" className={`${styles.optie} ${afterhours === o.value ? styles.optieActief : ''}`} onClick={() => kiesEnDoor(setAfterhours, o.value, 3)}>
                {o.label}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {stap === 3 && (
        <fieldset className={styles.vraag}>
          <legend className={styles.vraagTitel}>Welk deel van je aanvragen wordt uiteindelijk klant?</legend>
          <div className={styles.sliderWrap}>
            <input
              type="range"
              min={GRENZEN.conversiePct.min}
              max={GRENZEN.conversiePct.max}
              value={conversiePct}
              onChange={(e) => setConversiePct(Number(e.target.value))}
              className={styles.slider}
              aria-label="Conversiepercentage"
            />
            <span className={styles.sliderWaarde}>{conversiePct}%</span>
          </div>
          <p className={styles.hint}>Weet je het niet precies? Een schatting is prima.</p>
          <Button variant="primary" size="lg" fullWidth onClick={() => naarStap(4)}>
            Volgende
          </Button>
        </fieldset>
      )}

      {stap === 4 && (
        <fieldset className={styles.vraag}>
          <legend className={styles.vraagTitel}>Wat is je gemiddelde orderbedrag?</legend>
          <div className={styles.euroWrap}>
            <span className={styles.euroTeken} aria-hidden="true">€</span>
            <input
              type="number"
              inputMode="numeric"
              min={GRENZEN.orderwaarde.min}
              max={GRENZEN.orderwaarde.max}
              value={orderwaarde}
              onChange={(e) => setOrderwaarde(e.target.value)}
              className={`${styles.input} ${styles.inputEuro}`}
              placeholder="Bijv. 450"
              aria-label="Gemiddeld orderbedrag in euro"
            />
          </div>
          <Button variant="primary" size="lg" fullWidth disabled={orderwaarde === ''} onClick={() => naarStap(5)}>
            Volgende
          </Button>
        </fieldset>
      )}

      {stap === 5 && (
        <fieldset className={styles.vraag}>
          <legend className={styles.vraagTitel}>Vragen je klanten meestal ook bij anderen een offerte aan?</legend>
          <div className={styles.opties}>
            {SHOPPEN_OPTIES.map((o) => (
              <button
                key={o.value}
                type="button"
                className={`${styles.optie} ${shoppen === o.value ? styles.optieActief : ''}`}
                onClick={() => {
                  setShoppen(o.value)
                  track('lead_check_complete')
                  naarStap(6)
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {stap > 0 && (
        <button type="button" className={styles.terug} onClick={() => setStap(stap - 1)}>
          ← Vorige vraag
        </button>
      )}
    </div>
  )
}
```

Let op: `track('lead_check_complete')` hoort de score mee te sturen, maar de score is pas bekend ná state-update van `shoppen`. LeadCheckResult stuurt daarom in Task 3 zelf een `lead_check_result` event mét score; `lead_check_complete` hier blijft zonder score.

- [ ] **Step 4: LeadCheckWizard.module.css**

```css
/* app/(main)/lead-check/LeadCheckWizard.module.css — mobile-first */
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--space-6) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.introList {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: 0;
  margin: 0;
}

.introList li {
  position: relative;
  padding-left: var(--space-6);
  color: var(--color-text-muted);
  font-size: var(--text-base);
  line-height: 1.6;
}

/* Vinkje in brand-kleur vóór elk intro-punt */
.introList li::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: var(--color-primary);
  font-weight: 700;
}

.progress {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.progressTrack {
  height: 6px;
  background: var(--color-surface-2);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progressFill {
  height: 100%;
  background: var(--color-gradient);
  border-radius: var(--radius-full);
  transition: width 0.3s ease;
}

.progressLabel {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.vraag {
  border: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.vraagTitel {
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--color-text);
  line-height: 1.35;
  padding: 0;
}

/* Invoervelden minimaal 16px tegen iOS-zoom (projectregel) */
.input {
  font-size: 1rem;
  padding: var(--space-4);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  color: var(--color-text);
  width: 100%;
}

.input:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: 1px;
}

.euroWrap {
  position: relative;
}

.euroTeken {
  position: absolute;
  left: var(--space-4);
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-muted);
}

.inputEuro {
  padding-left: var(--space-8);
}

.opties {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.optie {
  font-size: 1rem;
  text-align: left;
  padding: var(--space-4);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  color: var(--color-text);
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.optie:hover {
  border-color: var(--color-primary);
  background: var(--color-surface);
}

.optieActief {
  border-color: var(--color-primary);
  background: var(--color-surface);
}

.sliderWrap {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.slider {
  flex: 1;
  accent-color: var(--color-primary);
}

.sliderWaarde {
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--color-primary);
  min-width: 3.5rem;
  text-align: right;
}

.hint {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  margin: 0;
}

.terug {
  align-self: flex-start;
  background: none;
  border: none;
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  cursor: pointer;
  padding: var(--space-2) 0;
}

.terug:hover {
  color: var(--color-primary);
}

@media (min-width: 640px) {
  .card {
    padding: var(--space-8);
  }
}
```

- [ ] **Step 5: Tijdelijke stub voor LeadCheckResult zodat de pagina compileert**

```tsx
// app/(main)/lead-check/LeadCheckResult.tsx  (stub, wordt in Task 3 vervangen)
'use client'

import type { LeadCheckInput } from '@/lib/leadCheck'

export default function LeadCheckResult({ invoer }: { invoer: LeadCheckInput }) {
  return <p>Uitslag volgt (stub). Aanvragen per week: {invoer.aanvragenPerWeek}</p>
}
```

- [ ] **Step 6: Verify met tsc + dev-server**

Run: `npx tsc --noEmit` → Expected: geen fouten.
Run (alleen als er nog geen dev-server draait): `npm run dev` en open `http://localhost:3000/lead-check`. Doorloop alle 6 vragen tot de stub-uitslag. NB: nooit `next build` draaien terwijl de dev-server draait (projectregel).

- [ ] **Step 7: Commit**

```bash
git add "app/(main)/lead-check/"
git commit -m "feat(lead-check): pagina + wizard met 6 vragen (uitslag nog stub)"
```

---

### Task 3: Uitslagscherm met gauge, banden en CTA's

**Files:**
- Modify (vervang stub volledig): `app/(main)/lead-check/LeadCheckResult.tsx`
- Create: `app/(main)/lead-check/LeadCheckResult.module.css`

- [ ] **Step 1: LeadCheckResult.tsx (volledige implementatie, mail-capture-UI inbegrepen; de API-route komt in Task 4)**

```tsx
// app/(main)/lead-check/LeadCheckResult.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import posthog from 'posthog-js'
import Button from '@/components/ui/Button'
import { berekenLeadCheck, euro, verbeterpunten, type LeadCheckInput } from '@/lib/leadCheck'
import styles from './LeadCheckResult.module.css'

/* Halve-cirkel-gauge; kleuren via CSS-variabelen (geen hardcoded hex, brand-regel) */
function ScoreGauge({ score }: { score: number }) {
  const RADIUS = 80
  const HALVE_OMTREK = Math.PI * RADIUS
  const vulling = (score / 100) * HALVE_OMTREK
  return (
    <svg viewBox="0 0 200 112" className={styles.gauge} role="img" aria-label={`Lek-score ${score} van 100`}>
      <defs>
        <linearGradient id="lekGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style={{ stopColor: 'var(--color-primary)' }} />
          <stop offset="100%" style={{ stopColor: 'var(--color-accent)' }} />
        </linearGradient>
      </defs>
      <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="var(--color-surface-2)" strokeWidth="14" strokeLinecap="round" />
      <path
        d="M 20 100 A 80 80 0 0 1 180 100"
        fill="none"
        stroke="url(#lekGradient)"
        strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray={`${vulling} ${HALVE_OMTREK}`}
      />
      <text x="100" y="84" textAnchor="middle" className={styles.gaugeScore}>{score}</text>
      <text x="100" y="104" textAnchor="middle" className={styles.gaugeLabel}>lek-score van 100</text>
    </svg>
  )
}

export default function LeadCheckResult({ invoer }: { invoer: LeadCheckInput }) {
  const resultaat = berekenLeadCheck(invoer)
  const punten = verbeterpunten(invoer)

  const [email, setEmail] = useState('')
  const [mailStatus, setMailStatus] = useState<'idle' | 'bezig' | 'klaar' | 'fout'>('idle')
  /* Honeypot tegen simpele spam-bots: mensen zien dit veld niet */
  const honeypotRef = useRef<HTMLInputElement>(null)

  /* Score één keer naar PostHog (lead_check_complete heeft de score nog niet) */
  useEffect(() => {
    posthog.capture('lead_check_result', { score: resultaat.score })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const geenAanvragen = invoer.aanvragenPerWeek === 0
  const perfecteScore = resultaat.score === 0

  const ctaBericht = `Ik deed de lead-lek-check (score ${resultaat.score} van 100) en wil graag een demo plannen.`

  async function verstuurMail(e: React.FormEvent) {
    e.preventDefault()
    if (honeypotRef.current?.value) return /* bot gevuld → stil negeren */
    setMailStatus('bezig')
    try {
      const res = await fetch('/api/lead-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, invoer }),
      })
      if (!res.ok) throw new Error('mislukt')
      posthog.capture('lead_check_email_submitted', { score: resultaat.score })
      setMailStatus('klaar')
    } catch {
      setMailStatus('fout')
    }
  }

  /* Randgeval: zonder aanvragen valt er niets te rekenen */
  if (geenAanvragen) {
    return (
      <div className={styles.card}>
        <h2 className={styles.titel}>Nog geen aanvragen via je website?</h2>
        <p className={styles.tekst}>
          Zonder aanvragen valt er nog niets te lekken. Zodra je formulier leads oplevert, helpt snelle opvolging je
          om er klanten van te maken. Benieuwd hoe je meer aanvragen binnenhaalt én direct opvolgt?
        </p>
        <Button variant="primary" size="lg" fullWidth href={`/contact?bericht=${encodeURIComponent(ctaBericht)}`}>
          Plan een vrijblijvende demo
        </Button>
      </div>
    )
  }

  return (
    <div className={styles.card}>
      <ScoreGauge score={resultaat.score} />

      {perfecteScore ? (
        <p className={styles.tekst}>
          Knap werk: je opvolging zit al heel strak. Wil je dit niveau vasthouden zonder er zelf bovenop te zitten?
          Dan laten we je graag zien hoe dat automatisch kan.
        </p>
      ) : (
        <>
          <div className={styles.cijfers}>
            <div className={styles.cijferBlok}>
              <span className={styles.cijferWaarde}>≈ {Math.max(1, Math.round(resultaat.gemisteKlantenMaand))}</span>
              <span className={styles.cijferLabel}>gemiste klanten per maand (schatting)</span>
            </div>
            <div className={styles.cijferBlok}>
              <span className={styles.cijferWaarde}>
                {euro(resultaat.omzetMaand.laag)} tot {euro(resultaat.omzetMaand.hoog)}
              </span>
              <span className={styles.cijferLabel}>misgelopen omzet per maand (indicatie)</span>
            </div>
            <div className={styles.cijferBlok}>
              <span className={styles.cijferWaarde}>
                {euro(resultaat.omzetJaar.laag)} tot {euro(resultaat.omzetJaar.hoog)}
              </span>
              <span className={styles.cijferLabel}>op jaarbasis (indicatie)</span>
            </div>
          </div>

          {punten.length > 0 && (
            <div className={styles.punten}>
              <h3 className={styles.puntenTitel}>Waar het bij jou lekt</h3>
              <ul className={styles.puntenLijst}>
                {punten.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <details className={styles.aannames}>
        <summary>Zo rekenen we</summary>
        <p>
          We rekenen met conservatieve factoren: 78% van de klanten kiest het bedrijf dat als eerste reageert.
          We nemen aan dat snellere en ruimere opvolging een deel van je gemiste aanvragen alsnog binnenhaalt.
          De uitkomst is een indicatie, geen belofte. Daarom tonen we een bandbreedte en ronden we af.
        </p>
      </details>

      <div className={styles.ctas}>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          href={`/contact?bericht=${encodeURIComponent(ctaBericht)}`}
          onClick={() => posthog.capture('lead_check_cta_demo', { score: resultaat.score })}
        >
          Zo dicht je dit lek: plan een demo
        </Button>
        <p className={styles.ctaSub}>
          Frontlix reageert binnen 60 seconden op elke aanvraag, dag en nacht, en zet je offerte automatisch klaar.
        </p>
      </div>

      {mailStatus === 'klaar' ? (
        <p className={styles.mailSucces}>Verstuurd! Check je inbox voor de volledige analyse.</p>
      ) : (
        <form className={styles.mailForm} onSubmit={verstuurMail}>
          <label htmlFor="leadcheck-email" className={styles.mailLabel}>
            Liever eerst rustig nalezen? Ontvang de volledige analyse met 3 concrete tips per mail.
          </label>
          <div className={styles.mailRij}>
            <input
              id="leadcheck-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jouw@bedrijf.nl"
              className={styles.mailInput}
            />
            <Button type="submit" variant="secondary" size="md" disabled={mailStatus === 'bezig'}>
              {mailStatus === 'bezig' ? 'Versturen...' : 'Stuur de analyse'}
            </Button>
          </div>
          {/* Honeypot: visueel verborgen, bots vullen hem wel in */}
          <input ref={honeypotRef} type="text" name="website" tabIndex={-1} autoComplete="off" className={styles.honeypot} aria-hidden="true" />
          {mailStatus === 'fout' && (
            <p className={styles.mailFout}>Versturen lukte niet. Probeer het nog eens of plan direct een demo.</p>
          )}
        </form>
      )}
    </div>
  )
}
```

- [ ] **Step 2: LeadCheckResult.module.css**

```css
/* app/(main)/lead-check/LeadCheckResult.module.css — mobile-first */
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--space-6) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  align-items: stretch;
}

.gauge {
  width: min(260px, 70vw);
  margin: 0 auto;
}

.gaugeScore {
  font-size: 2.4rem;
  font-weight: 900;
  fill: var(--color-text);
}

.gaugeLabel {
  font-size: 0.7rem;
  fill: var(--color-text-muted);
}

.titel {
  font-size: var(--text-2xl);
  font-weight: 800;
  color: var(--color-text);
  text-align: center;
}

.tekst {
  color: var(--color-text-muted);
  line-height: 1.7;
  text-align: center;
}

.cijfers {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.cijferBlok {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  text-align: center;
}

.cijferWaarde {
  font-size: var(--text-2xl);
  font-weight: 800;
  color: var(--color-primary);
}

.cijferLabel {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.punten {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.puntenTitel {
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--color-text);
}

.puntenLijst {
  margin: 0;
  padding-left: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  color: var(--color-text-muted);
  line-height: 1.6;
}

.aannames {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  line-height: 1.6;
}

.aannames summary {
  cursor: pointer;
  font-weight: 600;
  color: var(--color-text);
}

.aannames p {
  margin-top: var(--space-2);
}

.ctas {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.ctaSub {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  text-align: center;
  margin: 0;
}

.mailForm {
  border-top: 1px solid var(--color-border);
  padding-top: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.mailLabel {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  line-height: 1.6;
}

.mailRij {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

/* 16px minimaal tegen iOS-zoom (projectregel) */
.mailInput {
  font-size: 1rem;
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  color: var(--color-text);
  flex: 1;
}

.mailInput:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: 1px;
}

.honeypot {
  position: absolute;
  left: -9999px;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.mailSucces {
  border-top: 1px solid var(--color-border);
  padding-top: var(--space-6);
  color: var(--color-success);
  font-weight: 600;
  text-align: center;
}

.mailFout {
  color: var(--color-danger);
  font-size: var(--text-sm);
  margin: 0;
}

@media (min-width: 640px) {
  .card {
    padding: var(--space-8);
  }
  .cijfers {
    flex-direction: row;
  }
  .cijferBlok {
    flex: 1;
  }
  .mailRij {
    flex-direction: row;
    align-items: stretch;
  }
}
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit` → geen fouten. Doorloop op `http://localhost:3000/lead-check` de wizard met de spec-testwaarden (10 aanvragen, dezelfde dag, nee, 30%, 450, meestal) en controleer: score 70 in de gauge, banden zichtbaar, verbeterpunten, demo-knop linkt naar `/contact?bericht=...`. Mail-versturen geeft nu nog een nette foutmelding (route bestaat pas na Task 4): dat is verwacht gedrag.

- [ ] **Step 4: Commit**

```bash
git add "app/(main)/lead-check/"
git commit -m "feat(lead-check): uitslagscherm met gauge, omzet-band, verbeterpunten en CTA's"
```

---

### Task 4: Mail-route + analyse-mail

**Files:**
- Modify: `lib/mail.ts` (functie toevoegen onderaan)
- Create: `app/api/lead-check/route.ts`

- [ ] **Step 1: `sendLeadCheckAnalysis` toevoegen aan `lib/mail.ts` (onderaan het bestand, na `sendConfirmation`)**

```typescript
/** Stuurt de lead-check-analyse naar de invuller (zelfde visuele stijl als sendConfirmation). */
export async function sendLeadCheckAnalysis(
  to: string,
  data: {
    score: number
    gemisteKlantenMaand: number
    omzetMaandLaag: string
    omzetMaandHoog: string
    omzetJaarLaag: string
    omzetJaarHoog: string
    punten: string[]
  }
) {
  const transporter = getTransporter()
  const puntenHtml = data.punten
    .map(
      (p) => `
      <tr>
        <td style="padding: 4px 10px 4px 0; vertical-align: top; color: #1A56FF; font-size: 14px;">&#10003;</td>
        <td style="padding: 4px 0; color: #555555; font-size: 14px; line-height: 1.5;">${p}</td>
      </tr>`
    )
    .join('')

  await transporter.sendMail({
    from: `Frontlix <${process.env.MAIL_USER}>`,
    to,
    subject: `Je lead-lek-analyse: score ${data.score} van 100 | Frontlix`,
    html: `
<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"></head>
<body style="margin: 0; padding: 0; background-color: #F0F2F5; font-family: 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F0F2F5; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width: 560px; width: 100%;">
          <tr>
            <td style="background-color: #FFFFFF; border-radius: 16px 16px 0 0; padding: 32px 40px; text-align: center; border-bottom: 1px solid #F0F0F0;">
              <img src="https://frontlix.com/logo.png" alt="Frontlix" width="48" style="display: inline-block; max-width: 48px; height: auto; vertical-align: middle;" />
              <span style="display: inline-block; vertical-align: middle; margin-left: 12px; font-size: 22px; font-weight: 700; color: #1A1A1A; letter-spacing: -0.3px;">Frontlix</span>
            </td>
          </tr>
          <tr>
            <td style="background-color: #FFFFFF; padding: 40px;">
              <h2 style="margin: 0 0 8px; color: #1A1A1A; font-size: 20px; font-weight: 700;">Je lead-lek-analyse</h2>
              <p style="margin: 0 0 20px; color: #555555; font-size: 15px; line-height: 1.7;">
                Je lek-score is <strong style="color: #1A56FF;">${data.score} van 100</strong>.
                Op basis van je antwoorden schatten we dat je ongeveer ${data.gemisteKlantenMaand} klanten per maand misloopt.
                Dat komt neer op een indicatie van ${data.omzetMaandLaag} tot ${data.omzetMaandHoog} per maand,
                ofwel ${data.omzetJaarLaag} tot ${data.omzetJaarHoog} per jaar.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F5F7FA; border-radius: 12px; margin: 0 0 24px;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <p style="margin: 0 0 12px; color: #1A1A1A; font-size: 14px; font-weight: 600;">Jouw 3 concrete tips</p>
                    <table cellpadding="0" cellspacing="0">${puntenHtml}</table>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 8px; color: #555555; font-size: 13px; line-height: 1.6;">
                Dit is een eerlijke schatting met conservatieve aannames, geen belofte. We rekenen met het gegeven dat
                78% van de klanten kiest voor het bedrijf dat als eerste reageert.
              </p>
              <p style="margin: 0 0 24px; color: #555555; font-size: 15px; line-height: 1.7;">
                Zo dicht je dit lek: Frontlix reageert binnen 60 seconden op elke aanvraag, dag en nacht, en zet je offerte automatisch klaar.
              </p>
              <a href="https://frontlix.com/contact" style="display: inline-block; background: linear-gradient(135deg, #1A56FF, #00CFFF); color: #FFFFFF; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 8px;">Plan een vrijblijvende demo</a>
            </td>
          </tr>
          <tr>
            <td style="background-color: #F5F7FA; border-radius: 0 0 16px 16px; padding: 24px 40px; text-align: center;">
              <p style="margin: 0 0 4px; color: #1A1A1A; font-size: 14px; font-weight: 600;">Team Frontlix</p>
              <p style="margin: 0;">
                <a href="https://frontlix.com" style="color: #1A56FF; text-decoration: none; font-size: 12px;">frontlix.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  })
}
```

(Inline hex-kleuren zijn hier toegestaan: e-mail-HTML kan geen CSS-variabelen lezen; dit volgt het bestaande patroon van `sendConfirmation`.)

- [ ] **Step 2: `app/api/lead-check/route.ts`**

```typescript
// app/api/lead-check/route.ts
import { NextResponse } from 'next/server'
import { berekenLeadCheck, euro, parseLeadCheckInput, verbeterpunten } from '@/lib/leadCheck'
import { sendLeadCheckAnalysis, sendNotification } from '@/lib/mail'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_BODY_BYTES = 4096

export async function POST(request: Request) {
  try {
    const raw = await request.text()
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json({ success: false, message: 'Payload te groot.' }, { status: 400 })
    }
    const body = JSON.parse(raw) as { email?: unknown; invoer?: unknown }

    const email = typeof body.email === 'string' ? body.email.trim() : ''
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ success: false, message: 'Ongeldig e-mailadres.' }, { status: 400 })
    }

    /* Server herberekent: client-uitslag wordt niet vertrouwd */
    const invoer = parseLeadCheckInput(body.invoer)
    if (!invoer) {
      return NextResponse.json({ success: false, message: 'Ongeldige antwoorden.' }, { status: 400 })
    }

    const resultaat = berekenLeadCheck(invoer)
    const punten = verbeterpunten(invoer)

    /* 1. Notificatie naar de eigenaar, zodat hij binnen een minuut kan opvolgen */
    await sendNotification(
      `Lead-check ingevuld: score ${resultaat.score} (${email})`,
      `
      <h2>Nieuwe lead via de lead-lek-check</h2>
      <p><strong>E-mail:</strong> ${email}</p>
      <p><strong>Lek-score:</strong> ${resultaat.score} van 100</p>
      <ul>
        <li>Aanvragen per week: ${invoer.aanvragenPerWeek}</li>
        <li>Reactiesnelheid: ${invoer.speed}</li>
        <li>Buiten kantooruren: ${invoer.afterhours}</li>
        <li>Conversie: ${invoer.conversiePct}%</li>
        <li>Orderwaarde: ${euro(invoer.orderwaarde)}</li>
        <li>Klanten shoppen: ${invoer.shoppen}</li>
      </ul>
      <p>Geschatte misgelopen omzet: ${euro(resultaat.omzetMaand.laag)} tot ${euro(resultaat.omzetMaand.hoog)} per maand.</p>
      <p><strong>Reageer binnen 60 seconden, practice what you preach.</strong></p>
      `
    )

    /* 2. Analyse-mail naar de invuller (de beloofde volledige analyse) */
    await sendLeadCheckAnalysis(email, {
      score: resultaat.score,
      gemisteKlantenMaand: Math.max(1, Math.round(resultaat.gemisteKlantenMaand)),
      omzetMaandLaag: euro(resultaat.omzetMaand.laag),
      omzetMaandHoog: euro(resultaat.omzetMaand.hoog),
      omzetJaarLaag: euro(resultaat.omzetJaar.laag),
      omzetJaarHoog: euro(resultaat.omzetJaar.hoog),
      punten:
        punten.length > 0
          ? punten
          : ['Je opvolging zit al strak. Houd dit vast door je reactiesnelheid te blijven meten.'],
    })

    return NextResponse.json({ success: true, message: 'Analyse verstuurd.' })
  } catch (err) {
    console.error('lead-check route error:', err)
    return NextResponse.json({ success: false, message: 'Er ging iets mis. Probeer het later opnieuw.' }, { status: 500 })
  }
}
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit` → geen fouten.
Run: `npm test` → alle tests groen.
Handtest (vereist MAIL_USER/MAIL_PASS in `.env.local`; sla over als die lokaal ontbreken en noteer dat de mail-flow alleen op de VPS end-to-end te testen is):
```bash
curl -s -X POST http://localhost:3000/api/lead-check \
  -H 'Content-Type: application/json' \
  -d '{"email":"frontlixx@gmail.com","invoer":{"aanvragenPerWeek":10,"speed":"zelfde_dag","afterhours":"nee","conversiePct":30,"orderwaarde":450,"shoppen":"meestal"}}'
```
Expected: `{"success":true,...}` en twee mails in de inbox. Ongeldige e-mail → 400.

- [ ] **Step 4: Commit**

```bash
git add lib/mail.ts app/api/lead-check/route.ts
git commit -m "feat(lead-check): mail-route met server-herberekening en analyse-mail"
```

---

### Task 5: Form-tracking-koppeling

**Files:**
- Modify: `app/api/form-tracking/route.ts` (whitelist)
- Modify: `app/(main)/lead-check/LeadCheckResult.tsx` (tracking-call bij mail-submit)

- [ ] **Step 1: Voeg `lead_check` toe aan de whitelist**

Zoek in `app/api/form-tracking/route.ts` de definitie van `ALLOWED_FORM_NAMES` (rond regel 100-115) en voeg `'lead_check'` toe aan de set, bijvoorbeeld:

```typescript
const ALLOWED_FORM_NAMES = new Set(['contact', 'demo', 'project', 'hero_demo', 'personalized_demo', 'lead_check'])
```

(Neem de bestaande leden letterlijk over zoals ze in het bestand staan; alleen `'lead_check'` komt erbij.)

- [ ] **Step 2: Stuur een completed-event bij mail-submit**

In `LeadCheckResult.tsx`, in `verstuurMail` direct na de succesvolle response (na `posthog.capture('lead_check_email_submitted', ...)`), toevoegen:

```typescript
      /* Form-tracking: completed-event volgens bestaand patroon (silent fail) */
      fetch('/api/form-tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: crypto.randomUUID(),
          formName: 'lead_check',
          fieldData: { score: String(resultaat.score) },
          status: 'completed',
          pageUrl: window.location.pathname,
        }),
      }).catch(() => {})
```

- [ ] **Step 3: Verify + commit**

Run: `npx tsc --noEmit` → geen fouten.

```bash
git add app/api/form-tracking/route.ts "app/(main)/lead-check/LeadCheckResult.tsx"
git commit -m "feat(lead-check): form-tracking-event bij mail-capture"
```

---

### Task 6: Vindbaarheid: navbar, footer, homepage-teaser, sitemap

**Files:**
- Modify: `components/sections/Navbar.tsx:11-15`
- Modify: `components/sections/Footer.tsx:5-9`
- Create: `components/sections/LeadCheckTeaser.tsx` + `LeadCheckTeaser.module.css`
- Modify: `app/(main)/page.tsx`
- Modify: `app/sitemap.ts`

- [ ] **Step 1: Navbar-link**

In `components/sections/Navbar.tsx` de `navLinks`-array vervangen door:

```tsx
const navLinks = [
  { label: 'Diensten', href: '/diensten' },
  { label: 'Lead-check', href: '/lead-check' },
  { label: 'Over ons', href: '/over-ons' },
  { label: 'Contact', href: '/contact' },
]
```

(Het mobiele menu mapt dezelfde array, dus dit is één wijziging.)

- [ ] **Step 2: Footer-link**

In `components/sections/Footer.tsx` aan de `bedrijf`-array toevoegen (na Diensten):

```tsx
  { label: 'Lead-check', href: '/lead-check' },
```

(Eerst het bestand openen en de array exact overnemen; alleen deze regel komt erbij.)

- [ ] **Step 3: LeadCheckTeaser.tsx**

```tsx
// components/sections/LeadCheckTeaser.tsx
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import styles from './LeadCheckTeaser.module.css'

export default function LeadCheckTeaser() {
  return (
    <section id="lead-check-teaser" className={styles.teaser}>
      <div className={styles.inner}>
        <Badge variant="default" dot>
          Gratis check
        </Badge>
        <h2 className={styles.heading}>Hoeveel omzet lekt er bij jou weg?</h2>
        <p className={styles.tekst}>
          Beantwoord 6 korte vragen en zie in 1 minuut hoeveel aanvragen en omzet je misloopt door trage opvolging.
        </p>
        <Button variant="primary" size="lg" href="/lead-check">
          Doe de gratis lead-check
        </Button>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: LeadCheckTeaser.module.css**

```css
/* components/sections/LeadCheckTeaser.module.css — mobile-first */
.teaser {
  background: var(--color-surface);
  padding: var(--space-16) var(--space-4);
}

.inner {
  max-width: var(--max-width);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--space-4);
}

.heading {
  font-size: clamp(1.6rem, 5vw, 2.4rem);
  font-weight: 900;
  letter-spacing: -0.02em;
  color: var(--color-text);
}

.tekst {
  color: var(--color-text-muted);
  line-height: 1.7;
  max-width: 480px;
}

@media (min-width: 640px) {
  .teaser {
    padding: var(--space-24) var(--space-6);
  }
}
```

- [ ] **Step 5: Teaser op de homepage**

In `app/(main)/page.tsx`: import toevoegen en het component renderen direct ná `<StepsSection />`:

```tsx
import LeadCheckTeaser from '@/components/sections/LeadCheckTeaser'
```

```tsx
      <StepsSection />
      <LeadCheckTeaser />
```

(Bestand eerst lezen; alleen deze import + één regel JSX toevoegen, verder niets wijzigen.)

- [ ] **Step 6: Sitemap-entry**

In `app/sitemap.ts` toevoegen aan de array (na de `/diensten`-entry):

```typescript
    {
      url: `${baseUrl}/lead-check`,
      lastModified: '2026-06-06',
      changeFrequency: 'monthly',
      priority: 0.9,
    },
```

- [ ] **Step 7: Verify + commit**

Run: `npx tsc --noEmit` → geen fouten. Check op localhost: navbar-link (desktop + mobiel menu), footer-link, teaser op de homepage.

```bash
git add components/sections/Navbar.tsx components/sections/Footer.tsx components/sections/LeadCheckTeaser.tsx components/sections/LeadCheckTeaser.module.css "app/(main)/page.tsx" app/sitemap.ts
git commit -m "feat(lead-check): vindbaar via navbar, footer, homepage-teaser en sitemap"
```

---

### Task 7: ContactForm-prefill via query-param

**Files:**
- Modify: `components/sections/ContactForm.tsx`

- [ ] **Step 1: Prefill-effect toevoegen**

`ContactForm.tsx` is een client component met een `formRef`. Voeg na de bestaande state-declaraties een `useEffect` toe (en `useEffect` aan de react-import):

```tsx
  /* Prefill van het bericht-veld via ?bericht= (gebruikt door de lead-check demo-CTA) */
  useEffect(() => {
    const prefill = new URLSearchParams(window.location.search).get('bericht')
    if (!prefill || !formRef.current) return
    const veld = formRef.current.elements.namedItem('bericht') as HTMLTextAreaElement | null
    if (veld && veld.value === '') veld.value = prefill
  }, [])
```

(Bewust `window.location.search` in een effect in plaats van `useSearchParams`: dat vermijdt een verplichte Suspense-boundary en verandert niets aan de prerendering van de pagina.)

- [ ] **Step 2: Verify + commit**

Open `http://localhost:3000/contact?bericht=test123` → het berichtveld bevat "test123". Zonder param: leeg veld, formulier werkt zoals voorheen.

```bash
git add components/sections/ContactForm.tsx
git commit -m "feat(contact): bericht-prefill via query-param voor de lead-check CTA"
```

---

### Task 8: Eindverificatie

- [ ] **Step 1: Volledige checks**

```bash
npm test          # alle tests groen
npx tsc --noEmit  # geen TypeScript-fouten
npm run lint      # geen nieuwe lint-fouten
```

- [ ] **Step 2: Visuele verificatie via de screenshot-workflow**

```bash
node screenshot.mjs http://localhost:3000/lead-check lead-check-intro
```

Doorloop daarna handmatig de wizard en screenshot de uitslag. Lees de PNG's uit `temporary screenshots/` en controleer: spacing, gradient op gauge en CTA, geen warme kleuren, voortgangsbalk, mobiele breedte (375px) en desktop.

- [ ] **Step 3: Funnel-events controleren**

In de browser-console (PostHog debug staat aan in dev): events `lead_check_start`, `lead_check_step`, `lead_check_complete`, `lead_check_result`, `lead_check_cta_demo` verschijnen op de juiste momenten.

- [ ] **Step 4: Pagina aan de gebruiker tonen**

Dev-server laten draaien en de gebruiker melden dat `http://localhost:3000/lead-check` klaar is voor review (mobiel: zelfde URL op de telefoon via het lokale netwerk werkt alleen met `next dev -H 0.0.0.0`; standaard gewoon op de Mac bekijken).

- [ ] **Step 5: Niet pushen**

Werk blijft op `dev` tot de gebruiker de pagina heeft gereviewd en akkoord is. Geen merge naar `main`, geen deploy.

---

## Self-review checklist (na afronding plan)

- Spec-coverage: wizard (T2), uitslag + gauge + banden + verbeterpunten + aannames (T3), mail-capture + 2 mails + server-herberekening (T4), form-tracking (T5), navbar/footer/teaser/sitemap (T6), contact-prefill (T7), PostHog-events (T2/T3), randgevallen 0-aanvragen en score 0 (T1/T3), 16px-inputs en tokens (T2/T3 css), geen "AI" en geen streepjes in copy (alle teksten), SEO-metadata (T2).
- Bewust buiten scope: PDF-rapport, benchmark-laag, deel-links, rate-limiting op IP-niveau (honeypot + payload-cap + e-mailvalidatie is de MVP-bescherming; zwaardere rate-limiting ligt bij de uitgestelde security-items).
