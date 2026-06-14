# Gap-brief: App-niveau (chrome + globale features) (naar pariteit)

Sluit deze gaten in v2 t.o.v. het bestaande dashboard. Hergebruik de bestaande componenten + server-actions (verzin niets nieuws). v2-look (var(--rb-*), v2 ui-primitives, lucide, huisstijl). Behoud demo-fallback. Focus eerst op HOOG, dan MIDDEL.

## [hoog] MIST: Desktop Sidebar (left navigation panel)

Bestaande versie: Sidebar.tsx met volledige navigation (Overzicht, Inbox, Leads, Agenda, Reviews, Analyses, Veldwerk, Instellingen), bedrijfsnaam-header, UserMenu onderaan. V2 heeft alleen glas-pill-nav in de header, geen zijbalk. Ontbreekt: links-gepositioneerde persistent nav, bedrijfsnaam-display in sidebar-header, disabled-state voor 'Veldwerk'. Te hergebruiken: Sidebar.tsx-logica en styling.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/Sidebar.tsx`

## [hoog] MIST: Topbar met zoek-knop, thema-toggle en notificatie-bel

Bestaande versie: Topbar.tsx met search-form, ⌘K focus-trigger, LeadsViewSwitcher, 'Nieuwe offerte'-knop, ThemeToggle, NotificationPanel met bell-icon en badge. V2 shell: heeft 'Nieuwe offerte'-knop en avatar, maar geen topbar. Ontbreekt compleet: header-zoek, ⌘K support, LeadsViewSwitcher, NotificationPanel (bell + dropdown). Te hergebruiken: TopbarServer.tsx, Topbar.tsx client logic, NotificationPanel.tsx.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/Topbar.tsx, /Users/christiaantromp/Desktop/Frontlix website/components/dashboard/TopbarServer.tsx`

## [hoog] MIST: NotificationPanel (bel met dropdown, mark-as-read)

Bestaande versie: volledige NotificationPanel.tsx met bel-knop, dropdown-lijst, ongelezen-badge (unreadCount), markNotificationReadAction, markAllReadAction server-actions. V2 heeft geen notifications-UI ergens. Ontbreekt: bel-icoon in header, notification-dropdown, ongelezen teller, 'Mark all read'-knop. Te hergebruiken: NotificationPanel.tsx (client), TopbarServer.tsx (fetches via getRecentNotifications + getUnreadNotificationCount).

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/NotificationPanel.tsx, /Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/notifications/read-actions.ts`

## [hoog] MIST: UserMenu (met avatar, email, logout)

Bestaande versie: UserMenu.tsx in Sidebar footer, dropdown met avatar + initials + naam (uit email-prefix) + 'Owner-account' badge + Uitloggen-link. V2 shell: heeft avatar rechtsboven als link naar /instellingen, maar geen dropdown-menu en geen logout-functie. Ontbreekt: avatar-dropdown, profiel-info-strip, logout-link. Te hergebruiken: UserMenu.tsx component (aanpassen voor v2 header positioning).

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/UserMenu.tsx`

## [hoog] MIST: Logout-flow

Bestaande versie: UserMenu.tsx en MeerSheet.tsx linken naar /logout (GET route). V2 heeft geen logout-UI. Ontbreekt: logout-knop/link in header of user-menu. Te hergebruiken: bestaande /logout route (auth-layer), UserMenu.tsx logout-link.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/UserMenu.tsx (line 65), /Users/christiaantromp/Desktop/Frontlix website/components/dashboard/mobile/MeerSheet.tsx (line 215)`

## [hoog] MIST: Mobile chrome (bottom nav, sheet, top header)

Bestaande versie: volledige DashboardChrome+MobileShell+BottomNav+MeerSheet-stack voor <641px, met mobile-speficieke header + notifications-sheet + meer-sheet. V2 is desktop-only (geen mobile-targeting op breakpoints). Ontbreekt: volledig mobile-layout, bottom-nav, mesheet, mobile-notificaties-sheet, mobile-veldwerk-component. Te hergebruiken: mobile/* componenten.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/mobile/DashboardChrome.tsx, /Users/christiaantromp/Desktop/Frontlix website/components/dashboard/mobile/MobileShell.tsx, /Users/christiaantromp/Desktop/Frontlix website/components/dashboard/mobile/BottomNav.tsx, /Users/christiaantromp/Desktop/Frontlix website/components/dashboard/mobile/MeerSheet.tsx`

## [hoog] MIST: Veldwerk-pagina en -component (fieldwork tracking)

Bestaande versie: Volledige /veldwerk pagina (app/dashboard/(app)/veldwerk/) met VeldwerkPhases.tsx (monteur-stepper met fase-tracking) en mobile-variant (MobileVeldwerk.tsx). V2 heeft /veldwerk in demo-data als 'binnenkort' maar geen werkende pagina. Ontbreekt: veldwerk-pagina-impl, VeldwerkPhases-component, phase-tracking-UI. Te hergebruiken: VeldwerkPhases.tsx + veldwerk page files.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/app/dashboard/(app)/veldwerk/page.tsx, /Users/christiaantromp/Desktop/Frontlix website/components/dashboard/veldwerk/VeldwerkPhases.tsx`

## [middel] DEELS: NavBadges (aantal-indicatoren) op navigatie-items

V2 shell toont badges in glas-pill-nav (Leads: 14, Agenda: 4), maar: (1) geen tone-variatie (bestaande heeft 'live', 'muted' tones), (2) geen onderscheid tussen getal-badges en 'Binnenkort'-badges (Veldwerk). V2 navItems zijn flat-getypeerd; disabled-state ontbreekt. V2 haalt counts via getV2ShellData (parallel queries), pariteit met old layout is aanwezig, maar UI-rendering mist tone/disabled.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/Sidebar.tsx (NavLink component, lines 159-205)`

## [middel] MIST: ThemeToggle (dark/light mode)

Bestaande versie: ThemeToggle.tsx in Topbar (desktop) en MeerSheet (mobile), localStorage-persistent, `.dark` class op `.dashboard-theme-root`. V2 heeft geen theme-toggle UI ergens (alleen CSS-tokens voorbereid). Ontbreekt: toggle-knop in header/topbar. Te hergebruiken: ThemeToggle.tsx component (werkt al met gedeelde `.dashboard-theme-root` root).

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/ui/ThemeToggle.tsx`

## [middel] MIST: ExportsModal (data-export UI)

Bestaande versie: ExportsModal.tsx geactiveerd via ?export=1 query-param, met type/format/period-selectie, downloads via /api/dashboard/export. V2 heeft geen export-UI. Ontbreekt: export-knop, modal, format-keuze. Te hergebruiken: ExportsModal.tsx.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/ExportsModal.tsx`

## [middel] MIST: OnboardingWizard (7-staps setup-flow)

Bestaande versie: OnboardingWizard.tsx getoond wanneer !profile.onboarding_voltooid_op, 7 stappen, completeOnboardingAction server-action. V2 heeft geen onboarding. Ontbreekt: wizard-modal, stap-logica, progress-bar, skip-functie. Te hergebruiken: OnboardingWizard.tsx + completeOnboardingAction.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/OnboardingWizard.tsx, /Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/onboarding-actions.ts`

## [middel] MIST: Page title & subtitle in header (route-meta)

Bestaande versie: Topbar toont dynamische title + subtitle per route (bijv. '/leads' → 'Leads' + 'Alle aanvragen...'). V2 shell heeft geen title/subtitle area. Ontbreekt: pagina-context-display in header. Te hergebruiken: Topbar.tsx getMeta() logica.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/Topbar.tsx (lines 20-40, ROUTE_TITLES const)`

## [middel] MIST: Route metadata (query-title + subtitle mapping)

Bestaande versie: ROUTE_TITLES dict in Topbar.tsx. V2 heeft geen route-titel-mapping. Ontbreekt: titel + subtitle per route in header. Te hergebruiken: ROUTE_TITLES const + getMeta-logica.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/Topbar.tsx (lines 20-40)`

## [middel] MIST: Search form en submit-handler (nav naar /leads?q=...)

Bestaande versie: Topbar.tsx heeft search-form met onSubmit-handler die naar /leads?q=... navigeert. V2 heeft geen search-UI. Ontbreekt: search-input, form, query-redirect. Te hergebruiken: Topbar.tsx search-section.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/Topbar.tsx (lines 99-110, 67-74)`

## [middel] DEELS: Layout shell wrapper (>.dashboard-theme-root, display:contents)

Bestaande versie: `.dashboard-theme-root` wrapper met `display:contents`, omvat desktop+mobile chrome. V2: `rbRoot` div, geen `.dashboard-theme-root`. Status: v2 heeft aparte root-klasse; thema-toggle zou moeten herkonfigureren om op v2 root te werken of beide roots.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/app/dashboard/(app)/layout.tsx (lines 99-121), /Users/christiaantromp/Desktop/Frontlix website/components/dashboard/v2/ui/Shell.tsx (line 58)`

## [laag] DEELS: ManualOfferteController (offerte-wizard trigger)

Bestaande versie: ManualOfferteController in layout, luistert op ?nieuwe-offerte=1 query-param. V2 heeft NewOfferteMount in layout, luistert op 'rb:new-offerte' CustomEvent. Beide systemen bestaan naast elkaar; V2 event-model is een alternatieve implementatie. Status: beiden aanwezig maar met twee verschillende triggering-mechanismes.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/offerte/ManualOfferteController.tsx, /Users/christiaantromp/Desktop/Frontlix website/components/dashboard/v2/offerte/NewOfferteMount.tsx`

## [laag] MIST: LeadsViewSwitcher (table ↔ kanban toggle)

Bestaande versie: LeadsViewSwitcher in Topbar, switcht leads-page tussen table en pipeline-kanban-view. V2 leads-pagina (v2/leads/page.tsx) toont alleen 1 view (table). Ontbreekt: view-switcher-knop, toggle-logica. Te hergebruiken: LeadsViewSwitcher.tsx.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/leads/LeadsViewSwitcher.tsx`

## [laag] MIST: MobileSearchSheet (mobile ↔ desktop search UI)

Bestaande versie: MobileSearchSheet.tsx in Topbar, apart mobile-search-drawer. V2 heeft geen mobile-search-ondersteuning. Ontbreekt: mobile-search-sheet. Te hergebruiken: MobileSearchSheet.tsx.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/ui/MobileSearchSheet.tsx`

## [laag] MIST: Dagrapport-drawer (portal + fixed-in-overflow workaround)

Bestaande versie: Layout-wrapper voert `<div id='dagrapport-portal-root' />` in, buitengepositioneerd voor iOS fixed-in-overflow-scroller fix. V2 layout voert dit niet in. Ontbreekt: portal-target div. Te hergebruiken: layout-snippet (div met id).

Bron: `/Users/christiaantromp/Desktop/Frontlix website/app/dashboard/(app)/layout.tsx (line 119)`

## [laag] MIST: Keyboard shortcuts (⌘K / Ctrl+K → search focus)

Bestaande versie: Topbar luistert op keydown voor ⌘K / Ctrl+K en focust search-input. V2 heeft geen keyboard-shortcut-ondersteuning. Ontbreekt: ⌘K-handler. Te hergebruiken: Topbar.tsx useEffect (lines 56-65).

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/Topbar.tsx (lines 56-65)`

## [laag] MIST: Mobile nav toggle event (hamburger → sidebar open/close)

Bestaande versie: Topbar.tsx dispatcht 'frontlix-toggle-mobile-nav' event, Sidebar.tsx luistert erop. V2 is desktop-only, geen hamburger/sidebar. Ontbreekt: mobile-nav-toggle event-system. Te hergebruiken: event-dispatch-patroon als mobiel wordt geimplementeerd.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/Topbar.tsx (line 15), /Users/christiaantromp/Desktop/Frontlix website/components/dashboard/Sidebar.tsx (lines 94-98)`

## [laag] DEELS: Global auth + user profile loading (requireApprovedUser)

Bestaande versie: Layout.tsx vereist requireApprovedUser(), fetcht user/profile parallel met notificaties. V2 layout haalt via getV2ShellData() (v2Session()), geen explicit auth-check in layout. V2 relies op middleware voor auth. Status: beide hebben auth, maar v2 delegeert aan middleware, old haalt user/profile via server-functions.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/app/dashboard/(app)/layout.tsx (line 19), /Users/christiaantromp/Desktop/Frontlix website/components/dashboard/v2/shell-data.ts (line 23)`

## [laag] DEELS: Counts-caching (open leads, upcoming appts badges)

Beide versies fetchen parallel via Promise.all. Bestaande: explicit counts-object gefilterd per badge-toon. V2: getV2ShellData returnt nav met badges ge-mapped. Status: beide implementaties bestaan; v2 doet hetzelfde dus pariteit is OK.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/app/dashboard/(app)/layout.tsx (lines 26-65), /Users/christiaantromp/Desktop/Frontlix website/components/dashboard/v2/shell-data.ts (lines 28-56)`

## [laag] DEELS: Dashboard CSS design-system (density-cozy, tokens)

Bestaande versie: importeert @/styles/dashboard.css, shell-wrapper heeft `density-cozy` class. V2 importeert @/styles/rebrand-tokens.css (nieuw design-system). Beiden hebben eigen CSS-baseline; v2 is rebrand, oude is legacy. Status: beide staan naast elkaar; v2 is gedeelte van migratie.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/app/dashboard/(app)/layout.tsx (line 16), /Users/christiaantromp/Desktop/Frontlix website/app/dashboard/v2/layout.tsx (line 11)`
