# Mobiele dashboard-port — master design

_Datum: 2026-05-29 · Branch: `feat/mobile-leads-inbox` · Status: goedgekeurd ontwerp, klaar voor implementatieplannen_

Dit is de **master-spec** voor het porten van de resterende mobiele dashboard-schermen
uit het Claude-Design-prototype (`/Users/christiaantromp/Downloads/mobile-app-handoff`)
naar de echte Next.js-app. Elk scherm krijgt daarna **zijn eigen implementatieplan**
vlak vóór de bouw; deze spec legt de gedeelde architectuur, beslissingen, tokens,
shared primitives en per-scherm scope vast.

De feiten hieronder zijn geverifieerd tegen de live codebase (gap-analyse + handmatige
controle), niet alleen tegen de prototype-bronnen.

---

## 1. Doel & context

De mobiele app vervangt op `max-width: 640px` de desktop-shell. Drie schermen zijn al
geport en gelden als **referentie-implementatie**: Overzicht, Leads, Inbox (onder
`components/dashboard/mobile/`). Deze spec dekt de **5 resterende schermen**.

Bron-prototype draait op in-browser Babel met inline-styles en een `t`-theme-object;
dat porten we **niet** 1-op-1 — we vertalen naar de bestaande house-style (CSS Modules +
design-tokens + `data-*`-varianten).

---

## 2. Scope

### In scope (5 schermen)
1. **Analyses** — route `/statistieken`
2. **Reviews** — route `/reviews`
3. **Instellingen** — route `/instellingen` (hub + 8 detail-schermen)
4. **Lead-dossier** — route `/leads/:id` (incl. Offerte-tab)
5. **Agenda** — route `/agenda` (volledig, incl. write-acties)

### Buiten scope (bewust)
- **Handmatige offerte-flow** (`+ Nieuwe offerte`): **al mobiel uitgewerkt**.
  `components/dashboard/offerte/ManualOfferteModal.tsx` heeft echte `isMobile`-detectie
  (`matchMedia('(max-width: 768px)')`), een mobiel Step 0-entryscherm en aparte
  mobiele header/footer; geopend via `?nieuwe-offerte=1` vanuit
  `components/dashboard/mobile/HeaderActions.tsx`. Hooguit een latere visuele controle.
- Reviews-backend (tabel + bot-integratie): niet in deze ronde — Reviews ship't met
  mock-data. NPS↔Google-sterren reconciliatie = later.
- Desktop-aanpassingen: alleen mobiele views toevoegen; desktop blijft ongewijzigd.

---

## 3. Beslissingen (vastgelegd met gebruiker)

| # | Beslissing | Keuze |
|---|---|---|
| 1 | Welke schermen deze ronde | Alle 6 → na schrappen offerte: **5**, aanbevolen volgorde |
| 2 | Design-fidelity | **Pixel-match prototype** (binnen het token-systeem; geen inline-styles) |
| 3 | Handmatige offerte | **Al gedaan** → uit scope |
| 4 | Agenda-scope v1 | **Volledig incl. writes** (afronden/herplannen/nieuwe afspraak/foto-upload) |
| 5 | Sub-scherm-navigatie | **`MobileDrilldownLayer`** (in-page slide-in + browser-back), géén aparte routes |
| 6 | Reviews-datamodel | **Google-sterren + mock** (volgt pixel-match), duidelijk geflagd |

---

## 4. Architectuur & conventies (verplicht voor elk nieuw scherm)

Afgeleid van de al-geporte Overzicht/Leads/Inbox. Nieuwe schermen moeten hier exact op
aansluiten.

**Shell & activatie**
- Mobiel/desktop-toggle is **CSS-only** op `max-width: 640px` in
  `components/dashboard/mobile/DashboardChrome.tsx` (gebruikt `display: contents`, geen
  hydration-flash). **Pagina's beslissen nooit zelf** mobiel-vs-desktop; de layout doet dat.
- Let op: prototype gebruikt 720px — wij gebruiken **640px** (consistent met bestaande shell).
- `lib/dashboard/use-is-mobile.ts` bestaat maar wordt **niet** gebruikt door de shell.
  Niet inzetten tenzij we bewust naar mount-gating overstappen.

**Routing / bottom-nav**
- Echte Next.js-routing via `<Link>` (géén hash-routing; prototype's `useHashRoute`
  vervalt). `BottomNav.tsx` mapt tabs→routes: `home→/dashboard`, `leads→/leads`,
  `inbox→/inbox`, `cal→/agenda`, `meer→`(sheet). Actieve tab via `usePathname()` met
  prefix-match.
- Secundaire schermen (Reviews, Analyses/`statistieken`, Veldwerk, Instellingen) zijn
  bereikbaar via `MeerSheet.tsx` (al bedraad met `<Link>`s + badges).
- **Alle doel-routes bestaan al** onder `app/dashboard/(app)/{agenda,reviews,statistieken,instellingen,leads}`.
  We voegen de mobiele *view* toe in de bestaande pagina, CSS-gated — **geen nieuwe routes**.
- Full-screen-patroon (header + bottom-nav verbergen) bestaat al voor chat-detail en
  `/leads/[id]`; hergebruiken voor Lead-dossier en Agenda-detail.

**Styling**
- Eén `.tsx` + colocated `.module.css` per component; `'use client'` bovenaan
  interactieve components; named exports; camelCase class-namen.
- **Varianten via `data-*`-attributen, nooit className-concatenatie**
  (bv. `data-tone='blue'` → CSS-selector). Het `t.xxx`-theme-object van het prototype
  wordt volledig vertaald naar CSS custom properties — **geen inline-styles porten**.
- Alle spacing/kleur/radius via tokens (`--space-*`, `--color-*`, `--radius-card-mobile`,
  `--mobile-content-pad`, `--ease-ios`). Light/dark is globaal via `.dark` op een wrapper;
  components blijven theme-agnostisch.

**Data (mapper-patroon)**
- Server-component fetcht via `lib/dashboard/*-queries.ts`, geeft ruwe rows als props door;
  client-scherm draait een colocated `*-mappers.ts` (pure `RawX → MobileXView` + helpers)
  in `useMemo`; gemapte data stroomt naar presentational children. Mappers krijgen een
  colocated vitest `.test.ts`.

**Shared primitives die al bestaan (hergebruiken)**
- `components/dashboard/mobile/useSwipeReveal.ts` (REVEAL 144px / THRESHOLD 40px).
- `components/dashboard/mobile/drilldowns/MobileDrilldownLayer.tsx` — slide-in-laag met
  browser-back-integratie (`history.pushState`), geen route-wissel. **Dit is de tool voor
  alle stack-push/pop sub-schermen** (Instellingen-detail, Agenda-flows).
- Bottom-sheet-patroon: parent `useState` + conditional render + `onClose/onApply`
  (zie `leads/LeadsFilterSheet.tsx`).
- `leads/LeadsSegmentedChips.tsx` voor filter-pill-rijen.

---

## 5. Fase 0 — Gedeeld fundament (eerst, eenmalig)

Vóór de schermen fan-outen bouwen we het gedeelde fundament, zodat alle 5 schermen
consistent zijn.

### 5a. Tokens (`styles/tokens.css`)
Geverifieerd ontbrekend (grep gaf niets terug) — toevoegen, mét light/dark-waarde:
- `--color-elev` — verhoogd oppervlak t.o.v. `surface` (light `#FFFFFF`; dark `#2A2A2D` vs surface `#1C1C1E`).
- `--color-warning` — handoff `#F59E0B` (Agenda "Bel"-events, Instellingen amber-boxen).
- `--color-chip-bg` — handoff `rgba(0,0,0,.04)` / `rgba(255,255,255,.06)`.
- `--color-border-soft` — zachtere divider dan `--color-border`.
- `--accent-2` / secundaire cyaan — handoff `accent2 #00CFFF` (verifieer of dit al als
  `--color-accent` bestaat; zo niet, als named token toevoegen voor gradients-als-tokens).

**Semantische kleuren afstemmen:** prototype gebruikt `success #22C55E` / `danger #FF453A`;
codebase gebruikt `#16A34A` / `#DC2626`. **Codebase-waarden behouden**, prototype daar naartoe
restylen (consistente live-dot / completion-groen / reviews-rood).
**WhatsApp-palet** (`--wa-*` light+dark) bestaat al — hergebruiken voor WA-previews.

Lever ook een **mappingtabel** op (handoff `t`-key → CSS-var) zodat elk scherm dezelfde
vertaling gebruikt.

### 5b. Shared primitives (nieuw, in `components/dashboard/mobile/shared/`)
- **Inline-SVG chart-kit**: `AreaChart` (gradient-defs met unieke IDs), `DonutRing`/doel-ring
  (via `strokeDasharray`), `Sparkline`, horizontale `BarRow`. Token-aware CSS-module-componenten,
  géén inline-style-port. Gebouwd in stap 1 (Analyses), hergebruikt door Instellingen-simulator
  en eventueel Overzicht-KPI's.
- **`MobileDetailNavBar`**: gedeelde terug-knop + titel + rechter-actie (Agenda-detail,
  Instellingen-detail, Lead-dossier). Prototype heeft `FNav`/`ANavBar`/`LargeTitle` — nu
  heruitgevonden per scherm; één keer factoren.
- **`MobileToggle`**: iOS-stijl switch (`data-on`-variant) — Instellingen, Agenda-stappen.
- **`MobileStickyActionBar`**: backdrop-blur footer met safe-area-inset — Lead-dossier (+ herbruikt
  het al-mobiele offerte-patroon waar mogelijk).
- **`StarRating`**: fractionele sterren — alleen Reviews.

---

## 6. Per-scherm ontwerp

### 6.1 Analyses (`/statistieken`) — complexity M · echte data
- **Doel:** omzet-dashboard met periode-toggle (Maand/Kwartaal/Jaar).
- **Componenten:** periode-toggle, omzet-hero (area-chart + doel-ring), 2×2 KPI-grid met
  sparklines, conversie-trechter (bars), omzet-per-dienst (bars).
- **Data:** **live** via `lib/dashboard/stats-queries.ts` (`countLeads`, `countConverted`,
  `avgOfferteWaarde`, `avgReactietijdMs`, `statusVerdeling`, `categorieVerdeling`,
  `leadsPerDag`, `topTags`) + `period.ts` (`parsePeriod`, `periodToRange`). Mogelijk
  kwartaal-range toevoegen. Omzet-doel-% via `omzet-doel-actions.ts`. Verifiëren of "Bot zelf af"-KPI
  een bestaande query heeft.
- **Risico's:** inline-SVG charts zijn fiddly maar laag-risico; bouwt de herbruikbare chart-kit.
- **Waarom eerst:** beste real-data-dekking, geen nieuw backend, levert de chart-kit op.

### 6.2 Reviews (`/reviews`) — complexity M · mock-data (geflagd)
- **Doel:** Google-reviews — 4.8★ aggregaat, tabs Nieuw/Beantwoord/Aandacht.
- **Componenten:** score-header, tab-filter (hergebruik segmented-chips-patroon), review-kaart
  met fractionele sterren (`StarRating`), inline reply-composer met sjabloon-chips
  (Bedankt/Tot ziens/Herstel) + naam-substitutie, negatief-review rood-accent, success-toast.
- **Data:** **GEEN** — geen `reviews`/NPS-tabel; desktop `/reviews` is NPS-demo. Ship't met
  **mock-data, duidelijk geflagd**. Datamodel = Google-sterren (volgt pixel-match).
- **Risico's:** puur UI, laag-risico. NPS↔Google reconciliatie expliciet uitgesteld.
- **Parallel:** kan tegelijk met Analyses (geen gedeelde afhankelijkheid).

### 6.3 Instellingen (`/instellingen`) — complexity L (breedte) · grotendeels echte data
- **Doel:** hub (zoekbalk + categorie-kaarten) → 8 detail-schermen.
- **Detail-schermen + data (allemaal live via bestaande actions):**
  - Bedrijf — `tenant-base-actions.ts`
  - Team — bestaande team-actions
  - Prijzen (wat-als-simulator) — **echte backend**: `pricing-impact.ts`
    (`computeRevenueDelta`, `aggregateVolumes`, `volumeForRule`, `countConverted`) +
    `pricing-impact-queries.ts` (`getPricingImpactBaseline`) + `pricing-actions.ts`/`pricing-types.ts`.
    **Wire aan echte math, niet mocken.**
  - Diensten (toggles) — `service-offerings-actions.ts`
  - Openingsbericht (WA-preview) — `template-queries.ts`/`template-actions.ts`
  - Reminders — `reminder-actions.ts`
  - Notificaties (kanaal-matrix) — `notifications/prefs-actions.ts`
  - Tags — `tags-actions.ts`/`tag-actions.ts`
- **Navigatie:** hub→detail via `MobileDrilldownLayer`.
- **Risico's:** breedte (8 schermen), niet diepte. WA-preview (live substitutie) +
  notificatie-matrix zijn de fiddly bits. **Te verifiëren:** desktop `/instellingen/page.tsx`
  is één monolithische pagina — bepalen of secties extraheerbaar/deelbaar zijn of mobiel
  herbouwd worden (waarschijnlijk herbouwen, logica hergebruiken via de actions).
- **Parallel:** detail-schermen lenen zich voor parallelle sub-agents.

### 6.4 Lead-dossier (`/leads/:id`) — complexity M · echte data
- **Doel:** full-screen tabbed detail (verbergt bottom-nav, eigen "← Leads"-knop).
- **Layout:** header + 4-feiten KPI-strip + Surface-status-strip + sticky tab-bar
  (Info/Offerte/Foto's/Activiteit) + sticky actiebalk (Bel/WhatsApp/Stuur offerte).
- **Data:** **live** via `lib/dashboard/lead-queries.ts` (`getLeadDetail`,
  `aggregateActivityTimeline`) + `tag-queries.ts` + berichten/fotos/offertes/notes-tabellen.
  Desktop `LeadDetailHeader`, `LeadTabs`, `LeadInfoTab`, `LeadOfferte`, `LeadPhotos`,
  `LeadActivityTimeline`, `WhatsAppPane` = referentie.
- **Offerte-tab:** hergebruikt bestaande offerte-componenten; "Stuur offerte"/"Aanpassen"
  triggeren de al-mobiele `ManualOfferteModal`. **Let op:** offerte-mail-verzending is
  end-to-end nog ongetest (project-memory, bot-notificatie-risico) — verzend-wiring
  guarden/feature-flaggen tot die test gedaan is.
- **Risico's:** sticky tab + actiebalk op iOS (`-webkit-overflow-scrolling: touch`).
  Full-screen-no-nav-patroon bestaat al.

### 6.5 Agenda (`/agenda`) — complexity L · reads live, writes = nieuw backend
- **Doel:** week-lijst van afspraken + detail/flow-schermen.
- **Componenten:** week-lijst (`ABMain`) met dag-groepen + filter-pills + jump-strip +
  live-banner; sub-schermen via `MobileDrilldownLayer`/bottom-sheet: `FKlus` (klus-detail),
  `FPlaatsbezoek` (plaatsbezoek), `FAfronden` (afronden), `FHerplannen` (herplannen-sheet),
  `ABNew` (nieuwe-afspraak-sheet).
- **Data — reads live:** `lib/dashboard/agenda-queries.ts` (`getAppointmentsForRange`,
  `getAppointmentsForMonth`), `agenda-followups.ts`, `agenda-week.ts`, `agenda-route.ts`,
  `calendar.ts`. Afspraken uit `leads.afspraak_geboekt_op` (Amsterdam TZ). Desktop heeft
  8 grid-georiënteerde componenten = referentie, niet direct herbruikbaar voor de lijst.
- **Data — writes (nieuw):** "Klus afronden", "Herplannen" (met conflict-detectie),
  "Nieuwe afspraak", "Markeer afgerond", foto-upload, materiaal/next-step-toggles.
  **Vereist nieuwe server-actions en waarschijnlijk schema** (geen completion/time-tracking-tabel
  gevonden). Conflict-detectie heeft slot-availability-logica nodig die nog niet bestaat.
- **Risico's:** grootste brok + hoogste backend-risico. Live-banner ("Bezig · nog 1u 18m")
  vereist echt "huidige afspraak" + verstreken-tijd-berekening. Daarom **laatst**; het
  implementatieplan splitst read-only week-lijst+detail van de write-acties.

---

## 7. Bouwvolgorde & parallelisatie

1. **Fase 0** — tokens + shared primitives (chart-kit, nav-bar, toggle, sticky-bar, star-rating).
2. **Analyses** (M, live) — levert chart-kit. ┐
3. **Reviews** (M, mock)                      ┘ → 2 + 3 **parallel** (geen gedeelde deps).
4. **Instellingen** (L, breedte) — detail-schermen parallel via sub-agents.
5. **Lead-dossier** (M, live) — hergebruikt offerte-componenten.
6. **Agenda** (L) — read-only eerst, daarna write-acties + backend.

Sluit aan op de voorkeur "parallelle sub-agents voor grote builds".

---

## 8. Cross-cutting / open verificatiepunten

Op te lossen in het per-scherm implementatieplan (niet blokkerend voor deze spec):
- **Instellingen:** zijn desktop-secties extraheerbaar of mobiel herbouwen? (Verwachting: herbouwen, logica via bestaande actions.)
- **Agenda:** exact schema + server-actions voor writes + conflict-detectie ontwerpen.
- **Analyses:** kwartaal-range in `period.ts`? "Bot zelf af"-KPI-query bestaat?
- **Offerte-mail-verzending:** guarden tot end-to-end-test (bot-notificatie-risico).
- **`use-is-mobile.ts`:** dode code t.o.v. CSS-only shell — documenteren of opruimen om
  een tweede mobiele boom te voorkomen.
- **Breakpoint:** alle nieuwe schermen op **640px** (niet de 720px uit het prototype),
  anders dead-zone 640–720px.

---

## 9. Documentatie-aanpak

- **Deze master-spec** = gedeelde architectuur + beslissingen + per-scherm scope.
- **Per scherm** een eigen implementatieplan (via writing-plans), vlak vóór de bouw, zodat
  per scherm bijgestuurd kan worden. Volgorde van plannen volgt §7.
