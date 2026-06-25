# Hand-over-reden in het leaddossier ("te ver" / "te klein") — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In het leaddossier (desktop v2 + mobiel) een rode regel tonen die uitlegt waarom een lead "zelf overnemen" is: "Te ver, buiten je werkstraal (X km)" onder Adres en "Te klein, onder Y m²" onder Oppervlakte, afgeleid uit de afstand/m² vs de tenant-grenzen.

**Architecture:** Eén pure helper `handoverReason(lead, grenzen)` bepaalt de twee reden-teksten (of een neutrale fallback). Een async helper `getWerkgebiedGrenzen()` haalt de grenzen uit `tenant_settings` (met defaults). Beide dossier-pagina's halen de grenzen op en geven ze aan hun mapper; de v2- en mobiele dossier-mappers tonen de teksten als rode regels. Geen DB-migratie.

**Tech Stack:** Next.js (App Router, server components), TypeScript, Supabase, Vitest.

## Global Constraints

- **Bron**: de reden wordt AFGELEID, niet opgeslagen. Helper: `handoverReason(lead, grenzen)` met `grenzen = { radiusMaxKm, minM2BuitenStraal }`.
- Toon alleen bij een echte hand-over (`isHandover(lead)`), en alleen wanneer de grens echt overschreden is.
- **Exacte teksten**: `Te ver, buiten je werkstraal (${radiusMaxKm} km)` · `Te klein, onder ${minM2BuitenStraal} m²` · neutrale fallback `Bot heeft dit gesprek overgedragen`.
- **Voorrang**: bij hand-over gaat de reden-tekst vóór op het bestaande "Binnen gratis radius"-onderschrift op de Adres-rij.
- **Rode/waarschuwing-stijl** (token `var(--rb-status-hot-ink, #FF3B30)` desktop; mobiel een rode regel).
- Defaults bij ontbrekende grenzen: werkstraal **50** km, min **200** m².
- `afstand_km` is enkele reis; `radius_max_km` is ook enkele-reis-km (vergelijking klopt).
- Geen DB-migratie, geen botwerk. Desktop én mobiel.
- Tests met `npx vitest run <pad>`; volledige build met `npm run build` (alleen centraal/aan het eind).
- Streep-vrije, accentvrije zichtbare tekst (huisstijl).

---

## File Structure

- `lib/dashboard/handover-reason.ts` (nieuw) — pure `handoverReason` + async `getWerkgebiedGrenzen` + types.
- `lib/dashboard/handover-reason.test.ts` (nieuw) — tests voor de pure helper.
- `components/dashboard/v2/dossier/dossier-data.ts` (wijzigen) — `tone?: 'warn'` op `InfoRow`.
- `components/dashboard/v2/dossier/InfoTab.tsx` (wijzigen) — rode sub-variant renderen.
- `components/dashboard/v2/dossier/InfoTab.module.css` (wijzigen) — `.rowSubWarn`.
- `components/dashboard/v2/dossier/dossier-mappers.ts` (wijzigen) — grenzen-param, `buildKlant`/`buildWerk` met reden.
- `app/dashboard/v2/leads/[lead_id]/page.tsx` (wijzigen) — grenzen ophalen + meegeven.
- `components/dashboard/mobile/dossier/dossier-mappers.ts` (wijzigen) — grenzen-param + reden-velden op `MobileDossierData`.
- `components/dashboard/mobile/dossier/DossInfo.tsx` (wijzigen) — rode reden-regels renderen.
- `components/dashboard/mobile/dossier/DossInfo.module.css` (wijzigen) — `.handoverWarn`.
- `app/dashboard/(app)/leads/[lead_id]/page.tsx` (wijzigen) — grenzen ophalen + meegeven.

---

## Task 1: Gedeelde helper `handoverReason` + `getWerkgebiedGrenzen`

**Files:**
- Create: `lib/dashboard/handover-reason.ts`
- Test: `lib/dashboard/handover-reason.test.ts`

**Interfaces:**
- Consumes: `isHandover` (`./lead-status-meta`), `getDashboardSupabase` (zelfde import als `lib/dashboard/lead-queries.ts` gebruikt).
- Produces:
  - `interface HandoverGrenzen { radiusMaxKm: number; minM2BuitenStraal: number }`
  - `interface HandoverReason { adresSub: string | null; oppervlakteSub: string | null }`
  - `handoverReason(lead, grenzen: HandoverGrenzen): HandoverReason`
  - `getWerkgebiedGrenzen(): Promise<HandoverGrenzen>`

- [ ] **Step 1: Schrijf de falende test**

Create `lib/dashboard/handover-reason.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { handoverReason } from './handover-reason'

const grenzen = { radiusMaxKm: 50, minM2BuitenStraal: 200 }

describe('handoverReason', () => {
  it('geeft lege regels bij een niet-hand-over-lead', () => {
    expect(handoverReason({ eigenaar_overgenomen: false, status: 'nieuw', afstand_km: 80, m2: 50 }, grenzen))
      .toEqual({ adresSub: null, oppervlakteSub: null })
  })
  it('te ver + te klein: beide regels', () => {
    const r = handoverReason({ eigenaar_overgenomen: true, afstand_km: 80, m2: 50 }, grenzen)
    expect(r.adresSub).toBe('Te ver, buiten je werkstraal (50 km)')
    expect(r.oppervlakteSub).toBe('Te klein, onder 200 m²')
  })
  it('alleen te ver: adres gevuld, oppervlakte null', () => {
    const r = handoverReason({ eigenaar_overgenomen: true, afstand_km: 80, m2: 500 }, grenzen)
    expect(r.adresSub).toBe('Te ver, buiten je werkstraal (50 km)')
    expect(r.oppervlakteSub).toBeNull()
  })
  it('alleen te klein: oppervlakte gevuld, adres null', () => {
    const r = handoverReason({ eigenaar_overgenomen: true, afstand_km: 10, m2: 50 }, grenzen)
    expect(r.adresSub).toBeNull()
    expect(r.oppervlakteSub).toBe('Te klein, onder 200 m²')
  })
  it('hand-over zonder overschrijding: neutrale fallback', () => {
    const r = handoverReason({ status: 'handoff', afstand_km: 10, m2: 500 }, grenzen)
    expect(r.adresSub).toBe('Bot heeft dit gesprek overgedragen')
    expect(r.oppervlakteSub).toBeNull()
  })
  it('hand-over met ontbrekende afstand/m2: neutrale fallback', () => {
    const r = handoverReason({ eigenaar_overgenomen: true, afstand_km: null, m2: null }, grenzen)
    expect(r.adresSub).toBe('Bot heeft dit gesprek overgedragen')
    expect(r.oppervlakteSub).toBeNull()
  })
})
```

- [ ] **Step 2: Run test, verwacht falen**

Run: `cd /Users/christiaantromp/.claude/jobs/70431847/tmp/handover-reden-wt && npx vitest run lib/dashboard/handover-reason.test.ts`
Expected: FAIL ("Failed to resolve import './handover-reason'").

- [ ] **Step 3: Implementeer de helper**

Controleer eerst hoe `lead-queries.ts` de Supabase-client importeert:
Run: `grep -n "getDashboardSupabase" lib/dashboard/lead-queries.ts | head -1`
Neem die exacte import over in het nieuwe bestand.

Create `lib/dashboard/handover-reason.ts`:

```ts
import { isHandover } from './lead-status-meta'
import { getDashboardSupabase } from './supabase-server' // <-- vervang door de EXACTE import uit lead-queries.ts

export interface HandoverGrenzen {
  radiusMaxKm: number
  minM2BuitenStraal: number
}

export interface HandoverReason {
  /** Rode regel onder de Adres-rij (afstand), of null. */
  adresSub: string | null
  /** Rode regel onder de Oppervlakte-rij, of null. */
  oppervlakteSub: string | null
}

/**
 * Leidt de hand-over-reden af uit afstand + m2 tegen de werkgebied-grenzen.
 * Lege regels bij een niet-hand-over-lead. Toont alleen een specifieke reden
 * als de grens echt overschreden is; anders een neutrale fallback.
 */
export function handoverReason(
  lead: {
    eigenaar_overgenomen?: boolean | null
    status?: string | null
    afstand_km?: number | null
    m2?: number | null
  },
  grenzen: HandoverGrenzen,
): HandoverReason {
  if (!isHandover(lead)) return { adresSub: null, oppervlakteSub: null }
  const teVer = lead.afstand_km != null && lead.afstand_km > grenzen.radiusMaxKm
  const teKlein = lead.m2 != null && lead.m2 < grenzen.minM2BuitenStraal
  const oppervlakteSub = teKlein ? `Te klein, onder ${grenzen.minM2BuitenStraal} m²` : null
  let adresSub: string | null
  if (teVer) adresSub = `Te ver, buiten je werkstraal (${grenzen.radiusMaxKm} km)`
  else if (teKlein) adresSub = null // de reden staat al op de Oppervlakte-rij
  else adresSub = 'Bot heeft dit gesprek overgedragen' // neutrale fallback
  return { adresSub, oppervlakteSub }
}

const WERKSTRAAL_DEFAULT = 50
const MIN_M2_DEFAULT = 200

/** Haalt de werkgebied-grenzen uit tenant_settings (met defaults). */
export async function getWerkgebiedGrenzen(): Promise<HandoverGrenzen> {
  const supabase = await getDashboardSupabase()
  const { data } = await supabase
    .from('tenant_settings')
    .select('radius_max_km, radius_min_m2_buiten_straal')
    .limit(1)
    .maybeSingle()
  const row = data as { radius_max_km?: number | null; radius_min_m2_buiten_straal?: number | null } | null
  return {
    radiusMaxKm: row?.radius_max_km != null ? Number(row.radius_max_km) : WERKSTRAAL_DEFAULT,
    minM2BuitenStraal:
      row?.radius_min_m2_buiten_straal != null ? Number(row.radius_min_m2_buiten_straal) : MIN_M2_DEFAULT,
  }
}
```

- [ ] **Step 4: Run test, verwacht slagen**

Run: `npx vitest run lib/dashboard/handover-reason.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Verifieer typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -i "handover-reason" || echo "schoon"`
Expected: "schoon" (geen tsc-fouten; let op de getDashboardSupabase-import).

- [ ] **Step 6: Commit**

```bash
git add lib/dashboard/handover-reason.ts lib/dashboard/handover-reason.test.ts
git commit -m "feat(leads): handoverReason-helper + getWerkgebiedGrenzen"
```

---

## Task 2: Desktop (v2) — rode reden-regels in het dossier

**Files:**
- Modify: `components/dashboard/v2/dossier/dossier-data.ts` (`InfoRow`)
- Modify: `components/dashboard/v2/dossier/InfoTab.tsx:31-38` (sub-render)
- Modify: `components/dashboard/v2/dossier/InfoTab.module.css` (`.rowSubWarn`)
- Modify: `components/dashboard/v2/dossier/dossier-mappers.ts` (`buildKlant`, `buildWerk`, `mapLeadDetailToDossierData`)
- Modify: `app/dashboard/v2/leads/[lead_id]/page.tsx` (grenzen ophalen + meegeven)
- Test: `components/dashboard/v2/dossier/dossier-mappers.test.ts` (uitbreiden)

**Interfaces:**
- Consumes: `handoverReason`, `getWerkgebiedGrenzen`, `HandoverGrenzen` (`@/lib/dashboard/handover-reason`).
- Produces: `mapLeadDetailToDossierData(detail, pricing, now, grenzen)` (extra 4e param).

- [ ] **Step 1: Voeg `tone` toe aan `InfoRow`**

In `components/dashboard/v2/dossier/dossier-data.ts`, in de `InfoRow`-interface, na het `sub`-veld:

```ts
  /** Optionele sub-regel onder de waarde (bv. "Binnen gratis radius"). */
  sub?: string | null;
  /** Tint van de sub-regel: 'warn' = rood (bv. hand-over-reden). */
  tone?: "warn" | null;
```

- [ ] **Step 2: Render de rode sub-variant**

In `components/dashboard/v2/dossier/InfoTab.tsx`, vervang de sub-render (regel 38):

```tsx
              {row.sub ? (
                <div className={`${styles.rowSub} ${row.tone === "warn" ? styles.rowSubWarn : ""}`}>
                  {row.sub}
                </div>
              ) : null}
```

- [ ] **Step 3: Voeg de rode CSS-variant toe**

In `components/dashboard/v2/dossier/InfoTab.module.css`, na de `.rowSub`-regel (regel 72):

```css
.rowSubWarn {
  color: var(--rb-status-hot-ink, #FF3B30);
}
```

- [ ] **Step 4: Schrijf de falende mapper-test**

In `components/dashboard/v2/dossier/dossier-mappers.test.ts` (bestaat al, uitbreiden) een nieuw blok:

```ts
import { mapLeadDetailToDossierData } from './dossier-mappers'

function detailFor(leadOverrides: Record<string, unknown>) {
  return {
    lead: {
      lead_id: 'L1', naam: 'Test', plaats: 'Goes', telefoon: null, email: null, bedrijfsnaam: null,
      straat: 'Straat', huisnummer: '1', postcode: '4330', kanaal: 'wa', bron: 'whatsapp',
      hoofdcategorie: 'oprit_terras_terrein', sub_diensten: [], m2: 50, afstand_km: 80, lat: null, lng: null,
      status: 'info_compleet', eigenaar_overgenomen: true, dashboard_status: 'open', gesprek_fase: 'info_verzamelen',
      pending_eigenaar_review: null, aangemaakt: '2026-06-01T10:00:00Z', offerte_geldigheid_dagen: 14,
      ...leadOverrides,
    },
    offertes: [], prijsregels: [], fotos: [], berichten: [], notes: [], statusHistory: [],
  } as never
}

describe('dossier hand-over-reden', () => {
  const grenzen = { radiusMaxKm: 50, minM2BuitenStraal: 200 }
  it('toont rode te-ver + te-klein regels bij een hand-over-lead', () => {
    const d = mapLeadDetailToDossierData(detailFor({}), undefined, undefined, grenzen)
    const adres = d.klant.find((r) => r.label === 'Adres')
    const opp = d.werk.find((r) => r.label === 'Oppervlakte')
    expect(adres?.sub).toBe('Te ver, buiten je werkstraal (50 km)')
    expect(adres?.tone).toBe('warn')
    expect(opp?.sub).toBe('Te klein, onder 200 m²')
    expect(opp?.tone).toBe('warn')
  })
  it('laat een gewone lead ongemoeid (geen reden-tone)', () => {
    const d = mapLeadDetailToDossierData(detailFor({ eigenaar_overgenomen: false, afstand_km: 10 }), undefined, undefined, grenzen)
    const adres = d.klant.find((r) => r.label === 'Adres')
    expect(adres?.tone).toBeFalsy()
  })
})
```

- [ ] **Step 5: Run, verwacht falen**

Run: `npx vitest run components/dashboard/v2/dossier/dossier-mappers.test.ts`
Expected: FAIL (mapLeadDetailToDossierData accepteert nog geen 4e param / sub niet gezet).

- [ ] **Step 6: Implementeer de mapper-wijziging**

In `components/dashboard/v2/dossier/dossier-mappers.ts`:

Voeg toe aan de imports:
```ts
import { handoverReason, type HandoverGrenzen, type HandoverReason } from "@/lib/dashboard/handover-reason";
```

Wijzig `buildKlant` zodat het de reden meekrijgt en de Adres-rij-sub kiest:
```ts
function buildKlant(l: DetailLead, reason: HandoverReason): InfoRow[] {
```
en vervang het `sub`-veld op de Adres-rij door:
```ts
    sub: reason.adresSub ?? (l.afstand_km != null && l.afstand_km <= 25 ? "Binnen gratis radius" : null),
    tone: reason.adresSub ? "warn" : null,
```

Wijzig `buildWerk` zodat de Oppervlakte-rij de reden krijgt:
```ts
function buildWerk(l: DetailLead, reason: HandoverReason): InfoRow[] {
```
en vervang de Oppervlakte-push door:
```ts
  if (l.m2 != null) {
    rows.push({
      label: "Oppervlakte",
      waarde: `${l.m2} m²`,
      sub: reason.oppervlakteSub,
      tone: reason.oppervlakteSub ? "warn" : null,
    });
  }
```

Wijzig de signatuur van `mapLeadDetailToDossierData` (voeg 4e param toe):
```ts
export function mapLeadDetailToDossierData(
  detail: LeadDetail,
  pricing: ManualOffertePricing = FALLBACK_PRICING,
  now: number = Date.now(),
  grenzen: HandoverGrenzen = { radiusMaxKm: 50, minM2BuitenStraal: 200 },
): DossierData {
```
Bereken bovenin de functie (na `const l = detail.lead;`):
```ts
  const reason = handoverReason(l, grenzen);
```
En geef `reason` mee in de `return`-aanroepen: `buildKlant(l)` → `buildKlant(l, reason)` en `buildWerk(l)` → `buildWerk(l, reason)`.

- [ ] **Step 7: Run, verwacht slagen**

Run: `npx vitest run components/dashboard/v2/dossier/dossier-mappers.test.ts`
Expected: PASS.

- [ ] **Step 8: Voeg de grenzen-ophaling toe aan de v2-pagina**

In `app/dashboard/v2/leads/[lead_id]/page.tsx`:
- Import: `import { getWerkgebiedGrenzen } from "@/lib/dashboard/handover-reason";`
- Voeg `getWerkgebiedGrenzen()` toe aan de `Promise.all` (regel 41-46) en de destructuring:
```ts
  const [detail, pricing, allTags, leadTags, grenzen] = await Promise.all([
    getLeadDetail(lead_id),
    getManualOffertePricing(),
    getAllTags(),
    getTagsForLead(lead_id),
    getWerkgebiedGrenzen(),
  ]);
```
- Geef `grenzen` mee aan de mapper (regel 52):
```ts
  const dossier = mapLeadDetailToDossierData(detail, pricing, undefined, grenzen);
```

- [ ] **Step 9: Verifieer build + tests**

Run: `npm run build && npx vitest run components/dashboard/v2/dossier/`
Expected: build slaagt, tests PASS.

- [ ] **Step 10: Commit**

```bash
git add components/dashboard/v2/dossier/ app/dashboard/v2/leads/
git commit -m "feat(leads): rode hand-over-reden in v2-dossier (te ver / te klein)"
```

---

## Task 3: Mobiel — rode reden-regels in het dossier

**Files:**
- Modify: `components/dashboard/mobile/dossier/dossier-mappers.ts` (`mapLeadDetailToDossier`, `MobileDossierData`)
- Modify: `components/dashboard/mobile/dossier/DossInfo.tsx` (rode regels renderen)
- Modify: `components/dashboard/mobile/dossier/DossInfo.module.css` (`.handoverWarn`)
- Modify: `app/dashboard/(app)/leads/[lead_id]/page.tsx` (grenzen ophalen + meegeven)
- Test: `components/dashboard/mobile/dossier/dossier-mappers.test.ts` (nieuw of uitbreiden)

**Interfaces:**
- Consumes: `handoverReason`, `getWerkgebiedGrenzen`, `HandoverGrenzen` (`@/lib/dashboard/handover-reason`).
- Produces: `mapLeadDetailToDossier(detail, now, grenzen)` (extra 3e param); `MobileDossierData.handoverReden: { adresSub: string | null; oppervlakteSub: string | null }`.

- [ ] **Step 1: Schrijf de falende mapper-test**

In `components/dashboard/mobile/dossier/dossier-mappers.test.ts` (maak aan als die niet bestaat):

```ts
import { describe, it, expect } from 'vitest'
import { mapLeadDetailToDossier } from './dossier-mappers'

function detailFor(leadOverrides: Record<string, unknown>) {
  return {
    lead: {
      lead_id: 'L1', naam: 'Test', plaats: 'Goes', telefoon: null, email: null, bedrijfsnaam: null,
      straat: 'Straat', huisnummer: '1', postcode: '4330', kanaal: 'wa', hoofdcategorie: 'oprit_terras_terrein',
      sub_diensten: [], m2: 50, afstand_km: 80, lat: null, lng: null, totaal_prijs: null,
      status: 'info_compleet', eigenaar_overgenomen: true, dashboard_status: 'open', gesprek_fase: 'info_verzamelen',
      aangemaakt: '2026-06-01T10:00:00Z', offerte_geldigheid_dagen: 14,
      ...leadOverrides,
    },
    offertes: [], prijsregels: [], fotos: [], berichten: [], notes: [], statusHistory: [],
  } as never
}

describe('mobiel dossier hand-over-reden', () => {
  const grenzen = { radiusMaxKm: 50, minM2BuitenStraal: 200 }
  it('zet de reden-teksten bij een hand-over-lead', () => {
    const d = mapLeadDetailToDossier(detailFor({}), undefined, grenzen)
    expect(d.handoverReden.adresSub).toBe('Te ver, buiten je werkstraal (50 km)')
    expect(d.handoverReden.oppervlakteSub).toBe('Te klein, onder 200 m²')
  })
  it('laat een gewone lead leeg', () => {
    const d = mapLeadDetailToDossier(detailFor({ eigenaar_overgenomen: false, afstand_km: 10 }), undefined, grenzen)
    expect(d.handoverReden.adresSub).toBeNull()
    expect(d.handoverReden.oppervlakteSub).toBeNull()
  })
})
```

- [ ] **Step 2: Run, verwacht falen**

Run: `npx vitest run components/dashboard/mobile/dossier/dossier-mappers.test.ts`
Expected: FAIL (3e param + `handoverReden` bestaan nog niet).

- [ ] **Step 3: Implementeer de mobiele mapper-wijziging**

In `components/dashboard/mobile/dossier/dossier-mappers.ts`:
- Import toevoegen: `import { handoverReason, type HandoverGrenzen } from '@/lib/dashboard/handover-reason'`
- Voeg aan het `MobileDossierData`-type toe (na het `contact`-veld):
```ts
  /** Hand-over-reden-regels (rood), leeg als geen hand-over. */
  handoverReden: { adresSub: string | null; oppervlakteSub: string | null }
```
- Wijzig de signatuur:
```ts
export function mapLeadDetailToDossier(
  detail: LeadDetail,
  now: number = Date.now(),
  grenzen: HandoverGrenzen = { radiusMaxKm: 50, minM2BuitenStraal: 200 },
): MobileDossierData {
```
- Bereken na `const handover = isHandover(l)`:
```ts
  const reden = handoverReason(l, grenzen)
```
- Voeg in het `return`-object het veld toe (naast `contact`):
```ts
    handoverReden: { adresSub: reden.adresSub, oppervlakteSub: reden.oppervlakteSub },
```

- [ ] **Step 4: Run, verwacht slagen**

Run: `npx vitest run components/dashboard/mobile/dossier/dossier-mappers.test.ts`
Expected: PASS.

- [ ] **Step 5: Render de rode regels in `DossInfo.tsx`**

In `components/dashboard/mobile/dossier/DossInfo.tsx`: het component krijgt de dossier-data binnen (zoek waar `contact`, `dienst`, `lead` uit de props komen; voeg `handoverReden` toe aan die destructuring).

Voeg onder de Adres-rij in de Contact-kaart (na het `</DossRow>`-blok van het adres, binnen de card) toe:
```tsx
          {handoverReden.adresSub ? (
            <div className={styles.handoverWarn}>{handoverReden.adresSub}</div>
          ) : null}
```
Voeg in de Dienst-kaart, na de `pillRow`-div (na de m²-pill), toe:
```tsx
          {handoverReden.oppervlakteSub ? (
            <div className={styles.handoverWarn}>{handoverReden.oppervlakteSub}</div>
          ) : null}
```

- [ ] **Step 6: Voeg de rode CSS toe**

In `components/dashboard/mobile/dossier/DossInfo.module.css`:
```css
.handoverWarn {
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 700;
  color: var(--rb-status-hot-ink, #FF3B30);
}
```

- [ ] **Step 7: Voeg de grenzen-ophaling toe aan de mobiele pagina**

In `app/dashboard/(app)/leads/[lead_id]/page.tsx`:
- Import: `import { getWerkgebiedGrenzen } from '@/lib/dashboard/handover-reason'`
- Voeg `getWerkgebiedGrenzen()` toe aan de `Promise.all` (regel 20-25) + destructuring:
```ts
  const [detail, pricing, allTags, leadTags, grenzen] = await Promise.all([
    getLeadDetail(lead_id),
    getManualOffertePricing(),
    getAllTags(),
    getTagsForLead(lead_id),
    getWerkgebiedGrenzen(),
  ])
```
- Geef `grenzen` mee aan de mapper (regel 44):
```ts
          data={mapLeadDetailToDossier(detail, undefined, grenzen)}
```

- [ ] **Step 8: Verifieer build + tests**

Run: `npm run build && npx vitest run components/dashboard/mobile/dossier/`
Expected: build slaagt, tests PASS.

- [ ] **Step 9: Commit**

```bash
git add components/dashboard/mobile/dossier/ app/dashboard/(app)/leads/
git commit -m "feat(leads): rode hand-over-reden in mobiel dossier (te ver / te klein)"
```

---

## Task 4: Handmatige verificatie met een test-lead

**Files:** geen (verificatie). Raakt de productie-DB `ntew`; alleen met toestemming, omkeerbaar.

- [ ] **Step 1: Zet één test-lead op hand-over met een afstand boven de straal + m² onder het minimum**

```bash
ENV="/Users/christiaantromp/Desktop/Frontlix website/.env.local"
REF=$(grep '^NEXT_PUBLIC_SUPABASE_URL_DASHBOARD=' "$ENV" | head -1 | cut -d= -f2- | sed -E 's#https?://([^.]+)\..*#\1#' | tr -d '[:space:]')
TOKEN=$(grep '^SUPABASE_ACCESS_TOKEN=' "$ENV" | head -1 | cut -d= -f2- | tr -d '[:space:]')
jq -n --arg q "update leads set eigenaar_overgenomen=true, afstand_km=120, m2=40 where lead_id=(select lead_id from leads where coalesce(dashboard_archived,false)=false order by lead_id desc limit 1) returning lead_id, naam, afstand_km, m2;" '{query:$q}' | curl -s -X POST "https://api.supabase.com/v1/projects/$REF/database/query" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d @- | jq .
```

- [ ] **Step 2: Controleer in de app (na deploy of lokaal `npm run dev`)**

Open die lead op desktop + telefoon: onder Adres staat rood "Te ver, buiten je werkstraal (X km)" en onder Oppervlakte rood "Te klein, onder Y m²".

- [ ] **Step 3: Zet de test-lead terug**

```bash
jq -n --arg q "update leads set eigenaar_overgenomen=false where eigenaar_overgenomen=true returning lead_id;" '{query:$q}' | curl -s -X POST "https://api.supabase.com/v1/projects/$REF/database/query" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d @- | jq .
```
(De `afstand_km`/`m2` mogen blijven staan of ook teruggezet worden; dat is testdata.)

---

## Oplevering / deploy

- Geen database-migratie.
- Lokaal `npx vitest run` + `npm run build` groen.
- Deploy op de live branch `feat/dashboard-rebrand-v2` via de vaste route (ff-merge vanuit `feat/handover-reden`, dan VPS `git pull` + `rm -rf .next` + `npm run build` + `pm2 restart frontlix`), met ff-check vlak vóór de push (live branch beweegt) en geen overlappende build.

---

## Self-Review

Tegen de spec (`docs/superpowers/specs/2026-06-25-handover-reden-design.md`):

- **Gedeelde helper `handoverReason` (spec §1)** → Task 1. Inclusief `getWerkgebiedGrenzen` (spec §2).
- **Grenzen ophalen in beide pagina's (spec §2)** → Task 2 stap 8 (v2), Task 3 stap 7 (mobiel).
- **Desktop weergave: rode sub onder Adres + Oppervlakte, voorrang op "Binnen gratis radius" (spec §3)** → Task 2 (InfoRow.tone, InfoTab render + CSS, buildKlant/buildWerk).
- **Mobiel weergave: rode regels (spec §3)** → Task 3 (handoverReden op MobileDossierData, DossInfo render + CSS).
- **Neutrale fallback + randgevallen (spec §randgevallen)** → ingebakken in `handoverReason` (Task 1), gedekt door de tests.
- **Verificatie met test-lead (spec testplan)** → Task 4.
- **Placeholder-scan:** de enige open verwijzing is de exacte `getDashboardSupabase`-import (Task 1 stap 3), met een concrete grep-instructie om die te kopiëren uit `lead-queries.ts`. De DossInfo-prop-destructuring (Task 3 stap 5) verwijst naar het lezen van de bestaande prop-structuur; concreet beschreven.
- **Type-consistentie:** `HandoverGrenzen { radiusMaxKm, minM2BuitenStraal }`, `HandoverReason { adresSub, oppervlakteSub }`, `handoverReason(lead, grenzen)`, `getWerkgebiedGrenzen()`, `mapLeadDetailToDossierData(detail, pricing, now, grenzen)`, `mapLeadDetailToDossier(detail, now, grenzen)`, `MobileDossierData.handoverReden` — overal dezelfde namen/signaturen. `InfoRow.tone: "warn" | null` consistent in data-type, render en mappers.
