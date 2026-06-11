# Gap-brief: Reviews (naar pariteit)

Sluit deze gaten in v2 t.o.v. het bestaande dashboard. Hergebruik de bestaande componenten + server-actions (verzin niets nieuws). v2-look (var(--rb-*), v2 ui-primitives, lucide, huisstijl). Behoud demo-fallback. Focus eerst op HOOG, dan MIDDEL.

## [hoog] MIST: KPI-kaarten: NPS-score, Gemiddelde score, Response rate, Reviews dit jaar

Bestaande versie gebruikt KpiCard-component met 4 KPI's (NPS, avgScore, response rate, reviews count met trends). V2 heeft geen KPI-sectie, alleen ScoreColumn met gemiddelde-score-header en verdeling per ster. De NPS-score specifieke KPI ontbreekt.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/app/dashboard/(app)/reviews/page.tsx (regel 205-229) en /Users/christiaantromp/Desktop/Frontlix website/components/dashboard/ui/KpiCard`

## [hoog] DEELS: NPS-verdeling-visualisatie (stacked bar met promoters/passives/detractors)

Bestaande versie heeft NPSDistributionBar met horizontale stacked-bar (flex-based segments) + legend met legenda-uitleg per categorie. V2 heeft geen stacked-bar visualization. ScoreColumn toont wel sterklasse-verdeling (1-5 sterren), maar niet de NPS-categorieën (promoter/passive/detractor).

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/reviews/NPSDistributionBar.tsx`

## [hoog] DEELS: Filter-tabs: 'Alle reviews', 'In afwachting', 'Aandacht nodig' (detractors)

Bestaande versie heeft ReviewsFilterTabs met 3 filters: 'all', 'pending', 'detractor' met counts. V2 ReviewList heeft slechts 2 filters: 'alle' en 'open' (onbeantwoord). De 'detractor'-filter (aandacht nodig) ontbreekt volledig.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/reviews/ReviewsFilterTabs.tsx`

## [hoog] DEELS: Review-cards: verticale kaart-layout met avatar, naam, plaats, datum, score + sterren, NPS-tone (pill), body-text, published-status

Bestaande ReviewCard heeft: avatar + identity (naam/plaats/datum) linksboven, score+stars+NPS-pill rechtsboven, body-text onderaan met published-status-pill + open-lead-link. V2 ReviewRow is horizontaal inline-layout (chip/avatar linkjes, naam + sterren + meta inline, beantwoord-badge/knop rechts). Structureel anders; ReviewCard.tsx geeft beter visueel design.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/reviews/ReviewCard.tsx`

## [hoog] MIST: NPS-berekening: (promoters - detractors) / total * 100

Bestaande versie berekent NPS-score: Math.round(((promoters - detractors) / total) * 100). V2 toont gemiddelde-score en sterklasse-verdeling, maar geen NPS-score-KPI.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/app/dashboard/(app)/reviews/page.tsx (regel 144-146)`

## [middel] MIST: Paginatitel & sectie-header: 'Reviews & klanttevredenheid'

V2 heeft geen zichtbare titel/header-structuur zoals de bestaande versie (dash-section-head met title en sub). ScoreColumn en ReviewList hebben aparte titels, maar geen page-level header met NPS-score + aantal reviews + response rate in één regel.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/app/dashboard/(app)/reviews/page.tsx (regel 166-172)`

## [middel] MIST: Demo-banner: duidelijk label dat data placeholder is

Bestaande versie toont expliciet: 'Voorbeelddata, zodra Surface na elke klus een review-vraag verstuurt verschijnen hier echte reviews.' V2 heeft geen equivalent demo-banner of disclaimer.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/app/dashboard/(app)/reviews/page.tsx (regel 199-202)`

## [middel] MIST: Wachtende reviews sectie (PendingReviewRow) met Send-icoon en 'Vraag review'-knop

Bestaande versie toont onder 'In afwachting'-filter: lijst van PendingReviewRow met avatar, naam, klus-datum, plaats, days-since, 'Nog niet gevraagd'/'X dagen geleden gevraagd' pill, en Send-knop voor 'Vraag review'. V2 behandelt wachtende reviews en beantwoorde reviews uniform in ReviewList (geen aparte 'pending'-sectie-look).

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/reviews/PendingReviewRow.tsx`

## [middel] MIST: NPS-tone/sentiment-pill (Promoter/Passive/Detractor)

Bestaande ReviewCard toont NPS-tone als Pill met kleur-toon (groen voor promoter, rood voor detractor, grijs voor passive). V2 ReviewRow toont geen NPS-tone pill; alleen 'Beantwoord'-badge of -knop.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/reviews/ReviewCard.tsx (regel 49-53)`

## [middel] MIST: Published-status pill ('Gepubliceerd' groen met dot, of 'Niet gepubliceerd' amber)

Bestaande ReviewCard toont published-status onderaan (Pill met tone en optioneel dot). V2 ReviewRow heeft geen published-status-weergave.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/reviews/ReviewCard.tsx (regel 60-64)`

## [middel] MIST: Open lead-link (ArrowUpRight-icoon) per review

Bestaande ReviewCard toont '/leads/{leadId}'-link in footer van de kaart. V2 ReviewRow heeft geen open-lead-link.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/reviews/ReviewCard.tsx (regel 65-68)`

## [middel] MIST: Mobile Reviews-sectie (MobileReviews-component met ReviewScoreHeader, ReviewsTabs, ReviewCard interactief)

Bestaande versie heeft MobileReviews met uitgebreide mobile-specifieke UX (tabs, interactieve draft-tracking, toast-notificaties, templates voor snelle antwoorden). V2 heeft geen mobile-specifieke component; desktop-component zakt in op mobile via CSS-grid.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/mobile/reviews/MobileReviews.tsx`

## [middel] DEELS: Filter persisting via URL-params (searchParams.filter)

Bestaande versie: URL-parameter voor filter (all/pending/detractor), gebundeld in ReviewsFilterTabs (client-component). V2: filter via lokale state (useState) in ReviewsClient, geen URL-persisting. URL-persistence verloren.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/reviews/ReviewsFilterTabs.tsx`

## [middel] MIST: Response rate percentage (68% in voorbeeld)

Bestaande versie toont 'Response rate' KPI (68%). V2 ontbreekt dit KPI volledig. Dit is een belangrijke metric.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/app/dashboard/(app)/reviews/page.tsx (regel 219-223)`

## [middel] DEELS: Filterbare reviews-rijen: max 6 items in v2, alle items in bestaande (met kaart-grid)

V2 limiteert ReviewList tot 6 items (slice(0, 6)). Bestaande versie toont alle gefilterde reviews in kaart-grid (4-koloms responsive). Capping verlaagt de informatie-dichte.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/v2/reviews/ReviewsClient.tsx (regel 56)`

## [laag] MIST: Knop: 'Exporteer rapport' (disabled, voor toekomstige feature)

Bestaande versie heeft een disabled 'Exporteer rapport'-knop in de header (FileText-icoon). V2 ontbreekt deze knop volledig. Nodig voor parity.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/app/dashboard/(app)/reviews/page.tsx (regel 175-184)`

## [laag] MIST: Knop: 'Stuur reviewverzoek' (disabled, voor toekomstige feature)

Bestaande versie heeft een disabled 'Stuur reviewverzoek'-knop in de header (Send-icoon). V2 ontbreekt deze knop volledig. Nodig voor parity.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/app/dashboard/(app)/reviews/page.tsx (regel 185-194)`

## [laag] MIST: Trending-grafieken in KPI-kaarten (sparkline charts per KPI)

Bestaande KpiCard toont trend-array (7 punten) als sparkline-chart. V2 ontbreekt deze trend-visualisatie.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/ui/KpiCard`

## [laag] MIST: Hoeveelheid reviews 'dit jaar' KPI

Bestaande versie toont 'Reviews dit jaar' KPI (reviews.length + 42 = 47 in voorbeeld). V2 toont 'totaal reviews' (47) maar geen time-scoped variatie.

Bron: `/Users/christiaantromp/Desktop/Frontlix website/app/dashboard/(app)/reviews/page.tsx (regel 224-228)`
