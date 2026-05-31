# Spec — Mobiele offerte-editor (Optie A) in het lead-dossier

_Datum: 2026-05-31 · Branch: `feat/mobile-leads-inbox` · Status: goedgekeurd, klaar voor implementatie_

## 1. Doel

Vervang de read-only offerte-tab (`DossOfferte`, met dode "Aanpassen"-knop) door een
**volledig bewerkbare offerte-editor** die 1:1 het high-fidelity handoff-ontwerp volgt
(`/Users/christiaantromp/Downloads/design_handoff_mobile_offerte_editor/source/MobileOfferteEdit.jsx`),
voorgevuld met de **echte lead-data** (klant, m², bestaande `prijsregels`) en de
**echte Schoon Straatje-catalogus/tarieven**.

## 2. Scope (deze ronde)

- **Wel:** volledige UI op **lokale state**, gevoed met echte lead-data + echte SS-catalogus.
- **Niet:** opslaan naar DB, versturen (PDF/WhatsApp/mail) — dat blijft de bestaande desktop-flow.
- **Consistent** met de rest van het mobiele dossier: lezen gewired, schrijven blijft desktop.
- Mobiel-only; desktop ongemoeid. Geen inline-styles; CSS Modules + tokens (`color-mix`, `--tone`).

## 3. Bestandsstructuur — `components/dashboard/mobile/dossier/offerte/`

| Bestand | Verantwoordelijkheid |
|---|---|
| `offerte-edit-model.ts` | Types, **SS-catalogus**, units, BTW-opties, `offerteTotals()`, geld/datum-helpers (puur) |
| `offerte-edit-model.test.ts` | vitest: totals-formule + catalogus-tarieven == `FALLBACK_PRICING` |
| `offerte-edit-seed.ts` | `seedOfferteState(...)` → begin-state uit echte data; `matchCatalogKey()` |
| `offerte-edit-seed.test.ts` | vitest: prijsregels→regels, korstmos-seed, korting-prefill, custom-fallback |
| `OfferteEditAtoms.tsx` + `.module.css` | `OStepper`, `ONumField`, `OSwitch`, `OSectionLabel`, `OClientNote`, `OAddrInput`, `OUnitPicker`, `OSegmented`, `OFullSheet` |
| `DossOfferteEdit.tsx` + `.module.css` | Hoofd-editor (alle secties + sleep-herorden + overlays-aansturing) |
| `OffertePdfPreview.tsx` + `.module.css` | PDF-preview overlay (Schoon Straatje-briefhoofd) |
| `OfferteHistorie.tsx` + `.module.css` | Versie-historie overlay (echte versies, knoppen visueel) |

Gewijzigde bestanden:
- `components/dashboard/mobile/dossier/dossier-mappers.ts` — extra editor-velden in `offerte`.
- `components/dashboard/mobile/dossier/MobileLeadDossier.tsx` — render editor + actiebalk-wiring.
- `components/dashboard/mobile/dossier/DossierActionBar.tsx` — optionele `primaryLabel`.

## 4. Contracten (exact — parallelle agents moeten hierop matchen)

### 4.1 `offerte-edit-model.ts`

```ts
export type OfferteUnit = 'm²' | 'zak' | 'rol' | 'km' | 'minuut' | 'stuk' | 'm' | 'uur' | 'post'

export type CatalogItem = {
  key: string
  label: string
  unit: OfferteUnit
  rate: number
  area: boolean          // true => hoeveelheid = m2; false => hoeveelheid = qty
  defaultQty?: number    // voor niet-area regels
}

export type OfferteLine = {
  id: string             // stabiele id (bv. `l${n}`)
  key: string            // catalogus-key of 'custom'
  label: string
  unit: OfferteUnit
  rate: number
  area: boolean
  m2: number
  qty: number
  on: boolean            // uit => telt niet mee, kaart 50% opacity
  note: string           // klant-zichtbare notitie
  custom: boolean        // vrije regel
}

export type ToeslagMode = 'pct' | 'bedrag'
export type Toeslag = { id: string; key: string; label: string; mode: ToeslagMode; value: number; on: boolean }

export type BtwKey = '21' | '9' | '0' | 'verlegd'

export type OfferteTotals = {
  sub0: number
  toeslagRegels: { label: string; bedrag: number }[]
  korting: number
  subNet: number
  btw: number
  totaal: number
}

export const SS_UNITS: OfferteUnit[]            // voor de vrije-regel UnitPicker
export const SS_CATALOG: CatalogItem[]          // zie §5 — afgeleid uit FALLBACK_PRICING
export const SS_TOESLAG_PRESETS: Omit<Toeslag,'id'|'on'>[]  // [korstmos 10% pct]
export const BTW_OPTIONS: { key: BtwKey; kort: string }[]   // 21% / 9% / 0% / Verlegd

export function btwRate(k: BtwKey): number       // verlegd|0 => 0; anders n/100
export function btwLabel(k: BtwKey): string       // 'BTW 21%' | 'BTW verlegd'
export function lineQty(l: OfferteLine): number   // l.area ? l.m2 : l.qty
export function lineAmount(l: OfferteLine): number // l.on ? lineQty*rate : 0
export function offerteTotals(lines, toeslagen, kortingPct, btwKey): OfferteTotals

// geld/datum
export function eur(n: number): string            // '€1.234,56' (nl-NL, 2 dec)
export function eur0(n: number): string           // '€1.234' (afgerond)
export function addDays(base: Date, d: number): Date
export function fmtDatum(d: Date): string          // '14 jun 2026'
export function isoDate(d: Date): string           // '2026-06-14'
```

**Totaal-formule (exact, uit de handoff):**
```
sub0      = Σ lineAmount(l) over on-regels
toeslagen = elke actieve toeslag: mode==='pct' ? sub0 * value/100 : value
subNa     = sub0 + Σ toeslagen
korting   = subNa * (kortingPct/100)
subNet    = subNa - korting
btw       = subNet * btwRate(btwKey)
totaal    = subNet + btw
```

### 4.2 `offerte-edit-seed.ts`

```ts
export type EditorKlant = { naam: string; bedrijf: string; straat: string; pcplaats: string }

export type SeedRegel = { omschrijving: string; aantal: number | null; eenheid: string | null; stukprijs: number }

export type OfferteSeedInput = {
  klant: EditorKlant
  m2: number
  voornaam: string
  korstmos: boolean
  kortingPct: number
  kortingNote: string
  seedRegels: SeedRegel[]
}

export type OfferteSeed = {
  lines: OfferteLine[]
  toeslagen: Toeslag[]
  kortingPct: number
  kortingNote: string
  btwKey: BtwKey
  dagen: number
  bericht: string
}

export function matchCatalogKey(omschrijving: string): string  // catalogus-key of 'custom'
export function seedOfferteState(input: OfferteSeedInput): OfferteSeed
```

**Seed-regels:**
- `seedRegels.length > 0` → map elke regel naar een `OfferteLine`:
  - `key = matchCatalogKey(omschrijving)`; bij match: `label` = catalogus-label, `unit/area` uit catalogus,
    `rate = stukprijs` (de werkelijk geoffreerde prijs), `m2/qty = aantal ?? 0` (m2 als area).
  - geen match → `custom: true`, `label = omschrijving`, `unit = (eenheid as OfferteUnit) || 'post'`,
    `rate = stukprijs`, `area = eenheid === 'm²'`.
- `seedRegels.length === 0` → lege `lines` (gebruiker voegt toe via picker).
- **Korstmos-toeslag** geseed `on = korstmos && seedRegels.length === 0`
  (bestaande prijsregels hebben de 10% mogelijk al in `stukprijs` verwerkt → geen dubbeltelling;
  bij een verse offerte uit de catalogus wél automatisch 10%). Preset blijft altijd toevoegbaar.
- `btwKey = '21'`, `dagen = 14`.
- `bericht` = Schoon Straatje-aanhef met `voornaam` (zie §6).
- `kortingPct/kortingNote` uit input (lead-velden), anders 0/''.

### 4.3 Atoms — props (`OfferteEditAtoms.tsx`)

```ts
OStepper({ value:number, onChange:(n:number)=>void, step?=1, min?=0, max?=Infinity, suffix?='', size?:'md'|'lg', accent?:string })
ONumField({ value:number, onChange:(n:number)=>void, prefix?='', dec?=false, align?:'left'|'right' })
OSwitch({ on:boolean, onChange:(b:boolean)=>void, accent?:string, label?:string })   // accent default groen; var(--color-primary)/var(--color-warning)
OSectionLabel({ children, right? })
OClientNote({ value:string, onChange:(s:string)=>void, placeholder?:string })        // amber blok 'Zichtbaar voor klant'
OAddrInput({ value:string, onChange:(s:string)=>void, placeholder?:string })
OUnitPicker({ value:string, onChange:(s:string)=>void })                              // <select> SS_UNITS
OSegmented({ value:string, options:{key:string;kort:string}[], onChange:(k:string)=>void })  // BTW
OFullSheet({ open:boolean, onClose:()=>void, title:string, children, foot? })         // full-screen, slide-up
```

- `accent` waarden zijn CSS-kleur-vars (`var(--color-primary)`, `var(--color-warning)`, `var(--color-success)`),
  doorgegeven via `style={{'--tone': accent}}`; CSS gebruikt `color-mix(in srgb, var(--tone) X%, transparent)`.
- Tikbare getallen (OStepper-getal, ONumField): tik → input; Enter/blur commit; **komma als decimaalteken**.

### 4.4 `DossOfferteEdit.tsx` — props

```ts
type DossOfferteEditProps = {
  offerte: MobileDossierData['offerte']   // bevat de editor-velden uit §4.5
  pdfApiRef?: React.MutableRefObject<{ openPdf: () => void } | null>
}
```
- Bouwt begin-state via `seedOfferteState(...)` (uit `offerte`-velden) in lazy `useState`.
- Registreert `{ openPdf }` in `pdfApiRef` (voor de actiebalk "Controleer & stuur").
- Secties (top→bottom): Factuuradres · Persoonlijk bericht · Snel instellen · Regels (+sleep) ·
  Toeslagen · Korting · BTW · Totalen · Geldigheid · Acties (Bekijk PDF / Historie).
- Overlays: `<OffertePdfPreview/>` + `<OfferteHistorie/>`.

### 4.5 `dossier-mappers.ts` — uitbreiding van `MobileDossierData.offerte`

Behoud bestaande velden; **voeg toe**:
```ts
offerte: {
  status, regels, subtotaal, btw, totaal,          // bestaand (blijft)
  klant: EditorKlant,                               // {naam,bedrijf,straat,pcplaats} uit lead
  m2: number,                                       // lead.m2 ?? 0
  voornaam: string,                                 // (lead.naam||'klant').split(' ')[0]
  korstmos: boolean,                                // lead.korstmos === 'ja'
  kortingPct: number,                               // lead.korting_percentage ?? 0
  kortingNote: string,                              // lead.korting_omschrijving ?? ''
  seedRegels: SeedRegel[],                          // uit detail.prijsregels (omschrijving/aantal/eenheid/stukprijs)
  versies: { versie:number; totaalIncl:number; datum:string; verstuurd:boolean }[],  // uit detail.offertes
}
```
- `klant`: `naam=lead.naam`, `bedrijf=lead.bedrijfsnaam ?? ''`, `straat=[straat,huisnummer].join(' ')`,
  `pcplaats=[postcode,plaats].join(' ')`.
- `versies`: map `detail.offertes` → `{ versie, totaalIncl: o.totaal_incl, datum: fmt(o.aangemaakt_op), verstuurd: !o.is_concept }`.

### 4.6 `MobileLeadDossier.tsx` + `DossierActionBar.tsx`

- `MobileLeadDossier`: `const pdfApiRef = useRef(null)`. Tab `offerte` → `<DossOfferteEdit offerte={data.offerte} pdfApiRef={pdfApiRef} />`.
- `DossierActionBar`: nieuwe optionele prop `primaryLabel?: string` (default `'Stuur offerte'`).
- Op de Offerte-tab: `primaryLabel="Controleer & stuur"` en `onSendOfferte={() => pdfApiRef.current?.openPdf()}`.
  Op andere tabs: gedrag ongewijzigd (`onSendOfferte` opent de offerte-tab). Bel/WhatsApp ongewijzigd.

### 4.7 `OffertePdfPreview` — SS-template data-vorm

De preview spiegelt `lib/dashboard/offerte/pdf-template.ts`. `DossOfferteEdit` levert deze data
(afgeleid van de live editor-state):

```ts
type OffertePdfData = {
  nr: string                 // offertenummer (bv. '2026-<leadcijfers>')
  datum: string              // dd-mm-jjjj (vandaag)
  geldigTot: string          // dd-mm-jjjj (vandaag + dagen)
  dienst: string             // korte dienst-omschrijving (bv. hoofdcategorie of 'Reiniging & onderhoud')
  m2?: number                // optioneel, voor de 'Oppervlakte'-regel
  klant: { naam: string; bedrijf?: string; straat: string; pcplaats: string; email?: string; telefoon?: string }
  regels: { omschrijving: string; aantalLabel: string; stukprijs: number; totaal: number }[]  // 4-koloms Specificatie
  subtotaal: number          // sub0
  toeslagen: { label: string; bedrag: number }[]   // amber rijen ná subtotaal
  kortingPct: number
  kortingBedrag: number
  kortingNote?: string
  totaalExcl: number         // subNet vóór BTW
  btwPct: number             // 21 | 9 | 0
  btwBedrag: number
  totaalIncl: number         // totaal
  toelichting?: string       // = het persoonlijk bericht
}
```

- Tabel-kolommen exact als de template: **Omschrijving · Aantal · Stukprijs · Totaal** (`aantalLabel`
  = bv. "80 m²" of "2 rol"; lege string bij geen aantal).
- Totalen-volgorde: Subtotaal diensten → (toeslag-rijen, amber) → Actiekorting (groen, negatief) →
  Totaal excl. BTW → BTW (n%) → **Totaal incl. BTW** (navy grand-row).
- Geldformaat van de template: `€ 1234,56` (euro-spatie, komma, 2 dec). Datum dd-mm-jjjj.
- Branding navy `#002D63` / `#003F8A`, goud `#F5C518`, crème `#FAFAF0` — vaste print-kleuren.

## 5. Echte Schoon Straatje-catalogus (uit `FALLBACK_PRICING`)

| key | label | unit | rate | area |
|---|---|---|---|---|
| `reiniging` | Reiniging oppervlak | m² | 3,95 | ✓ |
| `invegen_normaal` | Invegen normaal voegzand (arbeid) | m² | 0,90 | ✓ |
| `invegen_onkruid` | Invegen onkruidwerend (arbeid) | m² | 1,60 | ✓ |
| `voegzand_normaal` | Voegzand normaal (15 kg/zak) | zak | 2,90 | — (qty 1) |
| `voegzand_onkruid` | Voegzand onkruidwerend (15 kg/zak) | zak | 20,90 | — (qty 1) |
| `beschermlaag` | Beschermlaag aanbrengen | m² | 1,60 | ✓ |
| `preventieve_onkruid` | Preventieve onkruidbeheersing | m² | 1,10 | ✓ |
| `onderhoud_4w` | Onderhoud (elke 4 weken) | m² | 1,25 | ✓ |
| `onderhoud_8w` | Onderhoud (elke 8 weken) | m² | 1,75 | ✓ |
| `onderhoud_12w` | Onderhoud (elke 12 weken) | m² | 2,90 | ✓ |
| `onderhoud_16w` | Onderhoud (elke 16 weken) | m² | 4,50 | ✓ |
| `planten` | Planten afschermen (afdekfolie) | rol | 8,50 | — (qty 1) |
| `reiskosten` | Reiskosten | km | 0,23 | — (qty 1) |

- Alle `rate`-waarden **moeten** uit `FALLBACK_PRICING` komen (import), niet los hardcoden — een
  test borgt gelijkheid. Onderhoud-plannen mappen op `plan_4w/8w/12w/16w_per_m2`.
- **Vrije regel** (`custom`) blijft beschikbaar voor meerwerk/extra arbeid (eenheid kiesbaar).
- **Géén** gevelreiniging, dakgoot, spoed- of weekendtoeslag (bestaan niet bij SS).
- Toeslag-presets: alleen **Korstmos-toeslag 10% (pct)**. "Eigen toeslag" via add (custom % of vast).
- BTW-control blijft (21/9/0/Verlegd) maar **default 21%**.

## 6. Standaard persoonlijk bericht (seed)

```
Beste {voornaam},

Bedankt voor je aanvraag. Hierbij onze offerte voor het reinigen van je oprit en terras.
Heb je vragen of wil je iets aanpassen? Bel of app ons gerust.

Met vriendelijke groet,
Schoon Straatje
```

## 7. Sub-keuzes (vastgelegd)

- **PDF-preview = de échte Schoon Straatje PDF-template** (niet het generieke mock-document uit de
  handoff). Spiegel `lib/dashboard/offerte/pdf-template.ts` (`renderOffertePDFHtml`): crème header
  `#FAFAF0` met "OFFERTE" navy `#002D63` + "Nr. …", gouden accentbalk `#F5C518`, twee meta-kaarten
  ("Offerte gegevens" / "Voor"), "Specificatie"-tabel met navy header (Omschrijving/Aantal/Stukprijs/
  Totaal), navy/goud totalenblok (Subtotaal → toeslagen → korting → excl. BTW → BTW → **Totaal incl.
  BTW** navy), optioneel Toelichting-blok (= het persoonlijk bericht), Voorwaarden + footer met
  bedrijfsnaam. **Papier-kleuren zijn thema-onafhankelijk** (letterlijke print-kleuren in de
  `.module.css`, gedocumenteerd). "Versturen via WhatsApp"-knop **visueel/uitgeschakeld** (versturen
  = desktop). Zie §4.7 voor de data-vorm.
- Historie: echte `offertes`-versies (read-only); "PDF"/"Dupliceer" visueel.
- Geldigheid default 14 dagen; snelknoppen 7/14/30/60.

## 8. Gotcha's

- **Datum:** gebruik echte `Date` (niet de hardcoded `2026-05-31` uit de mock). Hydration-veilig:
  init via `useState(() => Date.now())` / mount-guard, geen kale `new Date()` in render-pad dat SSR-mismatch geeft.
- **Slepen om te ordenen:** pointer-events porten; touch-action:none op de grip; evt. touch-tuning.
- **Korstmos dubbeltelling:** zie §4.2 (toeslag alleen auto-on bij verse offerte).
- **Komma-decimaal:** alle numerieke inputs accepteren komma; commit pareset met `.replace(',','.')`.

## 9. Bouwvolgorde (parallel via Workflow)

- **Fase A (parallel):** A1 = model+seed (+tests); A2 = atoms. (disjuncte bestanden, geen onderlinge import)
- **Fase B (parallel, na A):** B1 = `DossOfferteEdit` (+css); B2 = `OffertePdfPreview` (+css);
  B3 = `OfferteHistorie` (+css); B4 = `dossier-mappers` uitbreiding.
- **Fase C (sequentieel):** integratie (`MobileLeadDossier` + `DossierActionBar`) + verify
  (`tsc --noEmit`, `vitest run`, `lint`) + fix tot groen.
- **Fase D:** parallelle code-review (correctheid · handoff-fidelity · token/stijl-compliance) → fixes → re-verify.

## 10. Testen

- `offerte-edit-model.test.ts`: `offerteTotals` exacte bedragen (incl. toeslag/korting/btw/verlegd);
  `SS_CATALOG` rates == `FALLBACK_PRICING`.
- `offerte-edit-seed.test.ts`: prijsregels→lines mapping, `matchCatalogKey` cases, korstmos-seed-regel,
  korting-prefill, lege seed.
- `tsc --noEmit` clean; bestaande vitest-suite groen; `npm run lint` clean.
- Visuele check: ingelogde sessie van de user (dashboard auth-gated, niet headless te screenshotten).

## 11. Buiten scope

Opslaan/versturen, live `bot_config`-tarieven (we gebruiken fallback-constants), tenant_settings-branding
in de preview, marge-zicht, eenheid wisselen op catalogus-regels.
