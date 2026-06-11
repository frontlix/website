# Gap-brief: Leads (lijst/pipeline) (naar pariteit)

Sluit deze gaten in v2 t.o.v. het bestaande dashboard. Hergebruik de bestaande componenten + server-actions (verzin niets nieuws). v2-look (var(--rb-*), v2 ui-primitives, lucide, huisstijl). Behoud demo-fallback. Focus eerst op HOOG, dan MIDDEL.

## [hoog] MIST: Filter-tabs (7 statustabs: Alles, In gesprek, Owner-review, Offerte uit, Ingepland, Afgerond, Archief)

V2 LeadsView toon alleen 2 views (pipeline/lijst). De 7-tab status-filter (LeadsFilterTabs) is niet geïmplementeerd. Moet URL-param ?filter= ondersteunen en count-badges per tab tonen. HERGEBRUIKEN: LeadsFilterTabs.tsx en matchesFilter() logica uit bestaande page.tsx.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/leads/LeadsFilterTabs.tsx`

## [hoog] MIST: Web-chat/Geen WhatsApp toggle (separate filter naast tabs)

WebChatToggle toont count van web-only leads (kanaal=web) en filtert cumulatief. V2 ontbreekt dit. Moet URL-param ?kanaal=web ondersteunen. HERGEBRUIKEN: WebChatToggle.tsx en kanaalFilter logica.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/leads/WebChatToggle.tsx`

## [hoog] DEELS: Geavanceerde filter-panel (Bron: Form/WhatsApp, Urgent, Sorteer op)

V2 LeadsSearch is alleen een zoekbalk. LeadsFilterPanel (desktop-popover) biedt Bron, Urgent, Sortering-opties ontbreekt. URL-params: ?bron=form/?wa, ?urgent=1, ?sort=prijs/naam/fase. HERGEBRUIKEN: LeadsFilterPanel.tsx, setParam logica, BRONNEN/SORTS-opties.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/leads/LeadsFilterPanel.tsx`

## [hoog] DEELS: View-switcher (Pipeline / Tabel / Kaarten) met 3 opties

V2 ViewSwitcher biedt slechts 2 views (Lijst/Pipeline). Bestaande versie heeft 3: Pipeline, Tabel, Kaarten. V2 mist de Kaarten-view volledig. HERGEBRUIKEN: LeadsViewSwitcher.tsx, cookie-logic, LeadsKaarten.tsx voor kaarten-weergave.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/leads/LeadsViewSwitcher.tsx en LeadsKaarten.tsx`

## [hoog] DEELS: Tabel-view met kolommen (Naam, Dienst, m², Status, Gespreksfase, Offerte, Tijd)

V2 LeadsList is te basaal: alleen 7 vaste kolommen zonder verdere configuratie. Bestaande LeadsTable is veel rijker: kolom-definitions via COLUMNS array, mobiel+desktop responsive via TableToCards, speciale rendering per kolom (Avatar, Pill, formatting). HERGEBRUIKEN: LeadsTable.tsx volledig, COLUMNS-array, TableToCards-component.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/leads/LeadsTable.tsx`

## [hoog] MIST: Kaarten-view (grid van kanban-style cards)

V2 ontbreekt volledig: LeadsKaarten toont leads in auto-fill grid met gradient header-bands, status-pills, avatar+naam+adres, m²/diensten/prijs footer. HERGEBRUIKEN: LeadsKaarten.tsx en hele bijbehorende logica.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/leads/LeadsKaarten.tsx`

## [hoog] DEELS: Kop-secties: Leads-titel, actief-count, live-dot, export-knop, filters-popover, offerte-knop

V2 LeadsView heeft minimale kop (title + controls). Bestaande page: dash-section-head met LiveDot (realtime indicator), actief/totaal counts, FileText-export knop, LeadsFilterPanel popover, Plus-offerte knop. HERGEBRUIKEN: hele kop-structuur uit page.tsx, LiveDot-component, buttons.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/app/dashboard/(app)/leads/page.tsx (lines 197-224)`

## [hoog] DEELS: Server-side filtering logica (applyLeadsFilters, mapLeadsToV2, buildPipelineFromLeads)

V2 heeft applyLeadsFilters al in leads-mappers. Maar: bestaande page doet meer: archief-tab-aparte-query, tab-counts berekenen, webCount tellen, STAGE_ORDER constant, bronFilter+urgent-filter logica. V2 ontbreekt: archief-ondersteuning, tab-counts, separate archief-query.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/app/dashboard/(app)/leads/page.tsx (lines 35-180) en /components/dashboard/v2/leads/leads-mappers.ts`

## [hoog] MIST: Archief-tab + aparte query getLeadsList(undefined, { archived: true })

Bestaande: activeFilter === 'archief' triggers apart query. Archief-tab in FilterTabs. V2 applyLeadsFilters ontbreekt archief-logica. HERGEBRUIKEN: matchesFilter(lead, 'archief') logica, aparte query-call.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/app/dashboard/(app)/leads/page.tsx (lines 102-107, 124)`

## [middel] DEELS: Zoekbalk met debounce (search op naam/telefoon/adres)

V2 LeadsSearch werkt met Enter/submit, niet met debounce. Bestaande LeadsSearchBar debounceert 250ms en synct live met URL-param ?q=. V2 should use debounce i.p.v. submit-on-enter. HERGEBRUIKEN: LeadsSearchBar.tsx debounce-logica.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/leads/LeadsSearchBar.tsx`

## [middel] DEELS: Pipeline-view met 5 kolommen (In gesprek, Offerte review, Offerte uit, Ingepland, Afgerond)

V2 pipeline-layout is simpel (div grid). Bestaande pipeline gebruikt dash-pipeline-track/dash-pipe-col CSS-klassen, stage-matching op gesprek_fase+dashboard_status, count-pills, disabled '+'-knop per kolom. V2 mist stage-koppen-styling en '+' knop. HERGEBRUIKEN: LeadsPipeline.tsx STAGES-array en styling-klassen.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/leads/LeadsPipeline.tsx`

## [middel] DEELS: Lead-card in pipeline met prijs OF m²-pill in head

V2 LeadCard toont altijd waarde/tijd/status. Bestaande card: head heeft avatar+naam+plaats, prijs BOLD aan rechterzijde (of m²-pill als geen prijs), meta met m²+dienst, foot met bron+tijd. HERGEBRUIKEN: bestaande LeadCard.tsx styling.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/leads/LeadCard.tsx`

## [middel] MIST: Realtime toast-meldingen (nieuwe leads)

LeadsRealtimeToast luistert op Supabase realtime-kanaal (INSERT op leads-tabel) en toont toast-notificatie met lead-naam + Open-link. Auto-dismiss na 8s, router.refresh(). V2 ontbreekt dit volledig. HERGEBRUIKEN: LeadsRealtimeToast.tsx.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/leads/LeadsRealtimeToast.tsx`

## [middel] MIST: Export-knop (CSV export)

Bestaande page: href=/leads?export=1 (FileText-icon knop). Triggert API-route /api/dashboard/export/leads-csv die CSV genereert met headers+leads. V2 ontbreekt export-functie volledig. HERGEBRUIKEN: export-knop uit page.tsx, API-route blijft identiek.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/app/dashboard/(app)/leads/page.tsx (line 208-214) en /app/api/dashboard/export/leads-csv/route.ts`

## [middel] MIST: Nieuwe offerte snelkoppeling

Bestaande page: href=/leads?nieuwe-offerte=1 (Plus-icon knop). Dit triggert waarschijnlijk een modal/dialog. V2 ontbreekt volledig. HERGEBRUIKEN: knop uit page.tsx.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/app/dashboard/(app)/leads/page.tsx (line 216-222)`

## [middel] MIST: Mobiel-responsieve filters (MobileFiltersSheet)

Bestaande pagina: MobileFiltersSheet wrapper die LeadsFilterTabs + WebChatToggle in een sheet toont op mobiel (≤640px). V2 ontbreekt mobiele filter-strategie. HERGEBRUIKEN: MobileFiltersSheet.tsx, MobileSheet-component.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/leads/MobileFiltersSheet.tsx`

## [middel] MIST: URL-params cookie-fallback (leads_view cookie voor view-keuze)

Bestaande: cookie 'leads_view' perkeert view-keuze, server leest cookieStore bij geen ?view= param. V2 state-based enkel, geen cookie-persistentie. HERGEBRUIKEN: cookie-logica uit LeadsViewSwitcher.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/leads/LeadsViewSwitcher.tsx (lines 18-21, 68-72)`

## [middel] MIST: Actief-count vs. totaal-count display

Bestaande: LiveDot + '{actief} actief · {total} totaal' in kop. V2 ontbreekt counts. Actief = niet-afgehandelde leads. HERGEBRUIKEN: count-berekening en display uit page.tsx.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/app/dashboard/(app)/leads/page.tsx (lines 181-204)`

## [middel] MIST: Tab-counts stabiel bijhouden (counts berekenen over ALLE leads, niet gefilterde view)

Bestaande: counts Record per tab over ALLE leads upfront, dus counts blijven stabil terwijl je filters aanpast. V2 doet dit niet: zou dynamisch count per tab moeten. HERGEBRUIKEN: counts-berekening-logica lines 113-121 page.tsx.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/app/dashboard/(app)/leads/page.tsx (lines 113-121)`

## [middel] DEELS: Search-param read (searchParams: Promise, zelfde structuur)

V2 leest alleen q/bron/urgent/sort. Bestaande leest ook filter/kanaal/view. V2 pagina moet filter/?kanaal/?view? ondersteunen.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/app/dashboard/(app)/leads/page.tsx (lines 61-70) vs /app/dashboard/v2/leads/page.tsx (lines 28-33)`

## [laag] MIST: Live-indicator dot in kop

LiveDot-component toont animatie-indicator in de sectie-kop. V2 ontbreekt dit. HERGEBRUIKEN: LiveDot.tsx component en import.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/ui/LiveDot.tsx`

## [laag] MIST: Mobiele leads-weergave (MobileLeads component tree)

Bestaande page: <div mobileTree> met MobileLeads-component + mapLeadToCard helpers. V2 ontbreekt volledig. HERGEBRUIKEN: MobileLeads + mobile lead-mappers voor de mobiele weergave.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/mobile/leads/MobileLeads.tsx`
