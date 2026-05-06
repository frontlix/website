# Plan 8 — Agenda-pagina (Design)

**Datum:** 2026-05-06
**Status:** ontwerp ter review
**Scope:** nieuwe agenda-pagina op `/dashboard/agenda` (placeholder route bestaat al). Calendar-grid maand-view met geboekte afspraken. Read-only — alleen lezen uit `leads.afspraak_geboekt_op`. Geen schema-wijzigingen, geen bot-impact.

---

## Doel

Klanten van het lead-opvolgings-product willen hun geplande afspraken in één visueel overzicht zien — zoals Google Calendar maar gefilterd op de afspraken die de bot heeft geboekt. Past + future zijn beide zichtbaar zodat ze ook kunnen reflecteren ("welke no-shows had ik vorige maand").

---

## View

**Calendar-grid maand-view** — 7-koloms grid (Maandag t/m Zondag), 5-6 rijen afhankelijk van de maand. Leading days (laatste dagen van vorige maand) en trailing days (eerste dagen van volgende maand) worden gegrijst zodat de full grid altijd 35-42 cellen telt.

```
┌─────────────────────────────────────────────────────┐
│  ← Vorige      mei 2026      Volgende →   [Vandaag] │  ← month nav
├─────────────────────────────────────────────────────┤
│  Ma   Di   Wo   Do   Vr   Za   Zo                   │  ← weekdag headers
├─────────────────────────────────────────────────────┤
│ 28   │ 29   │ 30   │  1   │  2   │  3   │  4   │   │  ← leading days grijs
│ ░    │ ░    │ ░    │      │      │      │      │   │
│  5   │  6   │  7   │  8   │  9   │ 10   │ 11   │   │
│      │ Jan ⬛│      │      │ Roos⬛│      │      │   │  ← past = grijs
│      │      │      │      │      │      │      │   │
│ 12   │ 13   │ 14   │ 15   │ 16   │ 17   │ 18   │   │
│      │      │ ●    │      │ Tom🟦│      │      │   │  ← vandaag highlight
│      │      │      │      │      │      │      │   │
│ ...                                                  │
└─────────────────────────────────────────────────────┘
```

### Cel-content

Iedere cel toont:
- **Datum-cijfer** (28, 29, …) linksboven
- **Vandaag-highlight**: kleine cirkel rond het cijfer in `--color-primary`
- **Afspraak-blokjes**: tot 3 zichtbaar onder het cijfer
- **"+N meer"** link als er meer dan 3 afspraken op die dag zijn — klik scrolt naar de chronologische lijst onder de grid

### Afspraak-blokje

Compact horizontaal blokje:
- Achtergrond-kleur: future = `--color-primary`, past = `--color-text-muted` (grijs)
- Tekst: lead-naam (truncate met `text-overflow: ellipsis`)
- Hover: subtiele highlight + tooltip met `naam`, `tijd`, `dashboard_status`
- Klik: navigeert naar `/leads/[lead_id]` (bestaande detail-pagina)

### Visuele differentiatie past vs future

Per de gebruikers-keuze (B in de brainstorm):
- **Future appointments**: `background: var(--color-primary); color: white`
- **Past appointments**: `background: var(--color-surface-2); color: var(--color-text-muted); border: 1px solid var(--color-border)`

Onafhankelijk van de bot-status van de lead (akkoord, no-show, etc) — die zie je terug in de detail-pagina.

### Lijst onder de grid

Onder de calendar staat een chronologische lijst van alle afspraken in de huidige maand, gegroepeerd op dag. Reden: bij 4+ afspraken op één dag wordt het cel-blokje "+1 meer" en heb je een leesbare overflow nodig. Lijst ook handig voor scan-leesbaarheid.

```
┌─────────────────────────────────────────────────┐
│  Alle afspraken — mei 2026                      │
├─────────────────────────────────────────────────┤
│  Dinsdag 7 mei                                  │
│   • Jan de Vries — opgevolgd                    │
│                                                 │
│  Vrijdag 9 mei                                  │
│   • Roos Janssen — open                         │
│   • Piet Smit — opgevolgd                       │
│                                                 │
│  Vrijdag 16 mei                                 │
│   • Tom van Dijk — afspraak_bevestigd           │
└─────────────────────────────────────────────────┘
```

---

## Maand-navigatie

Header toont:
- **← Vorige** knop — link naar `?month=YYYY-MM` van vorige maand
- **maand + jaar** — bv "mei 2026", grote titel
- **Volgende →** knop
- **Vandaag** knop — link zonder `?month` param, defaults naar huidige maand

URL-state: `/dashboard/agenda?month=2026-05`. Geen param = huidige maand.

Server Component leest `searchParams.month`, parst naar `{year, month}`, fetcht afspraken.

---

## Architectuur

### Data-flow

`/dashboard/agenda/page.tsx` is een Server Component:

1. Parsed `searchParams.month` naar `{year, month}` (default: huidige maand)
2. Berekent het volledige grid-venster: `gridStart = laatste maandag van vorige maand of 1e van deze maand`, `gridEnd = +35-42 dagen`
3. Roept `getAppointmentsForMonth(year, month)` aan
4. Bouwt een `Map<dateKey, Appointment[]>` voor O(1) lookup per cel
5. Render de grid + de chronologische lijst

### Query-helper (`lib/dashboard/agenda-queries.ts`)

```typescript
export interface Appointment {
  lead_id: string
  naam: string | null
  telefoon: string | null
  afspraak_geboekt_op: string  // ISO timestamp
  dashboard_status: DashboardStatus | null
  status: string  // bot-status
}

export async function getAppointmentsForMonth(
  year: number,
  month: number  // 1-12
): Promise<Appointment[]>
```

Query haalt **alle leads** met `afspraak_geboekt_op` waar de datum in `[firstOfMonth, lastOfMonth]` valt. Gesorteerd op `afspraak_geboekt_op` ASC. Inclusief past appointments. Niet gefilterd op `dashboard_archived` — gearchiveerde leads waarvan de afspraak in deze maand viel willen we wel zien (was historische data).

### Date-helpers (`lib/dashboard/calendar.ts`)

```typescript
export function parseMonthParam(searchParams: ...): { year: number; month: number }  // default = vandaag
export function getMonthGrid(year: number, month: number): {
  cells: Array<{ date: Date; isCurrentMonth: boolean; isToday: boolean }>
  monthStart: Date
  monthEnd: Date
}
export function buildAppointmentsByDay(appointments: Appointment[]): Map<string, Appointment[]>  // key = YYYY-MM-DD
```

TDD voor `getMonthGrid` (date-math is fout-gevoelig: schrikkeljaren, locale, week-start).

### Components (`components/dashboard/agenda/`)

- `AgendaMonthNav.tsx` (server) — prev/today/next links + maand-titel
- `AgendaCalendar.tsx` (server) — de 7×6 grid; cellen, blokjes, "+N meer"
- `AgendaAppointmentBlock.tsx` (server) — één blokje (klikbaar `<Link>`)
- `AgendaAppointmentList.tsx` (server) — overflow-lijst onder de grid

Allemaal server components — geen client-state nodig. URL-state doet alle navigatie. Caching werkt automatisch.

---

## Edge cases

- **Geen afspraken in de maand**: grid rendert leeg, lijst toont "Geen afspraken in deze maand."
- **Afspraak in verleden maar archived lead**: tonen — historische data is waardevol.
- **Afspraak op leading/trailing day** (bv 28 april in mei-grid): toont in de leading-day cel met dezelfde stijl als andere past appointments. Klik werkt nog steeds, want we fetchen full grid window.
- **Jaargrens** (`?month=2026-12` → vorige = `2026-11`, volgende = `2027-01`): Date-helpers handelen dit af.
- **Ongeldige `month`-param** (bv `?month=abc` of `?month=2026-13`): valt terug op huidige maand.
- **Tijdzone**: timestamps worden in `Europe/Amsterdam` gerenderd. Voor de grid-mapping wordt de `afspraak_geboekt_op` geparsed naar de Amsterdamse datum (anders zou een afspraak om 01:30 'nachts in NL boven 23:30 UTC vallen en in een vorige dag terechtkomen). Documenteren in code.
- **Multi-day overlap**: niet relevant — een afspraak heeft één moment, geen duur.

---

## Niet-gescoped (YAGNI / later)

- **Drag-and-drop herplannen** — uit scope; afspraken-edit zou de bot moeten triggeren (Plan 6 was al "geen bot-impact" en Plan 8 volgt dat).
- **Week-view en day-view** — alleen maand-view in v1. Komt eventueel als de gebruikers het missen.
- **iCal-export** (.ics download) — uit scope, kan later toegevoegd worden zonder schema-werk.
- **Notification "afspraak over 1 uur"** — uit scope.
- **Filteren op tags / status** in de calendar — uit scope; gebruik daarvoor `/leads`.
- **Vandaag-toggle** voor "alleen toekomst" — niet gevraagd; past + future altijd beide zichtbaar.
- **Realtime updates** — agenda hoeft niet live te updaten; refresh is genoeg.

---

## Risico's & mitigaties

| Risico | Mitigatie |
|---|---|
| Tijdzone-mismatch tussen UTC-DB en NL-rendering | Parse `afspraak_geboekt_op` naar Europe/Amsterdam dag-key (`YYYY-MM-DD`) voor de grid-lookup. Helper-functie + tests. |
| Maand met veel afspraken (>20 op één dag) | `+N meer`-link naar overflow-lijst onder. Lijst is zelf niet-gepagineerd want de aantallen blijven beheersbaar (max ~50/dag) bij gebruik door één bedrijf. |
| Performance bij snelle prev/next-navigatie | Server-component caching dekt dit; queries zijn licht. Geen optimization nodig. |
| Lead met verwijderde naam (`naam IS NULL`) | Toon "Onbekend" in plaats van leeg blokje. |

---

## File Structure

**Nieuw:**
```
lib/dashboard/
├── agenda-queries.ts             — getAppointmentsForMonth
├── calendar.ts                   — parseMonthParam + getMonthGrid + buildAppointmentsByDay
└── calendar.test.ts              — TDD voor date-math + edge cases

components/dashboard/agenda/
├── AgendaMonthNav.tsx + .module.css           — prev/today/next + titel
├── AgendaCalendar.tsx + .module.css           — 7×N grid
├── AgendaAppointmentBlock.tsx + .module.css   — klikbaar blokje
└── AgendaAppointmentList.tsx + .module.css    — overflow-lijst onder grid
```

**Gewijzigd:**
```
app/dashboard/(app)/agenda/page.tsx  — vervangt placeholder
```

---

## Open vragen

Geen — alle design-keuzes zijn met de gebruiker doorgenomen. Calendar-grid (view C), past + future inbegrepen, visuele differentiatie B (future blauw, past grijs), optionele lijst onder de grid is meegenomen.

---

## Volgende stap

Implementatie-plan schrijven (`docs/superpowers/plans/2026-05-06-plan-8-agenda.md`) met TDD-tasks per helper + UI-component, volgens de structuur van Plan 5/6/7.
