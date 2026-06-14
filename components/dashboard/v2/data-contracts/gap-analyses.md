# Gap-brief: Analyses (statistieken) (naar pariteit)

Sluit deze gaten in v2 t.o.v. het bestaande dashboard. Hergebruik de bestaande componenten + server-actions (verzin niets nieuws). v2-look (var(--rb-*), v2 ui-primitives, lucide, huisstijl). Behoud demo-fallback. Focus eerst op HOOG, dan MIDDEL.

## [hoog] DEELS: Pagina-structuur & layout (desktop-tree)

v2 heeft AnalysesClient (interactief) maar mist de desktop-only stylesheet (.desktopTree/.mobileTree toggle). v2 rendert altijd voor desktop; mobiele versie (MobileAnalyses) is niet geïmplementeerd. Oplossing: page.module.css uit bestaande statistieken overnemen voor media-queries, en MobileAnalyses-wrapper toevoegen aan v2 page.tsx.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/app/dashboard/(app)/statistieken/page.tsx & page.module.css`

## [hoog] MIST: Verdeling per status (DistributionBars)

Bestaande statistieken tonen een DistributionBars-kaart (status-verdeling: bijv. 'Inkomend', 'Offerte', 'Akkoord' met percentage-balken). V2 mist dit volledig — noch de component noch de data-mapper. Oplossing: statusVerdeling query hergebruiken, DistributionBars-component kopiëren naar v2, en in AnalysesClient integreren in de twoCol/split-grid.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/stats/DistributionBars.tsx & statusVerdeling query`

## [hoog] MIST: Verdeling per categorie (DistributionBars)

Bestaande toon categorie-verdeling (bijv. 'Gevelreiniging', 'Dakgoot' enz. als percentage-balken). V2 mist dit — noch component noch mapper. Oplossing: categorieVerdeling query hergebruiken, DistributionBars integreren, in split-grid naast funnel plaatsen (zoals bestaande twoCol-layout).

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/stats/DistributionBars.tsx & categorieVerdeling query`

## [hoog] MIST: Top-tags (TopTagsList)

Bestaande toon top-10 tags als eenvoudige lijstkaart (naam + count). V2 mist dit volledig. topTags query wordt niet gedraaid in v2 page.tsx. Oplossing: topTags query toevoegen, TopTagsList component kopiëren/porten, in grid integreren.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/stats/TopTagsList.tsx & topTags query`

## [hoog] MIST: Mobile-responsive render (MobileAnalyses wrapper)

Bestaande page.tsx rendert desktop-component + MobileAnalyses via desktop/mobileTree CSS-toggle. V2 mist MobileAnalyses-integratie volledig. Oplossing: page.tsx aanpassen om MobileAnalyses aan te roepen (pas data-contract aan), en page.module.css media-queries toevoegen.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/mobile/analyses/MobileAnalyses.tsx`

## [hoog] MIST: Statistieken per status & categorie verdeling (data-mapping)

V2 page.tsx roept statusVerdeling() en categorieVerdeling() niet op. Bestaande wel. Oplossing: queries toevoegen aan v2 page.tsx, in analyses-mappers converter voor DistributionBars-form maken.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/stats-queries.ts (statusVerdeling, categorieVerdeling)`

## [middel] DEELS: Periode-keuze (PeriodSelector dropdown)

v2 heeft PeriodeTabs (pills: Week/Maand/Kwartaal), maar biedt slechts 3 opties. De bestaande PeriodSelector biedt 5 opties (deze-week, deze-maand, dit-kwartaal, dit-jaar, all-time). Bestaande opties 'dit-jaar' en 'all-time' ontbreken in v2 (alleen logica, geen design). Oplossing: parsePeriode() accepteert al beide; voeg logica toe om deze extra periodes in v2 te steunen (als extra pills of fallback naar bestaande selector).

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/stats/PeriodSelector.tsx`

## [middel] DEELS: Trend-grafiek (leads per dag, TrendLineChart)

Bestaande toon 'Leads per dag' als SVG-lijn (custom chart). V2 has OmzetLeadsChart (omzet + leads dual-axis), maar TrendLineChart (alleen leads, eenvoudig design) is niet opgenomen. leadsPerDag query wordt door v2 gebruikt, maar niet in een eenvoudige leads-only trendlijn. Gedeeltelijk omdat omzet-trend bestaat maar niet de originele simplistische leads-per-dag-lijn.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/stats/TrendLineChart.tsx & leadsPerDag query`

## [middel] DEELS: Titel 'Statistieken' en pagina-kop

V2 AnalysesClient toont 'Analyses' (niet 'Statistieken') en hint 'klik op een punt in de grafiek' (bestaande: 'Periode: [label]'). Ontbreekt: subtitel met periode-label. Oplossing: periodLabel in AnalysesClient opnemen.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/app/dashboard/(app)/statistieken/page.tsx (h1, subtitle)`

## [laag] DEELS: Omzet totaal (omzetTotaal query & weergave)

V2 draait omzetTotaal query en mapPeriodeReeks mappt het naar PeriodeReeks.totaal (compact label in mini-stats). Bestaande statistieken tonen dit niet expliciet (geen 'Totaal omzet' KPI). V2 gedeeltelijk omdat de data aanwezig is maar niet in dezelfde directe vorm als bestaande (meer in mini-stats dan prominent).

Bron: `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/stats-queries.ts (omzetTotaal)`

## [laag] MIST: Omzet-doelstelling (maand) getOmzetDoelMaand

Bestaande page.tsx roept getOmzetDoelMaand() op (regel 76) maar gebruikt het niet in rendering. V2 mist de query volledig. Waarschijnlijk voor dashboard-doel-tracking. Oplossing: query toevoegen aan v2 page.tsx (als eerder, optioneel voor toekomstig use).

Bron: `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/stats-queries.ts (getOmzetDoelMaand)`

## [laag] DEELS: Inzichten / Surface-insights

V2 rendert hardcoded demo-inzichten (Surface-API nog niet beschikbaar). Bestaande statistieken tonen dit niet. V2 is proto met hardcoded data; geen pariteit nodig, maar moet blijven als placeholder.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/v2/analyses/InzichtenCard.tsx & analyses-data.ts (INZICHTEN demo)`
