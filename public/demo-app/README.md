# Handoff: Frontlix Dashboard (Schoon Straatje tenant)

> **Lees dit eerst.** De HTML/JSX-bestanden in deze map zijn **design references** — high-fidelity prototypes die laten zien hoe het dashboard er uit moet zien en gedraagt. Het is **niet** productie-code om direct te kopiëren. De opdracht is om deze designs **na te bouwen in de bestaande codebase** (React, Vue, of welk framework dan ook is gekozen) met de daar geldende patronen, design tokens en libraries. Als er nog geen codebase is, kies dan een passend framework (bijv. Next.js + Tailwind, of Remix) en implementeer daar.

---

## Overview

Frontlix is een SaaS voor lokale schoonmaak-/onderhoudsbedrijven (in dit prototype: **Schoon Straatje**, een Nederlands voegen-, onkruid- en straatwerkbedrijf). Het dashboard is waar de eigenaar:

1. WhatsApp-gesprekken volgt die door de Frontlix-bot worden afgehandeld
2. Inkomende leads triagert (van eerste vraag → offerte → afspraak → afgerond)
3. Offertes (zowel bot-gegenereerd als handmatig) bekijkt, aanpast en verstuurt
4. De agenda van plaatsbezoeken/uitvoering beheert
5. Reviews verzamelt na afgeronde klussen
6. Veldwerkers een mobile-first view aanbiedt

De UI is Nederlandstalig. De brandvoering is "menselijke ondernemer met een slimme assistent op de achtergrond" — niet corporate, niet over-de-top techy.

## Fidelity

**High-fidelity (hifi)**. Kleuren, typografie, spacing, iconografie, copy en interactie-detail zijn allemaal final. Bouw pixel-perfect na, maar gebruik de UI-library en patterns van de bestaande codebase (bv. shadcn/ui, Mantine, eigen design system) in plaats van de inline styles uit de prototypes letterlijk over te nemen.

Wat **niet** final is en wat je mag vervangen door echte implementaties:
- Mock-data in `src/data.jsx` — vervang door echte API-calls
- LocalStorage-gebaseerde "auth" in `src/screens/Auth.jsx` — sluit aan op het echte auth-systeem
- De `RouteMap.jsx` schematische NL-silhouet — in productie waarschijnlijk Mapbox/MapLibre met echte coördinaten
- De `MobilePreviewShell` in `app.jsx` is een design-tool (mobile preview in een iPhone-bezel) en **niet** onderdeel van de app zelf; negeren

---

## Tech-context van het prototype

Bouwen aan deze prototypes is gedaan in plain HTML + JSX + Babel-in-the-browser, zonder build-step. Concrete verwijzingen:

- **Geen routing-library** — alleen `window.location.hash` met een `useHashRoute` hook in `app.jsx`. In productie vervang je dit door React Router / Next routing.
- **Geen state library** — alleen `useState`/`useEffect`. State management blijft lokaal; alleen `tweaks` (theme/density/sidebar) zijn globaal in `App`.
- **Geen icon library** — alle iconen zijn inline SVG (lucide-style, stroke 1.75) in een `<Icon name="..." size={...}/>`-component in `src/components.jsx`. In productie: vervang door `lucide-react` of een eigen icon-component.
- **Geen chart library** — KPI-trends en `AreaChart` zijn handmatige inline SVG in `src/components.jsx`. In productie: vervang door Recharts/Visx/Chart.js, of laat de SVG-aanpak staan als het simpel genoeg blijft.
- **Globale window-attached components** — door de Babel-in-the-browser setup hangen alle components aan `window`. Dat is **alleen** prototype-gymnastiek; in een normale React-app gewoon `import { ... }`.

---

## Design Tokens

Volledige bron: [`assets/frontlix-tokens.css`](./assets/frontlix-tokens.css). Belangrijkste waarden:

### Kleuren

| Token            | Light          | Dark            | Gebruik |
|------------------|----------------|-----------------|---------|
| `--bg`           | `#FFFFFF`      | `#0B0E14`       | App-/sidebar-achtergrond |
| `--surface`      | `#F9F9F9`      | `#0F131A`       | Body achter cards |
| `--surface-2`    | `#F0F0F0`      | `#161B25`       | Inputs, segments, tracks |
| `--card-bg`      | `#F5F7FA`      | `#141923`       | Card / panel achtergrond |
| `--fg`           | `#1A1A1A`      | `#ECEFF4`       | Primaire tekst |
| `--fg-muted`     | `#555555`      | `#8B95A8`       | Secundaire tekst, labels |
| `--fg-soft`      | `#444444`      | `#C5CCD8`       | Body-tekst |
| `--border`       | `rgba(0,0,0,0.10)` | `rgba(255,255,255,0.08)` | Card- en divider-borders |
| `--border-strong`| `rgba(0,0,0,0.16)` | `rgba(255,255,255,0.16)` | Focus / nadrukkelijke borders |

### Brand

| Token            | Waarde |
|------------------|--------|
| `--primary`      | `#1A56FF` (Frontlix-blauw) |
| `--accent`       | `#00CFFF` (cyaan) |
| `--gradient`     | `linear-gradient(135deg, #1A56FF, #00CFFF)` |
| `--shadow-primary` | `0 4px 24px rgba(26, 86, 255, 0.30)` |

### Semantisch

| Token        | Waarde     | Gebruik |
|--------------|------------|---------|
| `--success`  | `#16A34A`  | Goedgekeurd, live, ✓ |
| `--whatsapp` | `#25D366`  | WhatsApp-specifieke chrome |
| `--danger`   | `#DC2626`  | Afgewezen, uitloggen, errors |
| amber-tonen  | `#F59E0B`/`#B45309` | "wacht op" / "in review" |

### Typografie

- **Font**: `Inter` (Google Fonts), gewichten 400/500/600/700/800/900
- **Schaal** (rem, basis 16): `xs 12 / sm 14 / base 16 / lg 18 / xl 20 / 2xl 24 / 3xl 30 / 4xl 36 / 5xl 48`
- **Headings**: Inter 800/900, letter-spacing `-0.02em` t/m `-0.03em`, line-height `1.08`–`1.3`
- **Body**: Inter 400/500, line-height `1.5`–`1.75`
- **Eyebrow**: 12px, weight 600, uppercase, letter-spacing `0.08em`, in `--primary`

### Spacing-schaal

`4 / 8 / 12 / 16 / 20 / 24 / 32 / 48 / 64 / 96 px` (`--space-1`…`--space-24`).

### Radii

`sm 4 / md 8 / lg 16 / xl 24 / full 9999px`. Cards: `lg`. Buttons: `md`. Avatar/pill: `full`.

### Shadows

| Token | Waarde |
|-------|--------|
| `--shadow-card` | `0 1px 3px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.06)` |
| `--shadow-card-hov` | `0 4px 12px rgba(0,0,0,0.06), 0 16px 48px rgba(0,0,0,0.10)` |
| `--shadow-primary` | `0 4px 24px rgba(26,86,255,0.30)` |
| `--shadow-glow` | `0 0 40px rgba(26,86,255,0.15)` |
| `--shadow-nav` | `0 12px 40px rgba(0,0,0,0.12)` |

### Density-modi

`body.density-compact | density-cozy | density-roomy` — Tweakable. Standaard `cozy`. Bepaalt vooral row-padding in tabellen/lijsten en card-padding.

### Dark mode

`body.dark` triggert de dark-tokens (zie tabel boven). Alles wat custom kleuren gebruikt moet via tokens, niet hardcoded.

---

## App-shell & routing

**Layout** (`Dashboard.html` → `src/app.jsx`):

```
┌────────────────────────────────────────────────────────────────┐
│ Sidebar (240px)        │  Topbar (64px)                        │
│ ─ Logo + tenant        │  ─ menu-toggle  Title/sub             │
│ ─ Werkruimte           │  ─ Search (⌘K)                        │
│   • Overzicht          │  ─ Actions: ViewSwitcher (op /leads), │
│   • Inbox    [2 live]  │     "+ Nieuwe offerte", 🔔            │
│   • Leads    [14]      │                                       │
│   • Agenda   [4]       │  Content area (scrollt)               │
│   • Reviews  [2 live]  │  ┌─────────────────────────────────┐  │
│   • Analyses           │  │  Page content                   │  │
│   • Veldwerk [PWA]     │  │                                 │  │
│ ─ Beheer               │  │                                 │  │
│   • Instellingen       │  └─────────────────────────────────┘  │
│ ─ UserMenu (CT)        │                                       │
└────────────────────────┴────────────────────────────────────────┘
```

**Sidebar** (`Sidebar` in `app.jsx`)

- 240px breed, full-height, witte/donkere `--bg`, rechter `--border`
- Logo (32×32 PNG) + brandmark `Frontl<span class="ix">ix</span>` waarbij `ix` met gradient text-fill
- Tenant-label `Schoon Straatje` (11px, muted)
- Nav-items: 32px-hoge buttons met `<Icon size={16}/>` + label + optioneel `<span class="nav-badge">`
  - Badges met `tone: 'live'` krijgen de green-gradient (live WhatsApp/review-meldingen)
  - Badges met `muted: true` zijn neutrale tellers (14 leads, PWA-label)
- Bottom: `UserMenu` (avatar+naam+role) klikbaar → popup met identity, account, billing, support, uitloggen
- Toggle-bare via Topbar hamburger; app shell transitioned naar `grid-template-columns: 0 1fr`

**Topbar** (`Topbar` in `app.jsx`)

- 64px hoog, sticky, witte achtergrond, bottom `--border`
- Linkerkant: hamburger, page-title + sub
- Midden: search-input met inline `⌘K` keyboard-hint
- Rechterkant: `ViewSwitcher` (alleen op `/leads`), primaire CTA `+ Nieuwe offerte`, notification-bell met red dot
- Notification-panel: zie `src/components/modals.jsx` → `NotificationPanel` (dropdown, recent activity met clickable items die naar `/leads/:id` navigeren)

**Routing**

Hash-based, format: `#/<page>` of `#/leads/:id`. Pages: `overzicht | inbox | leads | leads/:id | agenda | reviews | analyses | veldwerk | instellingen`. Default: `overzicht`. Implementeer in productie met de routing-library van de codebase.

**Auth-gate**

Als er geen `frontlix_user` in localStorage staat, render je het `Auth`-scherm (login/signup/forgot) i.p.v. de app-shell. Zie `src/screens/Auth.jsx` voor het exacte design. In productie vervang je dit door de echte auth-flow van het project (en de localStorage-gymnastiek hoeft niet meer).

---

## Screens / Views

### 1. Overzicht (`#/overzicht`) — `src/screens/Overzicht.jsx`

**Doel:** Live dashboard-home. Wat is er deze week gebeurd, wat staat er vandaag te doen.

**Layout:**
- KPI-grid (4 cards): "Open leads", "Conversie (30d)", "Omzet deze week", "Bot-afhandeling %" — `KpiCard` in `components.jsx`, met sparkline-trend in inline SVG
- Twee kolommen onder de KPI's:
  - **Activity feed** (`ACTIVITY` uit `data.jsx`) — bot-events, lead-updates, review-incoming. Live ticker (nieuwe items poppen er bovenop met fade-in elke ~12s, gesimuleerd via `setInterval`). Elk item: icon, title, sub, time-ago. Clickable → lead-detail.
  - **Vandaag** — drie afspraken in compacte list-form, time + adres + klantnaam, klikbaar.
- Onderkant: brede card met `AreaChart` "Leads per dag (30 dagen)".
- Empty state via `tweaks.empty` toggle — toont `<EmptyState>` met copy "Nog geen leads. Activeer de WhatsApp-bot in Instellingen."

### 2. Inbox (`#/inbox`) — `src/screens/Inbox.jsx`

**Doel:** Alle actieve WhatsApp-gesprekken op één plek (Intercom-style).

**Layout (3-koloms, full-height):**
- **Links (320px):** Filter-tabs (`Alles | Ongelezen | Mijn | Bot | Actie nodig`) + zoekbalk + conversation-list. Elk item: avatar, naam, laatste bericht-preview, timestamp, ongelezen-badge, optioneel `bot`-label.
- **Midden (flex 1):** Actief gesprek. Header met klantnaam, telefoonnummer, status-pill. Berichten-stream (bubbles: bot/klant links, owner rechts). Onderaan composer met snelle-replies + textarea + send.
- **Rechts (320px):** Lead-context. Adres, dienst, m², prijs, button "Open in Leads", quick-actions ("Markeer afgehandeld", "Stuur offerte", "Plan afspraak").

**Interactie:** Klik op conversatie → laadt midden+rechts. Klik op "Open in Leads" → `navigate('leads/' + id)`. Mock data uit `CONVERSATIONS` in `data.jsx`.

### 3. Leads (`#/leads`) — `src/screens/Leads.jsx`

**Doel:** Alle leads in één view, met 3 schakelbare layouts.

**Top-strook:** Filter-chips (status), zoekbalk, count.

**View 1: Pipeline** (default, `view === 'pipeline'`)
- Horizontaal scrollbaar, 5 fase-kolommen uit `PIPELINE_STAGES`: `In gesprek | Offerte review | Offerte uit | Ingepland | Afgerond`
- Elke kolom: header met label + count, daaronder lead-cards. Card: naam + bedrijf, adres, dienst-tags, m², waarde-prijs, status-pill, time-ago, klein avatar.
- Sleepbaar? **Nee**, klik = navigatie naar detail. (Drag-drop is out of scope; alleen visueel pipeline.)

**View 2: Tabel** (`view === 'table'`)
- Compacte data-tabel: Lead-ID, Naam, Adres, Dienst, m², Waarde, Status, Afspraak, Acties. Sorteer-headers, hover-row highlight, density-modes wijzigen row-height.

**View 3: Kaarten/Kanban** (`view === 'kanban'`)
- 3-koloms grid met large cards. Meer visuele info per card (foto-thumbnail, hele samenvatting). Voor visuele triage.

**ViewSwitcher** zit in de Topbar, segmented-control met `Pipeline | Tabel | Kaarten`.

### 4. Lead-detail (`#/leads/:id`) — `src/screens/LeadDetail.jsx`

**Doel:** Alles over één lead, naast het complete WhatsApp-gesprek.

**Layout (2-koloms, full-height):**
- **Links (~60%):** Tab-bar `Info | Offerte | Foto's | Activiteit`
  - **Info-tab:** Klantgegevens, adres met afstand-km, dienst-checklist, m², bijzonderheden (planten, toegang, sleutel-locatie etc.), `Vraag-ondervraging-state` (welke vragen heeft bot al gesteld). Edit-knoppen per veld.
  - **Offerte-tab:** Volledige offerte als opmaakte PDF-preview. Regels, subtotaal, BTW, totaal. Action-bar: "Stuur via WhatsApp", "Download PDF", "Pas aan" (opent `ManualQuoteModal` met pre-fill).
  - **Foto's-tab:** Grid van klantgestuurde foto's (4-koloms), klik → lightbox. Tags per foto (oprit/terras/probleemgebied).
  - **Activiteit-tab:** Volledige tijdlijn — elk bot/owner/klant-event met timestamp.
- **Rechts (~40%):** WhatsApp-conversatie, volledige scrollbare history. Bubbles (klant: grijs links, bot: blauw rechts met 🤖 indicator, owner: groen rechts met avatar). Composer onderaan met snelle-replies.

### 5. Agenda (`#/agenda`) — `src/screens/Agenda.jsx` + `src/components/RouteMap.jsx`

**Doel:** Plaatsbezoeken en uitvoeringsafspraken plannen.

**Views toggleable:**
- **Week** (default) — kalendar met 7 kolommen (ma-zo), tijd-slots verticaal, afspraak-blokken kleurgecodeerd per type (bezoek / uitvoering / call). Klik blok → detail-popover.
- **Kaart** — `<RouteMap>` met schematisch NL-silhouet, pins per stad, lijnen tussen pins die de rijroute van de dag tonen, met afstand-km labels. Tijdslot-strip onder de kaart.

Includes ook **Instellingen** component (de file heet zo door legacy — `Agenda.jsx` exporteert beide).

### 6. Veldwerk (`#/veldwerk`) — `src/screens/Mobile.jsx`

**Doel:** Mobile-first scherm voor de monteur op locatie. Wordt in het prototype getoond binnen een iOS-bezel (uit `lib/ios-frame.jsx`); in productie is dit het echte mobile-PWA-scherm.

**Flow (`phase` state):** `onderweg → aangekomen → bezig → klaar`. Per phase een eigen UI:
- **Onderweg:** Volgende klus card (klant, adres, ETA), navigatie-button naar Apple/Google Maps, "Ik kom eraan" WhatsApp-templated bericht-knop.
- **Aangekomen:** Check-in (timestamp captured), foto-vóór upload, opmerkingen-veld.
- **Bezig:** Timer loopt, taken-checklist, materiaal-gebruik invoer.
- **Klaar:** Foto-na upload, klant-handtekening, "Verstuur opleverbon" knop.

### 7. Reviews (`#/reviews`) — `src/screens/Reviews.jsx`

**Doel:** NPS / klanttevredenheid na afgeronde klussen.

**Layout:**
- KPI's: gemiddelde score, NPS, response-rate
- Filter-tabs: `Alles | Nieuw | 5★ | <4★ | Beantwoord`
- Lijst van reviews als cards: klantnaam, datum, sterren, citaat, knop "Bedank" / "Reageer". Live-badge wanneer nieuwe binnen.
- Quick-reply templates (sjablonen) in een side-panel.

### 8. Analyses (`#/analyses`) — inline in `src/app.jsx`

Lichtgewicht extra screen — KPI-grid (Omzet Q2, Gem. offerte-waarde, Bot-onafhankelijk %, Cancellations) met sparkline-trends, plus brede 12-maands omzet-area-chart. Voor de echte productie-versie: hier komt waarschijnlijk de uitgebreide analytics-suite.

### 9. Instellingen (`#/instellingen`) — in `src/screens/Agenda.jsx`

**Tabbed settings:**
- **Bedrijf:** Naam, KVK, adres, logo-upload, brand-kleur
- **Diensten:** Catalog van diensten (Voegen invegen, Onkruidbehandeling, etc.) met prijzen per m², per uur, of vast
- **Bot:** WhatsApp-nummer, welkomstbericht, openings-uren, escalation-rules, prompt-templates
- **Team:** Owner + medewerkers, rollen
- **Integraties:** Mollie, Google Calendar, Sheets-export

### 10. Onboarding modal — `src/screens/Onboarding.jsx`

**7-staps wizard**, opent als modal voor nieuwe klanten:
1. Welkom + uitleg
2. Bedrijfsgegevens
3. Diensten + prijzen
4. WhatsApp-koppeling
5. Bot-persona (toon, taalgebruik)
6. Eerste lead-test
7. Klaar!

Progress-bar boven, "Volgende"/"Vorige", "Sla over" rechts. Triggert via `window.__openOnboarding()`.

### 11. Auth — `src/screens/Auth.jsx`

Drie views: `login | signup | forgot`. Gradient-achtergrond met blauwe flares (zie `assets/flare-blue.png`), gecentreerde card. Branded met Frontlix-logo + tagline. Form: e-mail/wachtwoord + "Onthoud mij" + "Wachtwoord vergeten" link.

### 12. ManualQuoteModal — `src/components/ManualQuote.jsx`

**Wizard-style modal** voor de owner om handmatig een offerte te bouwen (los van de bot). Steps: klant → dienst → regels → preview → versturen. Triggert via `window.__openManualQuote()` of de Topbar "+ Nieuwe offerte" button. **Belangrijk:** dit is met afstand het grootste component (1242 lines) — kijk goed naar de exacte UI.

### 13. ExportsModal — `src/components/Exports.jsx`

Modal voor data-export. Kies type (`leads / offertes / reviews`), format (`csv / xlsx / pdf`), periode (`7d / 30d / 90d / custom`). Download-knop. Triggert via `window.__openExport()`.

---

## Interactie- & gedrags-details

### Globale gedragingen
- **Sidebar toggle:** Hamburger in topbar collapsed/expand-t sidebar met 250ms ease-cubic transitie.
- **Notifications:** Bell-icon in topbar opent een dropdown panel; klik buitenpaneel = sluit; clickable items navigeren naar lead-detail.
- **Search (⌘K):** In het prototype niet functioneel uitgewerkt; in productie: command-palette implementeren.
- **Hover states:** Cards krijgen `--shadow-card-hov` + lichte translate-y(-2px) over 200ms ease. Nav-items krijgen `--card-hover-bg`.
- **Active states:** Nav-item `active` heeft `--primary` linker-border-accent + lichte primary-tinted-bg.
- **Loading states:** Niet expliciet ontworpen in prototype — gebruik de standaard skeleton/spinner van de codebase.
- **Error states:** Form-errors als rode caption onder velden; toast-meldingen rechtsboven voor failed-actions (zie codebase-conventies).

### Live-feel touches
- `Overzicht` activity feed simuleert real-time updates (nieuwe items elke 8–15 sec). In productie via Pusher/WebSocket.
- `Inbox` typing-indicators (3-dots bubble) in mock-data. In productie via real-time channel.
- Badges met `tone: 'live'` (Inbox `2`, Reviews `2`) krijgen subtle pulse-animation.

### Animaties
- **Sidebar collapse:** 250ms `cubic-bezier(0.16, 1, 0.3, 1)`
- **Modal entry:** Fade-in backdrop 200ms + scale-up van 0.96 → 1.0 op de content
- **Activity-feed items:** Fade-in vanaf top
- **Hover-translate:** 200ms ease-out

### Responsief gedrag
Het dashboard is **desktop-first** (target ≥1280px). Onder 1024px wordt de sidebar overlay-style. Onder 768px collapse-t alles naar single-column en is `Veldwerk` de aanbevolen route (zie `MobilePreviewShell` in `app.jsx` voor hoe het op een mobile-scherm zou kunnen scrollen).

### Density-modi
`compact | cozy (default) | roomy` — Wijzigen row-padding (compact 6/8, cozy 10/12, roomy 16/20) en card-padding. Implementeer als CSS-classe op de root + tokens, niet als prop op elk component.

### Dark mode
Eén class op `<body class="dark">` triggert alle dark-tokens uit `frontlix-tokens.css` (zie boven). Alle custom kleuren in de codebase moeten via tokens lopen.

---

## State management

In het prototype is alle state lokaal (`useState`). Wat je in productie waarschijnlijk wél centraal wilt:

| State | Scope | Note |
|-------|-------|------|
| `user` (auth) | global | Vervang localStorage door echte auth |
| `leads` lijst | server-state (React Query / SWR) | Refresh on focus + websocket-invalidation |
| `conversations` (WhatsApp) | server-state + realtime channel | Pusher / Ably |
| `notifications` | server-state + realtime | |
| `tweaks` (theme/density/sidebar) | local + localStorage persist | Niet aan server-side |
| `manualQuote` modal-open | local | |
| `onboarding` step | server (per-user flag) | |

---

## Assets

In `assets/`:
- `frontlix-logo.png` — 32×32 brand-logo (gebruikt in sidebar, auth-screen, mobile-frame)
- `flare-blue.png` — gradient-flare voor auth-screen achtergrond
- `flares.png` — variant met meerdere flares (back-up)
- `frontlix-tokens.css` — **single source of truth** voor design tokens

In productie: vervang door SVG-varianten van het logo als ze beschikbaar zijn; flares kunnen weg of als CSS-gradient nagebouwd.

---

## Bot-vocabulaire (data dictionary)

Voor consistentie tussen UI en backend, hier de exacte enum-waardes uit `src/data.jsx`:

**Fase** (gesprek-fase met klant):
`info_verzamelen | offerte_besproken | onderhandelen | datum_kiezen | afspraak_bevestigd | afspraak_geannuleerd`

**Status** (lead-status in dashboard):
`nieuw | in_gesprek | wacht_bevestiging | info_compleet | offerte_verstuurd | goedgekeurd | afgewezen | handoff`

**Diensten** (services-catalog):
`invegen | preventieve_onkruid | preventieve_onkruidbeheersing | beschermlaag | onderhoud | plan_4_weken | plan_8_weken | plan_12_weken | plan_16_weken | reinigen`

**Pipeline-fase** (5-kolommen view):
`info | review | verstuurd | gepland | klaar`

Alle Nederlandse labels in `FASES`, `STATUS`, `DIENST_LABELS` constants — gebruik die als bron voor i18n.

---

## Bestandsstructuur in deze handoff

```
design_handoff_frontlix_dashboard/
├── README.md                          ← dit bestand
├── Dashboard.html                     ← entry: laadt React+Babel, mount app
├── assets/
│   ├── frontlix-tokens.css            ← design tokens (single source)
│   ├── frontlix-logo.png
│   ├── flare-blue.png
│   └── flares.png
├── src/
│   ├── styles.css                     ← global app-shell styles
│   ├── data.jsx                       ← mock data (LEADS, CONVERSATIONS, ACTIVITY, FASES, STATUS, …)
│   ├── components.jsx                 ← Icon set, KpiCard, AreaChart, Pill, primitives
│   ├── app.jsx                        ← App shell: Sidebar, Topbar, routing, Tweaks
│   ├── components/
│   │   ├── modals.jsx                 ← PDFPreview, NotificationPanel
│   │   ├── ManualQuote.jsx            ← 5-step manual quote wizard
│   │   ├── RouteMap.jsx               ← schematic NL silhouette + route pins
│   │   ├── Exports.jsx                ← export modal
│   │   └── EmptyStates.jsx            ← EmptyState component
│   └── screens/
│       ├── Overzicht.jsx              ← dashboard home
│       ├── Inbox.jsx                  ← unified WhatsApp inbox
│       ├── Leads.jsx                  ← 3-view leads overview
│       ├── LeadDetail.jsx             ← lead detail + conversation
│       ├── Agenda.jsx                 ← agenda + Instellingen (combined file)
│       ├── Mobile.jsx                 ← Veldwerk-PWA screen
│       ├── Reviews.jsx                ← reviews/NPS
│       ├── Onboarding.jsx             ← 7-step onboarding wizard
│       └── Auth.jsx                   ← login/signup/forgot
└── lib/
    ├── ios-frame.jsx                  ← iPhone bezel (alleen voor preview, weglaten in prod)
    └── tweaks-panel.jsx               ← design-tool tweaks-panel (weglaten in prod)
```

---

## Volgorde van implementatie (suggestie)

1. **Setup:** Routing, design tokens (`frontlix-tokens.css` → Tailwind theme of CSS vars), Inter font.
2. **Shell:** `Sidebar`, `Topbar`, `UserMenu`, `NotificationPanel`. Werkende routing tussen lege pages.
3. **Primitives:** `Icon`, `Pill/Badge`, `KpiCard`, `AreaChart`, `EmptyState`, `Modal`. Verwijs naar `src/components.jsx` en `EmptyStates.jsx`.
4. **Overzicht** — relatief simpel scherm met primitives, goede smoke-test voor het systeem.
5. **Leads** (alle 3 views) + **LeadDetail** — kern van het dashboard.
6. **Inbox** — herbruikt veel uit LeadDetail (chat-bubbles, lead-context-panel).
7. **Agenda** + **RouteMap** + **Reviews**.
8. **ManualQuoteModal**, **ExportsModal**, **Onboarding** modals.
9. **Auth** + **Veldwerk** (PWA-scherm).
10. **Tweaks** (density/dark-mode) als finishing touch.

---

## Vragen / open punten

Stel deze aan de Product Owner voordat je begint:
- Welke routing-library? (Vermoedelijk afhankelijk van het framework — Next.js? Remix? Standalone Vite + React Router?)
- Welke UI-library? (Tailwind+shadcn? Mantine? Eigen design system?) — Zie of `frontlix-tokens.css` 1-op-1 te mappen is naar de Tailwind theme.
- Welke backend-API-shape? De `data.jsx` mock is de "ideale" data-shape vanuit UI-perspectief.
- Realtime-stack? Pusher / Ably / eigen WebSocket?
- WhatsApp-integratie: WhatsApp Business API direct of via 360dialog/MessageBird?
- Auth-stack? (Clerk / Supabase Auth / NextAuth?)
- Hosting voor PWA-veldwerk-mode?
