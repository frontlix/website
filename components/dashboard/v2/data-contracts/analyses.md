# Data-contract: Analyses (statistieken) — data-mapping van (app) naar v2

**Auth/tenant:** Single-tenant (Schoon Straatje), authenticated via Supabase Auth (RLS-compliant). Server-side Supabase client uit `lib/dashboard/supabase-server.ts` respects row-level security. Admin-schrijven (omzet-doel) via `getDashboardAdmin()` omdat `tenant_settings` geen UPDATE-policy heeft voor dashboard-users.

**Realtime:** geen

## Bestaande bestanden (bron)

- `/Users/christiaantromp/Desktop/Frontlix website/app/dashboard/(app)/statistieken/page.tsx`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/stats-queries.ts`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/period.ts`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/omzet-buckets.ts`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/format.ts`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/omzet-doel-actions.ts`
- `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/stats/KpiCard.tsx`
- `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/stats/PeriodSelector.tsx`
- `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/stats/TrendLineChart.tsx`
- `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/stats/DistributionBars.tsx`
- `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/stats/TopTagsList.tsx`
- `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/v2/analyses/page.tsx`
- `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/v2/analyses/analyses-data.ts`
- `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/v2/demo-data.ts`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/supabase-server.ts`

## Leest (weergave-data)

- **KPI-waarden: totaal leads, conversie %, gem. offertewaarde, gem. reactietijd**
  - bron: `Supabase leads-tabel + stats-queries (countLeads, countConverted, avgOfferteWaarde, avgReactietijdMs)`
  - vorm: { total: number, converted: number, avgOfferte: number | null, avgReactieMs: number | null }
  - vervangt in v2: ANALYSE_KPIS[4] in analyses-data.ts (momenteel: Nieuwe leads (week) / Conversie offerte→klant / Gem. kluswaarde / Prognose juni — hardcoded demo-data)
- **Verdeling per status (open, opgevolgd, afgehandeld, no-show, geen_interesse, archief)**
  - bron: `statusVerdeling() uit stats-queries.ts — query op leads.dashboard_status`
  - vorm: { status: string | null, count: number }[] DESC op count
  - vervangt in v2: Demo: niet getoond in v2 (het prototype toont alleen Funnel; v2 page zou kunnen uitbreiden)
- **Verdeling per categorie (gevelreiniging, oprit, dakgoot, etc.) — omzetPerspectief**
  - bron: `categorieVerdeling() + omzetPerCategorie() uit stats-queries.ts — queries op leads.hoofdcategorie`
  - vorm: { categorie: string, count: number }[] + { categorie: string, omzet: number }[] DESC
  - vervangt in v2: Demo: niet direct getoond (v2 toont TOP_DIENSTEN met omzet-aandeel %)
- **Leads per dag-trend (laatste N dagen, volgt periode-filter)**
  - bron: `leadsPerDag(now, trendDays) uit stats-queries.ts — rangeToDays(range) bepaalt aantal dagen`
  - vorm: { date: string (YYYY-MM-DD), count: number }[] ASC, incl. lege dagen met count 0
  - vervangt in v2: Demo: PERIODES.Week/Maand/Kwartaal.leads[] (statische getallen; v2 zou kunnen aan de echte leadsPerDag() koppelen)
- **Top-10 tags qua frequentie**
  - bron: `topTags(period, limit=10) uit stats-queries.ts — join leads_tags → tags.naam`
  - vorm: { naam: string, count: number }[] DESC
  - vervangt in v2: Demo: niet getoond in v2 (v2 toont TOP_DIENSTEN services ipv tags)
- **Totale omzet in periode (gewonnen leads: akkoord_op OR afspraak_geboekt_op)**
  - bron: `omzetTotaal(range) uit stats-queries.ts, intern: fetchGewonnenOmzetRows() — sum totaal_prijs`
  - vorm: number (euro-cents of euro)
  - vervangt in v2: PERIODES.Week/Maand/Kwartaal.totaal = '€27.1k' (hardcoded); Klik-interactie moet dit dynamisch leveren
- **Omzet-trend per periode-bucket (dag/maand granulariteit volgt PeriodKey)**
  - bron: `omzetTrendVoorPeriode(periodKey) uit stats-queries.ts → omzetBuckets() bepaalt granulariteit`
  - vorm: { bucket: string (YYYY-MM-DD of YYYY-MM), omzet: number }[] chronologisch
  - vervangt in v2: PERIODES.Week/Maand/Kwartaal.omzet[] (hardcoded; moet echte data gebruiken)
- **Maandelijks omzet-doel**
  - bron: `getOmzetDoelMaand() uit stats-queries.ts — reads tenant_settings.omzet_doel_maand`
  - vorm: number | null
  - vervangt in v2: Demo: 'doel €25k' hardcoded in PERIODES; v2 zou kunnen tonen en bewerken
- **Omzet per categorie (groepering)**
  - bron: `omzetPerCategorie(range) — join leads → sum per hoofdcategorie`
  - vorm: { categorie: string, omzet: number }[] DESC
  - vervangt in v2: Niet direct in v2; TOP_DIENSTEN zijn service-level (naam, pct, omzet)
- **Funnel: leads → gereageerd → offerte → geaccepteerd → afgerond**
  - bron: `Impliciete queries: countLeads(), countConverted() en afgeleide logica (geen dedicated funnel-query)`
  - vorm: { stap: string, n: number, pct: number }[] in volgorde
  - vervangt in v2: FUNNEL in analyses-data.ts (hardcoded: 38 leads → 92% gereageerd → 63% offerte → 39% geaccepteerd → 34% afgerond)
- **Bronnen per kanaal (WhatsApp, Website, Telefoon): leads, omzet, conversie, sparkline-trend**
  - bron: `Impliciete query (geen dedicated helper): group leads op kanaal-veld, count, sum omzet, calc conversie%`
  - vorm: { bron: string, leads: number, omzet: string, conv: string (%), spark: number[] }[]
  - vervangt in v2: BRONNEN in analyses-data.ts (hardcoded: WhatsApp 21 leads €7.4k 71%, Website 11 leads €3.2k 55%, Telefoon 6 leads €1.3k 50%)
- **Inzichten: AI-gegenereerde insights (oppurtuniteiten, sterke punten, waarschuwingen)**
  - bron: `lib/dashboard-helpers (nog niet gemaakt) of Surface API — Surface is 'live' met 38 leads / €11.9k in juni`
  - vorm: { titel: string, tekst: string, kind: 'plus' | 'kans' | 'let-op' }[]
  - vervangt in v2: INZICHTEN in analyses-data.ts (4 hardcoded inzichten: Reactietijd superkracht, 4 leads buiten radius, Korting-verzoeken nemen toe, Dinsdag beste dag)
- **Periode-keuze (week / maand / kwartaal / jaar / all-time) met URL-parameter**
  - bron: `parsePeriod() + periodToRange() uit period.ts — read ?period= searchParam`
  - vorm: PeriodKey = 'deze-week' | 'deze-maand' | 'dit-kwartaal' | 'dit-jaar' | 'all-time' (default: deze-maand)
  - vervangt in v2: PeriodeTabs: Week/Maand/Kwartaal (3 hardcoded; v2 zou kunnen sync met URL-param)

## Muteert (acties/knoppen)

- **Periode wisselen (week/maand/kwartaal/jaar/all-time)**  (client-supabase)
  - hergebruik: `components/dashboard/stats/PeriodSelector.tsx — onChange stuurt router.replace(pathname?period=...) — triggers Server Component re-render met nieuwe periodKey`
  - URL-driven state; parsePeriod() in page.tsx leest de param en roept stats-queries aan. V2 zou PeriodeTabs → setLocalState moeten vervangen door URL-param sync (Link/router.push).
- **Omzet-doel instellen / wissen**  (server-action)
  - hergebruik: `lib/dashboard/omzet-doel-actions.ts — saveOmzetDoelMaand(value: number | null)`
  - Server Action; Auth: RLS-compliant user. Schrijft via getDashboardAdmin() (service-role). Calls revalidatePath('/dashboard') daarna. V2 zou kunnen Form met handleSubmit aan deze action koppelen.
- **Klik op grafiek-punt (v2 interactief)**  (client-supabase)
  - hergebruik: `components/dashboard/v2/analyses/OmzetLeadsChart.tsx — onClick onPick(i) → setHi(i) — highlights punkt, update mini-stats`
  - Pure client-state (React useState); geen server-roundtrip. Mini-stats (mini=[]) wordt herberekend via useMemo.

## Gedeelde helpers (hergebruiken)

- `lib/dashboard/stats-queries.ts — 13 queryHelpers: countLeads, countConverted, countOffertesVerstuurd, avgOfferteWaarde, avgReactietijdMs, statusVerdeling, categorieVerdeling, leadsPerDag, topTags, omzetTotaal, omzetPerCategorie, omzetTrendVoorPeriode, getOmzetDoelMaand`
- `lib/dashboard/period.ts — PeriodKey type, parsePeriod(), periodToRange(), periodLabel(), rangeToDays(), prevWeekRange(), thisWeekRolling(), prevMonthSamePeriodRange(), prev30DaysRange(), last30DaysRange()`
- `lib/dashboard/omzet-buckets.ts — omzetBuckets() + bucketGranulariteit() — pure logic, geen DB, testable`
- `lib/dashboard/format.ts — formatEuro(), formatDuration(seconds), formatDateNL(), formatDateTimeNL(), formatRelative(), dashboardStatusLabel(), gesprekFaseLabel()`
- `lib/dashboard/omzet-doel-actions.ts — saveOmzetDoelMaand(value: number | null) Server Action`
- `lib/dashboard/supabase-server.ts — getDashboardSupabase() cached RLS-client`
- `lib/dashboard/supabase-admin.ts — getDashboardAdmin() service-role client (voor tenant_settings writes)`
- `lib/dashboard/database.types.ts — Database type (includes leads, berichten, lead_tags, tenant_settings)`
- `components/dashboard/v2/demo-data.ts — NAV, TENANT, STATUS_LINE, BRIEF, OWNER_ACTIONS, OMZET, KPIS, SPARK (gedeeld met alle v2-pagina's)`

## Valkuilen

- Period-filtering ongelijk in (app) vs v2: (app) leest URL-param ?period=..., maps naar PeriodKey, v2 gebruikt PeriodeNaam (Week/Maand/Kwartaal — slechts 3 opties). Moet aan elkaar gekoppeld worden (enum-mapping).
- OmzetTrend granulariteit (dag vs maand): omzetBuckets() bepaalt automatisch op basis van PeriodKey. Als v2 Week selecteert, krijgt je dagelijkse buckets. Zorg dat labels daarvan matchen (PERIODES.Week.labels = ['wo','do',...] moet 7 items hebben, niet 4).
- Funnel-logica: countConverted() telt leads met akkoord_op OF afspraak_geboekt_op. Maar voor funnel-stap 'Gereageerd' is geen directe query — moet afgeleide zijn via berichten.count (first outbound message per lead).
- Reactietijd in ms vs seconden: avgReactietijdMs() geeft milliseconds; formatDuration() verwacht seconds. Zorg voor conversie (ms/1000).
- NULL-categorie: categorieVerdeling() maakt NULL → 'Onbekend'. Zorg dat UI-componenten dit aankunnen (TopTagsList / TOP_DIENSTEN hardcoded diensten hebben geen NULL).
- Sparkline-data per bron: BRONNEN.spark = [3,4,3,5,6,5,7,8] (8 waarden). Echte data: leadsPerDag-subset per kanaal-filter moet ook 8 punten leveren (hardcoded op 'vorige 8 dagen' of iets dergelijks).
- Demo-data vs real: v2/analyses/page.tsx is 'use client', laadt PERIODES direct (client-side). Moet Server Component/wrapper worden OF async data via props doorgeven.
- RLS en tenant_settings: tenant_settings is single-tenant (geen tenant_id kolom). getDashboardSupabase() kan via RLS zelf de juiste rij niet bereiken; saveOmzetDoelMaand() gebruikt getDashboardAdmin() (service-role) voor writes.
- Delta-berekening: PERIODES.delta = '+18% vs vorige periode'. Bestaande queries hebben geen vorige-periode-logica gebakken. Moet prevMonthSamePeriodRange() / prev30DaysRange() implementeren in v2.
- Inzichten (Surface): INZICHTEN zijn hardcoded prototype. Echte 'Surface ziet' data (juni 2026 · 38 leads · €11.9k) moet uit Surface API of als placeholder worden gelaten; 'Radius-aanpassing' knop requires config-query.

## Koppel-stappenplan (v2)

## Stap-voor-stap v2-koppeling voor Analyses-pagina

### 1. KPI-tegels wisselen van hardcoded naar dynamisch
**Bestaande setup:** page.tsx haalt via Promise.all() 13 queries op, berekent KPI's (conversiePct, etc.)
**V2 huidige state:** analyses-data.ts ANALYSE_KPIS hardcoded met dummy values (Nieuwe leads 14, Conversie 64%, etc.)
**V2 mappping:** 
- Import countLeads(), countConverted(), avgOfferteWaarde(), avgReactietijdMs() uit lib/dashboard/stats-queries.ts
- V2 page.tsx is "use client"; moet Server Component worden OF een loader-component gebruiken
- Pak periodKey via searchParams, call stats-queries, map naar { label, value, unit, delta }
- Vervang ANALYSE_KPIS = KPIS met dynamische versie

### 2. Omzet & Leads-lijngrafiek aan data koppelen
**Bestaande setup:** omzetTrendVoorPeriode(periodKey) + leadsPerDag(now, trendDays) leveren { bucket, omzet }[] en { date, count }[]
**V2 huidige state:** OmzetLeadsChart rekent op p = PERIODES[periode], hardcoded labels/omzet/leads
**V2 wiring:**
- Voeg periode-state toe: [periode, setPeriode] = useState<PeriodeNaam>("Maand")
- In parent (page.tsx als Server Component) of een "use client" wrapper:
  - Call omzetTrendVoorPeriode(PeriodeNaam → PeriodKey mapping: "Maand" → "deze-maand")
  - Call leadsPerDag() met period-matched trendDays
  - Zet om naar PeriodeReeks-shape (labels, omzet[], leads[], max, lmax, totaal, delta)
- Pass p-object naar OmzetLeadsChart (al generiek)
- OmzetLeadsChart.onClick → onPick(i) → setHi(i) werkt als-is

### 3. Mini-stats aan grafiek-interactie koppelen
**Bestaande setup:** Niets; stats zijn statisch in page.tsx
**V2 huidige state:** page.tsx berekent mini[] via useMemo({ label, value, sub }, [p, hi])
**V2 wiring:**
- Logica is al aanwezig; pas labels/berekening aan naar echte data:
  - "Totaal deze periode" = omzetTotaal(range) (reeds beschikbaar)
  - "Gem. kluswaarde" = avgOfferteWaarde(range) / number of converted
  - "Beste punt" = p.labels[hi] + omzet/leads at index hi
  - "Prognose" = mag gedeeltelijk hardcoded blijven of via AI Surface

### 4. Funnel (van lead → klant) aan echte conversion-flow koppelen
**Bestaande setup:** Geen dedicated funnel-query; afleiden uit countLeads(), countConverted(), countOffertesVerstuurd()
**V2 huidige state:** FUNNEL hardcoded in analyses-data.ts (38 → 35 → 24 → 15 → 13)
**V2 wiring:**
- Maak funnel-helper-query: 
  - Stap 1: countLeads(range) = alle binnenkomende
  - Stap 2: count met 'gereageerd' status (berichten.richting='uitgaand' → count unique leads)
  - Stap 3: countOffertesVerstuurd(range)
  - Stap 4: count akkoord (countConverted OR countAkkoordIn)
  - Stap 5: count "completed" = geaccepteerd + betaald (afspraak_geboekt_op + payment_received)
- Reken pct uit per stap
- Map naar FUNNEL shape

### 5. Bronnen per kanaal aan data koppelen
**Bestaande setup:** Geen query; leads.kanaal-veld (WhatsApp, Website, Telefoon) + omzet-aggregatie
**V2 huidige state:** BRONNEN hardcoded (WhatsApp 21 leads €7.4k 71%, etc.)
**V2 wiring:**
- Maak bronnen-query-helper:
  - SELECT kanaal, COUNT(*) as leads, SUM(totaal_prijs) as omzet FROM leads WHERE (akkoord_op NOT NULL OR afspraak_geboekt_op NOT NULL) GROUP BY kanaal
  - Reken conversie% per kanaal: converted/total in kanaal
  - Maak sparkline-data: leadsPerDag per kanaal-filter (subset van leadsPerDag())
- Map naar BRONNEN shape

### 6. Top-diensten aan omzet-per-categorie koppelen
**Bestaande setup:** omzetPerCategorie(range) — reeds beschikbaar
**V2 huidige state:** TOP_DIENSTEN hardcoded (Gevelreiniging 34% €9.2k, etc.)
**V2 wiring:**
- Call omzetPerCategorie(range)
- Zet om naar DienstAandeel: { naam: categorie, pct: (omzet/totaalOmzet*100), omzet: formatEuro(omzet) }
- Sort DESC, limit top-5
- Map naar TOP_DIENSTEN shape

### 7. Inzichten (Surface-insights) — deels hardcoded, deels dynamisch
**Bestaande setup:** Geen query; INZICHTEN uit analyses-data.ts (4 statische).
**V2 huidige state:** Hardcoded in demo-data.
**V2 wiring:**
- Deels hardcoded (prototype/demo): "Reactietijd is je superkracht", "Dinsdag is je beste dag"
- Deels dynamisch (indien Surface-API beschikbaar):
  - "4 leads buiten radius gemist" = count leads met dienst_locatie outside radius + sum omzet
  - "Korting-verzoeken nemen toe" = count notes/tags met 'korting' keyword, trend vs vorige maand
- Surface API-call (nog te bouwen) OF gedeeltelijk hardcoded tot AI-integratie klaar is

### 8. Periode-wisseling (Week ↔ Maand ↔ Kwartaal)
**Bestaande setup:** (app)-page.tsx leest ?period=... en passed aan stats-queries
**V2 huidige state:** Client-component met PeriodeTabs.onChange setLocalState
**V2 wiring:**
- PeriodeTabs moet de periode in URL-state syncen: onClick → router.push(pathname + ?periode=...) (eigen param, niet ?period)
- OF: behou client-state, maar re-fetch data via Server Action / API-route
- Optie A (cleaner): wrapper-component (Server) die periode uit searchParams leest, data fetch doet, aan children doorgaat
- Optie B: Async data-loading in page.tsx, PeriodeTabs als client-component die router.push doet

### 9. Omzet-doel instellen
**Bestaande setup:** saveOmzetDoelMaand() Server Action in omzet-doel-actions.ts
**V2 huidige state:** Niets; kan knop toevoegen die deze action roept
**V2 wiring:**
- Button in page.tsx → onClick → Server Action saveOmzetDoelMaand(newValue)
- Result → revalidate cache → re-render

### Data-vloei-diagram:
```
V2 page.tsx (Server Component)
  ├─ readSearchParams() → period
  ├─ call omzetTrendVoorPeriode(period) → { bucket, omzet }[]
  ├─ call leadsPerDag(now, trendDays) → { date, count }[]
  ├─ call countLeads/Converted/Offerte/etc. → KPI values
  ├─ call omzetPerCategorie(range) → { categorie, omzet }[]
  ├─ (optioneel) call funnel-helper-query → { stap, n, pct }[]
  ├─ (optioneel) call bronnen-helper-query → { bron, leads, omzet, conv%, spark[] }[]
  └─ Pass all data as props naar client-components:
       ├─ PeriodeTabs (client): période-state, onChange → router.push
       ├─ OmzetLeadsChart (client): { omzet[], leads[], labels[], max, lmax }, onClick → setHi
       ├─ MiniStats (client): kalkuleer via useMemo(data, [hi, period-values])
       ├─ FunnelChart: { stap, n, pct }[]
       ├─ BronnenCards: { bron, leads, omzet, conv, spark }[]
       ├─ TopDiensten: { naam, pct, omzet }[]
       └─ InzichtenCards: { titel, tekst, kind }[] (deels hardcoded)
```

### Test-checklist voor wiring:
1. Periode-wisseling triggert re-fetch: navigeer naar ?period=dit-kwartaal, controleer KPI's updaten
2. Grafiek-klik: Click op een punt, mini-stats veranderen
3. Omzet-doel: Open form, stel doel in, check tenant_settings.omzet_doel_maand
4. RLS: Ingelogde user ziet alleen eigen tenant data (enforced door getDashboardSupabase())
5. Formatting: Euro's, duur, percentages correct formatted via formatEuro() et al.
