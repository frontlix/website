# Mobile Overzicht Shell Make-over — Design Spec

**Datum:** 2026-05-26
**Scope:** Nieuwe mobiele app-shell + nieuwe mobiele Overzicht-pagina + 3 drilldowns. Andere routes behouden de bestaande responsive-CSS (uit spec 2026-05-21) als fallback.
**Doel:** Pixel-perfect implementatie van de handoff in `mobile-overzicht-handoff/`, gekoppeld aan echte data.
**Niet-scope:** Volledige make-over van Leads/Inbox/Agenda/Lead-detail op mobiel (volgende sprint).

---

## 1. Architectuur

Het bestaande dashboard rendert `<Sidebar>` + `<Topbar>` + `<main>{children}</main>` in `app/dashboard/(app)/layout.tsx`. Onder 640px wordt deze hele chrome **vervangen** door een mobile shell (bottom-nav + optionele mobile-header), zonder breaking changes voor desktop.

**Visualisatie:**

```
<DashboardChrome>                  ← nieuwe client-wrapper
  <DesktopChrome>                  ← Sidebar + Topbar + main (visible ≥ 641px)
    {children}
  </DesktopChrome>
  <MobileShell>                    ← MobileHeader? + main + BottomNav (visible ≤ 640px)
    {children}
  </MobileShell>
</DashboardChrome>
```

**Beslissing — beide chromes in DOM, CSS-driven toggle.** Server-render is identiek tussen server en client (geen hydration-mismatch), `useIsMobile` is alleen nodig waar JS-gedrag verschilt. Geen `display: none`-flits omdat de media-query op CSS-niveau direct grijpt.

**Per-route gedrag:**
- `/dashboard` (Overzicht): binnen `<DesktopChrome>` blijft de huidige SSR-Overzicht, binnen `<MobileShell>` mount een nieuwe `<MobileOverzicht>` met eigen widgets, gevoed door dezelfde server-prefetched data. De rijke `<MobileOverzichtHeader>` wordt **in plaats van** de standaard `<MobileShellHeader>` gerenderd (greeting + sub-line + 3 acties).
- Andere routes (Leads, Inbox, Agenda, Reviews, Statistieken, Veldwerk, Instellingen): `<MobileShell>` rendert `{children}` één-op-één — de bestaande responsive-CSS uit spec 2026-05-21 doet z'n werk. Boven `{children}` mount een **dunne `<MobileShellHeader>`** (56px hoog) met page-titel uit `getMeta(pathname)` + zoek/+/bel (dezelfde 3 acties als op /dashboard). Dit voorkomt regressie: zoeken/notificaties/+offerte zijn altijd bereikbaar op mobiel, op elke route.

---

## 2. Breakpoint

**640px** (project-conform met bestaande responsive CSS). De `useIsMobile` hook wrapt `useMediaQuery('(max-width: 640px)')`.

```ts
// hooks/useIsMobile.ts
'use client'
import { useMediaQuery } from './useMediaQuery'
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 640px)')
}
```

---

## 3. Bestandsstructuur

```
components/dashboard/mobile/
├── DashboardChrome.tsx              ← client-wrapper (mount desktop + mobile chrome)
├── DashboardChrome.module.css
├── MobileShell.tsx                  ← <MobileShellHeader|MobileOverzichtHeader> + <main>{children}</main> + <BottomNav>
├── MobileShell.module.css
├── MobileShellHeader.tsx            ← dunne default header (titel + zoek/+/bel) — voor alle non-/dashboard routes
├── MobileShellHeader.module.css
├── HeaderActions.tsx                ← shared 🔍 / ➕ / 🔔 acties (hergebruikt door MobileShellHeader én MobileOverzichtHeader)
├── HeaderActions.module.css
├── BottomNav.tsx                    ← 5 tabs + Meer-trigger
├── BottomNav.module.css
├── MeerSheet.tsx                    ← slide-up sheet
├── MeerSheet.module.css
├── MobileNotificationsSheet.tsx     ← wrappert NotificationPanel-lijst in sheet
├── MobileNotificationsSheet.module.css
├── overzicht/
│   ├── MobileOverzicht.tsx          ← drilldown state-manager + base
│   ├── MobileOverzicht.module.css
│   ├── MobileOverzichtHeader.tsx    ← greeting + sub-line + 3 actions
│   ├── MobileOverzichtHeader.module.css
│   ├── AiBriefCard.tsx              ← Surface · Samenvatting kaart
│   ├── AiBriefCard.module.css
│   ├── HeroKpiCard.tsx              ← omzet + SVG goal-ring
│   ├── HeroKpiCard.module.css
│   ├── MiniKpiGrid.tsx              ← 2×2 grid
│   ├── MiniKpiGrid.module.css
│   ├── UrgentBlock.tsx              ← Wat-nu preview top-3
│   ├── UrgentBlock.module.css
│   ├── VandaagBlock.tsx             ← Vandaag preview top-3
│   ├── VandaagBlock.module.css
│   ├── ActivityFeedBlock.tsx        ← Recent feed top-3
│   └── ActivityFeedBlock.module.css
└── drilldowns/
    ├── MobileDrilldownLayer.tsx     ← transitie + history-handling (shared)
    ├── MobileDrilldownLayer.module.css
    ├── WatNuView.tsx
    ├── WatNuView.module.css
    ├── VandaagView.tsx
    ├── VandaagView.module.css
    ├── ActiviteitView.tsx
    └── ActiviteitView.module.css

hooks/
├── useIsMobile.ts                   ← nieuw, wrappert useMediaQuery
└── useBodyScrollLock.ts             ← nieuw, hergebruikt door alle sheets
```

**Bestaande code die wijzigt:**
- `app/dashboard/(app)/layout.tsx` — wrap content in `<DashboardChrome>`.
- `styles/tokens.css` — nieuwe mobile-tokens (zie §6).
- `lib/dashboard/surface-summary.ts` — extract van `buildSummary` uit `SurfaceDailySummary.tsx`. Desktop wijzigt niet (importeert vanaf nieuwe locatie).
- `lib/dashboard/lead-queries.ts` — nieuwe export `leadsArrivedTodayAndTomorrow()`.
- `app/dashboard/(app)/page.tsx` — server-prefetch geeft data aan zowel `<DesktopOverzicht>` als `<MobileOverzicht>`.
- `app/dashboard/(app)/instellingen/` — input voor `omzet_doel_maand`.

**Database-migratie:**
- `tenant_settings.omzet_doel_maand numeric NULL` (Euro-bedrag).

**Dode code voor opruim (fase 5 — vraag confirmation per item):**
- Mobile Overzicht-specifieke `@media`-blokken in `components/dashboard/overzicht/*.module.css`:
  - `KpiHeroCard.module.css` (hero compact, 2-koloms, ring weg)
  - `KpiMiniCard.module.css` (mini-cards even hoog op mobile)
  - `KpiTabs.module.css` (3 tabs zonder reactietijd)
  - Eventuele andere `@media (max-width: 640px)`-blokken in overzicht-componenten
- `Sidebar.module.css` `@media (max-width: 768px)` (drawer-gedrag is dood zodra `<DesktopChrome>` op ≤640 niet mount, mits 768 nergens anders nog matters)
- `Topbar.module.css` mobile-blokken (idem)
- Hamburger-knop in `Topbar.tsx` (idem)
- `MobileSearchSheet` (bestaand) — **behouden**, wordt geopend door de zoek-actie in `HeaderActions`

---

## 4. Data-flow

| Widget | Bron | Status |
|---|---|---|
| Greeting + voornaam | `getGreeting()`, `getVoornaam()` | bestaand |
| Sub-line "X leads vandaag · Y morgen" | `leadsArrivedTodayAndTomorrow()` | **nieuw** in `lead-queries.ts` |
| AI-brief tekst | `buildSurfaceSummary(stats)` | **extract** uit `SurfaceDailySummary.tsx` naar `lib/dashboard/surface-summary.ts` |
| Hero KPI omzet (€18.420) | sub-query in `stats-queries.ts` | bestaand |
| Hero KPI doel + ring% | `tenant_settings.omzet_doel_maand` | **nieuw** kolom |
| Mini-KPI Nieuwe leads | `countLeads()` + vergelijking | bestaand |
| Mini-KPI Conversie | `countConverted()`, `countLeads()` | bestaand |
| Mini-KPI Reactietijd | `avgReactietijdMs()` | bestaand |
| Mini-KPI Offertes open | `countOpenOffertes()` | bestaand |
| Wat-nu lijst (preview + drilldown) | `deriveActions()` | bestaand |
| Vandaag lijst (preview + drilldown) | `getAppointmentsForMonth()` filter vandaag | bestaand |
| Activiteit feed (preview + drilldown) | `buildActivityFeed()` | bestaand |
| Tenant + user info (MeerSheet) | `requireApprovedUser()` | bestaand |

**Eén SSR-fetch op `/dashboard`, twee renders.** Geen dubbele queries voor desktop vs mobile. Drilldowns krijgen de volledige lijst als prop — geen losse fetch.

**Placeholder-states:**
- `omzet_doel_maand IS NULL`: HeroKpiCard toont geen ring + "Stel je maanddoel in" → CTA naar `/instellingen?focus=omzet-doel`.
- Lege Wat-nu/Vandaag/Activiteit-lijst: empty-state copy ("Niks urgent — koffiepauze.").

---

## 5. Drilldown state-model

```ts
type DrilldownView = null | 'watnu' | 'vandaag' | 'feed'
const [sub, setSub] = useState<DrilldownView>(null)
```

**Twee absolute lagen** in `<MobileOverzicht>`'s main-area:

1. **Base** — `<OverzichtBase>` (header + AI-brief + hero + mini-KPIs + 3 preview-blocks). `transform: translateX(-20%) scale(.96); opacity: 0` als `sub !== null`.
2. **Drilldown** — `<MobileDrilldownLayer>` rendert één van WatNu/Vandaag/Activiteit. Start `translateX(100%)`, animeert naar `translateX(0)`. Easing `var(--ease-ios)`, 280ms.

**Browser-back integratie:**

```ts
function openDrilldown(view: DrilldownView) {
  setSub(view)
  history.pushState({ drilldown: view }, '', window.location.href)
}

function closeDrilldown() {
  if (history.state?.drilldown) history.back()  // triggert popstate-handler
  else setSub(null)
}

useEffect(() => {
  const onPop = (e: PopStateEvent) => {
    if (!e.state?.drilldown) setSub(null)
  }
  window.addEventListener('popstate', onPop)
  return () => window.removeEventListener('popstate', onPop)
}, [])
```

**Bottom-nav tijdens drilldown:**
- "Overzicht"-tab blijft gehighlight (drilldown is sub-state van Overzicht).
- Tikken op andere tab: eerst `setSub(null)` (+ history-cleanup), dan `router.push(route)`.
- Drilldown heeft eigen sticky top-bar: `← Terug` + titel + (optioneel) filter-icoon rechts.

**Refresh-gedrag:** refresh in drilldown brengt user terug op `/dashboard` zonder drilldown. URL was nooit gewijzigd. Geen verlies — gangbaar iOS app-state-after-coldlaunch gedrag.

---

## 6. Styling & tokens

**Conventie:** CSS Modules + CSS-custom-properties uit `styles/tokens.css`. Geen inline styles, geen `!important`, geen Tailwind.

**Mapping handoff `makeATheme` → Frontlix-tokens:**

| Handoff JS | Frontlix CSS-var |
|---|---|
| `t.accent` (#1A56FF) | `var(--color-primary)` |
| `t.accent2` (#00CFFF) | `var(--color-accent)` |
| gradient | `var(--color-gradient)` |
| `t.bg` / `t.surface` / `t.surface2` / `t.elev` | bestaande dashboard-tokens |
| `t.fg` / `t.fgMuted` / `t.fgSoft` | `var(--color-text)` / `--color-text-muted` / dashboard-soft |
| `t.border` / `t.borderSoft` | `var(--color-border)` / dashboard subtle |
| `t.success` / `t.warning` / `t.danger` / `t.wa` | dashboard-tokens |

**Nieuwe tokens (in `styles/tokens.css`):**

```css
:root {
  --mobile-header-h: 56px;
  --mobile-bottom-nav-h: 56px;
  --mobile-safe-area-bottom: env(safe-area-inset-bottom, 0px);
  --mobile-content-pad: var(--space-4);
  --ease-ios: cubic-bezier(.32, .72, 0, 1);
  --dur-drilldown: 280ms;
  --dur-sheet: 320ms;
  --radius-card-mobile: 16px;
  --radius-sheet: 20px;
}
```

**Dark mode:** bestaand (`.dark` class). Mobile-componenten gebruiken puur tokens → dark mode "just works" zodra de Meer-sheet-toggle aanstaat.

**Hit-targets (alle interactieve elementen ≥ 40px):**

| Element | Hoogte |
|---|---|
| Bottom-nav tab | 56px (incl. label + safe-area) |
| Header-icons (zoek/+/bel) | 40px |
| AI-brief primaire CTA | 36px binnen tap-veld ≥ 56 (hele kaart) |
| Mini-KPI tile | 86px |
| Wat-nu / Vandaag / Feed rij | 56px |
| Meer-sheet rij | 60px |
| Drilldown filter-chip | 32px hoog, ≥ 64px breed |

**Sheet body-scroll-lock:** `useBodyScrollLock` hook (`document.body.style.overflow = 'hidden'` met cleanup). Hergebruikt door MeerSheet, MobileNotificationsSheet, MobileSearchSheet.

**Safe-area:** bottom-nav `padding-bottom: var(--mobile-safe-area-bottom)`.

---

## 7. Header op `/dashboard` (mobile)

```
┌─────────────────────────────────────────────
│ Goedemiddag {voornaam}     [🔍]  [➕]  [🔔]
│ ● 14 leads vandaag · 4 morgen
└─────────────────────────────────────────────
```

- **🔍** → opent `MobileSearchSheet` (bestaand), submit → `router.push('/leads?q=...')`.
- **➕** → gradient-rond 40×40, `<Link href="?nieuwe-offerte=1" scroll={false}>`. `ManualOfferteController` (al gemount) opent de wizard.
- **🔔** → opent `MobileNotificationsSheet` (nieuw, wrappert `NotificationPanel`-lijst in een full-screen sheet). Rode dot bij `unreadCount > 0`.

**Op andere mobile-routes** rendert `MobileShell` automatisch de dunne `<MobileShellHeader>`: page-titel uit `getMeta(pathname)` links + dezelfde 3 acties rechts (🔍 / ➕ / 🔔). Hoogte: `var(--mobile-header-h)` (56px). De 3 acties zijn shared utility-componenten zodat `MobileOverzichtHeader` en `MobileShellHeader` ze allebei gebruiken (geen duplicate logica).

---

## 8. Meer-sheet anatomie

```
─── drag-handle ───────────────
MEER                         Sluit
─────────────────────────────────
⭐ Reviews              [count] ›   → /reviews
   2 nieuwe deze week
📊 Analyses                    ›   → /statistieken
   Conversie, omzet, bot-prestaties
🚚 Veldwerk           [PWA] ›   → /veldwerk
   Voor onderweg · iOS-frame demo
─────────────────────────────────
   ☀️ Schakel naar donker         ← bestaande ThemeToggle inline
─────────────────────────────────
 [CT] Christiaan Tromp
       Owner · Schoon Straatje
                    [Instellingen] → /instellingen
             Uitloggen             → /dashboard/logout
```

- Slide-up via `transform: translateY(110% → 0)`, easing `var(--ease-ios)`, `var(--dur-sheet)`.
- Backdrop `rgba(0,0,0,.36)` tap-to-dismiss.
- `[PWA]` is **puur visueel label** — geen technische scope voor PWA-installatie in deze spec.

---

## 9. Bouw-volgorde (gefaseerd, parallelliseerbaar)

Tussenstappen waar elke fase los te reviewen valt in browser/DevTools.

**Fase 0 — Voorwerk (alles parallel)**
- 0a. SQL-migratie: `tenant_settings.omzet_doel_maand numeric NULL`
- 0b. Settings-form: input voor maanddoel
- 0c. Nieuwe tokens in `styles/tokens.css`
- 0d. `hooks/useIsMobile.ts`
- 0e. `hooks/useBodyScrollLock.ts`
- 0f. Extract `lib/dashboard/surface-summary.ts` uit `SurfaceDailySummary.tsx` (desktop blijft groen)
- 0g. `leadsArrivedTodayAndTomorrow()` toevoegen aan `lead-queries.ts`

**Check:** desktop draait identiek, build groen, migratie ge-deployed.

**Fase 1 — Mobile shell (deels parallel)**
- 1a. `DashboardChrome.tsx` + CSS-driven media-toggle
- 1b. `MobileShell.tsx` (kiest header-variant op basis van pathname)
- 1c. `BottomNav.tsx` met 5-tabs + Meer-trigger
- 1d. `MobileShellHeader.tsx` met shared HeaderActions (zoek/+/bel) — gebruikt door fase 2 ook
- 1e. `MeerSheet.tsx` (parallel met 1a-d)
- 1f. Integratie in `app/dashboard/(app)/layout.tsx`

**Check:** bottom-nav onderaan op ≤640px, tabben tussen routes werkt, MeerSheet opent/sluit/navigeert. Desktop ongewijzigd.

**Fase 2 — Mobile Overzicht widgets (alle 6 widgets parallel)**
- 2a. `MobileOverzichtHeader.tsx` (incl. wiring search/+/bell)
- 2b. `AiBriefCard.tsx`
- 2c. `HeroKpiCard.tsx` (SVG goal-ring, geen lib)
- 2d. `MiniKpiGrid.tsx`
- 2e. `UrgentBlock.tsx`
- 2f. `VandaagBlock.tsx`
- 2g. `ActivityFeedBlock.tsx`
- 2h. `MobileOverzicht.tsx` (compositie + page-integratie) **sequentieel** na 2a-g

**Check:** mobile Overzicht pixel-perfect t.o.v. screenshot 1 met echte data.

**Fase 3 — Drilldowns**
- 3a. `MobileDrilldownLayer.tsx` (foundation: transitie + history-handling)
- 3b. `WatNuView.tsx` (parallel met 3c, 3d)
- 3c. `VandaagView.tsx`
- 3d. `ActiviteitView.tsx`
- 3e. Bind "Alles bekijken"-knoppen in MobileOverzicht aan `setSub()` **sequentieel** na 3a-d

**Check:** alle 3 drilldowns openen pixel-perfect, browser-back sluit, tab-switch sluit. Screenshots 3, 4, 5.

**Fase 4 — Sheets (parallel)**
- 4a. `MobileNotificationsSheet.tsx`
- 4b. MobileSearchSheet integratie / re-style (klein)

**Check:** beide sheets openen vanaf header, body-scroll-lock werkt.

**Fase 5 — Opschoning (sequentieel, met confirmation per delete)**
- 5a. Per item flaggen: Overzicht-mobile-CSS-blokken, Sidebar 768px-drawer, Topbar mobile, hamburger.
- 5b. `npm run lint` + `npm run build`.
- 5c. Puppeteer-screenshots vergelijken met handoff.

---

## 10. Acceptatie-criteria

- [ ] Op viewport ≤640px: bottom-nav onderaan op alle dashboard-routes, geen sidebar/topbar zichtbaar.
- [ ] Tikken op de 5 tabs navigeert correct, Meer opent de sheet.
- [ ] `/dashboard` toont nieuwe MobileOverzicht (pixel-perfect t.o.v. screenshot 1) met echte data — rijke MobileOverzichtHeader bovenaan.
- [ ] Andere routes (`/leads`, `/inbox`, `/agenda`, etc.) tonen hun bestaande responsive layout binnen de mobile shell, mét dunne MobileShellHeader bovenaan (titel + 🔍 / ➕ / 🔔).
- [ ] 3 drilldowns openen vanuit "Alles bekijken"-knoppen met iOS-stijl transitie (screenshots 3, 4, 5).
- [ ] Browser-back en tab-switch sluiten een open drilldown.
- [ ] Header + (gradient) opent ManualOfferteModal (al getest desktop-zijde).
- [ ] Header 🔔 opent NotificationPanel als full-screen sheet.
- [ ] Header 🔍 opent zoek-sheet en submit naar `/leads?q=`.
- [ ] Maand-doel-veld in `/instellingen` werkt; HeroKpiCard toont ring of placeholder afhankelijk van waarde.
- [ ] Dark-mode toggle in MeerSheet werkt op alle mobile-widgets.
- [ ] Desktop UX op viewports ≥641px is identiek aan vóór deze sprint.
- [ ] `npm run lint` + `npm run build` groen.

---

## 11. Open vragen voor implementatie (niet-blocking)

- Veldwerk PWA-installatie-prompt: later — `[PWA]`-label is voorlopig cosmetisch.
- Pull-to-refresh op lange feeds: out-of-scope, volgende sprint.
- Push-notificaties: out-of-scope.
