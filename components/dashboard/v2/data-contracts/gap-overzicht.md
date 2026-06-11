# Gap-brief: Overzicht (naar pariteit)

Sluit deze gaten in v2 t.o.v. het bestaande dashboard. Hergebruik de bestaande componenten + server-actions (verzin niets nieuws). v2-look (var(--rb-*), v2 ui-primitives, lucide, huisstijl). Behoud demo-fallback. Focus eerst op HOOG, dan MIDDEL.

## [hoog] MIST: Header action-buttons (Focus-modus, Export, Nieuwe offerte)

Bestaande page.tsx heeft dash-section-actions met 4 buttons: Focus-modus (Eye icon), Afspraken anchor (mobile), Export leads CSV, Nieuwe offerte. v2 page rendert geen header-section met action buttons. Hergebruiken: kan als apart shell-section boven de grid, of in een HeaderBar-component voor v2.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/app/dashboard/(app)/page.tsx lines 329-361`

## [hoog] DEELS: SurfaceDailySummary (AI samenvatting banner)

Bestaande SurfaceDailySummary.tsx is een banner met 'Dag in cijfers' + Dagrapport-link. v2 integreert de summary-tekst in BriefCard.body maar mist de banner-styling, icon-badge, 'Bekijk dagrapport'-link. Hergebruiken: SurfaceDailySummary component direct in v2 page, of samensmelten met BriefCard.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/overzicht/SurfaceDailySummary.tsx`

## [hoog] DEELS: EerstDitDoen (owner review action list)

v2 heeft ActionList.tsx die de layout doet, maar bestaande EerstDitDoen.tsx heeft meer visuele details: card-head met subtitle ('N acties · gesorteerd op urgentie & waarde'), twee Pill-badges (hot/warm counts), rode/amber idx-nummers per rij, wachtijd-badge rechts. v2 mapActionRows doet de basis, maar mist rendering details. Hergebruiken: EerstDitDoen component als drop-in vervanger van ActionList, of merge de styling-details in ActionList.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/overzicht/EerstDitDoen.tsx`

## [hoog] MIST: KPI Module (hero card + tabs + mini-grid)

Bestaande KpiModule.tsx (de (app)-versie) is het volledige KPI-blok met: KpiHeroCard (met donut-progress naar doel, icon-badge, delta met ArrowUp/Down, 'Uitschieter'-flame-badge), KpiTabs (4 server-side tabs: Omzet/Leads/Conversie/Reactietijd), KpiMiniCard (2x2 mini-grid + optional extra metric). v2 KpiTiles.tsx is veel simpeler: 2x2 grid zonder hero, tabs, of donut. Bestaande structuur veel uitgebreider. Hergebruiken: volledige KpiModule component uit (app) als drop-in, met eventueel mappers bijstellen.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/overzicht/KpiModule.tsx, KpiHeroCard.tsx, KpiMiniCard.tsx, KpiTabs.tsx`

## [hoog] MIST: Lead-instroom chart (AreaChart) + Trend Stats (4-vaks)

Bestaande page.tsx toont AreaChart met trendData + onder de chart een 4-vaks TrendStats strip met labels: Lead-instroom, Conversie, Owner-acties, Gem. ticket. v2 heeft geen trend-chart sectie. Hergebruiken: AreaChart component, TrendStat components (4x), KpiModule staat los in v2 dus deze chart is niet geïntegreerd.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/ui/AreaChart.tsx, components/dashboard/overzicht/TrendStat.tsx`

## [hoog] MIST: Trechter (funnel widget deze week)

Bestaande Trechter.tsx toont de conversie-trechter (welke % leads door welke fase zijn gekomen). v2 rendert dit niet. Hergebruiken: Trechter component + buildFunnelRows helper uit overzicht-data.ts.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/overzicht/Trechter.tsx, /Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/overzicht-data.ts`

## [hoog] MIST: Live Activity Feed (met tab-filter: Alles, Chat, Offerte, Agenda, Nieuw)

Bestaande LiveActivityFeed.tsx is een client-component met 5-tab filter (Alles/wa/quote/appt/new), 'NET BINNEN · N' counter, en feed-rijen met color-coded left-border per type + lead-link. v2 rendert geen activity-feed. Hergebruiken: volledige LiveActivityFeed component + buildActivityFeed helper.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/overzicht/LiveActivityFeed.tsx, lib/dashboard/overzicht-data.ts`

## [hoog] MIST: DagrapportDrawer (slide-out drawer met dag-stats)

Bestaande DagrapportDrawer.tsx is een fixed-position portal-overlay-drawer die toont wanneer ?dagrapport=1. Bevat dag-statistieken vs gisteren, Surface-activiteit, etc. v2 rendert dit niet. Hergebruiken: volledige DagrapportDrawer component, getDagrapport() helper, URL-param logic.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/overzicht/DagrapportDrawer.tsx, lib/dashboard/dagrapport-queries.ts`

## [hoog] MIST: Mobile Overzicht (MobileOverzicht component + data-mapping)

Bestaande page.tsx bouwt MobileOverzichtData blob (voornaam, leads vandaag/morgen, aiBrief, omzet, miniKpis, urgent items, vandaag-afspraken, activity, notifications) en rendert MobileOverzicht in mobileTree @media. v2 heeft geen mobile-variant. Hergebruiken: MobileOverzicht component + alle data-mappers + mobileTree styling.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/mobile/overzicht/MobileOverzicht.tsx, app/dashboard/(app)/page.tsx lines 245-311, 497-500`

## [hoog] DEELS: CSS layout: two-column grid (left 2fr trend+funnel, right 1fr activity+appts)

v2 page.module.css heeft .grid { gridTemplateColumns: 1.45fr 1fr }, wat anders is dan bestaande (2fr 1fr). Bestaande heeft ook .desktopTree / .mobileTree toggle via display:contents @media. v2 mist mobile-tree toggle. Hergebruiken: mainGrid + colLeft/colRight CSS-layout, desktop/mobile tree-toggle.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/app/dashboard/(app)/page.module.css`

## [hoog] MIST: URL-driven state: ?trend, ?kpi, ?focus, ?dagrapport params

v2 page.tsx haalt searchParams niet op. Bestaande page.tsx gebruikt ?trend=7d|28d|90d (trend-range), ?kpi=omzet|leads|... (KPI-tab), ?focus=live (focus-modus), ?dagrapport=1 (drawer). v2 kan deze parameters opnemen en via mappers doorvoeren.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/app/dashboard/(app)/page.tsx lines 72-81, 88-93`

## [hoog] MIST: Key helper functions: werkdagenTotEindeMaand, deltaPercent, deltaPercentagePoints, deltaSeconds, getInitials, mapEerstDitDoenToUrgentItems, pickAppointmentsForToday, mapLiveActivityToMobile

Bestaande page.tsx bevat 8 helper-functies onderaan (lines 511-714) voor mobile data-mapping. v2 heeft mappers in overzicht-mappers.ts (mapBriefData, mapActionRows, etc.) maar mist de mobile-specifieke helpers (werkdagenTotEindeMaand, getInitials, mapEerstDitDoenToUrgentItems, pickAppointmentsForToday, mapLiveActivityToMobile). Deze zijn nodig voor de MobileOverzicht-path.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/app/dashboard/(app)/page.tsx lines 511-714`

## [middel] DEELS: Greeting Title (time-dependent greeting + voornaam)

v2 heeft static greeting in BriefCard.tsx (mapBriefData). Bestaande GreetingTitle.tsx is een client-component die elke minuut refresh + tab-visibility tracking doet. v2 mist het live-update-mechanisme. Hergebruiken: GreetingTitle component + zijn interval/visibility-logic kan in BriefCard ingepast worden.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/overzicht/GreetingTitle.tsx`

## [middel] MIST: Trend Range Toggle (7d/28d/90d selector)

Bestaande page.tsx fetch trend-data voor configurable range (default 28d, URL-param ?trend=7d|28d|90d). v2 page.tsx hardcoded `leadsPerDag(now, 10)` (10 dagen). TrendRangeToggle.tsx bestaat niet in v2. Hergebruiken: TrendRangeToggle component + trend-range logic (trendRange state, hrefFor helpers).

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/overzicht/TrendRangeToggle.tsx`

## [middel] MIST: LiveActivityFocus (full-width focus mode via ?focus=live)

Bestaande page.tsx heeft focus-mode check: als ?focus=live, rendert alleen LiveActivityFocus (standalone full-width). v2 heeft geen focus-mode logic. Hergebruiken: LiveActivityFocus component + focusMode check.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/overzicht/LiveActivityFocus.tsx`

## [middel] DEELS: Komende afspraken list (upcoming appointments)

Bestaande page.tsx rendert upcomingAppts in een lijst met datum-kalender-blok, naam, time+phone, en status-Pill. AgendaCard.tsx in v2 is gelijk in doel maar mist: datum-kalender-styling (MAA blok + dag-nummer), telefoonnummer-weergave, status-Pill. v2 toont alleen tijd+titel+sub. Hergebruiken: de bestaande layout-code voor appt-rows, of merge de details in v2.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/app/dashboard/(app)/page.tsx lines 437-490`

## [middel] DEELS: Server queries: leadsArrivedTodayAndTomorrow, getRecentNotifications, etc.

v2 page.tsx haalt core queries op (leads, converted, trend, appts, allLeads), maar bestaande page.tsx heeft meer: leadsArrivedTodayAndTomorrow (voor mobile header), getRecentNotifications (bel-feed), getUnreadNotificationCount (badge). v2 kan deze toevoegen via dezelfde lib imports.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/lead-queries.ts, notification-queries.ts, activity-feed.ts`

## [middel] DEELS: LeadsPerDag trend-data + range-logic

v2 page.tsx haalt leadsPerDag(now, 10) op, hardcoded 10 dagen. Bestaande page.tsx haalt leadsPerDag(now, trendDays) op waar trendDays komt uit RANGE_DAYS[trendRange]. v2 kan trendRange uit searchParams halen en aanpassen.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/stats-queries.ts`

## [laag] MIST: LiveDot (live-indicator in header)

Bestaande page.tsx toont LiveDot in dash-section-sub. v2 heeft geen live-pulse-indicator. Hergebruiken: LiveDot component uit overzicht/ui, toevoegen aan BriefCard statusLine of header.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/ui/LiveDot.tsx`

## [laag] MIST: Conditional rendering: EerstDitDoen alleen als actions.length > 0

Bestaande page.tsx rendert EerstDitDoen alleen als eerstDitDoenActies.length > 0 (line 379-384), anders verdwijnt hele sectie. v2 ActionList.tsx staat altijd in de grid. Hergebruiken: conditional logic voor ActionList of merge in page-level layout.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/app/dashboard/(app)/page.tsx lines 379-384`
