# "Zelf overnemen" — hand-over-lead zichtbaar in het dashboard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Leads die de bot heeft overgedragen (buiten werkgebied + onder min-m², markering `eigenaar_overgenomen`/`status='handoff'`) krijgen overal in het dashboard een duidelijke rode badge "Zelf overnemen", plus een item in de "Eerst dit doen"-lijst.

**Architecture:** Eén gedeelde, pure helper `isHandover(lead)` bepaalt of een lead een overdracht is, afgeleid uit twee bestaande velden (geen DB-migratie). Alle weergave-mappers (v2-leadslijst, mobiele leadslijst, v2- en mobiel dossier, inbox) en de overzicht-actielijst gebruiken die helper en laten de hand-over-markering vóórgaan op de gewone status-weergave. De v2-leadslijst en het v2-dossier tonen de badge volledig via hun mapper (geen component-wijziging); mobiel + inbox krijgen een kleine component-toevoeging.

**Tech Stack:** Next.js (App Router), TypeScript, Supabase, Vitest.

## Global Constraints

- **Bron van waarheid:** `isHandover(lead) = lead.eigenaar_overgenomen === true || lead.status === 'handoff'`. Eén helper, overal gebruikt.
- **Label:** exact `Zelf overnemen` (rode tint). Geen "Handover"/"Hand-over" in zichtbare tekst.
- **Geen database-migratie, geen botwerk.** `eigenaar_overgenomen` (boolean) en `status` (text) bestaan al op `leads`; `database.types.ts` kent `eigenaar_overgenomen` al (regel 385).
- **Voorrang:** hand-over wint van "urgent" en van de gewone fase-/stage-badge.
- **Geen afvink-knop, geen filter-tab.** Alleen weergave + de "Eerst dit doen"-actie.
- Desktop (v2) én mobiel.
- Tests met `npx vitest run <pad>`; volledige build met `npm run build`. Geen `npm run build` in deelstappen (alleen aan het eind / bij de coördinator).
- Streep-vrije, accentvrije zichtbare tekst (huisstijl): komma i.p.v. liggend streepje.

---

## File Structure

- `lib/dashboard/lead-status-meta.ts` (wijzigen) — `isHandover()` helper toevoegen + `handoff`-label hernoemen naar "Zelf overnemen".
- `lib/dashboard/lead-status-meta.test.ts` (nieuw) — tests voor `isHandover()` + het hernoemde label.
- `lib/dashboard/lead-queries.ts` (wijzigen) — `eigenaar_overgenomen` toevoegen aan `LeadListItem` (Pick) + `LIST_COLUMNS`.
- `components/dashboard/v2/leads/leads-mappers.ts` (wijzigen) — `statusKindForLead`/`statusLabelForLead` met hand-over-voorrang.
- `components/dashboard/v2/leads/leads-mappers.test.ts` (nieuw of uitbreiden) — badge-tests.
- `components/dashboard/mobile/leads/lead-mappers.ts` (wijzigen) — `handover: boolean` op `MobileLeadCard` + `mapLeadToCard`.
- `components/dashboard/mobile/leads/lead-mappers.test.ts` (nieuw of uitbreiden) — `handover`-test.
- `components/dashboard/mobile/leads/<lead-kaart>.tsx` (wijzigen) — rode "Zelf overnemen"-badge op de kaart.
- `components/dashboard/v2/dossier/dossier-mappers.ts` (wijzigen) — kop-pill met hand-over-voorrang.
- `components/dashboard/mobile/dossier/dossier-mappers.ts` (wijzigen) — dossier-status met hand-over-voorrang.
- `components/dashboard/v2/inbox/inbox-mappers.ts` (wijzigen) — hand-over-markering op de thread + label.
- `components/dashboard/v2/inbox/<thread-render>.tsx` (wijzigen) — badge tonen.
- `lib/dashboard/eerst-dit-doen.ts` (wijzigen) — nieuwe `ActionKind: 'handover'`.
- `lib/dashboard/eerst-dit-doen.test.ts` (nieuw of uitbreiden) — actie-tests.

---

## Task 1: Fundering — `isHandover`-helper, label, query-veld

**Files:**
- Modify: `lib/dashboard/lead-status-meta.ts`
- Test: `lib/dashboard/lead-status-meta.test.ts` (nieuw)
- Modify: `lib/dashboard/lead-queries.ts:19-51` (`LeadListItem`) + `:53-83` (`LIST_COLUMNS`)

**Interfaces:**
- Produces: `isHandover(lead: { eigenaar_overgenomen?: boolean | null; status?: string | null }): boolean` uit `lib/dashboard/lead-status-meta.ts`. `LeadListItem` bevat voortaan `eigenaar_overgenomen`.

- [ ] **Step 1: Schrijf de falende test**

Create `lib/dashboard/lead-status-meta.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { isHandover, leadStatusMeta } from './lead-status-meta'

describe('isHandover', () => {
  it('is true bij eigenaar_overgenomen=true', () => {
    expect(isHandover({ eigenaar_overgenomen: true, status: 'info_compleet' })).toBe(true)
  })
  it('is true bij status=handoff', () => {
    expect(isHandover({ eigenaar_overgenomen: false, status: 'handoff' })).toBe(true)
  })
  it('is false bij een gewone lead', () => {
    expect(isHandover({ eigenaar_overgenomen: false, status: 'in_gesprek' })).toBe(false)
  })
  it('is false bij ontbrekende velden', () => {
    expect(isHandover({})).toBe(false)
  })
})

describe('leadStatusMeta handoff-label', () => {
  it('toont "Zelf overnemen" voor status handoff', () => {
    expect(leadStatusMeta('handoff')).toEqual({ label: 'Zelf overnemen', tone: 'red' })
  })
})
```

- [ ] **Step 2: Run test, verwacht falen**

Run: `cd /Users/christiaantromp/.claude/jobs/70431847/tmp/zelf-overnemen-wt && npx vitest run lib/dashboard/lead-status-meta.test.ts`
Expected: FAIL met "isHandover is not a function" (en/of het label is nog "Handover").

- [ ] **Step 3: Pas `lead-status-meta.ts` aan**

Hernoem het `handoff`-label (regel 29) van `'Handover'` naar `'Zelf overnemen'`:

```ts
  handoff:           { label: 'Zelf overnemen',     tone: 'red'   },
```

Voeg onderaan het bestand toe:

```ts
/**
 * Of een lead een overdracht ("Zelf overnemen") is: de bot heeft de lead niet
 * verder in behandeling genomen (buiten werkgebied + onder min-m², of dienst
 * uit) en de eigenaar moet het zelf oppakken. De bot zet `eigenaar_overgenomen`
 * zodra hij overneemt; na goedkeuring wordt `status = 'handoff'`. Beide tellen.
 */
export function isHandover(lead: {
  eigenaar_overgenomen?: boolean | null
  status?: string | null
}): boolean {
  return lead.eigenaar_overgenomen === true || lead.status === 'handoff'
}
```

- [ ] **Step 4: Run test, verwacht slagen**

Run: `npx vitest run lib/dashboard/lead-status-meta.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Voeg `eigenaar_overgenomen` toe aan de lijst-query**

In `lib/dashboard/lead-queries.ts`, voeg in de `LeadListItem`-Pick (na `| 'akkoord_op'`, regel ~50) toe:

```ts
  | 'akkoord_op'
  | 'eigenaar_overgenomen'
>
```

En in `LIST_COLUMNS` (na `'akkoord_op',`, regel ~82):

```ts
  'akkoord_op',
  'eigenaar_overgenomen',
].join(', ')
```

(`Lead`/`database.types.ts` kent `eigenaar_overgenomen` al, dus de Pick compileert; `status` zit al in beide.)

- [ ] **Step 6: Verifieer typecheck van de query-laag**

Run: `npx vitest run lib/dashboard/lead-status-meta.test.ts && npx tsc --noEmit 2>&1 | grep -i "lead-queries" || echo "geen tsc-fouten in lead-queries"`
Expected: tests PASS, geen tsc-fouten in `lead-queries.ts`.

- [ ] **Step 7: Commit**

```bash
git add lib/dashboard/lead-status-meta.ts lib/dashboard/lead-status-meta.test.ts lib/dashboard/lead-queries.ts
git commit -m "feat(leads): isHandover-helper + 'Zelf overnemen'-label + eigenaar_overgenomen in lijst-query"
```

---

## Task 2: Badge in de leadslijst (desktop v2 + mobiel)

**Files:**
- Modify: `components/dashboard/v2/leads/leads-mappers.ts:67-90`
- Test: `components/dashboard/v2/leads/leads-mappers.test.ts` (nieuw)
- Modify: `components/dashboard/mobile/leads/lead-mappers.ts:7-21,82-103`
- Test: `components/dashboard/mobile/leads/lead-mappers.test.ts` (nieuw)
- Modify: de mobiele lead-kaart-component (zie stap 7)

**Interfaces:**
- Consumes: `isHandover` (`@/lib/dashboard/lead-status-meta`).
- Produces: v2 `statusLabelForLead` geeft `"Zelf overnemen"` + `statusKindForLead` geeft `"hot"` bij hand-over; `MobileLeadCard` krijgt veld `handover: boolean`.

- [ ] **Step 1: Schrijf de falende v2-test**

Create `components/dashboard/v2/leads/leads-mappers.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mapLeadToV2 } from './leads-mappers'
import type { LeadListItem } from '@/lib/dashboard/lead-queries'

function baseLead(overrides: Partial<LeadListItem>): LeadListItem {
  return {
    lead_id: 'L1', naam: 'Test', bedrijfsnaam: null, telefoon: null, email: null,
    straat: null, huisnummer: null, postcode: null, plaats: 'Goes',
    hoofdcategorie: null, sub_diensten: null, m2: null, totaal_prijs: null,
    afstand_km: null, status: 'in_gesprek', gesprek_fase: 'info_verzamelen',
    dashboard_status: 'open', bron: null, afspraak_datum: null, afspraak_starttijd: null,
    aangemaakt: '2026-06-01T10:00:00Z', bijgewerkt: '2026-06-01T10:00:00Z', kanaal: 'wa',
    pending_eigenaar_review: null, klus_geblokkeerd: null, offerte_pending_sinds: null,
    offerte_verstuurd: null, offerte_verstuurd_op: null, akkoord_op: null,
    eigenaar_overgenomen: false,
    ...overrides,
  } as LeadListItem
}

describe('leadslijst hand-over-badge', () => {
  it('toont "Zelf overnemen" + hot bij eigenaar_overgenomen=true', () => {
    const lead = mapLeadToV2(baseLead({ eigenaar_overgenomen: true }))
    expect(lead.status).toBe('Zelf overnemen')
    expect(lead.statusKind).toBe('hot')
  })
  it('wint van urgent', () => {
    const lead = mapLeadToV2(baseLead({ eigenaar_overgenomen: true, pending_eigenaar_review: { reden: 'x' } as never }))
    expect(lead.status).toBe('Zelf overnemen')
  })
  it('toont de gewone status bij een normale lead', () => {
    const lead = mapLeadToV2(baseLead({}))
    expect(lead.status).not.toBe('Zelf overnemen')
  })
})
```

- [ ] **Step 2: Run, verwacht falen**

Run: `npx vitest run components/dashboard/v2/leads/leads-mappers.test.ts`
Expected: FAIL ("Zelf overnemen" wordt niet geretourneerd).

- [ ] **Step 3: Pas de v2-mapper aan**

In `components/dashboard/v2/leads/leads-mappers.ts`: voeg de import toe en laat hand-over vóórgaan in beide functies.

Bovenaan bij de imports:

```ts
import { isHandover } from "@/lib/dashboard/lead-status-meta";
```

`statusKindForLead` (regel 67-73) wordt:

```ts
function statusKindForLead(lead: LeadListItem): StatusKind {
  if (isHandover(lead)) return "hot"; // overdracht, jij moet dit zelf regelen
  if (isLeadUrgent(lead)) return "hot"; // wacht op jou / urgent -> koraal
  if (lead.gesprek_fase === "onderhandelen") return "review";
  return STAGE_TO_KIND[leadStage(lead)];
}
```

`statusLabelForLead` (regel 85-90) wordt:

```ts
function statusLabelForLead(lead: LeadListItem): string {
  if (isHandover(lead)) return "Zelf overnemen";
  if (isLeadUrgent(lead)) return "Wacht op jou";
  if (lead.gesprek_fase === "onderhandelen") return "In onderhandeling";
  return STAGE_LABEL[leadStage(lead)];
}
```

- [ ] **Step 4: Run, verwacht slagen**

Run: `npx vitest run components/dashboard/v2/leads/leads-mappers.test.ts`
Expected: PASS (3 tests). (De v2-leadslijst en pipeline tonen de badge automatisch via `StatusPill kind={lead.statusKind}` in `LeadsList.tsx:79`; geen component-wijziging nodig.)

- [ ] **Step 5: Schrijf de falende mobiele test**

Create `components/dashboard/mobile/leads/lead-mappers.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mapLeadToCard } from './lead-mappers'
import type { LeadListItem } from '@/lib/dashboard/lead-queries'

function baseLead(overrides: Partial<LeadListItem>): LeadListItem {
  return {
    lead_id: 'L1', naam: 'Test', bedrijfsnaam: null, telefoon: null, email: null,
    straat: null, huisnummer: null, postcode: null, plaats: 'Goes',
    hoofdcategorie: null, sub_diensten: null, m2: null, totaal_prijs: null,
    afstand_km: null, status: 'in_gesprek', gesprek_fase: 'info_verzamelen',
    dashboard_status: 'open', bron: null, afspraak_datum: null, afspraak_starttijd: null,
    aangemaakt: '2026-06-01T10:00:00Z', bijgewerkt: '2026-06-01T10:00:00Z', kanaal: 'wa',
    pending_eigenaar_review: null, klus_geblokkeerd: null, offerte_pending_sinds: null,
    offerte_verstuurd: null, offerte_verstuurd_op: null, akkoord_op: null,
    eigenaar_overgenomen: false,
    ...overrides,
  } as LeadListItem
}

describe('mobiele kaart hand-over', () => {
  it('zet handover=true bij eigenaar_overgenomen', () => {
    expect(mapLeadToCard(baseLead({ eigenaar_overgenomen: true })).handover).toBe(true)
  })
  it('zet handover=true bij status=handoff', () => {
    expect(mapLeadToCard(baseLead({ status: 'handoff' })).handover).toBe(true)
  })
  it('handover=false bij een normale lead', () => {
    expect(mapLeadToCard(baseLead({})).handover).toBe(false)
  })
})
```

- [ ] **Step 6: Run (faalt), pas `lead-mappers.ts` aan, run (slaagt)**

Run: `npx vitest run components/dashboard/mobile/leads/lead-mappers.test.ts` → FAIL ("handover" bestaat niet op het type).

Pas `components/dashboard/mobile/leads/lead-mappers.ts` aan:
- Voeg de import toe: `import { isHandover } from '@/lib/dashboard/lead-status-meta'`
- Voeg `handover: boolean` toe aan het `MobileLeadCard`-type (na `urgent: boolean`, regel 18):

```ts
  urgent: boolean
  handover: boolean
```

- Zet het veld in `mapLeadToCard` (na `urgent: isLeadUrgent(l),`, regel 99):

```ts
    urgent: isLeadUrgent(l),
    handover: isHandover(l),
```

Run opnieuw: `npx vitest run components/dashboard/mobile/leads/lead-mappers.test.ts` → PASS (3 tests).

- [ ] **Step 7: Toon de badge op de mobiele kaart**

Lees de mobiele lead-kaart-component (de component die `MobileLeadCard` rendert; zoek met `grep -rl "MobileLeadCard\|\.urgent" components/dashboard/mobile/leads`). Voeg, op de plek waar de `urgent`-indicator wordt getoond, een rode badge toe die voorrang heeft:

```tsx
{card.handover ? (
  <span className={styles.handoverBadge}>Zelf overnemen</span>
) : card.urgent ? (
  /* bestaande urgent-indicator ongewijzigd */
) : null}
```

Voeg in de bijbehorende `*.module.css` een `.handoverBadge` toe in dezelfde stijl als de bestaande urgent/status-badge, met een rode achtergrond (hergebruik de tokenkleur die ook elders voor rood/urgent wordt gebruikt, bv. `var(--rb-status-hot-bg)` / `var(--rb-status-hot-ink)`). Houd de bestaande urgent-render intact voor niet-hand-over-leads.

- [ ] **Step 8: Verifieer build + tests**

Run: `npm run build && npx vitest run components/dashboard/v2/leads/ components/dashboard/mobile/leads/`
Expected: build slaagt, tests PASS.

- [ ] **Step 9: Commit**

```bash
git add components/dashboard/v2/leads/ components/dashboard/mobile/leads/
git commit -m "feat(leads): 'Zelf overnemen'-badge in de leadslijst (desktop + mobiel)"
```

---

## Task 3: Hand-over-pill in het leaddossier (desktop v2 + mobiel)

**Files:**
- Modify: `components/dashboard/v2/dossier/dossier-mappers.ts:82-99`
- Modify: `components/dashboard/mobile/dossier/dossier-mappers.ts` (de `mapLeadDetailToDossier`-statusafleiding)
- Test: `components/dashboard/v2/dossier/dossier-mappers.test.ts` (nieuw of uitbreiden)

**Interfaces:**
- Consumes: `isHandover` (`@/lib/dashboard/lead-status-meta`). De detail-lead (`LeadDetail["lead"]`) bevat `eigenaar_overgenomen` + `status` al (de query doet `select('*')`).

- [ ] **Step 1: Schrijf de falende test (v2 dossier-kop)**

Create/extend `components/dashboard/v2/dossier/dossier-mappers.test.ts` met een test die een minimale `LeadDetail` met `lead.eigenaar_overgenomen = true` door `mapLeadDetailToV2Lead` haalt en controleert:

```ts
import { describe, it, expect } from 'vitest'
import { mapLeadDetailToV2Lead } from './dossier-mappers'

// Minimale LeadDetail-stub; alleen de velden die mapLeadDetailToV2Lead leest.
function detailStub(leadOverrides: Record<string, unknown>) {
  return {
    lead: {
      lead_id: 'L1', naam: 'Test', plaats: 'Goes', hoofdcategorie: null,
      totaal_prijs: null, bron: 'whatsapp', kanaal: 'wa', aangemaakt: '2026-06-01T10:00:00Z',
      dashboard_status: 'open', gesprek_fase: 'info_verzamelen', pending_eigenaar_review: null,
      status: 'info_compleet', eigenaar_overgenomen: false, ...leadOverrides,
    },
    offertes: [],
  } as never
}

describe('dossier-kop hand-over', () => {
  it('toont "Zelf overnemen" + hot bij eigenaar_overgenomen=true', () => {
    const v2 = mapLeadDetailToV2Lead(detailStub({ eigenaar_overgenomen: true }))
    expect(v2.status).toBe('Zelf overnemen')
    expect(v2.statusKind).toBe('hot')
  })
  it('toont de gewone status bij een normale lead', () => {
    const v2 = mapLeadDetailToV2Lead(detailStub({}))
    expect(v2.status).not.toBe('Zelf overnemen')
  })
})
```

- [ ] **Step 2: Run, verwacht falen**

Run: `npx vitest run components/dashboard/v2/dossier/dossier-mappers.test.ts`
Expected: FAIL.

- [ ] **Step 3: Pas `mapLeadDetailToV2Lead` aan (v2)**

In `components/dashboard/v2/dossier/dossier-mappers.ts`: voeg de import toe en laat hand-over de kop-pill bepalen vóór de stage:

```ts
import { isHandover } from "@/lib/dashboard/lead-status-meta";
```

In `mapLeadDetailToV2Lead` (regel 83-99), vervang de `status`/`statusKind`-velden door een hand-over-voorrang:

```ts
  const stage = leadStage(l);
  const handover = isHandover(l);
  const prijs = l.totaal_prijs ?? detail.offertes[0]?.totaal_incl ?? null;
  return {
    id: l.lead_id,
    naam: l.naam ?? "Onbekend",
    plaats: l.plaats ?? "Onbekend",
    dienst: l.hoofdcategorie ?? "Dienst",
    waarde: prijs != null ? formatEuro(prijs) : "Geen bedrag",
    bron: l.bron ?? l.kanaal ?? "onbekend",
    status: handover ? "Zelf overnemen" : STAGE_LABEL[stage],
    statusKind: handover ? "hot" : STAGE_KIND[stage],
    tijd: l.aangemaakt ? shortTimeAgo(l.aangemaakt) : "Onbekend",
    initials: initialsFromNaam(l.naam),
  };
```

- [ ] **Step 4: Run, verwacht slagen**

Run: `npx vitest run components/dashboard/v2/dossier/dossier-mappers.test.ts`
Expected: PASS. (`DossierView.tsx:292` rendert `<StatusPill kind={lead.statusKind}>● {lead.status}</StatusPill>` ongewijzigd.)

- [ ] **Step 5: Pas het mobiele dossier aan**

Lees `components/dashboard/mobile/dossier/dossier-mappers.ts` (`mapLeadDetailToDossier`, de plek waar `lead.stage = STAGE_LABEL[stage]` wordt gezet, ~regel 287-303). Voeg `import { isHandover } from '@/lib/dashboard/lead-status-meta'` toe en laat de status-/stage-tekst "Zelf overnemen" tonen wanneer `isHandover(detail.lead)`:

```ts
const handover = isHandover(detail.lead)
// ... waar de stage-tekst gezet wordt:
stage: handover ? 'Zelf overnemen' : STAGE_LABEL[stage],
```

Pas het exact aan op de bestaande veldnaam/structuur in die mapper (lees de functie eerst). Als het mobiele dossier de status als een gekleurde pill toont, geef die dan de rode/urgente variant bij hand-over (zelfde tokenkleur als elders voor rood).

- [ ] **Step 6: Verifieer build + tests**

Run: `npm run build && npx vitest run components/dashboard/v2/dossier/ components/dashboard/mobile/dossier/`
Expected: build slaagt, tests PASS.

- [ ] **Step 7: Commit**

```bash
git add components/dashboard/v2/dossier/ components/dashboard/mobile/dossier/
git commit -m "feat(leads): 'Zelf overnemen'-pill in het leaddossier (desktop + mobiel)"
```

---

## Task 4: Hand-over-markering in de inbox

**Files:**
- Modify: `components/dashboard/v2/inbox/inbox-mappers.ts`
- Modify: de thread-/gesprek-render-component in `components/dashboard/v2/inbox/`
- Test: `components/dashboard/v2/inbox/inbox-mappers.test.ts` (nieuw of uitbreiden)

**Interfaces:**
- Consumes: `isHandover`. De inbox-bron moet `eigenaar_overgenomen` + `status` van de lead bevatten; controleer de inbox-query (`lib/dashboard/inbox-queries.ts`) en voeg de velden toe aan de `ConversationPreview`/lead-context als ze ontbreken (analoog aan Task 1 stap 5).

- [ ] **Step 1: Onderzoek de inbox-databron**

Lees `lib/dashboard/inbox-queries.ts` en `components/dashboard/v2/inbox/inbox-mappers.ts`. Bepaal of de thread-/preview-data al `eigenaar_overgenomen`/`status` bevat. Zo niet: voeg die kolommen toe aan de betreffende `.select(...)` en aan het preview-/context-type (zelfde patroon als `LIST_COLUMNS`).

- [ ] **Step 2: Schrijf de falende test**

Breid `inbox-mappers.test.ts` (maak aan als die niet bestaat) uit met een test die bevestigt dat een conversatie met `eigenaar_overgenomen=true` (of `status='handoff'`) een `handover: true` (of label "Zelf overnemen") oplevert in de gemapte thread. Gebruik dezelfde mock-vorm als de bestaande inbox-mapper-aanroepen.

- [ ] **Step 3: Run (faalt), implementeer, run (slaagt)**

Voeg in `inbox-mappers.ts` `import { isHandover } from '@/lib/dashboard/lead-status-meta'` toe en zet een `handover`-boolean (of een statuslabel "Zelf overnemen" met voorrang) op de gemapte thread/preview. Run de test tot groen.

- [ ] **Step 4: Toon de badge in de inbox-UI**

Lees de thread-lijst- en/of gesprek-headercomponent in `components/dashboard/v2/inbox/`. Toon bij `handover` een rode "Zelf overnemen"-badge (zelfde stijl als Task 2 stap 7), zodat de eigenaar in de inbox ziet dat hij dit gesprek zelf moet voeren. De bestaande "Actie nodig"/status-weergave blijft intact voor niet-hand-over-gesprekken.

- [ ] **Step 5: Verifieer build + tests**

Run: `npm run build && npx vitest run components/dashboard/v2/inbox/`
Expected: build slaagt, tests PASS.

- [ ] **Step 6: Commit**

```bash
git add components/dashboard/v2/inbox/ lib/dashboard/inbox-queries.ts
git commit -m "feat(inbox): 'Zelf overnemen'-markering bij overgedragen gesprekken"
```

---

## Task 5: "Eerst dit doen"-actie voor hand-over

**Files:**
- Modify: `lib/dashboard/eerst-dit-doen.ts:12-19` (`ActionKind`) + `:85-229` (`deriveActionForLead`)
- Test: `lib/dashboard/eerst-dit-doen.test.ts` (nieuw of uitbreiden)

**Interfaces:**
- Consumes: `isHandover` (`@/lib/dashboard/lead-status-meta`), `LeadListItem` (bevat nu `eigenaar_overgenomen`).
- Produces: een `DashboardAction` met `kind: 'handover'`.

- [ ] **Step 1: Schrijf de falende test**

Create/extend `lib/dashboard/eerst-dit-doen.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { deriveActions } from './eerst-dit-doen'
import type { LeadListItem } from './lead-queries'

function lead(overrides: Partial<LeadListItem>): LeadListItem {
  return {
    lead_id: 'L1', naam: 'Test', bedrijfsnaam: null, telefoon: null, email: null,
    straat: null, huisnummer: null, postcode: null, plaats: 'Goes',
    hoofdcategorie: 'oprit_terras_terrein', sub_diensten: null, m2: null, totaal_prijs: 300,
    afstand_km: null, status: 'info_compleet', gesprek_fase: 'offerte_besproken',
    dashboard_status: 'open', bron: null, afspraak_datum: null, afspraak_starttijd: null,
    aangemaakt: '2026-06-01T10:00:00Z', bijgewerkt: '2026-06-01T10:00:00Z', kanaal: 'wa',
    pending_eigenaar_review: null, klus_geblokkeerd: null, offerte_pending_sinds: null,
    offerte_verstuurd: null, offerte_verstuurd_op: null, akkoord_op: null,
    eigenaar_overgenomen: false,
    ...overrides,
  } as LeadListItem
}

describe('eerst-dit-doen hand-over', () => {
  it('levert een handover-actie bij eigenaar_overgenomen=true', () => {
    const acties = deriveActions([lead({ eigenaar_overgenomen: true })])
    expect(acties[0]?.kind).toBe('handover')
    expect(acties[0]?.title).toMatch(/zelf overnemen/i)
  })
  it('geen handover-actie als de lead is afgehandeld', () => {
    const acties = deriveActions([lead({ eigenaar_overgenomen: true, dashboard_status: 'afgehandeld' })])
    expect(acties.find((a) => a.kind === 'handover')).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run, verwacht falen**

Run: `npx vitest run lib/dashboard/eerst-dit-doen.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementeer de hand-over-actie**

In `lib/dashboard/eerst-dit-doen.ts`:
- Voeg de import toe: `import { isHandover } from './lead-status-meta'`
- Breid `ActionKind` (regel 12-19) uit met `| 'handover'`:

```ts
export type ActionKind =
  | 'handover'            // bot heeft overgedragen (buiten werkgebied + onder min-m2)
  | 'owner_review'
  | 'klus_geblokkeerd'
  | 'offerte_versturen'
  | 'afspraak_vandaag'
  | 'onderhandeling'
  | 'buiten_radius'
  | 'stille_klant'
```

- Voeg in `deriveActionForLead`, als ALLEREERSTE check (vóór "Klus geblokkeerd", regel 90), toe:

```ts
  // 0. Bot heeft de lead overgedragen: eigenaar moet het gesprek zelf voeren.
  //    Verdwijnt zodra de lead is afgehandeld/geen interesse/gearchiveerd.
  if (
    isHandover(lead) &&
    lead.dashboard_status !== 'afgehandeld' &&
    lead.dashboard_status !== 'geen_interesse' &&
    lead.dashboard_status !== 'archief'
  ) {
    const createdMs = lead.aangemaakt ? new Date(lead.aangemaakt).getTime() : nowMs
    const waitMs = Math.max(0, nowMs - createdMs)
    return {
      id: `handover-${lead.lead_id}`,
      leadId: lead.lead_id,
      kind: 'handover',
      tone: 'hot',
      title: 'Zelf overnemen, buiten werkgebied',
      subtitle: subtitleForLead(lead),
      waitLabel: formatWait(waitMs),
      waitMs,
      urgency: 95,
    }
  }
```

(urgency 95: net onder "klus geblokkeerd" (100), boven owner_review (90). Tone `hot`.)

- [ ] **Step 4: Run, verwacht slagen**

Run: `npx vitest run lib/dashboard/eerst-dit-doen.test.ts`
Expected: PASS.

- [ ] **Step 5: Verifieer build + volledige testsuite**

Run: `npm run build && npx vitest run`
Expected: build slaagt, alle tests PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/dashboard/eerst-dit-doen.ts lib/dashboard/eerst-dit-doen.test.ts
git commit -m "feat(overzicht): 'Zelf overnemen'-actie in Eerst dit doen bij overgedragen leads"
```

---

## Task 6: Handmatige verificatie met een test-lead

**Files:** geen (verificatie).

- [ ] **Step 1: Zet één bestaande test-lead op hand-over (productie-DB `ntew`)**

```bash
ENV="/Users/christiaantromp/Desktop/Frontlix website/.env.local"
REF=$(grep '^NEXT_PUBLIC_SUPABASE_URL_DASHBOARD=' "$ENV" | head -1 | cut -d= -f2- | sed -E 's#https?://([^.]+)\..*#\1#' | tr -d '[:space:]')
TOKEN=$(grep '^SUPABASE_ACCESS_TOKEN=' "$ENV" | head -1 | cut -d= -f2- | tr -d '[:space:]')
# Kies een test-lead-id (niet-gearchiveerd) en zet de markering:
jq -n --arg q "update leads set eigenaar_overgenomen=true where lead_id=(select lead_id from leads where dashboard_archived is not true order by lead_id desc limit 1) returning lead_id;" '{query:$q}' | curl -s -X POST "https://api.supabase.com/v1/projects/$REF/database/query" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d @- | jq .
```

Alleen uitvoeren met toestemming (raakt de productie-DB; het is een omkeerbare test-markering op één test-lead).

- [ ] **Step 2: Controleer in de draaiende app (lokaal `npm run dev` of na deploy)**

Verwacht: die lead toont een rode "Zelf overnemen"-badge in de leadslijst (desktop + mobiel), een "Zelf overnemen"-pill in het leaddossier, een markering in de inbox, en een "Zelf overnemen"-item bovenaan "Eerst dit doen" op het overzicht.

- [ ] **Step 3: Zet de test-markering terug**

```bash
jq -n --arg q "update leads set eigenaar_overgenomen=false where eigenaar_overgenomen=true returning lead_id;" '{query:$q}' | curl -s -X POST "https://api.supabase.com/v1/projects/$REF/database/query" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d @- | jq .
```

---

## Oplevering / deploy

- Geen database-migratie.
- Lokaal `npx vitest run` + `npm run build` groen.
- Deploy op de live branch `feat/dashboard-rebrand-v2` via de vaste route: ff-merge vanuit `feat/zelf-overnemen` → push → VPS `git pull origin feat/dashboard-rebrand-v2 && rm -rf .next && npm run build && pm2 restart frontlix`. FF-check vlak vóór de push (live branch beweegt), geen overlappende build (rebuild-race).

---

## Self-Review

Tegen de spec (`docs/superpowers/specs/2026-06-24-zelf-overnemen-handover-design.md`):

- **isHandover-helper (spec §1)** → Task 1. `eigenaar_overgenomen` in de lijst-query → Task 1 stap 5. `database.types.ts` kent het veld al (regel 385), dus geen types-wijziging (afwijking t.o.v. de spec-formulering "waar de app-types ze nog niet kennen" — in de praktijk kennen ze het al; geen actie nodig).
- **Label "Zelf overnemen" (spec §2)** → Task 1 stap 3 (meta-hernoeming) + overal in de mappers.
- **Plekken (spec §3): leadslijst, dossier, inbox, overzicht-actie, desktop + mobiel** → Task 2 (lijst), Task 3 (dossier), Task 4 (inbox), Task 5 (overzicht). v2-lijst/dossier via de mapper (geen component), mobiel + inbox met component-toevoeging.
- **Voorrang op urgent/stage (spec §3 + randgevallen)** → expliciet in Task 2/3 (isHandover als eerste check) en Task 5 (actie als check #0).
- **Verdwijnen van de actie bij afgehandeld/archief (spec §4)** → Task 5 stap 3 (conditie). De badge blijft (informatief) — consistent met de spec.
- **Verificatie met test-lead (spec testplan)** → Task 6.
- **Placeholder-scan:** de UI-render-stappen (Task 2 stap 7, Task 3 stap 5, Task 4 stap 4) verwijzen naar het lezen van de exacte component + het bestaande badge-patroon; dit is bewust (brownfield-UI), met concrete code-skeletten en tokenkleuren. Geen "TODO/later".
- **Type-consistentie:** `isHandover(lead)` met dezelfde signatuur overal; `MobileLeadCard.handover: boolean`; `ActionKind` bevat `'handover'`; StatusKind `"hot"` voor de rode pill (bestaat al, geen nieuwe CSS).
