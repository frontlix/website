# Fix-brief: Leads (lijst + pipeline) (data-koppeling)

Los onderstaande parity-issues op. Houd de v2-look + scroll/hoogte ongewijzigd; verander alleen wat nodig is. Gebruik de bestaande (app)-implementatie als referentie (hergebruik geocode/validatie/acties, verzin niets nieuws). Behoud de demo-fallback (geen sessie -> demo).

## 1. [MEDIUM] `components/dashboard/v2/leads/leads-mappers.ts`

**Probleem:** Pipeline-kolomtitel-mismatch op de 'review'-fase. PIPELINE_STAGES mapt de echte stage 'review' (gesprek_fase 'onderhandelen', in de (app)-pipeline gelabeld 'Offerte review') positioneel op de demo-titel 'Bezoek gepland'. Daardoor landen leads die in onderhandeling/offerte-review zitten in een kolom met het label 'Bezoek gepland', wat semantisch iets anders is. Ook stage 'gesprek' (info_verzamelen, app-label 'In gesprek') krijgt de titel 'Nieuw'. De buckets/leadverdeling zijn correct (zelfde leadStage-logica), het zijn alleen de labels die afwijken van de bestaande pipeline en de werkelijke fase.

**Fix:** Pas de titels in PIPELINE_STAGES (regel 134-138) aan zodat ze de fase dekken: 'review' -> 'Offerte review' i.p.v. 'Bezoek gepland', en overweeg 'gesprek' -> 'In gesprek' i.p.v. 'Nieuw', conform de bestaande desktop-LeadsPipeline STAGES.label. Dit is een tekst-only wijziging (PipelineCol['titel'] is een string in de prop-vorm), raakt de visuele opzet/spacing niet en herstelt de label-parity. Let op: PipelineColumn is een union van de demo-PIPELINE_COLUMNS-strings; als TS klaagt, verbreed het titel-type of laat 'titel' een gewone string zijn.
