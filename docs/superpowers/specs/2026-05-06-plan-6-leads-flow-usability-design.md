# Plan 6 — Leads-flow usability (Design)

**Datum:** 2026-05-06
**Status:** ontwerp ter review
**Scope:** drie features die de bestaande leads-flow bruikbaarder maken zonder de schoon-straatje bot te raken.

---

## Doel

Het dashboard groeit van "alle leads zijn zichtbaar" naar "ik vind snel wat ik zoek en zie nieuwe activiteit live":

1. **Activity-timeline** als tweede tab op de detail-pagina — chronologisch overzicht van álle events op één lead.
2. **Filters + zoek** op de leads-lijst — zoekbalk + dashboard-status + tags + datum-range + gesprek-fase, met URL-state.
3. **Realtime updates** op de detail-pagina — nieuwe inkomende berichten/foto's verschijnen vanzelf in het gesprek.

Schoon-straatje bot wordt niet aangeraakt. Alleen Frontlix-codebase + leesoperaties op de schoon-straatje DB. Geen schema-migraties.

---

## Architectuur op hoofdlijnen

| Feature | Server-side | Client-side |
|---|---|---|
| Activity-timeline | `aggregateActivityTimeline()` (al klaar in Plan 4) | nieuwe tab-switcher + render-component |
| Filters + zoek | `getLeadsList(filters)` upgraden — DB-side filtering | filter-bar + uitklap-paneel + chips, URL-state |
| Realtime | n.v.t. (alleen client) | browser Supabase-client + Realtime channel + `router.refresh()` |

Geen DB-migraties. Geen nieuwe packages. Geen bot-impact.

---

## Sectie 1 — Activity-timeline

### Plek

Op de detail-pagina (`/leads/[lead_id]`) krijgt de **middenkolom** twee tabs bovenaan:

- **Gesprek** (default) — de huidige `LeadConversation` + `LeadPhotos` + `LeadOffertes` + `LeadPrijsregels`
- **Activiteit** — verticale tijdlijn met alle events

Tab-keuze in URL via `?tab=activiteit` zodat refresh de tab onthoudt en je een tab kan delen.

### Visueel

```
┌──────────────────────────────────────┐
│  [ Gesprek ] [ Activiteit ]          │  ← tabs
├──────────────────────────────────────┤
│                                      │
│  ●─── 14:32 — Klant stuurde bericht  │
│  │       "Ik wil graag offerte voor…"│
│  │                                   │
│  ●─── 14:25 — Foto ontvangen         │
│  │       via WhatsApp                │
│  │                                   │
│  ●─── 13:10 — Status: opgevolgd      │
│  │       was: open                   │
│  │                                   │
│  ●─── gisteren — Lead aangemaakt     │
│          Bron: whatsapp              │
│                                      │
└──────────────────────────────────────┘
```

Elk event-type krijgt een eigen kleurtje voor de dot (subtle):

- **bericht_in / bericht_uit** → primair-blauw
- **foto_geupload** → cyaan (accent)
- **offerte_verstuurd** → groen
- **notitie_toegevoegd** → grijs
- **status_gewijzigd** → oranje
- **akkoord / afspraak_geboekt** → goud
- **lead_aangemaakt** → grijs

### Geen filtering in v1

Geen toggles voor "alleen berichten" of "alleen status-changes". De timeline is per-lead en blijft overzienbaar (max paar tientallen events). YAGNI.

### Bestanden

- `components/dashboard/leads/LeadDetailTabs.tsx` + `.module.css` (nieuw, client) — tab-buttons, leest `searchParams.tab`, rendert children o.b.v. keuze
- `components/dashboard/leads/LeadActivityTimeline.tsx` + `.module.css` (nieuw, server) — rendert `ActivityEvent[]` als verticale tijdlijn
- `app/dashboard/(app)/leads/[lead_id]/page.tsx` — middenkolom in `<LeadDetailTabs>` wikkelen, beide views meegeven als children

### Tests

Server-side rendering test van de timeline-component is laag-waarde (snapshots). Wél een unit-test op een mini-helper die event-type → dot-kleur mapt (TDD), zodat we niet stilletjes regresses introduceren.

---

## Sectie 2 — Filters + zoek op `/leads`

### UI-pattern (gekozen: B)

Boven de tabel:

```
[ 🔍 Zoek naam of telefoon… ]      [ ⚙ Filters (3) ]   [ Exporteer CSV ]
[ status: opgevolgd × ]  [ tag: hot lead × ]  [ van 1 apr — t/m 30 apr × ]   ← chips bij actieve filters

────── tabel ──────
```

- **Zoekbalk** altijd zichtbaar links, debounced (300ms) zodat niet bij elke toetsaanslag een query gaat.
- **Filters-knop** rechts; aantal actieve filters in superscript (`Filters (3)`). Klik opent een uitklap-paneel onder de header met:
  - **Dashboard-status** — single-select dropdown (één tegelijk; "alle" = leeg)
  - **Tags** — multi-select; matches AND (lead moet alle gekozen tags hebben)
  - **Datum** — toggle "Aangemaakt" / "Bijgewerkt" + van-/t-m-datums
  - **Gesprek-fase** — single-select dropdown
- **Chips** boven de tabel tonen actieve filters; klik op `×` verwijdert die filter.
- **Exporteer CSV** blijft staan zoals nu (Plan 5).

Mobiel: zoekbalk + filters-knop nemen volledige breedte, paneel klapt over de hele breedte uit.

### URL-state

Alle filter-keuzes leven in URL-search-params:

```
/leads?q=jan&status=opgevolgd&tags=hot,vip&dateField=aangemaakt&from=2026-04-01&to=2026-04-30&fase=onderhandelen
```

Voordeel: bookmark, deelbaar, browser-back werkt, refresh behoudt staat. De page leest `searchParams` server-side, parsed naar een `LeadsFilters` object, en geeft door aan `getLeadsList(filters)`. Geen client-side state-management.

### Filter-gedrag (precies)

| Filter | Param | Gedrag |
|---|---|---|
| Zoek | `q` | Server-side `ilike '%query%'` op `naam` OR `telefoon`. Telefoon genormaliseerd: spaties / `+` / `-` / `(` / `)` strippen voor de match aan beide kanten. |
| Status | `status` | `eq('dashboard_status', value)` voor 1 waarde. Wegfilteren bij ontbreken. |
| Tags | `tags` | Comma-separated lijst. Lead matcht als hij **alle** opgegeven tags heeft (AND). Implementatie: subquery `IN (SELECT lead_id FROM lead_tags WHERE tag_id IN (...) GROUP BY lead_id HAVING COUNT(*) = N)`. |
| Datum | `dateField` (`aangemaakt`\|`bijgewerkt`) + `from` + `to` | `gte(dateField, from)` + `lte(dateField, to)`. Een ervan mag leeg zijn (open einde). |
| Gesprek-fase | `fase` | `eq('gesprek_fase', value)`. |

Alle filters worden gecombineerd met **AND**. Geen filter actief = huidige gedrag (alleen `dashboard_archived = false`, max 100, sortering DESC op `aangemaakt`).

### Datum-toggle keuze

Eén filter met een toggle (`Aangemaakt` ↔ `Bijgewerkt`). Niet twee onafhankelijke datum-filters tegelijk — dat is rommelig in URL en zelden nuttig. Als de user toch op beide tegelijk wil filteren komt dat als follow-up.

### Result-counter

Onder de filter-bar staat al `"X leads — niet gearchiveerd, nieuwste eerst."` Bij actieve filters wordt dat: `"X leads gevonden van Y totaal."` zodat duidelijk is dat een filter werkt.

### Bestanden

- `lib/dashboard/lead-filters.ts` (nieuw) + `.test.ts` — type `LeadsFilters` + `parseLeadsFilters(searchParams)` + `serializeLeadsFilters(filters)` (TDD)
- `lib/dashboard/lead-queries.ts` — `getLeadsList(filters?: LeadsFilters)` + meegerekende totaal-count voor de "X van Y"-tekst
- `lib/dashboard/lead-queries.test.ts` — bestaande tests breiden uit met filter-cases
- `components/dashboard/leads/LeadsFilterBar.tsx` + `.module.css` (nieuw, client) — search input + filters-knop + chips
- `components/dashboard/leads/LeadsFilterPanel.tsx` + `.module.css` (nieuw, client) — uitklap met de 4 controls
- `app/dashboard/(app)/leads/page.tsx` — leest `searchParams`, parst filters, rendert `LeadsFilterBar` + tabel

### Tests

- TDD op `lead-filters.ts` (parse/serialize) — minst 8 cases: leeg, enkele filter, alle filters samen, ongeldige params worden genegeerd, datum-edge cases.
- TDD op uitgebreide `getLeadsList(filters)` — wat gebeurt er met elke filter, combinaties, fallback bij ontbrekende params.
- UI-components testen we via end-to-end smoke (zelfde patroon als Plan 5).

---

## Sectie 3 — Realtime updates op detail-pagina

### Architectuur

Een client-only component `LeadDetailRealtime` (geen UI) wordt gemount op de detail-pagina, abonneert op INSERTs in `berichten` en `fotos` voor het huidige `lead_id`, en triggert bij elke event `router.refresh()` (Next.js App Router hook). Server fetcht opnieuw via `getLeadDetail()`, page re-rendert, alle views (incl. timeline) zijn live.

```
[bot schrijft bericht via service-key]
       │
       ▼
[Supabase Postgres trigger naar wal2json]
       │
       ▼
[Realtime broadcast op 'berichten' table]
       │
       ▼
[browser channel.on('postgres_changes') callback]
       │
       ▼
[router.refresh() — Next.js fetcht server data]
       │
       ▼
[page re-rendert met nieuwe bericht]
```

Geen optimistic state, geen client-side data-mutaties. Server blijft de waarheid.

### Live-indicator

In de header van de detail-pagina (rechts naast de leadnaam):

- **🟢 Live** — websocket connected, realtime werkt
- **⚪ Offline** — disconnected (network, server unreachable)

Klein, subtiel. Status komt uit de Realtime channel zelf via `channel.on('system', ...)` events.

### RLS-veiligheid

De browser-client gebruikt cookie-session (anon-key + Supabase Auth). Realtime push respecteert dezelfde RLS-policies als reads — alleen events op rijen die de user mag zien komen door. Geen tenant-lek mogelijk.

### Eenmalige Supabase-setup

Realtime moet aan staan voor `berichten` en `fotos` in de schoon-straatje Supabase: **Studio → Database → Replication → enable for tables**. Documenteren in het plan; wordt door de gebruiker handmatig gedaan.

### Bestanden

- `lib/dashboard/supabase-browser.ts` (nieuw) — browser-side Supabase-client (`createBrowserClient` van `@supabase/ssr`); cookie-session, anon-key
- `components/dashboard/leads/LeadDetailRealtime.tsx` (nieuw, client) — `useEffect` met channel-subscribe + cleanup; rendert `LiveIndicator` als prop-children
- `components/dashboard/leads/LiveIndicator.tsx` + `.module.css` (nieuw, client) — kleine 🟢/⚪ + label
- `app/dashboard/(app)/leads/[lead_id]/page.tsx` — `<LeadDetailRealtime leadId={...}>` mounten, indicator in `<LeadHeader>` plaatsen

### Tests

Geen unit-tests voor de subscription-wiring — dat vereist een volledige Supabase-Realtime-mock met dubieuze return-on-investment. Wel:

- Type-check en build moeten clean zijn.
- Handmatige smoke: twee tabs open op dezelfde lead, in Supabase Studio handmatig een rij in `berichten` inserten met `lead_id` van die lead, beide tabs moeten binnen 2 seconden de nieuwe bericht tonen. Live-indicator moet 🟢 staan.

---

## Niet-gescoped (YAGNI of uitgesteld)

- **Live-update van `/leads` lijst** — de gebruiker koos A (alleen detail). Komt later als de behoefte zich voordoet.
- **Filter op hoofdcategorie (`d`)** — niet door de user gevraagd. Kan trivially toegevoegd worden later (zelfde patroon als gesprek-fase).
- **Bulk-acties op gefilterde lijst** ("verander status van alle gefilterde leads") — uit scope; als het nodig wordt komt het in Plan 8+.
- **Save filter as preset** — uit scope; URL-bookmarks lossen dit op.
- **Activity-timeline filtering / exporteren** — uit scope.
- **Optimistic UI in realtime** — niet nodig; `router.refresh()` is genoeg snel.

---

## Risico's & mitigaties

| Risico | Mitigatie |
|---|---|
| Realtime websocket faalt → user mist updates | Live-indicator toont 🟢/⚪ status; user merkt het en kan refreshen |
| `router.refresh()` triggert race met manuele actie (bv. notitie schrijven en tegelijk komt er een bericht binnen) | Next.js handelt dit op render-niveau af; form-state in Client Components blijft staan |
| Filter-URL met onbekende param-waarden (bv. `status=ongeldigblabla`) | Parser valideert tegen toegestane waarden, ongeldige worden genegeerd, geen 500 |
| Datum-filter met `from > to` | Parser swapt of negeert; user-feedback in panel |
| Tags-AND query is duurder dan single-tag | Acceptabel; `getLeadsList` heeft `.limit(100)` (Plan 4 cleanup) |
| Realtime aan voor schoon-straatje DB → wat als bot heel veel events stuurt? | Geen probleem; er is geen client-side state-overhead, alleen `router.refresh()`; Next.js dedupliceert |

---

## Open vragen voor de plan-fase

Geen — alle design-keuzes zijn met de gebruiker doorgenomen.

---

## Volgende stap

Implementatie-plan schrijven (`docs/superpowers/plans/2026-05-06-plan-6-leads-flow-usability.md`) met TDD-tasks per onderdeel, volgens de structuur van Plan 5.
