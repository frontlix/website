# Frontlix Bouwkansen-rapport (2026-06-05)

## 1. Managementsamenvatting

Dit onderzoek begon met 243 gegenereerde ideeen, hield na ontdubbeling en triage 12 finalisten over en bracht er 5 tot een gescoorde shortlist. De rode draad is eenduidig: bijna alles van waarde draait rond een enkel thema, namelijk de pijn van trage of uitblijvende leadopvolging. Die pijn is extern keihard bewezen (binnen 5 minuten reageren geeft ongeveer 21 keer meer kans op kwalificatie, 78 procent koopt bij wie als eerste reageert). De zwakte zit nergens in de techniek maar in twee dingen: het vraagbewijs is voor de meeste kansen nog niet geleverd, en de distributie staat stil (kanaal koud, pijplijn koud, geen betalende klanten). De toplijst is bewust gerangschikt op vraagbewijs boven bouwplezier, niet op hoe leuk een feature is. De nummer 1 (afkoel-radar in de inbox) overleeft omdat de pijn massief is en validatie gratis kan meeliften op gesprekken die toch al lopen. Twee finalisten kregen een fataal-stem van het panel omdat hun kernclaim ("de handmatige versie draait al") feitelijk onjuist bleek. Eerlijke conclusie: er valt deze week niets te bouwen, wel valt er veel te valideren. De aanbeveling is drie goedkope validatiestappen vooraf, en pas bouwen na een gehaalde bewijsdrempel.

## 2. Toplijst (alle gebieden)

De volgorde respecteert de harde regel: vraagbewijs boven bouwplezier. De twee sterk-onderbouwde kansen (rang 3 en 5) staan bewust niet bovenaan, omdat hun eigen kernpremisse ("de handmatige LEKCHECK-DM draait al en is gevalideerd") door het panel feitelijk onjuist is bevonden en zij een fataal-stem kregen. Een onbewezen kans hoort niet bovenaan, ook niet als het externe categoriebewijs sterk is.

### 1. Onbeantwoorde-lead-radar in de inbox — score 68/110

- **Gebied:** PRODUCT
- **Wat:** Een radar die leads scoort op afkoel-risico (X uur geen reactie sinds binnenkomst, offerte wacht langer dan Y uur op goedkeuring, bot gepauzeerd en vergeten) en die bovenaan de inbox toont plus een push stuurt.
- **Voor wie:** MKB-dienstverlener met mens-in-de-lus offerte-goedkeuring.
- **Waarde-rekensom:** Retentie- en conversiehefboom, geen los prijslijntje. Bij grofweg 32 leads per maand, waarvan 3 stilvallen en de helft op tijd teruggehaald, ongeveer 1,5 geredde lead per maand. Bij 600 euro klusprijs en 25 procent win-rate is dat ongeveer 225 euro extra omzet per maand voor de klant, ongeveer 2.700 euro per jaar. Voor Frontlix zelf vooral een retentiehefboom: één voorkomen opzegging is bij 4 klanten meer waard dan de bouwinspanning. Eerlijke kanttekening: bij 0 betalende klanten is de churn-businesscase nu nog luchtkasteel, dus behandel dit als demo- en conversieargument.
- **Effort:** 3 dagen volgens de pitch, maar het panel corrigeert realistisch naar 5 tot 7 dagen (nieuwe kolom plus backfill, berichten-bulkquery met N+1-risico, cron met dedupe-state, notificatie-moeheid-tuning, regressiezone in de notificatie-pijplijn).
- **Vraagbewijs-status:** Matig.
- **Kern van het bewijs:** De onderliggende pijn (warme lead koelt af door trage opvolging) is sterk en NL-specifiek bewezen. De feature zelf is echter een gevalideerde commodity: GoHighLevel stale-opportunity, Zoho idle-lead, Pipedrive lead-scoring, Jobber push en SpeedToLead.io doen dit al. Niemand betaalt apart voor "een radar" (zit ingebakken in CRM's van ongeveer 15 tot 80 euro per gebruiker per maand). Het enige echt nieuwe stukje (bot_gepauzeerd_vergeten) is extern nergens als losse pijn aangetoond, dus onbewezen.
- **Onderhoud en kosten:** Lopende API-kosten nul (regels op timestamps, geen GPT, push via bestaande VAPID). Onderhoudsrisico = dedupe-kolom verplicht tegen notificatie-moeheid, en drempels af en toe bijstellen.
- **Eerste validatiestap (maximaal 1 week):** Zet handmatig een afkoel-rapport op uit de bestaande data (query op offerte_pending langer dan 12 uur, stille klant langer dan 3 dagen, bot gepauzeerd en stil) en stuur dat als losse regel naar de warme lead met de vraag "zou je hier een seintje van willen". Nul code. Vraag tegelijk in de toch al geplande koude demo's: "wat gebeurt er nu als een offerte 3 dagen blijft liggen". Bewijsdrempel: minstens 3 gesprekspartners noemen spontaan het stilvallen van leads als reele pijn.
- **Panelscore (totaal 68/110):** waarde 8, bewijs 5, effort-inv 4, fit 9, moat 3, panelgrootte 3.

### 2. Live lead-lek-check op frontlix.com (/lead-check) met directe demo-brug — score 65/110

- **Gebied:** GROEI
- **Wat:** Een losse, client-side pagina met een 6-vragen-diagnose die de bezoeker zelf zijn lek-score plus geschatte gemiste aanvragen en omzet (als eerlijke band) laat berekenen, eindigend op een demo-CTA. Anker-stat: 78 procent kiest wie als eerste reageert.
- **Voor wie:** Koude ICP-eigenaren (MKB-dienstverleners met formulier- of telefoon-leads) die via LinkedIn-outbound of content op de pagina landen.
- **Waarde-rekensom:** Funnelversneller. Bij ongeveer 50 outreach per week en een conversielift van 1 procentpunt (van 2 naar 3 procent) ongeveer 2 extra demo's per maand, ongeveer 24 per jaar; bij 12,5 procent demo-naar-klant ongeveer 3 extra klanten per jaar. Bij ongeveer 150 euro per maand is dat ongeveer 5.400 euro ARR-aanzet. Eerlijke nuance van het panel: dit is een stapeling van gunstige aannames, lees het als ambitie en niet als belofte.
- **Effort:** 3 dagen (panel noemt 3 tot 4 voor een goede mobile-first gauge plus conditionele copy plus QA).
- **Vraagbewijs-status:** Matig.
- **Kern van het bewijs:** Pijn en format zijn extern goed onderbouwd (interactieve calculators converteren benchmarkmatig veel hoger dan statische PDF's), maar het veld is overvol met exact dezelfde aanpak (leadleakaudit.com, hithereai.com, hotprospector.com en meer). De claim "niemand laat de ondernemer zijn eigen gemiste omzet uitrekenen" is feitelijk onjuist; dit bestaat al ruim. Geen enkele concurrent toont publiek omzet uit de calculator zelf. Differentiatie moet komen uit NL-taal plus de eigen 60-seconden-bewijsbrug, niet uit nieuwigheid.
- **Onderhoud en kosten:** Vrijwel nul. Berekening 100 procent client-side, geen API-kosten, draait op de bestaande VPS. Onderhoud = af en toe de rekenfactoren en copy bijstellen.
- **Eerste validatiestap (maximaal 1 week):** Plaats LEKCHECK in LinkedIn-Featured plus 2 posts en bied het actief aan in ongeveer 25 lopende DM's; tel hoeveel mensen de 6 vragen invullen. Voer in 5 koude gesprekken de diagnose mondeling uit. Zet eventueel een nepdeur-knop op /contact of home en meet kliks via PostHog. Bewijsdrempel: minstens 2 van de 3 (minstens 5 ingevulde diagnoses in 2 weken, minstens 3 van 5 gesprekken positief, of meer dan 5 procent kliks).
- **Panelscore (totaal 65/110):** waarde 6, bewijs 4, effort-inv 7, fit 9, moat 3, panelgrootte 3.

### 3. Lead-lek-check live met echte benchmark-data eronder — score 65/110

- **Gebied:** GROEI
- **Wat:** Dezelfde /lead-check-pagina, maar de uitkomst-bandbreedtes worden gevoed met geanonimiseerde echte cijfers uit de leads-tabel. In de verdieping wordt de echte-data-laag echter zelf weer uit de MVP geknipt (de leads-tabel is nu vooral eigen/demo-data en zou geen geloofwaardige branche-benchmark opleveren en de honesty-regel breken); de echte-data-laag wordt een latere v2.
- **Voor wie:** Koude ICP-prospects als demo-brug.
- **Waarde-rekensom:** Funnelversneller. Bij ongeveer 50 outreach per week en een respons-uplift van ongeveer 5 naar ongeveer 10 procent: van ongeveer 2 tot 3 naar ongeveer 5 gesprekken per week. Het verschil tussen het doel (3 tot 4 klanten) halen of missen is al snel 3.000 tot 9.000 euro per jaar waard. Daarnaast tijdsbesparing: elke handmatige DM-diagnose kost nu ongeveer 10 tot 15 minuten.
- **Effort:** 2,5 dagen (juist omdat de echte-data-laag eruit wordt geknipt blijft de MVP klein).
- **Vraagbewijs-status:** Sterk (categoriebewijs), maar let op: het panel gaf hier een fataal-stem omdat de premisse niet klopt (zie kern hieronder).
- **Kern van het bewijs:** Pijn en het lead-magneet-format zijn sterk bewezen (calculators ongeveer 15 tot 40 procent conversie versus 2 tot 5 procent voor statische PDF's). Maar het fatale punt: de claim "de handmatige DM-versie (LEKCHECK) draait al" is feitelijk onjuist. In de volledige CRM-dataset komt het triggerwoord LEKCHECK nul keer voor in een verstuurd bericht of een prospectreactie; het concept leeft alleen in skill-instructiebestanden. Geen enkele gelogde reactie beantwoordde de 6 vragen. De go-criteria-meetweek is dus nooit uitgevoerd en staat op nul. Bovendien sloopt de MVP zijn eigen titel door de benchmark-laag weg te knippen.
- **Onderhoud en kosten:** Zeer laag, 100 procent client-side, geen OpenAI, geen extra cron. De geschrapte echte-data-laag zou wel RLS- en PII-zorgvuldigheid plus periodieke herberekening vergen, vandaar dat die bewust uit de MVP blijft.
- **Eerste validatiestap (maximaal 1 week):** Voer de meetweek die nooit is gedaan alsnog uit: stuur de LEKCHECK-trigger naar 20 tot 30 koude ICP-prospects en log hoeveel de 6 vragen beantwoorden en hoeveel om een demo vragen. Go-criterium: minstens ongeveer 5 voltooiingen en minstens 2 vervolggesprekken. Pas daarna de 2,5 dag investeren.
- **Panelscore (totaal 65/110):** waarde 7, bewijs 3, effort-inv 7, fit 9, moat 3, panelgrootte 3.

### 4. Lead-lek-check ROI-rapport met geintegreerde live demo-koppeling — score 62/110

- **Gebied:** GROEI
- **Wat:** Na het resultaatscherm laat de prospect zijn mail achter voor de volledige analyse als PDF. Op submit gebeuren drie dingen: een gepersonaliseerd PDF-rapport (server-side via @react-pdf/renderer, al een dependency) wordt gemaild, de lead landt in Supabase plus Slack-notificatie zodat Frontlix binnen 60 seconden persoonlijk terugbelt (live bewijs), en PostHog logt de funnel. De auto-slug-demo-koppeling wordt bewust uit de MVP geknipt, omdat de bestaande LeadDemo-visualisatie geen props neemt en vaste getallen toont.
- **Voor wie:** Koude ICP-prospects die de check invullen en een tastbaar, gepersonaliseerd vervolg nodig hebben.
- **Waarde-rekensom:** Conversiehefboom. Bij ongeveer 15 check-bezoekers per week, ongeveer 40 procent voltooiing en ongeveer 50 procent mail-achterlaters ongeveer 3 leads per week; de PDF plus 60-seconden-terugbel tilt de demo-conversie van ongeveer 5 naar ongeveer 15 procent, ongeveer 0,6 extra demo's per week, over 26 weken ongeveer 15 extra demo's, bij 20 procent sluitkans ongeveer 3 extra klanten = ongeveer 6.000 tot 10.800 euro ARR. Harde voorwaarde: zonder verkeer is de opbrengst nul, hoe mooi de PDF ook is.
- **Effort:** 5 dagen volgens de pitch, panel corrigeert naar 6 tot 8 dagen (publiek ongeauthenticeerd mail-endpoint, rate-limiting naar voren getrokken, stapformulier, gauge, PDF-template).
- **Vraagbewijs-status:** Matig.
- **Kern van het bewijs:** Beide bouwstenen los goed onderbouwd; HiThere AI bouwde vrijwel exact dit (lead-leak-audit-calculator plus gepersonaliseerd auditrapport plus snelle opvolging), wat bewijst dat het bouwbaar en verkoopbaar is, maar ook dat het niet nieuw is. ROI-calculators raken gecommoditiseerd. Het exacte gecombineerde aanbod en de keten koud-verkeer naar check naar PDF naar demo is voor deze context onbewezen, en leunt op verkeer dat er nog niet is.
- **Onderhoud en kosten:** Lopende kosten nul (geen GPT-call, PDF zonder per-document-kosten, bestaande nodemailer). Enige echte nieuwe schuld: de publieke mail-capture is een ongeauthenticeerd endpoint, dus de uitgestelde rate-limiting wordt hier relevant tegen spam.
- **Eerste validatiestap (maximaal 1 week):** Draai de DM-versie 10 tot 15 keer handmatig naar koude prospects en maak voor 2 tot 3 ervan met de hand een PDF (Canva of een los script, geen pagina). Meet of de PDF de respons en demo-toezegging merkbaar verhoogt versus de kale DM-uitkomst. Go-criterium: minstens 3 van de ongeveer 12 leiden tot een demo-toezegging en het PDF maakte in minstens 1 geval het verschil.
- **Panelscore (totaal 62/110):** waarde 7, bewijs 4, effort-inv 5, fit 8, moat 3, panelgrootte 3.

### 5. Lead-lek-check als gehoste micro-app met persoonlijke deel-link — score 52/110

- **Gebied:** GROEI
- **Wat:** De gespecde /lead-check als statische client-side pagina, plus een dunne prospect-laag via een query-param ?p=naam-slug die enkel de naam in de hero personaliseert ("Speciaal voor jou, naam"). Bij voltooien plus mail-invul een POST naar een nieuwe Supabase-tabel lead_check_submissions. Echte per-prospect-tokens, automatische Sheet-append en e-mailbevestiging-bot blijven bewust buiten de MVP (de tokeninfra zit in de bot/FastAPI, niet in de Next.js-app; de linkedin-crm is een Google Sheet).
- **Voor wie:** Frontlix zelf, voor outbound-demo's naar koude MKB-ondernemers.
- **Waarde-rekensom:** Funnelversneller plus informatie. Bij ongeveer 50 outreach per week, conversie van ongeveer 2 naar ongeveer 4 procent: over 6 weken (300 contacten) van 6 naar 12 demo's; bij 1 op 4 sluitkans en ongeveer 150 tot 250 euro per maand ongeveer 1 tot 2 extra klanten = ongeveer 1.800 tot 6.000 euro jaarwaarde. De echte opbrengst is informatie (intentie-signalen binnen 2 weken) tegen ongeveer 3,5 dag bouw.
- **Effort:** 3,5 dagen volgens de pitch, panel noemt realistisch 5 tot 6 dagen.
- **Vraagbewijs-status:** Sterk (categoriebewijs), maar ook hier gaf het panel een fataal-stem (zie kern).
- **Kern van het bewijs:** Het funnel-patroon (gratis lead-lek-calculator als brug naar betaalde dienst) is mainstream en breed gecommercialiseerd (HiThere AI bijna 1-op-1 analoog, Chili Piper, LeadNero en tientallen anderen); de markt is vol, wat eerder vraag dan tegenbewijs is, maar differentiatie in copy en branchecijfers is cruciaal. Fataal punt: de groei-log heeft maar één echte week en die staat op nul over alle KPI's; nul geregistreerde invuller van de handmatige LEKCHECK; de outbound-motor staat stil (laatste post ongeveer 4 maanden geleden, pijplijn ongeveer 55 dagen koud); en de eigenaar besloot 4 dagen geleden expliciet "Lead-lek-check blijft handmatige DM-versie, pagina niet bouwen". Het idee heropent dus een genomen besluit zonder vraagbewijs.
- **Onderhoud en kosten:** Lopende kosten nul (client-side, bestaande Supabase, bestaande VPS). Risico om te bewaken: de capture-route is publiek plus service-role (omzeilt RLS), dus dezelfde payload-begrenzing en sanitatie als form-tracking overnemen tegen spam en PII-lekken.
- **Eerste validatiestap (maximaal 1 week):** Stuur 10 werkdagen lang aan minstens 25 koude prospects de LEKCHECK-DM en log per prospect of ze de 6 vragen beantwoorden. Drempel: minstens 8 van de 25 vullen in. Voer 5 korte gesprekken: "had je dit zelf ingevuld op een pagina, of waardeer je juist dat ik het voor je deed". Go/no-go: samen minstens 8 invullers en minstens 3 van 5 positief over self-serve.
- **Panelscore (totaal 52/110):** waarde 5, bewijs 4, effort-inv 5, fit 6, moat 3, panelgrootte 3.

## 3. Kort overzicht per waardegebied

### PRODUCT
Beste kans: **Onbeantwoorde-lead-radar in de inbox** (68, rang 1). Sterkste fit met de stack (vrijwel alles bestaat al: de scorer in eerst-dit-doen.ts, de notificatie-pijplijn, het cron-pattern) en het maakt de kernbelofte "geen warme lead glipt weg" waar. De pijn is massief bewezen, maar het meest onderscheidende stukje (bot-vergeten-detectie) is onbewezen en de retentie-businesscase is luchtig bij 0 klanten. Geen andere PRODUCT-kans haalde de gescoorde shortlist; alle andere PRODUCT-ideeen (no-show-schild, offerte-leesbevestiging, stille-lead-radar) sneuvelden in het kerkhof.

### GROEI
Dit gebied domineert de shortlist met 4 van de 5 kansen, allemaal varianten op de lead-lek-check. De beste die niet fataal is gestemd: de **live /lead-check met demo-brug** (65, rang 2). De **benchmark-variant** (65, rang 3) en de **micro-app met deel-link** (52, rang 5) hebben sterker categoriebewijs maar kregen een fataal-stem omdat hun premisse ("handmatige versie draait al") aantoonbaar onjuist is. Het **ROI-rapport met PDF** (62, rang 4) is de rijkste maar duurste variant. Eerlijke conclusie voor heel GROEI: de pijn en het format zijn bewezen, de eigen vraag is dat niet, en de funnel die alles moet voeden staat stil.

### INTERN
Geen enkele INTERN-kans haalde de finalistenronde of de shortlist. De enige INTERN-finalist (branche-pakket-generator) sneuvelde fataal: de kernbelofte hield geen stand (een nieuwe branche is al een bestand van ongeveer 31 regels, geen dagen dev-werk) en het volume om de fabriek te rechtvaardigen ontbreekt. Advies: niets bouwen in dit gebied tot er klantvolume is dat herhaling rechtvaardigt.

### NIEUW
Geen kansen in dit gebied overleefden de triage tot een gescoorde finalist. Alle nieuwe-product-richtingen (losse micro-SaaS Lekradar, partner-laag, foto-naar-prijs, voice-demo, benchmark-product) vielen af op ontbrekende vraag of op het ontbreken van een klantenbasis om mee te beginnen.

## 4. Quick wins (effort 2 dagen of minder)

Geen. Geen van de gescoorde finalisten heeft een effort van 2 dagen of minder; de laagste is de benchmark-variant met 2,5 dagen (en die kreeg een fataal-stem). De goedkoopste echte "quick win" is dan ook geen bouwtaak maar een validatietaak: het handmatige afkoel-rapport uit bestaande data (nul code) en de handmatige LEKCHECK-meetweek. Doe die eerst.

## 5. Niet-gescoorde overlevers

Geen. Alle 5 overlevers zijn gescoord; er zijn geen ongescoorde overlevers.

## 6. Kerkhof (gesneuvelde ideeen)

- **Stille-lead-radar: dashboard-alert voor leads die afkoelen** (PRODUCT) — Bestaat al volledig in productie: de stille_klant-tak draait al in eerst-dit-doen.ts en wordt gerenderd via EerstDitDoen.
- **Lek-rapport-generator: PDF-funneldiagnose van een echte prospect-website** (GROEI) — Format besmet door associatie met SEO/agency-spam, en de lek-formule werkt niet zonder zelf-invoer van de prospect.
- **Branche-pakket-generator (intern config-fabriek)** (INTERN) — Volume ontbreekt en het idee weerlegt zichzelf: een nieuwe branche is al ongeveer 31 regels config, geen uren dev-werk.
- **Lead-check als terugkerende klant-zelfscan** (GROEI) — Geen klant om te retentioneren (dashboard is bewijsbaar single-tenant), en leunt op een gedeelde lek-formule plus pagina die nog niet bestaan.
- **Interactieve ROI-calculator op de demo-pagina (prijs aan klant-omzet koppelen)** (GROEI) — Premisse fout: er staat nergens een prijs op de site of demo-pagina, dus de gestelde pijn bestaat niet.
- **No-show-schild: bevestig-en-herinner met 1-tik-verzetten** (PRODUCT) — Fataal op vraagbewijs; de "vrijwel alles bestaat al"-claim klopt niet, waardoor de 5 dagen een grove onderschatting zijn.
- **Offerte-leesbevestiging: weet wanneer de prospect de offerte opent** (PRODUCT) — Kernpremisse feitelijk onjuist: de offerte verlaat Frontlix nooit als trackbare link, dus er valt geen view-event te loggen; en de "geen concurrent biedt dit"-claim klopt niet (Offorte doet het).

## 7. Methodeverantwoording

### Trechter en aantallen
- **Rondes:** 1
- **Ideeen gegenereerd:** 243
- **Duplicaten verwijderd:** 80
- **Na triage afgevallen:** 151
- **Pipeline-in (finalisten naar verdieping):** 12
- **Zonder oordeel gebleven:** 0
- **Gescoord:** 5
- **Overlevers:** 5
- **Kerkhof:** 7

De optelsom: 243 ideeen, waarvan 80 duplicaten en 151 na triage afvielen, liet 12 finalisten over; daarvan zijn er 5 gescoord en als overlever doorgekomen en 7 in het kerkhof beland (gesneuveld bij verdieping of scoring).

### Caps en grenzen (expliciet)
- **Scoringsschaal:** maximaal 110 punten per kans, opgebouwd uit waarde, bewijs, effort-inverse, fit, moat en panelgrootte. De hoogste behaalde score is 68, dus geen enkele kans komt in de buurt van het plafond; dat is een eerlijk signaal dat geen van de kansen overtuigend boven twijfel staat.
- **Effort-cap:** de pitches gaven optimistische dag-schattingen; het panel heeft die expliciet teruggefloten (radar van 3 naar 5 tot 7 dagen, ROI-rapport van 5 naar 6 tot 8 dagen, micro-app van 3,5 naar 5 tot 6 dagen). Lees de panelcijfers, niet de pitch-cijfers.
- **Vraagbewijs-cap:** de hoogste bewijs-subscore is 5 op de schaal; geen enkele kans haalde een hoog bewijscijfer. Categoriebewijs (de pijn bestaat, de tactiek werkt elders) is sterk, maar eigen, gemeten vraag voor Frontlix ontbreekt overal.
- **Slechts 1 ronde:** er is niet itereratief doorgezocht; een tweede generatieronde had mogelijk andere of betere richtingen opgeleverd.

### Wat NIET is onderzocht
- **Geen hard zoekvolume:** voor geen enkele NL-zoekterm is geverifieerd keyword-volume verkregen (geen Keyword Planner of Semrush-toegang). Alle vraag-uitspraken steunen op statistiek plus concurrentie-proliferatie, niet op gemeten zoekvraag.
- **Geen rauwe gebruikersvraag:** er zijn geen directe Reddit-, forum-, LinkedIn- of Facebook-groepsthreads gevonden waarin eigenaren om deze specifieke gereedschappen vragen. Het bewijs is afgeleid, niet first-person.
- **Geen winstgevendheidsbewijs per concurrent:** de vele concurrenten tonen dat het format populair is, niet dat een losse calculator een duurzaam bedrijf opleverde (nimbflow.com staat zelfs te koop).
- **Geen interne meetweek uitgevoerd:** de go/no-go-meetweken die de ideeen zelf voorschrijven zijn (nog) niet gedraaid; voor de fataal-gestemde kansen staat de teller bewijsbaar op nul.

### De 151 na triage afgevallen ideeen (bijlage-lijst, alleen titels)
1. Branche-Lek-Check-generator: per vakgebied een eigen /lek-check-landingspagina
2. Factuur-na-akkoord robot: van goedgekeurde offerte naar betaalverzoek zonder boekhoudprogramma
3. Onboarding-in-een-uur: zelfbedienings-setupwizard die een nieuwe klant zonder Chris live zet
4. Verkoop-pijplijn-cron voor Chris: dagelijkse 'wie moet ik vandaag opvolgen'-lijst uit het hele Frontlix-systeem
5. Reviews-tabel + WhatsApp-review-oogst die de mock vervangt
6. Branche-demo-uitbreiding naar telefoon-gedreven trades (loodgieter/installateur)
7. Win-back-motor: slapende leads automatisch heractiveren via WhatsApp
8. Demo-in-een-minuut-bouwer: bedrijfssite scrapen tot kant-en-klare gepersonaliseerde demo
9. Reactietijd-thermometer in het dashboard
10. Stille-lead-detector met automatische opvolg-suggestie
11. Reactietijd-bewijsbadge voor de demo-pagina
12. WhatsApp Click-to-Chat lead-magneet als embeddable widget
13. Google Business Profile-monitor in het reviews-scherm (zonder OAuth, via scraping-light)
14. Slack/WhatsApp-dagbrief van Schoon Straatje: omzet, no-shows en lekken naar de eigenaar
15. Voice-note-verstaander: klant stuurt spraakbericht, bot verstaat het meteen
16. Diepte-laag tegen de Meta-bot: verticalized offerte als verdedigbare moat
17. Live spraak-demo op de site: bel de Frontlix-bot en hoor je eigen offerte
18. Branche-demo-fabriek: van prospect-website naar gepersonaliseerde demo in 1 run
19. Foto-naar-prijs-engine via VLM: klant stuurt foto, offerte-voorzet rekent zelf
20. Maandelijks Lekrapport per e-mail
21. Heractivatie-radar voor ingeslapen leads
22. Branche-startpakket: kies-je-vak-wizard die config.json automatisch vult
23. Proefmodus met testleads: dashboard vol zonder echte klanten af te schrikken
24. Demo-naar-account-brug: gepersonaliseerde demo wordt het skelet van de echte tenant
25. Universele website-formulier-snippet met zelf-test-knop
26. Buiten-kantooruren-bewijsrapport (de lek die je dichtte, in euro's)
27. Usage-meter per tenant (lead-events teller als facturatie-grondslag)
28. Stille-uren-radar: dagelijkse signaallijst van leads die vastlopen
29. Offerte-goedkeuren-via-Slack: 1-tik approve vanaf de telefoon
30. Veilige offerte-mail-testmodus met bot-circuit-breaker
31. Demo-config-generator: van LinkedIn-profiel naar gepersonaliseerde demo in 2 min
32. Productized 'lead-opvolg-audit' als betaalde instap onder de SaaS-drempel
33. Klant-zelfbediening reviews-aggregatie zodra de tabel er is
34. Eenbron-prijsmotor: branche-config los van code (JSON in Supabase, beheerd via instellingen)
35. 60-seconden-bewijsdemo: live timer-replay van een echte leadopvolging
36. Bron-attributie-paneel: zie welk kanaal echte klanten oplevert, niet alleen leads
37. Lek-radar: wekelijkse funnel-alarmbrief per klant
38. Spiegel-rapport na de demo: hier zat jouw lek, dit pakt Frontlix
39. Terugkeer-motor: automatische heraanvraag bij klanten die jaarlijks dezelfde klus nodig hebben
40. Wekelijkse klant-resultaatbrief: Frontlix bewijst zichzelf automatisch zodat Chris geen retentie-mails hoeft te schrijven
41. Concurrent-reactiesnelheid-spiegel: meet en toon hoeveel sneller de klant reageert dan zijn markt
42. Foto-vlekherkenning voor schoonmaak: bot leest oprit/gevel en zet m2-schatting voor
43. Kleur- en herstel-intake voor schilders: bot stelt de juiste meet-vragen zodat de ondernemer een gericht voorzet krijgt
44. Live branche-demo-generator: voer een bedrijfsnaam in en krijg een werkende WhatsApp-demo voor die specifieke trade
45. Schilder/klusbedrijf: meerdere-vlakken-calculator in de offerte-editor
46. Concurrent-reactietijd-meter als koud openingswapen
47. Conversie-funnel-visualisatie uit status-historie
48. ROI-onepager-export per klant
49. Verloren-leads-analyse met heractivatie-suggesties
50. Mollie-betaalverzoek bij offerte-akkoord (aanbetaling vergrendelt de klus)
51. VoIP-koppeling: gemiste oproep wordt direct een WhatsApp-lead
52. Reviews-naar-Google-vindbaarheid als losse betaalde mini-dienst (GBP Boost)
53. Stille lead-verrijker: achtergrond-AI tagt en scoort elke lead bij binnenkomst
54. Antwoordkwaliteit-monitor: AI beoordeelt de bot-antwoorden van de afgelopen week
55. Lead-lek-check met foto-bewijs: upload je formulier-screenshot, AI leest de lekken
56. Outbound-radar: AI vindt en kwalificeert ICP-prospects met intentie-signaal
57. Concurrentie-reactietijd-radar: bewijs onder de lead-lek-check leggen
58. Reactietijd-vergelijking tegen branchegemiddelde
59. Resultaten-spiekbriefje voor demogesprekken
60. Stille-week-signaal naar de founder
61. Wekelijkse opvolg-suggesties: leads die dreigen koud te worden
62. Reactietijd-bewaking met automatische waarschuwing bij bot-stilte
63. Frontlix Partner-laag: dashboard-licenties doorverkopen aan websitebouwers
64. Self-service WhatsApp-koppeling met live testbericht-knop
65. Importeer-je-prijslijst: PDF/foto-upload die prijsregels voorinvult
66. Branche-democonfig-bibliotheek: nieuwe verticals zonder dev-werk demobaar
67. Branche-startpakketten: kant-en-klare config-presets per vak
68. Proefperiode-klok gekoppeld aan eerste echte lead, niet aan kalenderdatum
69. Migratie-import: historische leads van de klant inladen voor directe benchmarks
70. Onboarding-as-a-service als betaald instapaanbod (Setup Sprint)
71. Reactiesnelheid-garantie als betaalde tier (60-seconden-SLA met meterstand)
72. Per-lead-prijsmeter in het dashboard (kostentransparantie als upsell-haak)
73. Marge-dashboard-blok dat de hogere tier rechtvaardigt
74. Demo-uit-LinkedIn: prospect-URL naar gepersonaliseerde demo in 30s
75. Wekelijkse pipeline-warmhoud-brief uit het LinkedIn-CRM
76. Deploy-vangrail: één commando dat de eigen valkuilen afdwingt
77. Content-grondstof-cron: post-haakjes uit echte klantdata
78. Comment-radar: golden-window engagement-queue uit LinkedIn
79. Wekelijkse ops-gezondheidsbrief: deploy + cron + error-log in één Slack-kaart
80. Reactie-snelheid widget voor de eigen website van de klant
81. Slimme no-show- en opvolg-herinneraar voor de klant
82. Concurrentie-snelheidstest als publieke groei-asset
83. Wekelijkse no-show- en stille-lead-alert die de founder namens de klant naport
84. Verlaten-aanvraag-redder: e-mail-fallback voor leads die de intake niet afmaken
85. 60-seconden bewijs-demo die de prospect zelf triggert
86. Verlies-autopsie: wekelijkse 'waarom liep deze lead weg'-analyse uit de eigen leaddata
87. Partner-portaal-light: white-label demo-links voor websitebouwers die de ICP bedienen
88. Reactietijd-bewijsbadge: live 'wij reageerden in X seconden'-meter
89. Frontlix Benchmark: branchecijfers als terugkerend inkomstenproduct
90. Tweede-kans-motor voor afgekoelde leads die nooit boekten
91. Maandelijkse Zo-deed-je-het-PDF die de klant zichzelf toestuurt
92. Marge-waarschuwing: signaleer klussen waar je amper aan verdient
93. Branche-specifieke lead-lek-check varianten: trimsalon en kapper krijgen hun eigen rekenvoorbeeld
94. Garagebedrijf: kenteken-intake + APK/onderhoud-triage
95. Wekelijkse branche-radar: intern signaal welke vertical nu vraag toont
96. Zelfboek-slotpagina als publiek alternatief voor de LLM-agenda
97. Branche-benchmark: 'Hoe scoor jij vs vergelijkbare bedrijven'
98. Demo's vullen met realistische data uit eigen geaggregeerde patronen
99. Beste-bel-momenten-heatmap uit gesprek-timestamps
100. Eerlijke betrouwbaarheids-badge uit de bot-foutenlog
101. Optimale-remindertiming-advies uit conversiedata
102. Boekhoud-brug: geaccepteerde offerte als concept-factuur naar Moneybird/e-Boekhouden
103. Telefonische lead-redder: AI-voicebot belt gemiste website-leads binnen 60s
104. Zelf-gehoste Qwen3-8B op de VPS voor goedkope bulk-klusjes (geen API-rekening)
105. Meertalige real-time WhatsApp-bot voor anderstalige klanten van NL-bedrijven
106. Persoonlijk recordbord: 'jouw cijfers sinds de start'
107. Betaalde maand-rapportage als los add-on voor niet-klanten met eigen data
108. Witte-handschoen-setuprapport: founder vult in, klant keurt in 1 scherm goed
109. Onboarding-telemetrie: zie waar nieuwe klanten vastlopen vóór ze afhaken
110. Succesfee-pilot op geboekte afspraken (no-cure-no-pay-laag bovenop basis)
111. Publiek deelbaar prestatie-badge + mini-rapport ('Powered by Frontlix, reageert in 47s')
112. Tier-feature-flags-laag (entitlements per tenant)
113. Kost-per-lead-watcher met Slack-alert bij onrendabele tenant
114. Per-lead-afrekenmodel als optioneel pakket (Pay-per-Lead naast vast abonnement)
115. Jaarbundel met vooruitbetaling en gegarandeerde reactietijd-SLA
116. Doorverwijs-programma met trackbare deellink in het klant-dashboard
117. Branche-template-galerij als zelfbedienings-instapfunnel
118. Tenant-provisioning script: nieuwe klant of demo live in één commando
119. Bot-zelfdiagnose-wacht: stille faal-detectie op de leadmotor
120. Maandelijkse merk-rapportage-PDF voor de klant (white-label)
121. Gespreks-kwaliteitsrapport uit de bot-logs als wekelijkse founder-brief
122. Bot-engine als white-label intake-laag voor één bevriende websitebouwer
123. Snelheidsgarantie-badge met live publieke meter
124. Branche-benchmarkrapport als leadmagneet en betaald inzichtproduct
125. Weer-trigger: zet capaciteit in als het weer de vraag bepaalt
126. Slimme dagroute-planner: rangschik de afspraken van de dag op kortste rijroute
127. Hovenier-seizoensvelden + meerwerk-vangnet in de bot
128. Fysio/zorg-praktijk: AVG-veilige intake zonder medische data in de bot
129. Glazenwasser/schoonmaak: terugkerend-abonnement-detectie en herhaalplanning
130. Rijschool-pakket: les-pakket-keuze + proefles-slot in plaats van offerte
131. Slimme offerte-upsell (vrijblijvende meerwerk-suggesties in de offerte)
132. Klaar-voor-jouw-boekhouding: een-richtings-handoff naar Moneybird, Teamleader of e-Boekhouden
133. Witlabel-partnerlaag voor websitebouwers en bureaus
134. Anonieme branche-benchmark uit gepoolde leaddata
135. Doe-het-zelf voice-demo op de marketingsite: bel de Frontlix-bot nu
136. Jaarrubriek-overzicht voor de boekhouder
137. Jaaroverzicht-terugblik die de klant deelbaar maakt
138. Branche-benchmark: hoe presteer jij versus vergelijkbare bedrijven
139. Multi-vestiging / team-tier met per-monteur-toewijzing en rapportage
140. Software-leverancier-integratie: webhook-koppeling voor offerte- en planningstools
141. Publieke status-/wachtpagina voor de lead zelf
142. WhatsApp-knop generator met QR voor offline leadcapture
143. Reactiveer-de-doden campagne voor stille leads
144. Inventaris-intake voor verhuizers: bot bouwt een verhuislijst en volume-schatting uit foto's en kamers
145. Branche-specifieke offerte-PDF-skins (vertrouwens-laag per vakgebied)
146. Bonnetjes- en kostprijs-scanner: marge-data bijwerken via foto
147. Marketplace-listing-pakket: Frontlix als opvolg-laag in platforms die de ICP al gebruikt
148. Partner-attributie-dashboard binnen Mission Control
149. Conversatie-naar-vault: automatische destillatie van klant-DM-besluiten
150. Lead-claim race-modus voor bedrijven met meerdere monteurs
151. Frontlix Lekradar als losse micro-SaaS: betaalde reactietijd-monitor voor MKB

## 8. Voorstel: de eerste 3 acties voor komende week

Geen van deze acties is bouwen. Het zijn validatiestappen die binnen een week passen en die de twee fatale gaten (onbewezen eigen vraag, stilstaande funnel) direct aanpakken.

1. **Draai het handmatige afkoel-rapport (nul code).** Query de bestaande leads-data op offerte_pending langer dan 12 uur, stille klant langer dan 3 dagen, en bot gepauzeerd en stil. Stuur dat als losse regel naar de bestaande warme lead met de vraag "zou je hier een seintje van willen". Dit valideert de nummer 1-kans (radar) zonder een regel productiecode en zonder kosten.

2. **Voer de LEKCHECK-meetweek uit die nog nooit is gedaan.** Stuur 10 werkdagen lang aan minstens 25 koude ICP-prospects de handmatige LEKCHECK-DM met de 6 vragen en log per prospect: gestart, voltooid, demo gevraagd. Dit is de ontbrekende bewijsstap onder alle vier de GROEI-kansen en het herstart meteen de stilstaande outbound-motor. Go-criterium: minstens 8 invullers en minstens 2 vervolggesprekken.

3. **Voer 5 korte gesprekken over self-serve versus persoonlijk.** Vraag prospects die de DM-check deden: "had je dit zelf op een pagina ingevuld, of waardeer je juist dat ik het voor je deed". Dit beslist tussen de publieke /lead-check-varianten (rang 2 tot 5) en de zuivere DM-aanpak, zodat er straks niet de verkeerde variant gebouwd wordt. Bouw pas een pagina als minstens 3 van de 5 positief zijn over self-serve.

## Open punten van de completeness-critic

- **Mono-thesis-tunnel rond één pijn:** Alle 5 finalisten leunen op dezelfde aanname (trage leadopvolging) en op twee buitenlandse ankerstatistieken (21x kwalificatiekans, 78 procent koopt-bij-eerste); onderzoek of die cijfers stand houden voor NL MKB-dienstverleners (telefoon- en WhatsApp-gedreven, kleine volumes) en zoek minstens één onafhankelijke pijn-as buiten leadopvolging voordat het hele portfolio op één thesis wordt gebouwd.
- **Monetisatie- en eerste-klant-lens onderbelicht:** De retentie- en omzetcijfers zijn herhaaldelijk "luchtkasteel bij 0 klanten" maar er is geen onderzoek naar betalingsbereidheid, prijspunt of het mechanisme dat de allereerste betalende klant binnenhaalt; onderzoek welke kans het kortste pad naar klant nummer 1 oplevert in plaats van de grootste retentiehefboom voor een klantenbasis die nog niet bestaat.
- **Concurrentie- en moat-claim ongeverifieerd voor NL:** Elke kans krijgt moat 3 en "de markt is vol" leunt op buitenlandse spelers (HiThere AI, GoHighLevel, Chili Piper); verifieer of er een Nederlandstalige directe concurrent bestaat en of de gestelde differentiator (NL-taal plus 60-seconden-bewijsbrug) feitelijk verdedigbaar en gewenst is, in plaats van als aanname te dienen.
- **Distributie zelf als kans ontbreekt:** De kerndiagnose is "distributie staat stil" (kanaal koud, pijplijn 55 dagen koud), tóch veronderstellen alle 5 finalisten verkeer dat er niet is en gaat geen enkele kans over het herstarten van het kanaal zelf; onderzoek of een distributie- of kanaalkans (bijvoorbeeld de in de 151-lijst gedumpte comment-radar, content-grondstof-cron of outbound-radar) niet een hogere hefboom heeft dan opnieuw een lead-magneet zonder publiek.
