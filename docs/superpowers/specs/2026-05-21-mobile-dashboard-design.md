# Mobile Dashboard — Design Spec

**Datum:** 2026-05-21
**Scope:** `app.frontlix.com` dashboard volledig bruikbaar op telefoons (320–480 px)
**Doel:** Volwaardig mobile — alle dashboard-functionaliteit op telefoon werkbaar én geoptimaliseerd, niet "good-enough". Desktop UX blijft ongewijzigd.

---

## 1. Uitgangssituatie (audit)

Het dashboard staat in `app/dashboard/(app)/` en `components/dashboard/`. Mobiel is gedeeltelijk gedaan:

- **Aanwezig:** sidebar-drawer (768px), hamburger in topbar, ExportsModal/Stats hebben media queries, Veldwerk is mobile-first opgezet.
- **Knelpunten geconstateerd:**
  - Inconsistente breakpoint-set (600 / 640 / 768 / 900 / 1100) — geen één strategie
  - Geen consistent `<640px` (phone) breakpoint over alle pagina's
  - Tabellen (Leads, Notificaties in Instellingen, Offerte-regels) overflowen
  - KPI-grids (Overzicht trend-stats, Reviews) collapsen niet onder 640px
  - NotificationPanel `width: 360px` zonder viewport-cap → overflow op 320px
  - Tabs (Instellingen-nav, Lead-detail-tabs) krimpen onder de touch-target-grens
  - Geen aparte mobile-modus voor Agenda week/maand-grid
  - Topbar search verdwijnt onder 768px zonder fallback
  - Geen touch-target token; hover-only acties op tabel-rijen
  - Onboarding/Exports modals niet geoptimaliseerd voor smalle viewports

Volledige audit: zie inline analyse 2026-05-21.

## 2. Doel

| Acceptatiecriterium | Meetbaar via |
|---|---|
| Geen horizontale page-scroll op 320px wide viewport | DevTools responsive, real device |
| Alle interactive tap-targets ≥ 44 × 44 px | Manual audit + Lighthouse a11y |
| Alle modals/dropdowns/sheets blijven binnen viewport | Visual test per route |
| Tabellen leesbaar (of als card-stack gerenderd) op <640px | Per-page review |
| Lighthouse mobile + a11y ≥ 90 per dashboard-route | `npm run build` + Lighthouse CI |
| Werkt op iPhone Safari (16+) en Android Chrome (laatste) | Real device test |

## 3. Architectuur — fundamenten

### 3.1 Breakpoint-set standaardiseren
Naar `styles/tokens.css`:

```css
:root {
  --bp-sm: 480px;   /* small phones */
  --bp-md: 640px;   /* phones / phablet kantelpunt */
  --bp-lg: 768px;   /* tablet */
  --bp-xl: 1100px;  /* desktop 2-col → 1-col kantelpunt */
}
```

Bestaande `@media (max-width: 600 | 900 | 1024)` worden vervangen of gemotiveerd behouden. Geen tokens via custom-properties in `@media` (Browsers ondersteunen dat nog niet) — tokens dienen als documentatie + JS-toegang.

### 3.2 Touch-target token
```css
:root {
  --tap-min: 44px;
}
```
Alle interactive elementen krijgen `min-height: var(--tap-min)` of equivalent. Geldt voor: buttons, tabs, nav-items, toggles, dropdown-items, chevron-links, toggle-switches.

### 3.3 Density-systeem mobile-aware
Huidige `--content-pad: 24px` (cozy) wordt:
```css
@media (max-width: 768px) { :root { --content-pad: 16px; } }
@media (max-width: 480px) { :root { --content-pad: 12px; } }
```

### 3.4 Drie herbruikbare patterns in `components/dashboard/ui/`

**`TableToCards`** — Wrapper die op ≥640px een `<table>` rendert, op <640px een verticale card-stack van dezelfde data. Acceptee­rt:
- `columns`: array van `{ key, label, render?, mobile?: 'primary' | 'secondary' | 'hidden' }`
- `rows`: data
- `rowHref?` / `onRowClick?` voor navigatie
- `keyField`: identifier

Card-render: `primary` velden bovenaan groot, `secondary` velden in kleine grid, `hidden` niet getoond op mobile.

**`MobileSheet`** — Bottom-sheet variant van Modal. Slide-up vanaf onderkant, sticky header met sluit-knop + titel, scrollbare body, optionele sticky footer. Op ≥768px valt het terug op gecentreerde modal. Bruikbaar voor: filters, search, dropdowns met veel items, lead-context-pane, agenda day-detail.

**`SplitView`** — Wrapper voor 2-koloms layouts (lijst + detail). Op ≥768px naast elkaar, op <768px één kolom met routing-gebaseerde toggle (via `?view=detail` of subroute). Inbox & Lead-detail gebruiken dit.

### 3.5 Fixes globale chrome

- **NotificationPanel** (`components/dashboard/NotificationPanel.module.css`): `max-width: calc(100vw - 16px)`, `right: 8px` op <480px, of voll­edig converteren naar `MobileSheet` onder 640px.
- **Topbar**: search wordt een icon-button op <768px die `MobileSheet` opent met search-input + recente zoekresultaten.
- **Sidebar drawer**: width `min(280px, calc(100vw - 32px))`, betere ellipsis op `.tenant`.
- **Topbar title**: `.sub` op <480px verbergen of inkorten.
- **Hamburger + actions**: gegarandeerd 44×44 tap-area.

## 4. Pagina-passes (volgorde)

Volgorde op verwacht mobile-gebruik, hoog naar laag:

1. **Overzicht** (`app/dashboard/(app)/page.tsx`)
   - `.trendStats` (4-koloms) → 2×2 grid op <640, 1-kolom op <480
   - KPI-cards: stack met behoud van grote cijfers
   - Charts (AreaChart, Donut): width 100%, hoogte aangepast
   - Activity-feed: full-width cards

2. **Inbox** (`app/dashboard/(app)/inbox/`)
   - 3-col `SplitView`: lijst-default op mobile
   - Thread via tap → `?conv=ID`
   - Context-pane als `MobileSheet` (info-knop in thread-header)
   - WhatsApp-composer: sticky bottom, full-width
   - Thread-header actions: condenseren naar overflow-menu (3-dots)

3. **Leads (lijst)** (`components/dashboard/leads/`)
   - `LeadsTable` → `TableToCards`
     - Mobile-primary: naam + adres, status-pill, datum
     - Mobile-secondary: m², dienst, gespreksfase, offerte-status
   - `LeadsPipeline` (kanban): horizontaal scrollen per kolom, snap-points, kolom-width 280px
   - `LeadsKaarten`: al grid-based, 1-kolom check
   - View-switcher in Topbar: chips met 44px tap, of als `MobileSheet`-keuzelijst
   - Filter-row: `MobileSheet` met alle filters in plaats van flex-wrap

4. **Lead-detail** (`app/dashboard/(app)/leads/[lead_id]/`)
   - `SplitView`: chat in `MobileSheet` of als tab-pane onder
   - `LeadTabs`: sticky bovenaan, horizontaal scrollen al goed; tap-target check
   - Tab-panels: padding 16 → 12px op mobile
   - `LeadDetailHeader`: vertical stack op <640, actions in overflow-menu
   - Offerte-regels-tabel → `TableToCards` of horizontale scroll
   - Foto's-grid: `repeat(auto-fill, minmax(120px, 1fr))`
   - Conversation: bubbles al OK, composer sticky

5. **Offerte-wizard** (`components/dashboard/offerte/`)
   - Per stap een full-screen view op mobile
   - Sticky footer met progress-bar + Vorige/Volgende
   - Multi-column forms → 1-kolom
   - Preview-paneel als `MobileSheet` of aparte stap
   - Manual-offerte controller modal → `MobileSheet`

6. **Agenda** (`app/dashboard/(app)/agenda/`)
   - Default-view op mobile: **dag-lijst** (chronologisch, scrollable)
   - Week-view: opt-in, met `overflow-x: auto` + dag-snap
   - Maand-view: compacte cellen, tap opent dag in `MobileSheet`
   - `AgendaRouteMap`: fullscreen op mobile, sticky filter-bar bovenaan
   - Upcoming-list sidebar → bovenaan stack op <1100px

7. **Reviews** (`app/dashboard/(app)/reviews/`)
   - `.reviewsGrid`: explicit `minmax(min(380px, 100%), 1fr)` zodat cards niet overflowen
   - KPI-bovenrij: 2×2 → 1-kolom
   - Review-card: actie-buttons in overflow-menu

8. **Instellingen** (`app/dashboard/(app)/instellingen/`)
   - `SettingsNav` als chips (44px tap-area), horizontaal scrollen onder 768px
   - Tab-content forms: 1-kolom op <640
   - Prijzen-lijst: stack met label boven, waarde onder op <480
   - Notificaties-tabel: `TableToCards` of stack-rows
   - Toggle-switches: 44×24 minimum
   - Editor-modals (`PrijzenEditor`, `PricingRuleEditor`): `MobileSheet`

9. **Statistieken** (`app/dashboard/(app)/statistieken/`)
   - Al goed gestructureerd. Touch-ups: period-selector tap-area, distribution-bars labels niet overlappen, top-tags lijst-padding

10. **Veldwerk** (`app/dashboard/(app)/veldwerk/`)
    - Al mobile-first. Touch-ups: tap-area check, chevron-icoon minder prominent, sticky filter

### 4.1 Modals & overlays

- **OnboardingWizard**: padding mobile-aware (36→20px), step-progress-bar boven, knoppen sticky onder
- **ExportsModal**: al goed; alleen tap-area check
- **NotificationPanel**: → `MobileSheet` op <640

## 5. Verificatie

- **Real device test**: iPhone (Safari 17+), Android Pixel (Chrome) per pagina
- **DevTools responsive**: 320×568, 375×667, 414×896, 768×1024
- **Lighthouse**: mobile + a11y per route, doel ≥90
- **Touch-only media queries**: `@media (hover: none) and (pointer: coarse)` voor hover-revealed acties → vervangen door zichtbare button of long-press
- **Screenshot-workflow**: `node screenshot.mjs http://localhost:3000/dashboard/...` per pagina, voor/na vergelijking via `temporary screenshots/`

## 6. Scope-grenzen (YAGNI)

Buiten scope deze ronde:
- PWA / installable app / app-icoon
- Native gestures (swipe-to-archive, pull-to-refresh) tenzij triviaal
- Offline mode / service worker caching
- Aparte mobile-routes (alle via responsive CSS, één component-tree)
- Mobile-specific notificaties / push
- Native sharing API integration

## 7. Risico's

- **Lead-detail SplitView**: huidige route is `/leads/[id]`, chat is in dezelfde view. Met `MobileSheet` voor chat moeten we URL-state (open/closed) bijhouden zodat back-button werkt.
- **Offerte-wizard 1-step-per-screen**: bestaande wizard heeft eigen state-machine. Refactor moet behoudend zijn — bestaande props/handlers blijven.
- **Pipeline kanban op mobile**: kolommen horizontaal scrollen werkt, maar drag-and-drop tussen kolommen wordt onmogelijk. Fallback: tap → status-picker `MobileSheet`.
- **TableToCards** als generieke component vereist dat álle leads-table-velden via de `columns`-prop gaan. Huidige `LeadsTable` is custom-render — refactor nodig.

## 8. Volgorde van werken

Sprint 1 — Fundament:
1. Tokens.css uitbreiding (breakpoints, tap-min, density)
2. `MobileSheet` component bouwen + storybook-pagina
3. `TableToCards` component bouwen
4. `SplitView` wrapper bouwen
5. Globale chrome fixes (Topbar, Sidebar, NotificationPanel)

Sprint 2 — Hoge-impact pagina's:
6. Overzicht
7. Inbox
8. Leads (lijst + detail)

Sprint 3 — Tools:
9. Offerte-wizard
10. Agenda

Sprint 4 — Rest + polish:
11. Reviews, Instellingen, Statistieken, Veldwerk, Modals
12. Real-device test rondje + Lighthouse audit
13. Backlog van gevonden issues

Detail-stappenplan volgt via `writing-plans` skill — dit document is het ontwerp.
