# Plan 7 — Statistieken-pagina (Design)

**Datum:** 2026-05-06
**Status:** ontwerp ter review
**Scope:** nieuwe statistieken-pagina op `/dashboard/statistieken` (placeholder route bestaat al). Read-only aggregaties op de bestaande `leads`/`berichten`/`lead_tags`-tabellen — geen schema-wijzigingen, geen bot-impact.

---

## Doel

Klanten van het lead-opvolgings-product willen op één plek hun operational metrics zien — hoeveel leads, hoeveel converteert, hoe snel reageer ik, wat is mijn gemiddelde offerte-waarde. Een dashboard-pagina die in één oogopslag de vragen beantwoordt die ondernemers wekelijks/maandelijks stellen.

---

## Metrics (8 stuks)

| Code | Metric | Type | Periode-afhankelijk |
|---|---|---|---|
| a | Aantal leads (total + this period) | KPI-card | ✓ |
| b | Conversie-rate (% met `akkoord_op` of `afspraak_geboekt_op`) | KPI-card | ✓ |
| c | Gemiddelde reactietijd (lead → eerste uitgaande bericht) | KPI-card | ✓ |
| d | Gemiddelde offerte-waarde (`AVG(totaal_prijs)`) | KPI-card | ✓ |
| e | Verdeling per dashboard-status | horizontale bar-chart | ✓ |
| f | Verdeling per hoofdcategorie | horizontale bar-chart | ✓ |
| g | Leads per dag (trend) | inline SVG line-chart | fixed 30 dagen |
| h | Top tags (top 10 meest toegekend) | lijst met counts | ✓ (filter op aangemaakt-datum) |

### Definitie van de metrics

- **Conversie**: een lead "converteert" als `akkoord_op IS NOT NULL OR afspraak_geboekt_op IS NOT NULL`. Conversie-rate = converted / total in de periode.
- **Reactietijd**: tijd tussen `leads.aangemaakt` en de `timestamp` van het eerste `berichten`-rij met `richting = 'uitgaand'` voor diezelfde lead. Leads zonder uitgaand bericht tellen niet mee in de berekening (zou de average vertekenen).
- **Verdeling per status (e)**: telling van leads per `dashboard_status`-waarde, inclusief `NULL` als "Geen status". Gefilterd op periode.
- **Verdeling per hoofdcategorie (f)**: telling per `leads.hoofdcategorie`. Categorieën die niet voorkomen in de periode worden niet getoond.
- **Trend (g)**: groepeer alle leads van laatste 30 dagen op `aangemaakt::date`, return een rij `{date, count}` per dag. Onafhankelijk van de globale periode-selector.
- **Top tags (h)**: COUNT van `lead_tags` JOIN `leads` waar `aangemaakt` binnen de periode valt. Top 10 met DESC count.

---

## Tijdvenster (period selector)

Globale dropdown bovenaan de pagina, defaults op **deze maand**:

- `deze-week` — vandaag minus weekdag (maandag als start)
- `deze-maand` — eerste dag van huidige maand
- `dit-kwartaal` — eerste dag van kwartaal
- `dit-jaar` — 1 januari huidig jaar
- `all-time` — geen periode-filter

Selector-keuze leeft in URL als `?period=deze-maand`. URL-state pattern uit Plan 6 (filters): `useSearchParams` + `router.replace`.

De trend-grafiek (g) gebruikt de selector **niet** — die staat altijd op laatste 30 dagen. Dat is de meest leesbare default voor een line-chart en past in de visuele rhythm van de pagina.

---

## Layout

```
┌──────────────────────────────────────────────────────┐
│  Statistieken                  [Deze maand  ▼ ]      │  ← header + period selector
├──────────────────────────────────────────────────────┤
│  KPI-cards-grid (4 kolommen op desktop, 2 op tablet, │
│  1 op mobiel)                                        │
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐            │
│  │ Leads │ │ Conv. │ │ ⌀ Off │ │ ⌀ Tijd│            │
│  │  142  │ │  18%  │ │ €2450 │ │ 4u12m │            │
│  └───────┘ └───────┘ └───────┘ └───────┘            │
├──────────────────────────────────────────────────────┤
│  Twee-koloms grid (1 op mobiel)                     │
│  Verdeling per status      Verdeling per cat.        │
│  ▓▓▓▓▓▓▓▓ Open      45%   ▓▓▓▓▓ Kunststof   30%     │
│  ▓▓▓▓▓ Opgevolgd    30%   ▓▓▓▓ Schilderwerk 25%     │
│  ▓▓▓ Afgehandeld    20%                             │
├──────────────────────────────────────────────────────┤
│  Twee-koloms grid                                    │
│  Leads per dag (30d)         Top tags                │
│   ╱╲    ╱╲                    hot lead       12      │
│  ╱  ╲__╱  ╲___                retour-klant    8      │
│                                spoed           5      │
└──────────────────────────────────────────────────────┘
```

KPI-card: groot getal, label eronder, subtiele change-indicator als we ooit "vergelijking met vorige periode" toevoegen (uit scope nu).

Verdelings-bar: simpel — een gevulde div met `width: ${pct}%` + label + count. Pure CSS, geen lib.

Trend-line: inline SVG met één `<path>` element. Berekend met `d3-shape`-stijl logica maar handmatig — gewoon mappen van datapunt naar `(x, y)` in de viewBox. ~30 regels code, geen dependency.

Top-tags-lijst: simpele `<ul>` met `<li>` per tag, naam + count gescheiden.

---

## Architectuur

### Data-flow

`/dashboard/statistieken/page.tsx` is een Server Component:

1. Leest `searchParams.period`, parsed naar `Period` type
2. Berekent `from`-datum o.b.v. period-keuze (now-functions in `lib/dashboard/period.ts`)
3. Roept parallel 8 queries aan via `Promise.all`
4. Geeft de resultaten door aan kleinere render-componenten

### Query-helpers (`lib/dashboard/stats-queries.ts`)

```typescript
export interface StatsPeriod {
  from: string | null  // ISO date; null = all-time
  to: string  // huidige tijdstip
}

export async function countLeads(period: StatsPeriod): Promise<number>
export async function countConverted(period: StatsPeriod): Promise<number>
export async function avgOfferteWaarde(period: StatsPeriod): Promise<number | null>
export async function avgReactietijdMs(period: StatsPeriod): Promise<number | null>
export async function statusVerdeling(period: StatsPeriod): Promise<Array<{status: string | null; count: number}>>
export async function categorieVerdeling(period: StatsPeriod): Promise<Array<{categorie: string; count: number}>>
export async function leadsPerDag(): Promise<Array<{date: string; count: number}>>  // fixed 30d
export async function topTags(period: StatsPeriod, limit?: number): Promise<Array<{naam: string; count: number}>>
```

Elke functie doet 1 query. Bij errors return een neutrale waarde (0, [], null) zodat de page niet crasht — zelfde patroon als `getLeadsList`.

### Period-helpers (`lib/dashboard/period.ts`)

```typescript
export type PeriodKey =
  | 'deze-week'
  | 'deze-maand'
  | 'dit-kwartaal'
  | 'dit-jaar'
  | 'all-time'

export function parsePeriod(searchParams: ...): PeriodKey  // default 'deze-maand'
export function periodToRange(key: PeriodKey, now?: Date): StatsPeriod
export function periodLabel(key: PeriodKey): string  // 'Deze maand', etc
```

TDD op `parsePeriod` + `periodToRange` — date-math wil je goed testen (wat is "begin van dit kwartaal" op 5 mei → 1 april).

### Components (`components/dashboard/stats/`)

- `PeriodSelector.tsx` (client) — dropdown die URL update, zelfde patroon als Plan 6 filter-bar
- `KpiCard.tsx` — gewone server component, label + waarde + optionele subtekst
- `DistributionBars.tsx` — server, mapt array naar bars met width %
- `TrendLineChart.tsx` — server, render een inline SVG met path uit datapunten
- `TopTagsList.tsx` — simpele lijst

Geen chart-library. Alle visualisatie is CSS + raw SVG.

---

## Edge cases

- **Geen leads in periode**: KPI-cards tonen `0`, percentages tonen `—`, charts tonen "Geen data in deze periode".
- **`avg`-functions met nul rijen**: Postgres geeft `null` terug, we tonen `—`.
- **Reactietijd met outlier (10 dagen)**: voor v1 nemen we de pure gemiddelde. Mediaan is robuuster maar duurder; later optimaliseren.
- **Trend-chart met 1 datapunt**: render een dot ipv lijn.
- **`hoofdcategorie` is `null`**: telt mee als categorie "Onbekend".
- **Top-tags met 0 tags ooit toegekend**: lijst toont "Nog geen tags toegekend".

---

## Niet-gescoped (YAGNI / later)

- **Vergelijking met vorige periode** ("+12% vs vorige maand") — uit scope.
- **Drill-down** vanaf een chart-balk naar gefilterde leads-lijst — kan later via een link naar `/leads?status=...`.
- **Export van stats als PDF/CSV** — uit scope.
- **Per-medewerker statistieken** — single-tenant + geen "owner per lead" velden, dus niet nu.
- **Realtime updates** — stats hoef je niet live te zien; refresh is genoeg.
- **Cumulatieve trends** (voortschrijdend gemiddelde) — uit scope.

---

## Risico's & mitigaties

| Risico | Mitigatie |
|---|---|
| 8 parallel queries belasten Supabase | `.limit()` waar relevant; queries zijn licht (count + avg). Acceptabel. |
| Reactietijd-query (join + min) is duurste | Dialect: COUNT(distinct lead_id) + AVG over een subquery. Behandelt wel n=1000+ leads in <100ms. |
| Tijdzone (UTC vs Europe/Amsterdam) bij "deze week" | `periodToRange` werkt met UTC-ISO-strings; queries vergelijken op `aangemaakt >= from`. Voor hoofdgebruik in Nederland verwaarloosbaar. Documenteren in code. |
| Inline-SVG trend-chart wordt onleesbaar bij weinig data | Render `<path>` alleen als ≥2 datapunten; anders tonen we "Te weinig data voor trend." |

---

## File Structure

**Nieuw:**
```
lib/dashboard/
├── stats-queries.ts        — 8 query-helpers
├── stats-queries.test.ts   — TDD voor query-shape (mocks)
├── period.ts               — parse + range + label helpers
└── period.test.ts          — TDD voor date-math

components/dashboard/stats/
├── PeriodSelector.tsx + .module.css        — client, URL-state
├── KpiCard.tsx + .module.css               — herbruikbare KPI-card
├── DistributionBars.tsx + .module.css      — horizontale bars
├── TrendLineChart.tsx + .module.css        — inline-SVG line
└── TopTagsList.tsx + .module.css           — top-N tags lijst
```

**Gewijzigd:**
```
app/dashboard/(app)/statistieken/page.tsx  — vervangt placeholder
```

---

## Open vragen

Geen — alle design-keuzes zijn met de gebruiker doorgenomen. Charting wordt zonder externe library opgelost (CSS + inline SVG).

---

## Volgende stap

Implementatie-plan schrijven (`docs/superpowers/plans/2026-05-06-plan-7-statistieken.md`) met TDD-tasks per query + UI-component, volgens de structuur van Plan 5/6.
