# Gedeelde offerte-concepten (cross-device sync) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Handmatige-offerte-concepten worden gedeeld opgeslagen in de database in plaats van per-browser localStorage, zodat desktop en mobiel exact dezelfde concepten tonen en kunnen openen.

**Architecture:** Eén nieuwe tabel `offerte_concepten` (losstaand van `leads`/`offertes`, onzichtbaar voor de bot) met een canonieke `ManualOfferteData` (`data`, cross-wizard) plus een optionele rijke `OfferteDraftState` (`v2_state`, voor volledig v2-herstel). Drie server-actions (`listConcepten`/`upsertConcept`/`removeConcept`) achter een approved-user-gate, service-role writes. Beide wizards (v2-desktop en legacy-mobiel) vervangen hun localStorage-paden door deze actions; een eenmalige upload migreert bestaande lokale concepten.

**Tech Stack:** Next.js (App Router, server actions), Supabase (Postgres, service-role admin client), TypeScript, Vitest.

## Global Constraints

- Concepten zijn **gedeeld per account** (single-tenant): geen `owner`/`user_id`/`tenant_id`-kolom.
- Concepten zijn **onzichtbaar voor de bot**: tabel heeft geen relatie met `leads`; geen halve leads in de pijplijn.
- Alle DB-writes via `getDashboardAdmin()` (service-role), achter `requireApprovedUser()`. `NEXT_REDIRECT`-fouten (object met `digest`) altijd doorgooien.
- `lib/`-code importeert **niet** uit `components/`: de server-action typeert `v2_state` als `unknown` (jsonb-passthrough), niet als `OfferteDraftState`.
- Canoniek concept-formaat = `ManualOfferteData` (uit `lib/dashboard/manual-offerte-types.ts`). De v2-wizard schrijft daarnaast zijn `OfferteDraftState` als `v2State`; de legacy modal geeft altijd `v2State: null`.
- Max 30 concepten (constante `MAX_CONCEPTEN = 30`).
- Deploy-doel is de live branch `feat/dashboard-rebrand-v2`. Werk gebeurt op `feat/concept-sync`.
- Tests draaien met `npx vitest run <pad>`; volledige build met `npm run build`.

---

## File Structure

- `supabase/migrations-frontlix/060_offerte_concepten.sql` (nieuw) — DDL voor de tabel.
- `lib/dashboard/offerte-concept-actions.ts` (nieuw) — `listConcepten`/`upsertConcept`/`removeConcept` + `Concept`-type.
- `lib/dashboard/offerte-concept-actions.test.ts` (nieuw) — unit-tests met gemockte admin/auth.
- `components/dashboard/v2/offerte/offerte-mappers.ts` (wijzigen) — `mapManualOfferteToWizard` + `buildManualOfferteFromWizard` toevoegen.
- `components/dashboard/v2/offerte/offerte-mappers.test.ts` (nieuw) — mapper-tests.
- `components/dashboard/v2/offerte/OfferteWizard.tsx` (wijzigen) — auto-save/laden/lijst/verwijderen naar server-actions + localStorage-migratie; `handleVerstuur` gebruikt de helper.
- `components/dashboard/offerte/ManualOfferteModal.tsx` (wijzigen) — load/save/remove naar server-actions + localStorage-migratie.
- `components/dashboard/v2/offerte/offerte-drafts.ts` (behouden als type-bron `OfferteDraft`/`OfferteDraftState`; localStorage-functies worden niet meer aangeroepen na migratie, maar blijven staan voor de eenmalige upload).

---

## Task 1: Database-tabel `offerte_concepten`

**Files:**
- Create: `supabase/migrations-frontlix/060_offerte_concepten.sql`

**Interfaces:**
- Produces: tabel `offerte_concepten(id uuid pk, data jsonb, v2_state jsonb null, label text, totaal numeric, bijgewerkt_op timestamptz, aangemaakt_op timestamptz)`.

- [ ] **Step 1: Verifieer dat 060 vrij is**

Run: `ls supabase/migrations-frontlix | sort | tail -3`
Expected: hoogste nummer is `059_*`. Is er al een `060_*`, neem dan het eerstvolgende vrije nummer en pas de bestandsnaam overal in deze taak aan.

- [ ] **Step 2: Schrijf de migratie**

Create `supabase/migrations-frontlix/060_offerte_concepten.sql`:

```sql
-- 060_offerte_concepten.sql
-- Gedeelde handmatige-offerte-concepten (cross-device sync). Concepten stonden
-- in localStorage (per browser/apparaat); deze tabel maakt ze accountbreed
-- gedeeld. LOSSTAAND van leads/offertes: de bot ziet deze rijen nooit, dus
-- geen halve leads in de pijplijn.
--
-- data     = canonieke ManualOfferteData (gedeelde, cross-wizard vorm)
-- v2_state = rijke OfferteDraftState van de v2-wizard (incl. losse vrije
--            meerwerk-regels); null bij een legacy(mobiel)-concept.

create table if not exists public.offerte_concepten (
  id            uuid primary key default gen_random_uuid(),
  data          jsonb not null,
  v2_state      jsonb,
  label         text not null default '',
  totaal        numeric not null default 0,
  bijgewerkt_op timestamptz not null default now(),
  aangemaakt_op timestamptz not null default now()
);

-- Lijst toont nieuwste eerst.
create index if not exists offerte_concepten_bijgewerkt_idx
  on public.offerte_concepten (bijgewerkt_op desc);
```

- [ ] **Step 3: Pas de migratie toe op `ntew` (dashboard-DB)**

De service-role/Management-API-toegang staat in `.env.local` van de app-repo. Pas toe met het Management API SQL-endpoint (ref `ntewbcbveqqrojhrkrno`):

```bash
ENV="/Users/christiaantromp/Desktop/Frontlix website/.env.local"
REF=$(grep '^NEXT_PUBLIC_SUPABASE_URL_DASHBOARD=' "$ENV" | head -1 | cut -d= -f2- | sed -E 's#https?://([^.]+)\..*#\1#' | tr -d '[:space:]')
TOKEN=$(grep '^SUPABASE_ACCESS_TOKEN=' "$ENV" | head -1 | cut -d= -f2- | tr -d '[:space:]')
SQL=$(cat supabase/migrations-frontlix/060_offerte_concepten.sql)
jq -n --arg q "$SQL" '{query:$q}' | curl -s -X POST \
  "https://api.supabase.com/v1/projects/$REF/database/query" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d @-
```

Expected: `[]` (geen fout). Dit raakt productie; alleen uitvoeren met expliciete toestemming van Chris.

- [ ] **Step 4: Verifieer de tabel bestaat met de juiste kolommen**

```bash
jq -n --arg q "select column_name, data_type from information_schema.columns where table_name='offerte_concepten' order by ordinal_position;" '{query:$q}' | curl -s -X POST "https://api.supabase.com/v1/projects/$REF/database/query" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d @- | jq -c '.[]'
```

Expected: rijen voor `id, data, v2_state, label, totaal, bijgewerkt_op, aangemaakt_op`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations-frontlix/060_offerte_concepten.sql
git commit -m "feat(offerte): migratie 060 offerte_concepten (gedeelde concepten)"
```

---

## Task 2: Server-actions `offerte-concept-actions.ts`

**Files:**
- Create: `lib/dashboard/offerte-concept-actions.ts`
- Test: `lib/dashboard/offerte-concept-actions.test.ts`

**Interfaces:**
- Consumes: `getDashboardAdmin` (`./supabase-admin`), `requireApprovedUser` (`./require-approved-user`), `revalidatePath` (`next/cache`), `ManualOfferteData` (`./manual-offerte-types`).
- Produces:
  - `type Concept = { id: string; data: ManualOfferteData; v2State: unknown | null; label: string; totaal: number; bijgewerktOp: number }`
  - `listConcepten(): Promise<Result<Concept[]>>`
  - `upsertConcept(input: { id: string; data: ManualOfferteData; v2State: unknown | null; label: string; totaal: number }): Promise<Result>`
  - `removeConcept(id: string): Promise<Result>`
  - `Result<T> = { ok: true; data?: T } | { ok: false; error: string }`

- [ ] **Step 1: Schrijf de falende tests**

Create `lib/dashboard/offerte-concept-actions.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockRequireApprovedUser,
  mockRevalidatePath,
  mockFrom,
  mockSelectList,
  mockUpsert,
  mockSelectOverflow,
  mockDeleteIn,
  mockDeleteEq,
} = vi.hoisted(() => {
  const mockRequireApprovedUser = vi.fn(() => Promise.resolve())
  const mockRevalidatePath = vi.fn()

  // listConcepten: select().order().limit()
  const mockSelectList = vi.fn(() =>
    Promise.resolve({
      data: [
        { id: 'C2', data: { naam: 'B' }, v2_state: null, label: 'B', totaal: 200, bijgewerkt_op: '2026-06-24T10:00:00Z' },
        { id: 'C1', data: { naam: 'A' }, v2_state: { stap: 1 }, label: 'A', totaal: 100, bijgewerkt_op: '2026-06-23T10:00:00Z' },
      ],
      error: null as { message: string } | null,
    }),
  )
  // upsertConcept: upsert()
  const mockUpsert = vi.fn(() => Promise.resolve({ error: null }))
  // opschoning: select().order().range()
  const mockSelectOverflow = vi.fn(() => Promise.resolve({ data: [], error: null }))
  // delete().in() (opschoning) en delete().eq() (removeConcept)
  const mockDeleteIn = vi.fn(() => Promise.resolve({ error: null }))
  const mockDeleteEq = vi.fn(() => Promise.resolve({ error: null }))

  const mockFrom = vi.fn(() => ({
    select: vi.fn((_cols: string) => ({
      order: vi.fn(() => ({
        limit: mockSelectList,
        range: mockSelectOverflow,
      })),
    })),
    upsert: mockUpsert,
    delete: vi.fn(() => ({ in: mockDeleteIn, eq: mockDeleteEq })),
  }))

  return {
    mockRequireApprovedUser, mockRevalidatePath, mockFrom,
    mockSelectList, mockUpsert, mockSelectOverflow, mockDeleteIn, mockDeleteEq,
  }
})

vi.mock('./supabase-admin', () => ({ getDashboardAdmin: () => ({ from: mockFrom }) }))
vi.mock('./require-approved-user', () => ({ requireApprovedUser: mockRequireApprovedUser }))
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }))

import { listConcepten, upsertConcept, removeConcept } from './offerte-concept-actions'

const baseData = { naam: 'Test' } as never

describe('offerte-concept-actions', () => {
  beforeEach(() => {
    mockRequireApprovedUser.mockClear()
    mockRevalidatePath.mockClear()
    mockFrom.mockClear()
    mockUpsert.mockClear()
    mockSelectOverflow.mockReset()
    mockSelectOverflow.mockResolvedValue({ data: [], error: null })
    mockDeleteIn.mockClear()
    mockDeleteEq.mockClear()
  })

  it('listConcepten geeft concepten nieuwste eerst met epoch-ms', async () => {
    const res = await listConcepten()
    expect(res.ok).toBe(true)
    const data = (res as { ok: true; data: { id: string; bijgewerktOp: number }[] }).data
    expect(data.map((c) => c.id)).toEqual(['C2', 'C1'])
    expect(data[0].bijgewerktOp).toBe(new Date('2026-06-24T10:00:00Z').getTime())
  })

  it('upsertConcept schrijft data + v2_state en revalidate', async () => {
    const res = await upsertConcept({ id: 'C9', data: baseData, v2State: { stap: 2 }, label: 'X', totaal: 50 })
    expect(res.ok).toBe(true)
    const arg = mockUpsert.mock.calls[0][0] as Record<string, unknown>
    expect(arg.id).toBe('C9')
    expect(arg.v2_state).toEqual({ stap: 2 })
    expect(mockRevalidatePath).toHaveBeenCalled()
  })

  it('upsertConcept verwijdert concepten buiten de 30 nieuwste', async () => {
    mockSelectOverflow.mockResolvedValueOnce({ data: [{ id: 'OUD1' }, { id: 'OUD2' }], error: null })
    const res = await upsertConcept({ id: 'C9', data: baseData, v2State: null, label: 'X', totaal: 50 })
    expect(res.ok).toBe(true)
    expect(mockDeleteIn).toHaveBeenCalledWith(['OUD1', 'OUD2'])
  })

  it('upsertConcept weigert een lege id', async () => {
    const res = await upsertConcept({ id: '', data: baseData, v2State: null, label: 'X', totaal: 0 })
    expect(res.ok).toBe(false)
  })

  it('removeConcept verwijdert op id', async () => {
    const res = await removeConcept('C1')
    expect(res.ok).toBe(true)
    expect(mockDeleteEq).toHaveBeenCalledWith('id', 'C1')
  })
})
```

- [ ] **Step 2: Run de tests, verwacht falen**

Run: `npx vitest run lib/dashboard/offerte-concept-actions.test.ts`
Expected: FAIL met "Failed to resolve import './offerte-concept-actions'" (bestand bestaat nog niet).

- [ ] **Step 3: Schrijf de implementatie**

Create `lib/dashboard/offerte-concept-actions.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { getDashboardAdmin } from './supabase-admin'
import { requireApprovedUser } from './require-approved-user'
import type { ManualOfferteData } from './manual-offerte-types'

const MAX_CONCEPTEN = 30

export type Concept = {
  id: string
  data: ManualOfferteData
  v2State: unknown | null
  label: string
  totaal: number
  bijgewerktOp: number
}

type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string }

function isRedirect(err: unknown): boolean {
  return !!err && typeof err === 'object' && 'digest' in err
}

/** Alle concepten, nieuwste eerst. Gedeeld per account. */
export async function listConcepten(): Promise<Result<Concept[]>> {
  try {
    await requireApprovedUser()
    const admin = getDashboardAdmin()
    const { data, error } = await admin
      .from('offerte_concepten')
      .select('id, data, v2_state, label, totaal, bijgewerkt_op')
      .order('bijgewerkt_op', { ascending: false })
      .limit(MAX_CONCEPTEN)
    if (error) return { ok: false, error: error.message }
    const concepten: Concept[] = (data ?? []).map((r: Record<string, unknown>) => ({
      id: r.id as string,
      data: r.data as ManualOfferteData,
      v2State: (r.v2_state ?? null) as unknown,
      label: (r.label as string) ?? '',
      totaal: Number(r.totaal ?? 0),
      bijgewerktOp: new Date(r.bijgewerkt_op as string).getTime(),
    }))
    return { ok: true, data: concepten }
  } catch (err) {
    if (isRedirect(err)) throw err
    return { ok: false, error: err instanceof Error ? err.message : 'onbekende fout' }
  }
}

/** Insert of update op id; trimt daarna tot de 30 nieuwste. */
export async function upsertConcept(input: {
  id: string
  data: ManualOfferteData
  v2State: unknown | null
  label: string
  totaal: number
}): Promise<Result> {
  try {
    await requireApprovedUser()
    if (!input.id) return { ok: false, error: 'concept-id ontbreekt.' }
    const admin = getDashboardAdmin()

    const { error } = await admin.from('offerte_concepten').upsert(
      {
        id: input.id,
        data: input.data,
        v2_state: input.v2State ?? null,
        label: input.label,
        totaal: input.totaal,
        bijgewerkt_op: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )
    if (error) return { ok: false, error: error.message }

    // Opschoning: alles voorbij de 30 nieuwste verwijderen.
    const { data: overflow, error: selErr } = await admin
      .from('offerte_concepten')
      .select('id')
      .order('bijgewerkt_op', { ascending: false })
      .range(MAX_CONCEPTEN, MAX_CONCEPTEN + 1000)
    if (!selErr && overflow && overflow.length > 0) {
      const ids = (overflow as { id: string }[]).map((r) => r.id)
      await admin.from('offerte_concepten').delete().in('id', ids)
    }

    revalidatePath('/leads')
    return { ok: true }
  } catch (err) {
    if (isRedirect(err)) throw err
    return { ok: false, error: err instanceof Error ? err.message : 'onbekende fout' }
  }
}

/** Verwijder één concept (handmatig of na versturen). */
export async function removeConcept(id: string): Promise<Result> {
  try {
    await requireApprovedUser()
    if (!id) return { ok: false, error: 'concept-id ontbreekt.' }
    const admin = getDashboardAdmin()
    const { error } = await admin.from('offerte_concepten').delete().eq('id', id)
    if (error) return { ok: false, error: error.message }
    revalidatePath('/leads')
    return { ok: true }
  } catch (err) {
    if (isRedirect(err)) throw err
    return { ok: false, error: err instanceof Error ? err.message : 'onbekende fout' }
  }
}
```

- [ ] **Step 4: Run de tests, verwacht slagen**

Run: `npx vitest run lib/dashboard/offerte-concept-actions.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/dashboard/offerte-concept-actions.ts lib/dashboard/offerte-concept-actions.test.ts
git commit -m "feat(offerte): server-actions list/upsert/remove offerte-concepten"
```

---

## Task 3: Inverse mapper `mapManualOfferteToWizard`

**Files:**
- Modify: `components/dashboard/v2/offerte/offerte-mappers.ts`
- Test: `components/dashboard/v2/offerte/offerte-mappers.test.ts` (nieuw)

**Interfaces:**
- Consumes: `ManualOfferteData` (`@/lib/dashboard/manual-offerte-types`), `OfferteDraftState` (`./offerte-drafts`), `naarKomma` (`./offerte-utils`), types `Kleur`/`KortingType`/`KlantType` (`./types`).
- Produces: `mapManualOfferteToWizard(data: ManualOfferteData, perMin: number): OfferteDraftState`.

- [ ] **Step 1: Schrijf de falende test**

Create `components/dashboard/v2/offerte/offerte-mappers.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { DEFAULTS } from '@/lib/dashboard/manual-offerte-types'
import { mapManualOfferteToWizard } from './offerte-mappers'

describe('mapManualOfferteToWizard', () => {
  it('herstelt inhoudelijke velden uit een ManualOfferteData', () => {
    const data = {
      ...DEFAULTS,
      naam: 'Familie Bakker',
      bedrijf: '',
      telefoon: '0612345678',
      email: 'b@x.nl',
      straat: 'Dorpsstraat',
      huisnummer: '1',
      postcode: '4330',
      plaats: 'Middelburg',
      m2: 120,
      sub: ['invegen', 'beschermlaag'],
      reinigen_actief: true,
      voegzand_normaal_actief: true,
      voegzand_normaal_m2: 120,
      voegzand_normaal_zakken: 24,
      voegzand_normaal_prijs: 2.9,
      kleur_naturel: true,
      kleur_antraciet: false,
      groene_aanslag: 'ja',
      korstmos: 'nee',
      afstand_km: 12,
      reiniging_per_m2_override: 1.25,
      korting_percentage: 0,
      korting_bedrag: 50,
      korting_omschrijving: 'actie',
      geldigheid_dagen: 30,
      notitie: 'graag snel',
      kanaal: 'mail',
    }

    const s = mapManualOfferteToWizard(data, 0.5)

    expect(s.stap).toBe(1)
    expect(s.klant?.naam).toBe('Familie Bakker')
    expect(s.klant?.tel).toBe('0612345678')
    expect(s.m2).toBe(120)
    expect(s.diensten['Reinigen']).toBe(true)
    expect(s.diensten['Invegen']).toBe(true)
    expect(s.diensten['Beschermlaag']).toBe(true)
    expect(s.voegzandM2.normaal).toBe(120)
    expect(s.kleur).toBe('Naturel')
    expect(s.groeneAanslag).toBe(true)
    expect(s.afstandKm).toBe(12)
    expect(s.prijsOverrides?.['reiniging_per_m2']).toBe('1,25')
    expect(s.kortingType).toBe('euro')
    expect(s.kortingEuro).toBe('50')
    expect(s.kortingReden).toBe('actie')
    expect(s.geldigDagen).toBe(30)
    expect(s.bericht).toBe('graag snel')
    expect(s.kanaal).toBe('email')
  })

  it('zet kleur "Allebei" als beide kleuren aan staan', () => {
    const data = { ...DEFAULTS, kleur_naturel: true, kleur_antraciet: true }
    expect(mapManualOfferteToWizard(data, 0.5).kleur).toBe('Allebei')
  })

  it('herstelt extra arbeid als één vrije regel via perMin', () => {
    const data = { ...DEFAULTS, extra_arbeid_minuten: 60, extra_arbeid_personen: 1, extra_arbeid_omschrijving: 'Meerwerk' }
    const s = mapManualOfferteToWizard(data, 0.5)
    expect(s.vrij).toHaveLength(1)
    expect(s.vrij[0].naam).toBe('Meerwerk')
    expect(s.vrij[0].bedrag).toBe('30') // 60 min * 0,5 = 30
  })
})
```

- [ ] **Step 2: Run de test, verwacht falen**

Run: `npx vitest run components/dashboard/v2/offerte/offerte-mappers.test.ts`
Expected: FAIL met "mapManualOfferteToWizard is not a function".

- [ ] **Step 3: Schrijf de implementatie**

In `components/dashboard/v2/offerte/offerte-mappers.ts`, voeg bovenaan toe aan de imports:

```ts
import type { OfferteDraftState } from "./offerte-drafts";
import { naarKomma } from "./offerte-utils";
import type { KlantType } from "./types";
```

(`parsePrijs` en `Kleur`/`KortingType`/`Kanaal` zijn al geïmporteerd; voeg alleen ontbrekende toe.)

Voeg onderaan het bestand toe:

```ts
/** kleur-booleans → v2-kleurkeuze (inverse van kleurToBooleans). */
function booleansToKleur(naturel: boolean, antraciet: boolean): Kleur {
  if (naturel && antraciet) return "Allebei";
  if (antraciet) return "Antraciet";
  return "Naturel";
}

/** SendKanaal → v2-kanaal. 'mail' → 'email', anders 'manual' (download/whatsapp
 *  zijn server-side allebei 'manual'; we tonen 'manual' bij hervatten). */
function sendToKanaal(kanaal: ManualOfferteData["kanaal"]): Kanaal {
  return kanaal === "mail" ? "email" : "manual";
}

/** Override-getal → rauwe invoerstring (komma); undefined ⇒ lege string. */
function ovStr(n: number | undefined): string {
  return n == null ? "" : naarKomma(n);
}

/**
 * ManualOfferteData → v2-wizard-state. Fallback voor concepten zonder v2State
 * (legacy/mobiel gemaakt). Inhoudelijke velden komen 1-op-1 terug; pure
 * navigatie-state (stap/zoek) krijgt defaults en de wizard opent op stap 1.
 * `perMin` (live tarief) zet extra_arbeid terug als één vrije meerwerk-regel.
 */
export function mapManualOfferteToWizard(
  data: ManualOfferteData,
  perMin: number,
): OfferteDraftState {
  const klantType: KlantType = data.bedrijf.trim() ? "Zakelijk" : "Particulier";
  const invegenActief = data.voegzand_normaal_actief || data.voegzand_onkruidwerend_actief;

  const vrij =
    data.extra_arbeid_minuten > 0
      ? [
          {
            id: 1,
            naam: data.extra_arbeid_omschrijving || "Meerwerk",
            bedrag: naarKomma(Math.round(data.extra_arbeid_minuten * (perMin > 0 ? perMin : 1))),
          },
        ]
      : [];

  return {
    stap: 1,
    zoek: "",
    klant: {
      naam: data.naam,
      bedrijf: data.bedrijf,
      straat: data.straat,
      nr: data.huisnummer,
      postcode: data.postcode,
      plaats: data.plaats,
      tel: data.telefoon,
      email: data.email,
      sub: "",
      initials: "",
      bestaand: !!data.existing_lead_id,
      lead_id: data.existing_lead_id ?? undefined,
    },
    klantType,
    aiGebruikt: false,
    factuurZelfde: data.factuur_zelfde,
    factuur: {
      straat: data.factuur_straat,
      nr: data.factuur_huisnummer,
      postcode: data.factuur_postcode,
      plaats: data.factuur_plaats,
    },
    afstandKm: data.afstand_km > 0 ? data.afstand_km : null,
    m2: data.m2,
    qty: { invegen: 0, rollen: data.planten_afschermen_rollen },
    rolPrijs: naarKomma(data.planten_afschermen_prijs),
    voegzandM2: { normaal: data.voegzand_normaal_m2, onkruidwerend: data.voegzand_onkruidwerend_m2 },
    voegzandZakken: { normaal: data.voegzand_normaal_zakken, onkruidwerend: data.voegzand_onkruidwerend_zakken },
    zandPrijzen: {
      normaal: naarKomma(data.voegzand_normaal_prijs),
      onkruidwerend: naarKomma(data.voegzand_onkruidwerend_prijs),
    },
    prijsOverrides: {
      reinigen_dagprijs: ovStr(data.reinigen_dagprijs_override),
      reiniging_per_m2: ovStr(data.reiniging_per_m2_override),
      invegenN: ovStr(data.arbeid_invegen_normaal_override),
      invegenO: ovStr(data.arbeid_invegen_onkruidwerend_override),
      bescherm: ovStr(data.beschermlaag_override),
      onkruid: ovStr(data.preventieve_onkruid_override),
      reiskosten: ovStr(data.reiskosten_per_km_override),
    },
    diensten: {
      Reinigen: data.reinigen_actief ?? true,
      Invegen: invegenActief,
      Beschermlaag: data.sub.includes("beschermlaag"),
      "Preventieve onkruid": data.sub.includes("preventieve_onkruid"),
      Onderhoudsabonnement: data.sub.includes("onderhoud"),
    },
    bm2: data.beschermlaag_m2 ?? 0,
    om2: data.preventieve_onkruid_m2 ?? 0,
    groeneAanslag: data.groene_aanslag === "ja",
    kleur: booleansToKleur(data.kleur_naturel, data.kleur_antraciet),
    korstmosConditie: data.korstmos === "ja",
    onderhoudWeken: data.onderhoud_weken,
    korstmosToeslag: false,
    kortingType: data.korting_bedrag > 0 ? "euro" : "procent",
    kortingPct: data.korting_percentage ? String(data.korting_percentage) : "",
    kortingEuro: data.korting_bedrag ? String(data.korting_bedrag) : "",
    kortingReden: data.korting_omschrijving,
    geldigDagen: data.geldigheid_dagen,
    btw: "21%",
    vrij,
    volgorde: [],
    bericht: data.notitie,
    kanaal: sendToKanaal(data.kanaal),
  };
}
```

> Let op: controleer dat de objectsleutels in `diensten` exact matchen met `DIENSTEN_INIT` (`components/dashboard/v2/offerte/offerte-data.ts:150`). Pas de sleutelnamen aan als die afwijken (bv. `"Preventieve onkruid"` vs een andere spelling). De setter-namen in `laadConcept` (`OfferteWizard.tsx:520-564`) tonen de exacte veldnamen van `OfferteDraftState`.

- [ ] **Step 4: Run de test, verwacht slagen**

Run: `npx vitest run components/dashboard/v2/offerte/offerte-mappers.test.ts`
Expected: PASS (3 tests). Faalt een assertion door een afwijkende `DIENSTEN_INIT`-sleutel of `OfferteKlant`-veld, corrigeer de mapper (niet de test) tot het klopt.

- [ ] **Step 5: Commit**

```bash
git add components/dashboard/v2/offerte/offerte-mappers.ts components/dashboard/v2/offerte/offerte-mappers.test.ts
git commit -m "feat(offerte): mapManualOfferteToWizard (inverse mapper voor concept-herstel)"
```

---

## Task 4: Helper `buildManualOfferteFromWizard` (DRY-refactor)

**Files:**
- Modify: `components/dashboard/v2/offerte/offerte-mappers.ts`
- Modify: `components/dashboard/v2/offerte/OfferteWizard.tsx:709-768` (handleVerstuur)
- Test: `components/dashboard/v2/offerte/offerte-mappers.test.ts` (uitbreiden)

**Interfaces:**
- Consumes: `mapWizardToManualOfferte`, `WizardSubmitState` (beide in dit bestand), `parsePrijs`.
- Produces: `buildManualOfferteFromWizard(input: BuildInput): ManualOfferteData` waar `BuildInput` de wizard-velden + `{ vrij, perMin, voegzandDekking }` bevat. Exporteer ook `type BuildInput`.

- [ ] **Step 1: Schrijf de falende test (uitbreiding)**

Voeg toe aan `components/dashboard/v2/offerte/offerte-mappers.test.ts`:

```ts
import { buildManualOfferteFromWizard } from './offerte-mappers'

describe('buildManualOfferteFromWizard', () => {
  const base = {
    klant: { naam: 'A', bedrijf: '', straat: '', nr: '', postcode: '', plaats: '', tel: '', email: '', sub: '', initials: '', bestaand: false },
    factuurZelfde: true,
    factuur: { straat: '', nr: '', postcode: '', plaats: '' },
    m2: 100, bm2: 0, om2: 0,
    qty: { invegen: 0, rollen: 0 },
    rolPrijs: '8,5',
    voegzandM2: { normaal: 0, onkruidwerend: 0 },
    voegzandZakken: { normaal: 0, onkruidwerend: 0 },
    voegzandDekking: 5,
    zandPrijzen: { normaal: '2,9', onkruidwerend: '20,9' },
    prijsOverrides: {},
    diensten: { Reinigen: true, Invegen: false },
    groeneAanslag: false,
    kleur: 'Naturel' as const,
    korstmosConditie: false,
    kortingType: 'procent' as const,
    kortingPct: '10',
    kortingEuro: '',
    kortingReden: '',
    geldigDagen: 0,
    bericht: '',
    kanaal: 'email' as const,
    afstandKm: null,
  }

  it('zet vrije regels om naar extra_arbeid via perMin', () => {
    const out = buildManualOfferteFromWizard({
      ...base,
      vrij: [{ id: 1, naam: 'Paaltjes', bedrag: '30' }],
      perMin: 0.5,
    })
    expect(out.extra_arbeid_minuten).toBe(60) // 30 / 0,5
    expect(out.extra_arbeid_personen).toBe(1)
    expect(out.extra_arbeid_omschrijving).toBe('Paaltjes')
    expect(out.korting_percentage).toBe(10)
  })

  it('geen vrije regels ⇒ geen extra arbeid', () => {
    const out = buildManualOfferteFromWizard({ ...base, vrij: [], perMin: 0.5 })
    expect(out.extra_arbeid_minuten).toBe(0)
    expect(out.extra_arbeid_personen).toBe(0)
  })
})
```

- [ ] **Step 2: Run de test, verwacht falen**

Run: `npx vitest run components/dashboard/v2/offerte/offerte-mappers.test.ts`
Expected: FAIL met "buildManualOfferteFromWizard is not a function".

- [ ] **Step 3: Schrijf de helper**

Voeg toe aan `components/dashboard/v2/offerte/offerte-mappers.ts` (gebruikt het reeds aanwezige `parsePrijs` en `mapWizardToManualOfferte`):

```ts
export type BuildInput = Omit<WizardSubmitState, "extraArbeid"> & {
  /** Vrije meerwerk-regels (naam + euro). */
  vrij: { id: number; naam: string; bedrag: string }[];
  /** Live arbeidstarief per minuut, voor de euro→minuten-omzetting. */
  perMin: number;
};

/**
 * Bouwt de definitieve ManualOfferteData uit de wizard-state. Bevat de
 * vrij→extra_arbeid-omzetting die voorheen inline in handleVerstuur stond, zodat
 * verzenden én auto-save exact dezelfde payload produceren.
 */
export function buildManualOfferteFromWizard(input: BuildInput): ManualOfferteData {
  const { vrij, perMin, ...wizard } = input;
  const vrijSom = vrij.reduce((s, v) => s + parsePrijs(v.bedrag), 0);
  const perMinSafe = perMin > 0 ? perMin : 1;
  const extraMinuten = vrijSom > 0 ? Math.round(vrijSom / perMinSafe) : 0;
  const vrijOmschrijving = vrij.map((v) => v.naam.trim()).filter(Boolean).join("; ");
  const extraArbeid =
    extraMinuten > 0
      ? { minuten: extraMinuten, personen: 1, omschrijving: vrijOmschrijving || "Meerwerk" }
      : { minuten: 0, personen: 0, omschrijving: "" };
  return mapWizardToManualOfferte({ ...wizard, extraArbeid });
}
```

- [ ] **Step 4: Run de test, verwacht slagen**

Run: `npx vitest run components/dashboard/v2/offerte/offerte-mappers.test.ts`
Expected: PASS (alle tests uit Task 3 + 2 nieuwe).

- [ ] **Step 5: Laat `handleVerstuur` de helper gebruiken**

In `components/dashboard/v2/offerte/OfferteWizard.tsx`, vervang de inline-blok in `handleVerstuur` (regel ~724-768: vanaf `const vrijSom = ...` t/m de afsluiting van `mapWizardToManualOfferte({ ... })`) door:

```ts
    const payload = buildManualOfferteFromWizard({
      klant,
      factuurZelfde,
      factuur,
      m2,
      qty,
      rolPrijs,
      voegzandM2,
      voegzandZakken,
      voegzandDekking: pricing.voegzand_m2_per_zak > 0 ? pricing.voegzand_m2_per_zak : 5,
      zandPrijzen,
      prijsOverrides,
      diensten,
      groeneAanslag,
      kleur,
      korstmosConditie,
      kortingType,
      kortingPct,
      kortingEuro,
      kortingReden,
      geldigheidDagen: geldigDagen,
      bericht,
      kanaal,
      afstandKm,
      bm2,
      om2,
      vrij,
      perMin: pricing.extra_arbeid_per_min,
    });
```

Pas de import aan: `import { mapMatchToKlant, buildManualOfferteFromWizard } from "./offerte-mappers";` (verwijder `mapWizardToManualOfferte` uit de import als die nergens anders meer wordt gebruikt; controleer met grep).

- [ ] **Step 6: Verifieer build + bestaande tests**

Run: `npx vitest run components/dashboard/v2/offerte/ && npm run build`
Expected: tests PASS, build slaagt (geen type-fouten in OfferteWizard).

- [ ] **Step 7: Commit**

```bash
git add components/dashboard/v2/offerte/offerte-mappers.ts components/dashboard/v2/offerte/offerte-mappers.test.ts components/dashboard/v2/offerte/OfferteWizard.tsx
git commit -m "refactor(offerte): buildManualOfferteFromWizard gedeeld door verzenden + auto-save"
```

---

## Task 5: v2-wizard bedraden naar de database

**Files:**
- Modify: `components/dashboard/v2/offerte/OfferteWizard.tsx` (auto-save ~450-511, conceptenlijst ~513-516, `laadConcept` ~520-564, `verwijderConcept` ~611-616, na-submit ~788-791, plus migratie-effect)

**Interfaces:**
- Consumes: `listConcepten`, `upsertConcept`, `removeConcept` (`@/lib/dashboard/offerte-concept-actions`), `buildManualOfferteFromWizard`, `mapManualOfferteToWizard`, en de bestaande localStorage-functies `listDrafts`/`removeDraft as removeLocalDraft` (`./offerte-drafts`) alleen voor de eenmalige migratie.

- [ ] **Step 1: Vervang de imports en lijst-state**

In `OfferteWizard.tsx`:
- Import toevoegen: `import { listConcepten, upsertConcept, removeConcept } from "@/lib/dashboard/offerte-concept-actions";`
- Behoud `import { listDrafts, makeDraftId, formatLaatstBewerkt, type OfferteDraft } from "./offerte-drafts";` (we gebruiken `listDrafts` enkel voor migratie; `upsertDraft`/`removeDraft` uit de import halen).
- De `drafts`-state houdt nu `Concept[]` aan in plaats van `OfferteDraft[]`. Verander het state-type: `const [drafts, setDrafts] = useState<Concept[]>([]);` en importeer `type Concept`.

- [ ] **Step 2: Auto-save schrijft naar de database**

Vervang in het auto-save-`useEffect` (regel ~458-501) de `upsertDraft({...})`-aanroep door een DB-upsert. De `state`-opbouw (het volledige `OfferteDraftState`-object) blijft identiek; we sturen 'm als `v2State` mee en bouwen de canonieke `data`:

```ts
    const t = setTimeout(() => {
      const v2State = {
        stap, zoek, klant, klantType, aiGebruikt, factuurZelfde, factuur, afstandKm,
        m2, qty, rolPrijs, voegzandM2, voegzandZakken, zandPrijzen, prijsOverrides,
        diensten, bm2, om2, groeneAanslag, kleur, korstmosConditie, onderhoudWeken,
        korstmosToeslag, kortingType, kortingPct, kortingEuro, kortingReden,
        geldigDagen, btw, vrij, volgorde, bericht, kanaal,
      };
      const data = buildManualOfferteFromWizard({
        klant, factuurZelfde, factuur, m2, qty, rolPrijs, voegzandM2, voegzandZakken,
        voegzandDekking: pricing.voegzand_m2_per_zak > 0 ? pricing.voegzand_m2_per_zak : 5,
        zandPrijzen, prijsOverrides, diensten, groeneAanslag, kleur, korstmosConditie,
        kortingType, kortingPct, kortingEuro, kortingReden, geldigheidDagen: geldigDagen,
        bericht, kanaal, afstandKm, bm2, om2, vrij, perMin: pricing.extra_arbeid_per_min,
      });
      void upsertConcept({ id, data, v2State, label: conceptLabel, totaal }).then((res) => {
        if (res.ok) setSavedAt(Date.now());
      });
    }, 1200);
```

(Debounce van 500 naar 1200 ms. De `savedAt`-flash wordt nu alleen gezet bij `res.ok`, zodat het vinkje eerlijk is.)

- [ ] **Step 3: Conceptenlijst laadt uit de database**

Vervang het lijst-`useEffect` (regel ~514-516):

```ts
  useEffect(() => {
    if (!conceptenOpen) return;
    void listConcepten().then((res) => {
      if (res.ok && res.data) setDrafts(res.data);
    });
  }, [conceptenOpen]);
```

- [ ] **Step 4: `laadConcept` gebruikt v2State of de fallback-mapper**

`laadConcept` neemt nu een `Concept`. Bouw de `OfferteDraftState` (`s`) uit `concept.v2State` indien aanwezig, anders via de mapper, en laat de bestaande setters ongewijzigd:

```ts
  const laadConcept = (c: Concept) => {
    const s = (c.v2State as OfferteDraftState | null)
      ?? mapManualOfferteToWizard(c.data, pricing.extra_arbeid_per_min);
    setStap(s.stap);
    setZoek(s.zoek);
    // ... (alle bestaande setters uit regel 525-557 ongewijzigd) ...
    setDraftId(c.id);
    setSavedAt(c.bijgewerktOp);
    setVerzonden(false);
    setFout(null);
    setServerTotaal(null);
    setConceptenOpen(false);
  };
```

Importeer `mapManualOfferteToWizard` en `type OfferteDraftState`. De call-site (regel ~661, `onClick={() => laadConcept(d)}`) blijft werken want `d` is nu een `Concept`.

- [ ] **Step 5: `verwijderConcept` en na-submit verwijderen via de action**

Vervang `verwijderConcept` (regel ~611-616):

```ts
  const verwijderConcept = (id: string) => {
    void removeConcept(id).then(() => {
      void listConcepten().then((res) => { if (res.ok && res.data) setDrafts(res.data); });
    });
    if (id === draftId) nieuwLeegConcept();
  };
```

Vervang in `handleVerstuur` na succes (regel ~788-791) `removeDraft(draftId)` door:

```ts
          if (draftId) {
            void removeConcept(draftId);
            setDraftId(null);
          }
```

- [ ] **Step 6: Eenmalige migratie van lokale concepten**

Voeg een mount-`useEffect` toe (draait één keer) die bestaande localStorage-concepten uploadt en daarna de sleutel wist:

```ts
  useEffect(() => {
    const lokale = listDrafts(); // leest 'frontlix:v2:offerte-concepten'
    if (lokale.length === 0) return;
    void (async () => {
      let allesOk = true;
      for (const d of lokale) {
        const data = mapManualOfferteToWizard
          ? // bouw canonieke data uit de opgeslagen state via de helper
            buildManualOfferteFromWizard({
              klant: d.state.klant, factuurZelfde: d.state.factuurZelfde, factuur: d.state.factuur,
              m2: d.state.m2, qty: d.state.qty, rolPrijs: d.state.rolPrijs,
              voegzandM2: d.state.voegzandM2, voegzandZakken: d.state.voegzandZakken,
              voegzandDekking: pricing.voegzand_m2_per_zak > 0 ? pricing.voegzand_m2_per_zak : 5,
              zandPrijzen: d.state.zandPrijzen, prijsOverrides: d.state.prijsOverrides ?? {},
              diensten: d.state.diensten, groeneAanslag: d.state.groeneAanslag, kleur: d.state.kleur,
              korstmosConditie: d.state.korstmosConditie, kortingType: d.state.kortingType,
              kortingPct: d.state.kortingPct, kortingEuro: d.state.kortingEuro,
              kortingReden: d.state.kortingReden, geldigheidDagen: d.state.geldigDagen,
              bericht: d.state.bericht, kanaal: d.state.kanaal, afstandKm: d.state.afstandKm,
              bm2: d.state.bm2, om2: d.state.om2, vrij: d.state.vrij,
              perMin: pricing.extra_arbeid_per_min,
            })
          : d.state;
        const res = await upsertConcept({ id: d.id, data, v2State: d.state, label: d.label, totaal: d.totaal });
        if (!res.ok) allesOk = false;
      }
      if (allesOk && typeof window !== "undefined") {
        window.localStorage.removeItem("frontlix:v2:offerte-concepten");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
```

(Vereenvoudig de ternary: `mapManualOfferteToWizard` is altijd aanwezig — gebruik direct de `buildManualOfferteFromWizard`-tak. De conditie staat hier alleen ter verduidelijking; verwijder 'm bij implementatie.)

- [ ] **Step 7: Verifieer build + tests**

Run: `npm run build && npx vitest run components/dashboard/v2/offerte/`
Expected: build slaagt (geen type-fouten), tests PASS.

- [ ] **Step 8: Handmatige rookproef (lokaal `npm run dev`)**

Open de v2-wizard, vul een klant + dienst + een vrije meerwerk-regel in, sluit de wizard. Heropen via de concepten-lijst: het concept staat er, inclusief de vrije regel. Controleer in de DB:

```bash
ENV="/Users/christiaantromp/Desktop/Frontlix website/.env.local"; REF=$(grep '^NEXT_PUBLIC_SUPABASE_URL_DASHBOARD=' "$ENV" | head -1 | cut -d= -f2- | sed -E 's#https?://([^.]+)\..*#\1#' | tr -d '[:space:]'); TOKEN=$(grep '^SUPABASE_ACCESS_TOKEN=' "$ENV" | head -1 | cut -d= -f2- | tr -d '[:space:]')
jq -n --arg q "select id, label, totaal, (v2_state is not null) as heeft_v2 from offerte_concepten order by bijgewerkt_op desc limit 5;" '{query:$q}' | curl -s -X POST "https://api.supabase.com/v1/projects/$REF/database/query" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d @- | jq -c '.[]'
```

Expected: het zojuist gemaakte concept verschijnt met `heeft_v2: true`.

- [ ] **Step 9: Commit**

```bash
git add components/dashboard/v2/offerte/OfferteWizard.tsx
git commit -m "feat(offerte): v2-wizard concepten via database i.p.v. localStorage"
```

---

## Task 6: Legacy modal bedraden naar de database

**Files:**
- Modify: `components/dashboard/offerte/ManualOfferteModal.tsx` (load ~330-365, save ~375-405, verwijderDraft ~427-440, na-submit ~481, plus migratie)

**Interfaces:**
- Consumes: `listConcepten`, `upsertConcept`, `removeConcept` (`@/lib/dashboard/offerte-concept-actions`). De legacy `DraftEntry.data` is al `ManualOfferteData`, dus `data` = `entry.data`, `v2State: null`, `label` = `deriveKlantNaam(data)`, `totaal` = (bestaande totaal-berekening of 0).

- [ ] **Step 1: Import + drafts-state op Concept**

Voeg toe: `import { listConcepten, upsertConcept, removeConcept } from '@/lib/dashboard/offerte-concept-actions'`. Verander `const [drafts, setDrafts] = useState<DraftEntry[]>([])` naar `useState<Concept[]>([])` en importeer `type Concept`. Behoud `deriveKlantNaam`, `makeDraftId`, `isDefaultsData`.

- [ ] **Step 2: Load leest uit de database (+ eenmalige migratie)**

Vervang het load-`useEffect` (regel ~330-365). Migreer eenmalig de bestaande V1+V2 localStorage-concepten, daarna laad uit de DB:

```ts
  useEffect(() => {
    void (async () => {
      // Eenmalige migratie van lokale concepten (V1 + V2) naar de database.
      try {
        const raws: string[] = []
        const v1 = window.localStorage.getItem(DRAFT_KEY_V1)
        if (v1) { try { raws.push(JSON.stringify([JSON.parse(v1)])) } catch { /* skip */ } }
        const v2 = window.localStorage.getItem(DRAFTS_KEY_V2)
        if (v2) raws.push(v2)
        const lokale: DraftEntry[] = raws.flatMap((r) => {
          try { const p = JSON.parse(r); return Array.isArray(p) ? p : [] } catch { return [] }
        }).filter((d) => d && d.id && d.data)
        let allesOk = true
        for (const d of lokale) {
          const res = await upsertConcept({
            id: d.id, data: d.data, v2State: null,
            label: deriveKlantNaam(d.data), totaal: 0,
          })
          if (!res.ok) allesOk = false
        }
        if (allesOk) {
          window.localStorage.removeItem(DRAFT_KEY_V1)
          window.localStorage.removeItem(DRAFTS_KEY_V2)
        }
      } catch (e) { console.error('[ManualOfferteModal] concept-migratie:', e) }

      const res = await listConcepten()
      if (res.ok && res.data) setDrafts(res.data)
    })()
  }, [])
```

- [ ] **Step 3: Auto-save schrijft naar de database**

Vervang in het auto-save-`useEffect` (regel ~375-405) de localStorage-`setItem`-tak door een DB-upsert (de debounce-timer + `isDefaultsData`-guard blijven):

```ts
        const id = currentDraftId ?? makeDraftId()
        void upsertConcept({ id, data, v2State: null, label: deriveKlantNaam(data), totaal: 0 }).then((res) => {
          if (!res.ok) return
          if (!currentDraftId) setCurrentDraftId(id)
          setDraftSavedFlash(true)
          void listConcepten().then((r) => { if (r.ok && r.data) setDrafts(r.data) })
        })
```

- [ ] **Step 4: hervatDraft + verwijderDraft op Concept**

`hervatDraft(id)` zoekt nu in `drafts` (type `Concept`) en gebruikt `draft.data`:

```ts
  const hervatDraft = (id: string) => {
    const draft = drafts.find((d) => d.id === id)
    if (!draft) return
    userHasEditedRef.current = true
    setData({ ...DEFAULTS, ...draft.data })
    setCurrentDraftId(id)
    setBannersDismissed(true)
    setStep(1)
  }
```

Vervang `verwijderDraft` (regel ~427-440):

```ts
  const verwijderDraft = (id: string) => {
    void removeConcept(id).then(() => {
      void listConcepten().then((r) => { if (r.ok && r.data) setDrafts(r.data) })
    })
    if (id === currentDraftId) setCurrentDraftId(null)
  }
```

- [ ] **Step 5: Verifieer build**

Run: `npm run build`
Expected: build slaagt, geen type-fouten in ManualOfferteModal (let op de plekken die `d.savedAt`/`d.klantNaam` gebruikten in de lijst-render rond regel ~655-668; vervang door `d.bijgewerktOp` resp. `d.label`).

- [ ] **Step 6: Handmatige rookproef (cross-wizard)**

Met `npm run dev`: maak een concept in de v2-wizard (desktop-breedte), open daarna de mobiele modal (smal venster, `/leads?nieuwe-offerte=1`) en controleer dat hetzelfde concept in de lijst staat en te hervatten is. Maak een concept in de mobiele modal, controleer dat het in de v2-lijst verschijnt.

- [ ] **Step 7: Commit**

```bash
git add components/dashboard/offerte/ManualOfferteModal.tsx
git commit -m "feat(offerte): legacy modal concepten via database + cross-wizard sync"
```

---

## Self-Review

Uitgevoerd tegen `docs/superpowers/specs/2026-06-24-offerte-concepten-sync-design.md`:

- **Datamodel** (spec §1) → Task 1. Inclusief `v2_state` en de 30-grens (geforceerd in `upsertConcept`, Task 2).
- **Server-actions** (spec §2) → Task 2, met tests die `data`+`v2_state`-schrijven, sortering en opschoning dekken.
- **Gedeeld formaat + mappers** (spec §3, §5) → Task 3 (`mapManualOfferteToWizard`) + Task 4 (`buildManualOfferteFromWizard`).
- **Wizard-integratie** (spec §4) → Task 5 (v2) + Task 6 (legacy), inclusief `v2State`-schrijven/lezen, debounce-verhoging, na-submit-opruiming en de legacy `v2State: null`.
- **Migratie lokale concepten** (spec randgevallen) → Task 5 stap 6 + Task 6 stap 2.
- **Deploy** (spec oplevering) → zie Execution Handoff hieronder; migratie toepassen in Task 1 stap 3.
- **Placeholder-scan:** geen "TBD"/"later". De enige verwijzingen-naar-bestaande-code zijn exacte regelreferenties voor setter-namen/lijst-render, met de instructie ze te verifieren. De ternary in Task 5 stap 6 is gemarkeerd om te vereenvoudigen.
- **Type-consistentie:** `Concept`, `BuildInput`, `mapManualOfferteToWizard(data, perMin)` en `buildManualOfferteFromWizard(input)` worden in elke verwijzing met dezelfde naam/signatuur gebruikt. `v2State` is overal `unknown | null` in `lib/`, gecast naar `OfferteDraftState` in de wizard.

**Aandachtspunt voor de uitvoerder:** Task 5/6 raken grote bestaande UI-bestanden. Lees `laadConcept`/`nieuwLeegConcept` (OfferteWizard) en de lijst-render (ManualOfferteModal ~655-668) volledig voor je edit, en leun op `npm run build` (typecheck) tussen de stappen.
