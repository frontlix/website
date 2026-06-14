# Gap-brief: Agenda (naar pariteit)

Sluit deze gaten in v2 t.o.v. het bestaande dashboard. Hergebruik de bestaande componenten + server-actions (verzin niets nieuws). v2-look (var(--rb-*), v2 ui-primitives, lucide, huisstijl). Behoud demo-fallback. Focus eerst op HOOG, dan MIDDEL.

## [hoog] MIST: View Toggle (Week/Maand/Routekaart segmented buttons)

Bestaand: `ViewToggle` component (lines 270-293 page.tsx) toont 3 links voor week/maand/routekaart-views met actieve state. v2 `AgendaHeader` heeft geen view-toggle, slechts 1 hardcoded layout (week).

Bron: `app/dashboard/(app)/agenda/page.tsx lines 270-293; components/dashboard/agenda/AgendaMonthNav.tsx`

## [hoog] MIST: Maand-view met kalender

Bestaand: volledige `MonthView` (lines 152-195) haalt maandafspraken op via `getAppointmentsForMonth()`, bouwt `appointmentsByDay` Map, toont kalender-grid via `AgendaCalendar` component (met dag-cellen, afspraken per cel, overflow-logic). v2 heeft nul maand-UI.

Bron: `app/dashboard/(app)/agenda/page.tsx lines 152-195; components/dashboard/agenda/AgendaCalendar.tsx`

## [hoog] MIST: Maand-navigatie (vorige/volgende maand)

Bestaand: `MonthView` construeert prev/next-maand-links (lines 165-166) en toont ze in ActionBar met kalender-icoon + 'Vandaag'. v2 heeft geen maand-UI.

Bron: `app/dashboard/(app)/agenda/page.tsx lines 165-186; components/dashboard/agenda/AgendaMonthNav.tsx`

## [hoog] MIST: Kalender-grid met afspraken per dag

Bestaand: `AgendaCalendar` (7×6 raster, WEEKDAYS-header) toont per cel: dagnum (met vandaag-highlight), max 3 afspraken als `AgendaAppointmentBlock` (naam + tijd), overflow-badge '+N meer'. v2 heeft geen maand-grid.

Bron: `components/dashboard/agenda/AgendaCalendar.tsx; components/dashboard/agenda/AgendaAppointmentBlock.tsx`

## [hoog] MIST: Routekaart-view met Google Maps / SVG-fallback

Bestaand: volledige `RouteView` (lines 198-266) haalt routekaart-afspraken op, toont `AgendaRouteMap` die: (1) met Google Maps API/Map ID → interactieve client-component `AgendaRouteView` met DirectionsRenderer + InfoWindow + live km/rijtijd, (2) zonder → SVG-fallback met routelijn + pinkoppelingen (BASIS + route-tips). v2 heeft nul routekaart.

Bron: `app/dashboard/(app)/agenda/page.tsx lines 198-266; components/dashboard/agenda/AgendaRouteMap.tsx; components/dashboard/agenda/AgendaRouteView.tsx`

## [hoog] MIST: Routekaart: Google Maps interactieve kaart

Bestaand: `AgendaRouteView.tsx` (100+ regels) client-component: APIProvider + Map + AdvancedMarkers per stop + InfoWindow on click + DirectionsRenderer per dag (echte route met optimalisatie). Functies: stop aanraken = InfoWindow + 'Open in Google Maps' deep-link, dag-tab wisselen = ander-kleur-route. v2 heeft geen Google Maps.

Bron: `components/dashboard/agenda/AgendaRouteView.tsx`

## [hoog] MIST: Routekaart: SVG fallback (schematische route)

Bestaand: `AgendaRouteMap` fallback (lines 87-155) toont SVG met route-lijn + pinkoppelingen, gebaseerd op `buildRouteDays()` output. v2 `RouteMap.tsx` toont alleen de mini-statische SVG (geen echte afspraken-integratie).

Bron: `components/dashboard/agenda/AgendaRouteMap.tsx lines 87-155; components/dashboard/v2/agenda/RouteMap.tsx (stub)`

## [hoog] MIST: Routekaart: Dagindeling sidebar met stops + km/rijtijd

Bestaand: `AgendaRouteMap` sidebar (lines 129-153) toont: 'Dagindeling' card met DayBlocks (per dag: dayLabel, totalKm, stops-list met pinIndex-nummers, naam, plaats, m2, tijd). v2 geen routekaart-sidebar.

Bron: `components/dashboard/agenda/AgendaRouteMap.tsx lines 129-153`

## [hoog] MIST: Routekaart: Dag-tabs (hele week / per dag focus)

Bestaand: `AgendaRouteMap` header tabs (lines 102-116) + focusDay-param: 'Hele week' link + per-dag-tabjes. Klik → URL-param `dag=YYYY-MM-DD`, kaart toont enkel die dag, fallback-SVG-route adapteert. v2 geen dag-tabs.

Bron: `components/dashboard/agenda/AgendaRouteMap.tsx lines 102-116; RouteView page.tsx lines 212-215`

## [hoog] DEELS: Week-navigatie: vorige/volgende week buttons

Bestaand: `WeekView` (lines 107-149) toont ← → navigatie-buttons (links naar `/agenda?week=...`), ook 'Vandaag'-button. v2 `AgendaHeader` heeft nav-buttons (lines 24-31) maar ze zijn niet wired (geen `onClick`, geen router-push, geen `href`). Buttons are visually present but functionally empty.

Bron: `app/dashboard/(app)/agenda/page.tsx lines 117-127; components/dashboard/v2/agenda/AgendaHeader.tsx lines 24-31`

## [hoog] MIST: Afspraakdetail-modal: verzetten (reschedule)

Bestaand: `rescheduleAppointment()` server-action bestaat (lib/dashboard/agenda-actions.ts lines 52-81), haalt Google-event + klant-notificatie langs bot-API. v2 `AppointmentDetail` modal heeft GEEN 'Verzetten'-knop of -logica. Opmerking in AgendaView.tsx lines 8-9: 'follow-up'.

Bron: `lib/dashboard/agenda-actions.ts lines 52-81`

## [hoog] DEELS: Nieuwe afspraak inplannen (handmatig, modal)

Bestaand: 'Afspraak'-button is disabled (title: 'binnenkort beschikbaar', lines 128-137, 246-255). v2 `NewAppointmentModal` (components/dashboard/v2/agenda/NewAppointmentModal.tsx) toont modal met velden: titel/dag/tijd/duur (allemaal demo-static, niet editable). 'Opslaan'-button doet niets concreets (dummy-click). Noch bestaand noch v2 hebben echt afspraken-creatie.

Bron: `app/dashboard/(app)/agenda/page.tsx lines 128-137; components/dashboard/v2/agenda/NewAppointmentModal.tsx`

## [hoog] MIST: Komende 7 dagen sidebar (afspraken-lijst + werk-uren totaal)

Bestaand: `AgendaUpcomingList` (sidebar, lines 143-145) toont 'Komende 7 dagen' card met alle afspraken van de week (kleurband + naam + datum+tijd + plaats+m2). Subheader toont aantallen: 'N afspraken · X uur werk'. v2 heeft geen sidebar.

Bron: `components/dashboard/agenda/AgendaUpcomingList.tsx`

## [hoog] MIST: Mobiele agenda-view (apart van desktop, altijd week-weergave)

Bestaand: `MobileAgenda` component (import lines 22-27, render lines 88-90) toont altijd week-data, losstaand van desktop-view (week/maand/routekaart). Mobileweek is separate fetch (lines 60-73). v2 heeft geen mobiele implementatie.

Bron: `app/dashboard/(app)/agenda/page.tsx lines 22-27, 60-90; components/dashboard/mobile/agenda/MobileAgenda.tsx`

## [hoog] DEELS: Search-params handling: week/month/view/dag URL-params

Bestaand: page.tsx haalt `searchParams` (week/month/view/dag), parseert via `parseWeekParam()` / `parseMonthParam()`. v2 page.tsx haalt week-param en parseert, maar v2-header nav-buttons doen geen URL-push (buttons zijn dummy).

Bron: `app/dashboard/(app)/agenda/page.tsx lines 44-55; app/dashboard/v2/agenda/page.tsx lines 25-35`

## [hoog] MIST: Google Maps API integratie (routekaart met echte weg-directions)

Bestaand: `AgendaRouteView` (100+ regels) gebruikt `@vis.gl/react-google-maps` APIProvider, Map, DirectionsService/Renderer, optimalisatie. Env-vars: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY + NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID. v2 heeft geen Google Maps.

Bron: `components/dashboard/agenda/AgendaRouteView.tsx; app/dashboard/(app)/agenda/page.tsx lines 40-85`

## [middel] MIST: Routekaart: Optimalisatie-tips sidebar

Bestaand: `buildTip()` functie (lines 338-345) genereert tips als één dag >400km ('overweeg te combineren'). TipCard toont tips sidebar boven. v2 geen tips.

Bron: `components/dashboard/agenda/AgendaRouteMap.tsx lines 338-345`

## [middel] DEELS: Afspraakdetail-modal: deadline-typen met speciale UI

Bestaand: geen aparte deadline-handling in (app)-agenda. v2 `AppointmentDetail` (lines 26-64) implementeert aparte UI voor type==='deadline': 'Offerte verloopt'-tekst + 'Stuur herinnering'-button met hardcoded demo-content ('€395 verloopt om 16:00'). Geen backend-koppeling (demo-only).

Bron: `components/dashboard/v2/agenda/AppointmentDetail.tsx lines 26-64`

## [middel] DEELS: Route & contact-modal: navigatie/bel/WhatsApp knoppen

v2 `RouteContactModal` (lines 43-56) toont 3 knoppen: 'Start navigatie' (primary), 'Bel' + 'WhatsApp' (secondary). Buttons zijn aanwezig maar niet geimplementeerd (geen `onClick`-logica, dummy-state).

Bron: `components/dashboard/v2/agenda/RouteContactModal.tsx lines 43-56`

## [middel] MIST: Op te volgen sidebar (follow-ups: owner-reviews + stale offertes)

Bestaand: `AgendaFollowupList` (sidebar, line 145) async-component haalt via `getOwnerFollowups()` + `getStaleOfferteFollowups()` leads op die actie nodig hebben. Toont max 6 items als cards (naam + reden-badge + link naar lead). v2 geen follow-up sidebar.

Bron: `components/dashboard/agenda/AgendaUpcomingList.tsx lines 108-145; lib/dashboard/agenda-followups.ts`

## [middel] DEELS: Afspraken-kleurering op basis van status (tone: blue/green/amber/red)

Bestaand: `appointmentTone()` (agenda-event.ts lines 42-50) bepaalt kleur via dashboard_status (afgehandeld=green, openstaand=blue, no_show=red). v2 mappers gebruiken simplified logic: alle bekende afspraken→'klus' (green), no_show→'intern' (muted), geen amber/red states.

Bron: `lib/dashboard/agenda-event.ts lines 42-50; components/dashboard/v2/agenda/agenda-mappers.ts lines 43-46`

## [middel] MIST: Uur-labels en halfuur-raster (07:00-18:00 in week-grid)

Bestaand: `AgendaWeekGrid` (lines 12-14, 48-70) toont links uur-labels (7-18) en 22-rijen met 2 halfuur-cellen per uur. Afspraken positioneren via grid-row. v2 `WeekGrid` heeft geen uur-raster, slechts flat-list per dag.

Bron: `components/dashboard/agenda/AgendaWeekGrid.tsx lines 12-14, 48-70`

## [middel] MIST: Afspraak-blok positioning: startuur/einduur met duur-schatting

Bestaand: `AgendaWeekGrid` berekent halfuur-offset uit afspraak-starttijd + `estimateDurationMinutes()`, positioneert via CSS grid-row (lines 80-103). v2 `WeekGrid` toont slechts `tijd · duur`-tekst, geen spatial positioning.

Bron: `components/dashboard/agenda/AgendaWeekGrid.tsx lines 80-103`

## [middel] MIST: Tenant-base coördinaten (basis-locatie voor routekaart)

Bestaand: `getTenantBase()` haalt basis-coördinaten (bv. Biervliet) op (lines 205-208). Passed naar `AgendaRouteMap`. v2 geen basis-integratie.

Bron: `app/dashboard/(app)/agenda/page.tsx lines 205-208; lib/dashboard/tenant-base.ts`

## [middel] DEELS: Responsieve layout: desktop-tree + mobile-tree

Bestaand: CSS-scheidingslijn `styles.desktopTree` + `styles.mobileTree` (lines 87-90). v2 geen expliciete mobiele variantafhandeling (geheel v2 is desktop-focus).

Bron: `app/dashboard/(app)/agenda/page.tsx lines 87-90; app/dashboard/v2/agenda/page.module.css`

## [laag] MIST: Google Calendar integratie (afspraken uit Google Calendar)

Bestaand: verwijzing in title/aria-label ('binnenkort beschikbaar' + 'Surface plant nu automatisch in via WhatsApp'), suggereert toekomstige Google Calendar sync. Niet actief in huide code, maar relevante feature voor roadmap.

Bron: `app/dashboard/(app)/agenda/page.tsx lines 131-132`

## [laag] DEELS: Afspraak-checklist (demo: hogedruk/impregnatie/afzetlint)

v2 `AppointmentDetail` (lines 55-57) toont hardcoded checklist-tekst ('hogedrukspuit · impregnatiemiddel · afzetlint'). Bestaand heeft geen aparte checklist-UI. Dit is v2-specific, maar niet aan echte data gekoppeld.

Bron: `components/dashboard/v2/agenda/AppointmentDetail.tsx lines 55-57`
