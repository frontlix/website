# Offerte goedkeuren en wijzigen vanuit het dashboard, Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Een herkenbaar "Offerte ter goedkeuring"-blok in het leaddossier (desktop en mobiel) met Goedkeuren en Aanpassen, plus twee bugfixes (de blokkade die goedkeuren nu tegenhoudt, en de regelprijs die bij versturen verloren gaat).

**Architecture:** We bouwen geen nieuwe offerte-machinerie. We hergebruiken de bestaande `approve-quote`-route (bot `approveQuote`) en de bestaande offerte-editors. De wijzigingen zijn: (1) een dashboard-zijdige prijs-override-mapping naar de kolommen die de bot leest, (2) een mapper-vlag plus pure helpers voor de offerte-status, (3) een goedkeur-blok-component op desktop en mobiel, (4) een echte goedkeur-knop in de mobiele editor.

**Tech Stack:** Next.js (App Router), React client components, TypeScript, CSS Modules, Vitest. Supabase (service-role admin in server-actions).

## Global Constraints

- Geen nieuwe bot-endpoints. Alleen de bestaande routes `POST /api/dashboard/lead/[lead_id]/approve-quote` (goedkeuren/versturen) en de bestaande editors worden gebruikt.
- Geen wijziging aan de e-mail-goedkeurflow.
- Huisstijl: geen liggende streepjes (em-dash) in zichtbare tekst. Gebruik komma's. Geen klemtoonaccenten in UI-teksten.
- Werk op een aparte branch `feat/offerte-goedkeuren-dashboard`, afgetakt van `feat/dashboard-rebrand-v2`. Niet pushen of deployen zonder expliciete toestemming van Chris.
- Test-runner: `npm test` (= `vitest run`). Een enkel bestand: `npx vitest run <pad>`. Lint: `npm run lint`. Typecheck: `npx tsc --noEmit`.
- Tests staan naast de bron als `<naam>.test.ts`. Conventie: pure functies, `import { describe, it, expect } from 'vitest'`, minimale factory met `as unknown as <Type>`.

---

## File-structuur

Nieuw:
- `components/dashboard/v2/dossier/OfferteTerGoedkeuringBlok.tsx` + `.module.css` (desktop blok)
- `components/dashboard/mobile/dossier/offerte/MobileOfferteGoedkeuring.tsx` + `.module.css` (mobiel blok)
- `lib/dashboard/offerte-form-mapping.test.ts` bestaat al, wordt uitgebreid
- `components/dashboard/v2/dossier/dossier-data.test.ts` (test voor `deriveAlVerstuurd`)

Gewijzigd:
- `lib/dashboard/offerte-form-mapping.ts` (override-kolommen wegschrijven)
- `components/dashboard/v2/dossier/dossier-data.ts` (types + `deriveAlVerstuurd`)
- `components/dashboard/v2/dossier/dossier-mappers.ts` (vlag + `offerteTerGoedkeuring`)
- `components/dashboard/v2/dossier/DossierView.tsx` (blok renderen, blokkade-fix, kop-knop)
- `components/dashboard/v2/dossier/OffertesTab.tsx` + `OfferteEditor.tsx` (Goedkeuren-knop in editor)
- `components/dashboard/mobile/dossier/dossier-mappers.ts` (`terGoedkeuring`-afgeleide)
- `components/dashboard/mobile/dossier/MobileLeadDossier.tsx` (blok renderen)
- `components/dashboard/mobile/dossier/offerte/MobileOfferteEditor.tsx` (stub vervangen door echte approve)
- `.gitignore` (`.superpowers/`)

---

## Task 0: Setup, branch en gitignore

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Maak en check de feature-branch uit**

```bash
cd "/Users/christiaantromp/Desktop/Frontlix website"
git checkout feat/dashboard-rebrand-v2
git checkout -b feat/offerte-goedkeuren-dashboard
```

- [ ] **Step 2: Voeg `.superpowers/` toe aan `.gitignore`**

Voeg deze regel toe onderaan `.gitignore`:

```
.superpowers/
```

- [ ] **Step 3: Commit**

```bash
git add .gitignore docs/superpowers/specs/2026-06-25-offerte-goedkeuren-dashboard-design.md docs/superpowers/plans/2026-06-25-offerte-goedkeuren-dashboard.md
git commit -m "chore: spec + plan offerte-goedkeuren-dashboard, ignore .superpowers"
```

---

## Task 1: Prijs-fout fixen, regel-overrides naar de bot-kolommen

De dashboard-editor schrijft per-regel prijs-overrides als JSON naar
`leads.offerte_prijs_overrides`. De bot leest die JSON nooit; `calculatePrice`
leest losse `*_override`-kolommen. Deze taak schrijft de overrides ook naar die
losse kolommen, zodat een aangepaste regelprijs bij versturen behouden blijft.

**Mapping (dashboard-sleutel -> bot-kolom):**
- `reinigen_dagprijs_override` -> `reinigen_dagprijs_onder_100m2_override`
- `reiniging_per_m2_override` -> `reinigen_per_m2_override`
- `arbeid_invegen_normaal_override` -> `invegen_arbeid_normaal_per_m2_override`
- `arbeid_invegen_onkruidwerend_override` -> `invegen_arbeid_onkruidwerend_per_m2_override`
- `beschermlaag_override` -> `beschermlaag_per_m2_override`
- `reiskosten_per_km_override` -> `reiskosten_per_km_override`
- `onderhoud_per_m2_override` EN `preventieve_onkruid_override` -> beide naar `onkruid_per_m2_override` (de bot heeft een kolom; per lead is normaal maar een van beide actief, `onderhoud` heeft voorrang).

**Files:**
- Modify: `lib/dashboard/offerte-form-mapping.ts`
- Test: `lib/dashboard/offerte-form-mapping.test.ts` (bestaat al, uitbreiden)

**Interfaces:**
- Produces: `writePrijsOverrideColumns(data: ManualOfferteData): Record<string, number | null>` (module-privé). `buildLeadFieldsFromForm` neemt het resultaat op in zijn return-object.

- [ ] **Step 1: Schrijf de falende test**

Voeg toe aan `lib/dashboard/offerte-form-mapping.test.ts` (onder de bestaande `describe`-blokken):

```ts
describe('losse *_override-kolommen, bot leest deze in calculatePrice', () => {
  test('reiskosten en onderhoud landen ook op de losse lead-kolommen', () => {
    const base = mapLeadToFormData(
      makeLead({ hoofdcategorie: 'onkruidbeheersing_zakelijk', sub_diensten: [], m2: 88 }),
    )
    const data = { ...base, reiskosten_per_km_override: 0.3, onderhoud_per_m2_override: 1.4 }
    const payload = buildLeadFieldsFromForm(data, 'test-1', 500)
    expect(payload.reiskosten_per_km_override).toBe(0.3)
    expect(payload.onkruid_per_m2_override).toBe(1.4)
  })

  test('reiniging_per_m2_override mapt naar reinigen_per_m2_override', () => {
    const base = mapLeadToFormData(makeLead({ hoofdcategorie: 'oprit_terras_terrein', m2: 100 }))
    const payload = buildLeadFieldsFromForm({ ...base, reiniging_per_m2_override: 4.25 }, 'test-1', 500)
    expect(payload.reinigen_per_m2_override).toBe(4.25)
  })

  test('override van 0 blijft 0 op de losse kolom (gratis), niet null', () => {
    const base = mapLeadToFormData(makeLead({ sub_diensten: ['invegen'], m2: 100 }))
    const payload = buildLeadFieldsFromForm({ ...base, beschermlaag_override: 0 }, 'test-1', 500)
    expect(payload.beschermlaag_per_m2_override).toBe(0)
  })

  test('geen override, dan staat de losse kolom op null (reset naar prijslijst)', () => {
    const base = mapLeadToFormData(makeLead({ sub_diensten: ['invegen'], m2: 100 }))
    const payload = buildLeadFieldsFromForm(base, 'test-1', 500)
    expect(payload.reinigen_per_m2_override).toBeNull()
    expect(payload.onkruid_per_m2_override).toBeNull()
  })

  test('preventieve_onkruid mapt naar onkruid_per_m2_override als onderhoud leeg is', () => {
    const base = mapLeadToFormData(
      makeLead({ hoofdcategorie: 'oprit_terras_terrein', sub_diensten: ['preventieve_onkruidbeheersing'], m2: 60 }),
    )
    const payload = buildLeadFieldsFromForm({ ...base, preventieve_onkruid_override: 3 }, 'test-1', 500)
    expect(payload.onkruid_per_m2_override).toBe(3)
  })
})
```

- [ ] **Step 2: Run de test, verifieer dat hij faalt**

Run: `npx vitest run lib/dashboard/offerte-form-mapping.test.ts -t "losse"`
Expected: FAIL (de losse kolommen staan nog niet in `payload`, dus `toBe(0.3)` faalt met `undefined`).

- [ ] **Step 3: Implementeer de mapping-helper**

In `lib/dashboard/offerte-form-mapping.ts`, voeg direct onder `writePrijsOverrides` (rond regel 58) deze functie toe:

```ts
/** Schrijf de per-regel overrides OOK naar de losse lead-kolommen die de bot
 *  (calculatePrice) leest. De bot leest deze kolommen, NIET de
 *  offerte_prijs_overrides-JSON. Zonder deze write gaat een aangepaste
 *  regelprijs verloren bij het versturen. Altijd alle kolommen schrijven (null
 *  als de override weg is), zodat een teruggezette prijs de oude waarde wist. */
function writePrijsOverrideColumns(data: ManualOfferteData): Record<string, number | null> {
  const val = (v: number | undefined): number | null =>
    typeof v === 'number' && Number.isFinite(v) ? v : null
  // onkruid_per_m2_override wordt door de bot in twee contexten gelezen
  // (onderhoud-basisdienst en preventieve sub-dienst). Per lead is normaal maar
  // een van beide actief; onderhoud heeft voorrang als beide gezet zijn.
  const onkruid = data.onderhoud_per_m2_override ?? data.preventieve_onkruid_override
  return {
    reinigen_dagprijs_onder_100m2_override: val(data.reinigen_dagprijs_override),
    reinigen_per_m2_override: val(data.reiniging_per_m2_override),
    invegen_arbeid_normaal_per_m2_override: val(data.arbeid_invegen_normaal_override),
    invegen_arbeid_onkruidwerend_per_m2_override: val(data.arbeid_invegen_onkruidwerend_override),
    beschermlaag_per_m2_override: val(data.beschermlaag_override),
    reiskosten_per_km_override: val(data.reiskosten_per_km_override),
    onkruid_per_m2_override: val(onkruid),
  }
}
```

- [ ] **Step 4: Neem de kolommen op in `buildLeadFieldsFromForm`**

In `lib/dashboard/offerte-form-mapping.ts`, in het return-object van
`buildLeadFieldsFromForm`, vlak na de regel
`offerte_prijs_overrides: writePrijsOverrides(data),` voeg toe:

```ts
    ...writePrijsOverrideColumns(data),
```

- [ ] **Step 5: Run de test, verifieer dat hij slaagt**

Run: `npx vitest run lib/dashboard/offerte-form-mapping.test.ts`
Expected: PASS (alle blokken, inclusief de bestaande JSON-tests, blijven groen).

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: geen fouten. Mocht TS klagen dat een `*_override`-kolom niet bestaat op het `leads`-Update-type, dan komt dat doordat `buildLeadFieldsFromForm` `Record<string, unknown>` retourneert (zo niet, voeg de zes kolommen `reinigen_dagprijs_onder_100m2_override`, `reinigen_per_m2_override`, `invegen_arbeid_normaal_per_m2_override`, `invegen_arbeid_onkruidwerend_per_m2_override`, `beschermlaag_per_m2_override`, `onkruid_per_m2_override` als `number | null` toe aan Row/Insert/Update van tabel `leads` in `lib/dashboard/database.types.ts`; `reiskosten_per_km_override` en `extra_arbeid_prijs_override` bestaan daar al).

- [ ] **Step 7: Commit**

```bash
git add lib/dashboard/offerte-form-mapping.ts lib/dashboard/offerte-form-mapping.test.ts
git commit -m "fix: schrijf offerte-prijs-overrides ook naar de bot-leesbare kolommen"
```

---

## Task 2: Dossier-mapper, status-vlag, offerteTerGoedkeuring en blokkade-helper (desktop)

Deze taak levert de datalaag voor het desktop-blok en de blokkade-fix: een vlag
per offerte, een afgeleide voor het blok, en een pure `deriveAlVerstuurd` die
een wachtende offerte niet meer als verstuurd telt.

**Files:**
- Modify: `components/dashboard/v2/dossier/dossier-data.ts`
- Modify: `components/dashboard/v2/dossier/dossier-mappers.ts`
- Test: `components/dashboard/v2/dossier/dossier-data.test.ts` (nieuw)

**Interfaces:**
- Produces (in `dossier-data.ts`):
  - `DossierOfferte` krijgt veld `wachtOpGoedkeuring?: boolean`
  - `DossierData` krijgt veld `offerteTerGoedkeuring?: { dienst: string; m2: string; totaal: string } | null`
  - `deriveAlVerstuurd(offertes: Pick<DossierOfferte, 'concept' | 'tone' | 'wachtOpGoedkeuring'>[]): boolean`
- Produces (in `dossier-mappers.ts`): `buildOffertes` zet `wachtOpGoedkeuring`; `mapLeadDetailToDossierData` zet `offerteTerGoedkeuring`.
- Consumes: `OfferteTone` uit `dossier-data.ts`.

- [ ] **Step 1: Schrijf de falende test voor `deriveAlVerstuurd`**

Maak `components/dashboard/v2/dossier/dossier-data.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { deriveAlVerstuurd } from './dossier-data'

describe('deriveAlVerstuurd', () => {
  it('een verstuurde offerte telt als verstuurd', () => {
    expect(deriveAlVerstuurd([{ concept: false, tone: 'verstuurd' }])).toBe(true)
  })

  it('een offerte die op goedkeuring wacht telt NIET als verstuurd', () => {
    expect(
      deriveAlVerstuurd([{ concept: false, tone: 'verstuurd', wachtOpGoedkeuring: true }]),
    ).toBe(false)
  })

  it('een concept telt niet als verstuurd', () => {
    expect(deriveAlVerstuurd([{ concept: true, tone: 'concept' }])).toBe(false)
  })

  it('een archief-offerte telt niet als verstuurd', () => {
    expect(deriveAlVerstuurd([{ concept: false, tone: 'archief' }])).toBe(false)
  })

  it('leeg, dan niet verstuurd', () => {
    expect(deriveAlVerstuurd([])).toBe(false)
  })
})
```

- [ ] **Step 2: Run de test, verifieer dat hij faalt**

Run: `npx vitest run components/dashboard/v2/dossier/dossier-data.test.ts`
Expected: FAIL met "deriveAlVerstuurd is not a function" / import-fout.

- [ ] **Step 3: Voeg types en helper toe aan `dossier-data.ts`**

In `components/dashboard/v2/dossier/dossier-data.ts`, in `interface DossierOfferte`, voeg na het `tone?`-veld toe:

```ts
  /** True wanneer deze (niet-concept) offerte status wacht_op_goedkeuring heeft.
   *  Telt dan NIET als "al verstuurd" (zie deriveAlVerstuurd). */
  wachtOpGoedkeuring?: boolean;
```

In `interface DossierData`, voeg na het `offertes`-veld toe:

```ts
  /** De offerte die op goedkeuring wacht (status wacht_op_goedkeuring), met
   *  dienst-label, m2 en totaal voor het goedkeuringsblok bovenaan het dossier.
   *  null/afwezig = geen wachtende offerte. */
  offerteTerGoedkeuring?: { dienst: string; m2: string; totaal: string } | null;
```

Onderaan het bestand (na de `DOSSIER`-constante), voeg de pure helper toe:

```ts
/** Is er al een offerte naar de klant verstuurd? Een niet-concept, niet-archief
 *  offerte telt als verstuurd, BEHALVE wanneer die nog op goedkeuring wacht.
 *  Deze uitzondering houdt de "Offerte versturen"/Goedkeuren-knop bruikbaar op
 *  het moment dat de bot de offerte ter goedkeuring heeft klaargezet. */
export function deriveAlVerstuurd(
  offertes: Pick<DossierOfferte, 'concept' | 'tone' | 'wachtOpGoedkeuring'>[],
): boolean {
  return offertes.some((o) => !o.concept && o.tone !== 'archief' && !o.wachtOpGoedkeuring)
}
```

- [ ] **Step 4: Run de test, verifieer dat hij slaagt**

Run: `npx vitest run components/dashboard/v2/dossier/dossier-data.test.ts`
Expected: PASS (alle 5).

- [ ] **Step 5: Zet de vlag in `buildOffertes`**

In `components/dashboard/v2/dossier/dossier-mappers.ts`, in het `return`-object
binnen de `.map()` van `buildOffertes` (na `pdfModel,`), voeg toe:

```ts
      wachtOpGoedkeuring: !concept && o.status === "wacht_op_goedkeuring",
```

- [ ] **Step 6: Bouw de `offerteTerGoedkeuring`-afgeleide in de mapper**

In `components/dashboard/v2/dossier/dossier-mappers.ts`, in
`mapLeadDetailToDossierData`, direct vóór het `return {`-statement, voeg toe:

```ts
  // De wachtende offerte (status wacht_op_goedkeuring): dienst-label, m2 en
  // totaal voor het goedkeuringsblok bovenaan het dossier.
  const wachtende = detail.offertes.find(
    (o) => !o.is_concept && o.status === "wacht_op_goedkeuring",
  );
  const offerteTerGoedkeuring = wachtende
    ? {
        dienst: humanizeHoofd(l.hoofdcategorie),
        m2: l.m2 != null ? `${l.m2} m²` : "",
        totaal: formatEuro(wachtende.totaal_incl),
      }
    : null;
```

En voeg in het `return`-object, na `offertes,`, toe:

```ts
    offerteTerGoedkeuring,
```

- [ ] **Step 7: Typecheck**

Run: `npx tsc --noEmit`
Expected: geen fouten.

- [ ] **Step 8: Commit**

```bash
git add components/dashboard/v2/dossier/dossier-data.ts components/dashboard/v2/dossier/dossier-data.test.ts components/dashboard/v2/dossier/dossier-mappers.ts
git commit -m "feat: dossier-mapper levert wacht-op-goedkeuring vlag, blok-data en blokkade-helper"
```

---

## Task 3: Desktop goedkeur-blok-component

**Files:**
- Create: `components/dashboard/v2/dossier/OfferteTerGoedkeuringBlok.tsx`
- Create: `components/dashboard/v2/dossier/OfferteTerGoedkeuringBlok.module.css`

**Interfaces:**
- Produces: `OfferteTerGoedkeuringBlok` (React component) met props
  `{ dienst: string; m2: string; totaal: string; sending: boolean; onGoedkeuren: () => void; onAanpassen: () => void }`.

- [ ] **Step 1: Maak het component**

Maak `components/dashboard/v2/dossier/OfferteTerGoedkeuringBlok.tsx`:

```tsx
"use client";

import { CheckCircle2, Pencil } from "lucide-react";
import styles from "./OfferteTerGoedkeuringBlok.module.css";

interface OfferteTerGoedkeuringBlokProps {
  /** Dienst-label van de wachtende offerte. */
  dienst: string;
  /** Oppervlakte-label (bv. "45 m²") of leeg. */
  m2: string;
  /** Totaalbedrag incl. btw (geformatteerd, bv. "€ 380,00"). */
  totaal: string;
  /** Bezig met versturen: knoppen uit + label op "Versturen…". */
  sending: boolean;
  onGoedkeuren: () => void;
  onAanpassen: () => void;
}

/** Blok bovenaan het dossier zodra een offerte op goedkeuring wacht. Toont een
 *  samenvatting en twee acties: Aanpassen (opent de offerte-editor) en
 *  Goedkeuren (verstuurt de offerte naar de klant via WhatsApp). */
export function OfferteTerGoedkeuringBlok({
  dienst,
  m2,
  totaal,
  sending,
  onGoedkeuren,
  onAanpassen,
}: OfferteTerGoedkeuringBlokProps) {
  const sub = [dienst, m2, totaal].filter(Boolean).join(" · ");
  return (
    <div className={styles.blok}>
      <span className={styles.icoon}>
        <CheckCircle2 size={20} strokeWidth={2.2} />
      </span>
      <div className={styles.tekst}>
        <strong>Offerte wacht op je goedkeuring</strong>
        <span>{sub}</span>
      </div>
      <div className={styles.acties}>
        <button
          type="button"
          className={styles.aanpassen}
          onClick={onAanpassen}
          disabled={sending}
        >
          <Pencil size={15} strokeWidth={2.1} />
          Aanpassen
        </button>
        <button
          type="button"
          className={styles.goedkeuren}
          onClick={onGoedkeuren}
          disabled={sending}
        >
          {sending ? "Versturen…" : "Goedkeuren"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Maak de stylesheet**

Maak `components/dashboard/v2/dossier/OfferteTerGoedkeuringBlok.module.css`:

```css
.blok {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border: 1.5px solid var(--rb-mint-ink, #1e8a5e);
  border-radius: var(--rb-r-card, 16px);
  background: color-mix(in srgb, var(--rb-mint, #dff5ea) 45%, var(--rb-card, #ffffff));
  font-family: var(--rb-font);
}

.icoon {
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: var(--rb-mint-ink, #1e8a5e);
  color: #fff;
}

.tekst {
  display: flex;
  flex-direction: column;
  line-height: 1.35;
}
.tekst strong {
  font-size: 14px;
  font-weight: 800;
  color: var(--rb-ink, #212a45);
}
.tekst span {
  font-size: 12.5px;
  color: var(--rb-muted, #7a83a6);
}

.acties {
  margin-left: auto;
  display: flex;
  gap: 8px;
  flex: 0 0 auto;
}

.aanpassen,
.goedkeuren {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  padding: 9px 16px;
  border-radius: var(--rb-r-pill, 9999px);
  cursor: pointer;
  border: 1px solid transparent;
}
.aanpassen {
  background: var(--rb-card, #ffffff);
  color: var(--rb-ink, #212a45);
  border-color: rgba(33, 42, 69, 0.14);
}
.goedkeuren {
  background: var(--rb-mint-ink, #1e8a5e);
  color: #fff;
}
.aanpassen:disabled,
.goedkeuren:disabled {
  opacity: 0.6;
  cursor: default;
}

@media (max-width: 640px) {
  .blok {
    flex-wrap: wrap;
  }
  .acties {
    width: 100%;
  }
  .aanpassen,
  .goedkeuren {
    flex: 1;
    justify-content: center;
  }
}
```

- [ ] **Step 3: Typecheck en lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: geen fouten over dit bestand.

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/v2/dossier/OfferteTerGoedkeuringBlok.tsx components/dashboard/v2/dossier/OfferteTerGoedkeuringBlok.module.css
git commit -m "feat: desktop goedkeur-blok component"
```

---

## Task 4: Desktop blok bedraden in DossierView (blok + blokkade-fix + kop-knop)

**Files:**
- Modify: `components/dashboard/v2/dossier/DossierView.tsx`

**Interfaces:**
- Consumes: `deriveAlVerstuurd` en `data.offerteTerGoedkeuring` (Task 2), `OfferteTerGoedkeuringBlok` (Task 3).

- [ ] **Step 1: Imports toevoegen**

In `components/dashboard/v2/dossier/DossierView.tsx`, bij de imports:

```tsx
import { OfferteTerGoedkeuringBlok } from "./OfferteTerGoedkeuringBlok";
import { DOSSIER, deriveAlVerstuurd } from "./dossier-data";
```

(De bestaande `import { DOSSIER } from "./dossier-data";` op regel 14 wordt vervangen door de regel hierboven.)

- [ ] **Step 2: Vervang de `alVerstuurd`-afleiding door de helper (blokkade-fix)**

Vervang de regel (rond 241):

```tsx
  const alVerstuurd = data.offertes.some((o) => !o.concept && o.tone !== "archief");
```

door:

```tsx
  const alVerstuurd = deriveAlVerstuurd(data.offertes);
```

- [ ] **Step 3: Voeg een `naarOffertesTab`-helper toe (voor Aanpassen)**

In de component-body, vlak bij de andere handlers (bv. na `naarNotities`), voeg toe:

```tsx
  const naarOffertesTab = () => {
    setTab("Offertes");
  };
```

- [ ] **Step 4: Render het blok tussen de kop en de split-view**

In de JSX, direct na de afsluitende `</div>` van de kop (de regel met
commentaar `{/* Split view */}` eronder), voeg toe vóór `{/* Split view */}`:

```tsx
      {data.offerteTerGoedkeuring ? (
        <OfferteTerGoedkeuringBlok
          dienst={data.offerteTerGoedkeuring.dienst}
          m2={data.offerteTerGoedkeuring.m2}
          totaal={data.offerteTerGoedkeuring.totaal}
          sending={sending}
          onGoedkeuren={handleVerstuur}
          onAanpassen={naarOffertesTab}
        />
      ) : null}
```

- [ ] **Step 5: Verberg de kop-knop "Offerte versturen" wanneer het blok actief is**

Het blok neemt de goedkeur-actie over. Wikkel de bestaande primaire knop (de
`<button className={styles.primaryBtn} ...>Offerte versturen</button>`, rond
regel 377-390) in een conditie, zodat hij verdwijnt zodra er een wachtende
offerte is:

```tsx
          {!data.offerteTerGoedkeuring ? (
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={handleVerstuur}
              disabled={!live || alVerstuurd || sending}
              title={
                alVerstuurd
                  ? "Deze offerte is al verstuurd"
                  : "Offerte versturen naar de klant via WhatsApp"
              }
              style={!live || alVerstuurd ? { opacity: 0.55, cursor: "not-allowed" } : undefined}
            >
              {sending ? "Versturen…" : alVerstuurd ? "Al verstuurd" : "Offerte versturen"}
            </button>
          ) : null}
```

- [ ] **Step 6: Typecheck en lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: geen fouten.

- [ ] **Step 7: Handmatige verificatie (build + visuele check)**

Run: `npm run build`
Expected: build slaagt. Start daarna `npm run dev` en open een lead met een
offerte die op goedkeuring wacht. Verwacht: het groene blok staat bovenaan, de
kop-knop "Offerte versturen" is weg, "Goedkeuren" is klikbaar (niet "Al
verstuurd"), "Aanpassen" springt naar het tabblad Offertes. Bij een lead zonder
wachtende offerte: geen blok, kop-knop gedraagt zich zoals voorheen.

- [ ] **Step 8: Commit**

```bash
git add components/dashboard/v2/dossier/DossierView.tsx
git commit -m "feat: desktop goedkeur-blok bedraden + blokkade-fix in dossier"
```

---

## Task 5: Goedkeuren-knop in de desktop OfferteEditor

Zodat je na het aanpassen direct kunt goedkeuren zonder terug te scrollen.

**Files:**
- Modify: `components/dashboard/v2/dossier/OfferteEditor.tsx`
- Modify: `components/dashboard/v2/dossier/OffertesTab.tsx`
- Modify: `components/dashboard/v2/dossier/DossierView.tsx`

**Interfaces:**
- Produces: `OfferteEditor` krijgt optionele prop `onGoedkeuren?: () => void`; `OffertesTab` krijgt optionele prop `onGoedkeuren?: () => void` en geeft die door.
- Consumes: `handleVerstuur` uit `DossierView` (de approve-flow met flush).

- [ ] **Step 1: Voeg de prop toe aan OfferteEditor**

In `components/dashboard/v2/dossier/OfferteEditor.tsx`, in `interface OfferteEditorProps`, voeg toe:

```tsx
  /** Optionele Goedkeuren-actie (verstuurt de offerte). Wanneer gezet toont de
   *  actiebalk een Goedkeuren-knop naast Bekijk/Download/Historie. */
  onGoedkeuren?: () => void;
```

En in de functie-signatuur, voeg `onGoedkeuren` toe aan de destructurering:

```tsx
export function OfferteEditor({
  leadId,
  form,
  offertes = [],
  fotosCount = 0,
  apiRef,
  onTotaal,
  onGoedkeuren,
}: OfferteEditorProps) {
```

- [ ] **Step 2: Importeer het icoon**

In de `lucide-react`-import bovenaan `OfferteEditor.tsx`, voeg `CheckCircle2` toe aan de bestaande lijst (naast `Download`, `Eye`, `Clock`, `Loader2`).

- [ ] **Step 3: Voeg de knop toe aan de actiebalk**

In de actiebalk-JSX (`<div className={styles.actionBar}>`, rond regel 1231),
voeg als eerste knop binnen de `div` toe:

```tsx
          {onGoedkeuren ? (
            <button
              type="button"
              className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
              onClick={onGoedkeuren}
            >
              <CheckCircle2 size={15} strokeWidth={2.2} />
              Goedkeuren
            </button>
          ) : null}
```

- [ ] **Step 4: Geef de prop door via OffertesTab**

In `components/dashboard/v2/dossier/OffertesTab.tsx`, in `interface OffertesTabProps`, voeg toe:

```tsx
  /** Optionele Goedkeuren-actie, doorgegeven aan de editor. */
  onGoedkeuren?: () => void;
```

In de functie-signatuur:

```tsx
export function OffertesTab({ data = DOSSIER, leadId, offerteApiRef, onGoedkeuren }: OffertesTabProps) {
```

En in de `<OfferteEditor ... />`-aanroep, voeg toe:

```tsx
        onGoedkeuren={onGoedkeuren}
```

- [ ] **Step 5: Geef de actie door vanuit DossierView**

In `components/dashboard/v2/dossier/DossierView.tsx`, in de `<OffertesTab ... />`-aanroep
(rond regel 408), voeg toe zodat de editor-knop alleen verschijnt bij een
wachtende offerte:

```tsx
              <OffertesTab
                data={data}
                leadId={leadId}
                offerteApiRef={offerteApiRef}
                onGoedkeuren={data.offerteTerGoedkeuring ? handleVerstuur : undefined}
              />
```

- [ ] **Step 6: Typecheck, lint, build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: geen fouten, build slaagt.

- [ ] **Step 7: Handmatige verificatie**

Start `npm run dev`, open een lead met een wachtende offerte, klik Aanpassen.
Verwacht: in de editor-actiebalk staat een groene Goedkeuren-knop; klikken
verstuurt (flush gebeurt al via de bestaande `handleVerstuur`-flow, want
`offerteApiRef` is gedeeld). Bij een lead zonder wachtende offerte staat de
Goedkeuren-knop niet in de editor.

- [ ] **Step 8: Commit**

```bash
git add components/dashboard/v2/dossier/OfferteEditor.tsx components/dashboard/v2/dossier/OffertesTab.tsx components/dashboard/v2/dossier/DossierView.tsx
git commit -m "feat: Goedkeuren-knop in de desktop offerte-editor"
```

---

## Task 6: Mobiele mapper, terGoedkeuring-afgeleide

**Files:**
- Modify: `components/dashboard/mobile/dossier/dossier-mappers.ts`

**Interfaces:**
- Produces: `MobileDossierData['offerte']` krijgt veld
  `terGoedkeuring?: { dienst: string; m2: string; totaal: string } | null`; `buildOfferte` vult dat.

- [ ] **Step 1: Breid het offerte-type uit**

In `components/dashboard/mobile/dossier/dossier-mappers.ts`, in het
`offerte: { ... }`-type binnen `MobileDossierData` (rond regel 58-77), voeg een
veld toe (na `dienst: string`):

```ts
    /** De wachtende offerte (status wacht_op_goedkeuring) voor het mobiele
     *  goedkeur-blok: dienst-label, m2 en geformatteerd totaal. null = geen. */
    terGoedkeuring?: { dienst: string; m2: string; totaal: string } | null
```

- [ ] **Step 2: Vul `terGoedkeuring` in `buildOfferte`**

In `buildOfferte`, in het `return`-object (rond regel 255-275), voeg toe.
Gebruik de reeds aanwezige variabelen `l` (de lead), `latest` (de relevante
offerte-rij) en `totaal` (number). Voor het euro-formaat gebruik je dezelfde
helper als de rest van het bestand (controleer de bestaande import; in deze
mapper wordt euro getoond, gebruik die formatter, hieronder `formatEuro`):

```ts
    terGoedkeuring:
      !l.offerte_verstuurd && latest?.status === "wacht_op_goedkeuring"
        ? {
            dienst: humanizeHoofd(l.hoofdcategorie),
            m2: l.m2 != null ? `${l.m2} m²` : "",
            totaal: formatEuro(totaal),
          }
        : null,
```

Let op: controleer of `humanizeHoofd` en `formatEuro` in dit bestand bestaan of
geïmporteerd zijn. Zo niet, gebruik de in dit bestand aanwezige equivalenten
(de mapper toont al een `dienst`-string en euro-bedragen, dus beide bewerkingen
bestaan hier al, mogelijk onder een andere naam, bv. `formatEuro` uit
`@/lib/dashboard/format`). Hergebruik die in plaats van nieuwe te maken.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: geen fouten.

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/mobile/dossier/dossier-mappers.ts
git commit -m "feat: mobiele mapper levert wacht-op-goedkeuring blok-data"
```

---

## Task 7: Mobiel goedkeur-blok-component en bedrading

**Files:**
- Create: `components/dashboard/mobile/dossier/offerte/MobileOfferteGoedkeuring.tsx`
- Create: `components/dashboard/mobile/dossier/offerte/MobileOfferteGoedkeuring.module.css`
- Modify: `components/dashboard/mobile/dossier/MobileLeadDossier.tsx`

**Interfaces:**
- Produces: `MobileOfferteGoedkeuring` met props
  `{ leadId: string; dienst: string; m2: string; totaal: string; onAanpassen: () => void }`.
- Consumes: `useBotAction` uit `components/dashboard/bot-actions/use-bot-action.ts`; `data.offerte.terGoedkeuring` (Task 6).

- [ ] **Step 1: Maak het component**

Maak `components/dashboard/mobile/dossier/offerte/MobileOfferteGoedkeuring.tsx`:

```tsx
"use client";

import { CheckCircle2, Pencil } from "lucide-react";
import { useBotAction } from "@/components/dashboard/bot-actions/use-bot-action";
import styles from "./MobileOfferteGoedkeuring.module.css";

interface MobileOfferteGoedkeuringProps {
  leadId: string;
  dienst: string;
  m2: string;
  totaal: string;
  /** Opent het Offerte-tabblad om de offerte aan te passen. */
  onAanpassen: () => void;
}

/** Mobiel blok onder de kop zodra een offerte op goedkeuring wacht. Goedkeuren
 *  verstuurt via dezelfde approve-quote-route als desktop; Aanpassen opent het
 *  Offerte-tabblad. */
export function MobileOfferteGoedkeuring({
  leadId,
  dienst,
  m2,
  totaal,
  onAanpassen,
}: MobileOfferteGoedkeuringProps) {
  const { run, pending, error } = useBotAction(
    `/api/dashboard/lead/${leadId}/approve-quote`,
  );
  const sub = [dienst, m2, totaal].filter(Boolean).join(" · ");

  const goedkeuren = () => {
    if (pending) return;
    if (!window.confirm("Offerte nu naar de klant sturen via WhatsApp?")) return;
    run();
  };

  return (
    <section className={styles.blok}>
      <div className={styles.kop}>
        <span className={styles.icoon}>
          <CheckCircle2 size={18} strokeWidth={2.2} />
        </span>
        <div className={styles.tekst}>
          <strong>Offerte wacht op je goedkeuring</strong>
          <span>{sub}</span>
        </div>
      </div>
      <div className={styles.acties}>
        <button
          type="button"
          className={styles.aanpassen}
          onClick={onAanpassen}
          disabled={pending}
        >
          <Pencil size={15} strokeWidth={2.1} />
          Aanpassen
        </button>
        <button
          type="button"
          className={styles.goedkeuren}
          onClick={goedkeuren}
          disabled={pending}
        >
          {pending ? "Versturen…" : "Goedkeuren"}
        </button>
      </div>
      {error ? <p className={styles.fout}>{error}</p> : null}
    </section>
  );
}
```

- [ ] **Step 2: Maak de stylesheet**

Maak `components/dashboard/mobile/dossier/offerte/MobileOfferteGoedkeuring.module.css`:

```css
.blok {
  margin: 10px 14px 0;
  padding: 12px 14px;
  border: 1.5px solid var(--color-success, #16a34a);
  border-radius: 12px;
  background: color-mix(in srgb, var(--color-success, #16a34a) 10%, var(--color-bg, #fff));
}

.kop {
  display: flex;
  align-items: center;
  gap: 10px;
}
.icoon {
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  background: var(--color-success, #16a34a);
  color: #fff;
}
.tekst {
  display: flex;
  flex-direction: column;
  line-height: 1.35;
}
.tekst strong {
  font-size: 14px;
  color: var(--color-text, #1a1a1a);
}
.tekst span {
  font-size: 12px;
  color: var(--color-text-muted, #555);
}

.acties {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
.aanpassen,
.goedkeuren {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 700;
  padding: 11px 14px;
  border-radius: 10px;
  border: 1px solid transparent;
}
.aanpassen {
  background: var(--color-bg, #fff);
  color: var(--color-text, #1a1a1a);
  border-color: var(--color-border, rgba(0, 0, 0, 0.1));
}
.goedkeuren {
  background: linear-gradient(135deg, #1a56ff, #00cfff);
  color: #fff;
}
.aanpassen:disabled,
.goedkeuren:disabled {
  opacity: 0.6;
}
.fout {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--color-danger, #c0362c);
}
```

(Goedkeuren-knop bewust in de blauw-cyaan gradient die mobiel al voor de primaire
verstuur-actie gebruikt; de groene rand markeert het goedkeur-moment.)

- [ ] **Step 3: Render het blok in MobileLeadDossier**

In `components/dashboard/mobile/dossier/MobileLeadDossier.tsx`, importeer:

```tsx
import { MobileOfferteGoedkeuring } from "./offerte/MobileOfferteGoedkeuring";
```

En render het blok tussen de `tagsRow`-div en `<DossierTabs ...>`:

```tsx
        <div className={styles.tagsRow}>
          <LeadTagsRow leadId={lead.id} leadTags={leadTags} allTags={allTags} live />
        </div>
        {data.offerte.terGoedkeuring ? (
          <MobileOfferteGoedkeuring
            leadId={data.leadId}
            dienst={data.offerte.terGoedkeuring.dienst}
            m2={data.offerte.terGoedkeuring.m2}
            totaal={data.offerte.terGoedkeuring.totaal}
            onAanpassen={() => setTab("offerte")}
          />
        ) : null}
        <DossierTabs active={tab} tabs={TABS} onSelect={(k) => setTab(k as Tab)} />
```

Let op: controleer hoe `leadId` beschikbaar is in dit component. Volgens de
mapper is dat `data.leadId`; bestaat dat veld niet op `MobileDossierData`, gebruik
dan `lead.id` (de lead is al gedestructureerd als `const { lead } = data`).

- [ ] **Step 4: Typecheck, lint, build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: geen fouten, build slaagt.

- [ ] **Step 5: Handmatige verificatie**

Start `npm run dev`, open de mobiele weergave (smal venster of device-emulatie)
van een lead met een wachtende offerte. Verwacht: het blok staat onder de kop,
Goedkeuren vraagt bevestiging en verstuurt, Aanpassen opent het Offerte-tabblad.

- [ ] **Step 6: Commit**

```bash
git add components/dashboard/mobile/dossier/offerte/MobileOfferteGoedkeuring.tsx components/dashboard/mobile/dossier/offerte/MobileOfferteGoedkeuring.module.css components/dashboard/mobile/dossier/MobileLeadDossier.tsx
git commit -m "feat: mobiel goedkeur-blok onder de kop"
```

---

## Task 8: Echte goedkeur-knop in de mobiele offerte-editor

De stub `handleSendClick` (alert "binnenkort") wordt een echte approve-call, zodat
"Direct versturen naar klant" daadwerkelijk verstuurt.

**Files:**
- Modify: `components/dashboard/mobile/dossier/offerte/MobileOfferteEditor.tsx`

**Interfaces:**
- Consumes: `useBotAction`; bestaande `flushPending()` (rond regel 360-370) en `leadId`-prop.

- [ ] **Step 1: Imports toevoegen**

In `components/dashboard/mobile/dossier/offerte/MobileOfferteEditor.tsx`, voeg toe:

```tsx
import { useBotAction } from "@/components/dashboard/bot-actions/use-bot-action";
```

- [ ] **Step 2: Hook initialiseren in het component**

In de component-body (na het binnenkrijgen van `leadId`), voeg toe:

```tsx
  const { run: approveQuote, pending: approving } = useBotAction(
    `/api/dashboard/lead/${leadId}/approve-quote`,
  );
```

- [ ] **Step 3: Vervang de stub `handleSendClick`**

Vervang de bestaande stub (rond regel 387-391):

```tsx
  const handleSendClick = useCallback(() => {
    // Stub: verzending wordt later gekoppeld (mirror van LeadOfferteForm).
    // eslint-disable-next-line no-alert
    alert('Versturen via WhatsApp wordt binnenkort gekoppeld.')
  }, [])
```

door:

```tsx
  const handleSendClick = useCallback(() => {
    if (!leadId || approving) return;
    // eslint-disable-next-line no-alert
    if (!window.confirm("Offerte nu naar de klant sturen via WhatsApp?")) return;
    // Schrijf eerst het laatst bewerkte concept weg, dan versturen via de bot.
    flushPending();
    approveQuote();
  }, [leadId, approving, flushPending, approveQuote]);
```

Let op: controleer dat `flushPending` in scope en in de dependency-array correct
is (de functie bestaat al, rond regel 360-370). Als `flushPending` async is,
gebruik dan `flushPending(); approveQuote();` zoals hierboven (de bot
herberekent toch vers; de flush borgt het concept in de DB voor de zekerheid).

- [ ] **Step 4: Update de knop-staat**

In de "Direct versturen naar klant"-knop (rond regel 1086-1090), voeg
`disabled={approving}` toe en pas het label aan:

```tsx
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={handleSendClick}
            disabled={approving}
          >
            <MessageCircle size={16} aria-hidden="true" />{" "}
            {approving ? "Versturen…" : "Direct versturen naar klant"}
          </button>
```

- [ ] **Step 5: Typecheck, lint, build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: geen fouten, build slaagt.

- [ ] **Step 6: Handmatige verificatie**

Start `npm run dev`, mobiele weergave, open de offerte-editor van een lead.
Verwacht: "Direct versturen naar klant" vraagt bevestiging en verstuurt echt
(geen alert meer); de knop toont "Versturen…" tijdens het versturen.

- [ ] **Step 7: Commit**

```bash
git add components/dashboard/mobile/dossier/offerte/MobileOfferteEditor.tsx
git commit -m "feat: mobiele offerte-editor verstuurt echt via approve-quote"
```

---

## Task 9: Integratie en end-to-end verificatie

**Files:** geen wijziging, alleen verificatie.

- [ ] **Step 1: Volledige test-suite**

Run: `npm test`
Expected: alle tests groen, inclusief de nieuwe `offerte-form-mapping`- en
`dossier-data`-tests.

- [ ] **Step 2: Lint en build**

Run: `npm run lint && npm run build`
Expected: geen fouten, build slaagt.

- [ ] **Step 3: Handmatige end-to-end test door Chris (op een testlead)**

Op een testlead met een offerte die op goedkeuring wacht:
1. Desktop: het groene blok staat bovenaan, "Goedkeuren" is klikbaar (niet "Al verstuurd").
2. Desktop: "Goedkeuren" verstuurt de offerte echt naar de klant (WhatsApp + e-mail).
3. Desktop: "Aanpassen" opent de editor; een regelprijs aanpassen en goedkeuren; controleer dat de klant-PDF de aangepaste prijs toont (dit valideert de prijs-fix uit Task 1).
4. Telefoon: hetzelfde blok onder de kop; Goedkeuren verstuurt; Aanpassen opent de editor; "Direct versturen naar klant" verstuurt echt.

- [ ] **Step 4: Klaar voor review**

Niet pushen of deployen. Meld aan Chris dat de branch `feat/offerte-goedkeuren-dashboard`
klaarstaat voor zijn handmatige test en daarna voor deploy-toestemming.

---

## Self-review (door de planner)

**Spec-dekking:**
- Goedkeur-blok desktop -> Task 3 + 4. OK
- Goedkeur-blok mobiel + echte approve -> Task 6 + 7 + 8. OK
- Blokkade-fout (alVerstuurd negeert wacht_op_goedkeuring) -> Task 2 (`deriveAlVerstuurd`) + Task 4 (gebruik). OK
- Prijs-fout (regel-overrides bereiken de bot) -> Task 1. OK
- Aanpassen opent bestaande editor -> Task 4 (`naarOffertesTab`) en Task 7 (`setTab('offerte')`). OK
- Goedkeuren-knop in editor -> Task 5. OK

**Type-consistentie:** `wachtOpGoedkeuring` en `offerteTerGoedkeuring` (Task 2) worden exact zo geconsumeerd in Task 4/5; `terGoedkeuring` (Task 6) exact zo in Task 7. `deriveAlVerstuurd`-signatuur in Task 2 matcht het gebruik in Task 4. `useBotAction` retourneert `{ run, pending, error }`, zo gebruikt in Task 7/8.

**Aannames die in de taken zelf geverifieerd worden:** of `database.types.ts` de override-kolommen nodig heeft (Task 1, Step 6); de exacte naam van de euro-formatter en `humanizeHoofd` in de mobiele mapper (Task 6, Step 2); of `leadId` op `MobileDossierData` staat dan wel via `lead.id` moet (Task 7, Step 3); of `flushPending` async is (Task 8, Step 3).
