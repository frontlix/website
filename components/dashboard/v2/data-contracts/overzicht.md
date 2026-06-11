# Data-contract: Overzicht (Rebranding v2 / Desktop) — Data-contract vastlegging

**Auth/tenant:** User auth via requireApprovedUser() (RLS-gated Supabase client); tenant-scope via single-tenant impliciet (Supabase RLS-policies op leads/berichten/offertes filteren op user_id / tenant_id via auth session). BriefCard/ActionList/OmzetCard/KpiTiles/AgendaCard are all client-rendered via server-props; no extra auth-check per component nodig.

**Realtime:** geen

## Bestaande bestanden (bron)

- `/Users/christiaantromp/Desktop/Frontlix website/app/dashboard/(app)/page.tsx`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/overzicht-data.ts`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/surface-summary.ts`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/eerst-dit-doen.ts`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/stats-queries.ts`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/lead-queries.ts`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/activity-feed.ts`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/agenda-queries.ts`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/dagrapport-queries.ts`
- `/Users/christiaantromp/Desktop/Frontlix website/app/dashboard/v2/page.tsx`
- `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/v2/demo-data.ts`
- `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/v2/overzicht/BriefCard.tsx`
- `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/v2/overzicht/ActionList.tsx`
- `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/v2/overzicht/OmzetCard.tsx`
- `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/v2/overzicht/KpiTiles.tsx`
- `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/v2/overzicht/AgendaCard.tsx`
- `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/v2/overzicht/overzicht-data.ts`

## Leest (weergave-data)

- **BriefCard (Surface samenvatting 'Drie dingen voor de koffie') — status-regel + voornaam + briefing-tekst + CTA naar Leads**
  - bron: `Afgeleid van lib/dashboard/surface-summary + bestaande stats`
  - vorm: greeting (string), voornaam (string), leadsVandaag (int), offertesWeek (int), akkoordWeek (int), omzetMaand (int), gemTicket (int)
- **ActionList (Eerst dit doen) — owner-review-acties uit openstaande leads**
  - bron: `lib/dashboard/eerst-dit-doen.ts: deriveActions() + countByTone()`
  - vorm: DashboardAction[] met title, subtitle, meta (wachtlabel), hot flag; sortering op tone (hot/warm) → urgency → waitMs desc
- **OmzetCard (Omzet deze maand + voortgangsring) — absolute bedrag + delta vs vorige week + doel + percentage**
  - bron: `lib/dashboard/stats-queries.ts: countConverted() × avgOfferteWaarde() voor huidge maand; prev-maand same-periode voor vorige-week delta`
  - vorm: omzetMaand (€), omzetMaandPrev (€), omzetDoelMaand (€), pct (0-100), delta (€), rest tot doel (€)
- **KpiTiles (4 KPI's: Nieuwe leads week / Conversie / Reactietijd / Offertes open) + sparklines**
  - bron: `lib/dashboard/overzicht-data.ts: buildKpiMetrics() + buildOpenOffertesMetric(); spark-reeks uit separate source`
  - vorm: KpiMetric[] met value, unit, delta, up-flag, prevValue; sparkline (10 punten) per tegel
- **AgendaCard (Vandaag in de agenda) — compacte afspraken-lijst + Volledige agenda-link**
  - bron: `lib/dashboard/agenda-queries.ts: getAppointmentsForMonth(); filter op vandaag + first 3-4 items`
  - vorm: Appointment[] (lead_id, naam, afspraak_datum, afspraak_starttijd, afspraak_geboekt_op, plaats, telefoon, dashboard_status)
- **KPI-metriek: Omzet deze maand (record in buildKpiMetrics)**
  - bron: `lib/dashboard/stats-queries.ts: countConverted(maand) × avgOfferteWaarde(maand)`
  - vorm: omzetMaand (€), omzetMaandPrev (€), doel (tenant_settings.omzet_doel_maand of default), unit: 'eur'
- **KPI-metriek: Nieuwe leads (week) — rolling 7d vs vorige week**
  - bron: `lib/dashboard/stats-queries.ts: countLeads(week7d) vs countLeads(prevWeek7d)`
  - vorm: leadsLast7d (count), leadsPrev7d (count), doel (KPI_DOELEN.leads_week), unit: 'count'
- **KPI-metriek: Conversie offerte→klant — pct last 30d vs prev 30d**
  - bron: `lib/dashboard/stats-queries.ts: countConverted(last30) / countLeads(last30) en vorige 30d`
  - vorm: conversiePctLast30 (%), conversiePctPrev30 (%), doel (KPI_DOELEN.conversie_pct), unit: 'pct'
- **KPI-metriek: Reactietijd (gem.) — avg ms per 7d rolling window**
  - bron: `lib/dashboard/stats-queries.ts: avgReactietijdMs(week7d) vs avgReactietijdMs(prevWeek7d); omzet naar seconden`
  - vorm: reactietijdLast7S (sec), reactietijdPrev7S (sec), doel (KPI_DOELEN.reactietijd_doel_s), invertDelta: true (lager=beter), unit: 's'
- **Extra KPI: Offertes open — stand-metric, geen delta**
  - bron: `lib/dashboard/stats-queries.ts: countOpenOffertes()`
  - vorm: openOffertes (count, stand), doel: 0, unit: 'count'
- **Tenant instellingen — chatbot_naam, omzet_doel_maand**
  - bron: `Supabase 'tenant_settings' tabel (kolommen uit migratie 045)`
  - vorm: chatbot_naam (string, default 'Surface'), omzet_doel_maand (€ | null)

## Muteert (acties/knoppen)

- **BriefCard CTA: Klik 'Open de X wachtende offertes' → navigeer naar /dashboard/v2/leads**  (client-supabase)
  - hergebruik: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/v2/overzicht/BriefCard.tsx:29`
  - router.push() naar V2_BASE + '/leads'; geen server-actie, zuiver client-side navigatie
- **ActionList: Klik actie-rij → navigeer naar relevante pagina op basis van action.kind (ACTION_TARGET[n])**  (client-supabase)
  - hergebruik: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/v2/overzicht/ActionList.tsx:12-30`
  - ACTION_TARGET mapping: 1→/leads, 2→/leads, 3→/inbox, 4→/reviews, 5→/leads; geen DB-mutation, zuiver navigatie
- **OmzetCard: Klik kaart → navigeer naar /dashboard/v2/analyses**  (client-supabase)
  - hergebruik: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/v2/overzicht/OmzetCard.tsx:17`
  - router.push(); prototype-conforme click-target voor een drilldown in analyses
- **KpiTiles: Klik KPI-tegel → navigeer naar /dashboard/v2/analyses**  (client-supabase)
  - hergebruik: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/v2/overzicht/KpiTiles.tsx:21`
  - Alle 4 tegels linken naar analyses; prototype-conforme behavior
- **AgendaCard: Klik agenda-rij of 'Volledige agenda' → navigeer naar /dashboard/v2/agenda**  (client-supabase)
  - hergebruik: `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/v2/overzicht/AgendaCard.tsx:22, 39`
  - router.push(); enkel navigatie, geen mutations

## Gedeelde helpers (hergebruiken)

- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/stats-queries.ts: countLeads(), countConverted(), avgOfferteWaarde(), countOffertesVerstuurd(), countAkkoordIn(), countOpenOffertes(), avgReactietijdMs()`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/lead-queries.ts: getLeadsList(), leadsArrivedTodayAndTomorrow()`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/agenda-queries.ts: getAppointmentsForMonth(), getAppointmentsForRange()`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/activity-feed.ts: getRecentInboundMessages()`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/overzicht-data.ts: buildKpiMetrics(), buildOpenOffertesMetric(), buildActivityFeed(), buildFunnelRows(), pickUpcomingAppointments(), buildSurfaceSummary() (afgeleid)`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/eerst-dit-doen.ts: deriveActions(), countByTone()`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/surface-summary.ts: buildSurfaceSummary()`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/period.ts: periodToRange(), thisWeekRolling(), prevWeekRange(), prevMonthSamePeriodRange(), last30DaysRange(), prev30DaysRange()`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/require-approved-user.ts: requireApprovedUser() (auth-gate + user-fetch)`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/supabase-server.ts: getDashboardSupabase() (auth'd client)`

## Valkuilen

- Afspraak-timezone: afspraak_geboekt_op is al UTC-instant (afgeleid uit afspraak_datum + afspraak_starttijd via appointmentInstantIso), geen verdere conversie nodig. Vendaag-filter moet Europe/Amsterdam-timezone gebruiken (toLocaleString trick met timeZone='Europe/Amsterdam')
- Omzet-doel NULL-handling: tenant_settings.omzet_doel_maand kan null zijn (migratie 045 nog niet in productie), defensief casten naar (tenant?.omzet_doel_maand ?? null) en fallback naar KPI_DOELEN.omzet_maand als null
- Reactietijd inverteer-delta: LAGER (sneller) is BETER. buildKpiMetrics() zet invertDelta: true op reactietijd metric. UI moet delta-pil flip van 'positief' (rood ↑) naar groen ↓ voor snellere antwoorden
- Conversie-pct berekening: countConverted() telt leads met akkoord_op OR afspraak_geboekt_op (beide zijn conversies). Maar vorige-periode moet same-periode zijn (maand vs maand, week vs week), niet calendar-week-mismatch
- Lead-archief exclusion: getLeadsList() filtert dashboard_archived=false standaard. deriveActions() werkt op alle leads (inclusief gearchiveerde?), check of we archief moeten uitsluiten bij acties
- Owner-acties sortering: deriveActions() sorteert: tone (hot vóór warm) → urgency (desc) → waitMs (desc). Tie-breaker is belangrijk; test met meerdere hot-items
- Sparkline data: SPARK-constante (10 punten) is hardcoded in demo-data. v2 moet echte sparkline ophalen (7-daags rolling, afgeleid uit leadsPerDag/offertes/akkoorden); momenteel geen dedicated query, afleiding nodig
- Tenant-settings migratie 045: omzet_doel_maand is nieuwe kolom. Productie kan stale data hebben; defensieve null-checks overal
- Leads-tabel RLS: Alle queries draaien via getDashboardSupabase() die RLS-policies appliceert. Geen extra WHERE clauses nodig in code, maar verify dat policies tenant_id filteren
- Parallelle queries: page.tsx gebruikt Promise.all([...]) voor 20+ queries. Timeout-risk als één query hangt; log slow queries via slow-query-logging Supabase feature

## Koppel-stappenplan (v2)


## Hoe v2-Overzicht aan bestaande data koppelen

### Stap 1: Server-fetch op pagina-level (/app/dashboard/v2/page.tsx)
Voeg server-side data-fetch toe aan de bestaande v2-page (momenteel zuiver demo-data). Pattern volgt `/app/dashboard/(app)/page.tsx`:

1. Import alle helpers uit lib/dashboard/:
   - `requireApprovedUser()` → auth-gate + user data
   - `getDashboardSupabase()` → RLS-gated client
   - `periodToRange()`, `thisWeekRolling()`, enz. → time windows
   - `countLeads()`, `countConverted()`, `avgOfferteWaarde()`, etc. → stats queries
   - `getAppointmentsForMonth()` → agenda
   - `buildKpiMetrics()`, `buildSurfaceSummary()`, `deriveActions()` → data-mapping

2. Data-ophaal in /app/dashboard/v2/page.tsx als async server-component:
   ```
   const [
     leadsMaand, convertedMaand, avgWaarde, appts, allLeads,
     tenantRaw, leadsVandaag, offertesWeek, akkoordWeek,
     leadsLast7d, leadsPrev7d, convertedLast30, ...
   ] = await Promise.all([...])
   ```
   → Alle queries parallel; geen extra DB-round-trips

3. Bereken afgeleide metrics (conversie %, omzet, deltas):
   ```
   const omzetMaand = avgWaarde * convertedMaand
   const conversiePctLast30 = (convertedLast30 / leadsLast30d) * 100
   ```

4. Bouw KPI-record via `buildKpiMetrics()`:
   ```
   const kpiMetrics = buildKpiMetrics({
     omzetMaand, omzetMaandPrev, leadsLast7d, leadsPrev7d,
     conversiePctLast30, conversiePctPrev30, reactietijdLast7S,
     omzetDoelMaand: tenant?.omzet_doel_maand
   })
   ```

5. Leid "Eerst dit doen" acties af via `deriveActions()`:
   ```
   const eerstDitDoenActies = deriveActions(allLeads, 5)
   ```

6. Bouw Surface-samenvatting via `buildSurfaceSummary()`:
   ```
   const brief = buildSurfaceSummary({
     leadsVandaag, offertesWeek, akkoordWeek, omzetMaand, gemTicket
   })
   ```

7. Filter agenda-items voor vandaag (eerste 3-4 items uit getAppointmentsForMonth):
   ```
   const todaysAppts = pickUpcomingAppointments(appts, 4)
     .filter(a => isToday(a.afspraak_geboekt_op))
   ```

### Stap 2: Data-props doorgeven aan client-componenten

Bouw een server-props object (merk op: v2/page.tsx is async server-component):
```typescript
type OverzichtProps = {
  brief: { title, body, cta }
  actions: DashboardAction[]
  omzet: { value, delta, doel, pct }
  kpis: KpiMetric[]
  spark: number[]
  agenda: Appointment[]
  chatbotName: string
}

// In /app/dashboard/v2/page.tsx:
const props: OverzichtProps = {
  brief: {
    title: 'Drie dingen voor de koffie',
    body: buildSurfaceSummary(...),
    cta: openOffertes > 0 ? `Open de ${openOffertes} wachtenden` : undefined
  },
  actions: eerstDitDoenActies,
  omzet: { 
    value: formatEuro(omzetMaand), 
    delta: formatEuro(omzetMaand - omzetMaandPrev),
    doel: formatEuro(omzetDoelMaand ?? 25000),
    pct: Math.round((omzetMaand / omzetDoelMaand) * 100)
  },
  kpis: Object.values(kpiMetrics).slice(0, 4),  // Omzet, Leads, Conversie, Reactietijd
  spark: SPARK_DATA_FROM_QUERY,  // TBD: sparkline-data ophalen
  agenda: todaysAppts,
  chatbotName
}

return (
  <div className={styles.grid}>
    <div className={styles.col}>
      <BriefCard brief={props.brief} chatbotName={props.chatbotName} />
      <ActionList actions={props.actions} />
    </div>
    <div className={styles.col}>
      <OmzetCard {...props.omzet} />
      <KpiTiles kpis={props.kpis} spark={props.spark} />
      <AgendaCard appointments={props.agenda} />
    </div>
  </div>
)
```

### Stap 3: Client-componenten updaten om server-props te ontvangen

Herstel BriefCard.tsx:
```typescript
export function BriefCard({ 
  brief, 
  chatbotName 
}: { 
  brief: { title, body, cta }
  chatbotName: string
}) {
  return (
    <Card pad="none" className={styles.card}>
      <p className={styles.text}>{brief.body}</p>
      <button ... onClick={() => router.push(...)}>{brief.cta}</button>
    </Card>
  )
}
```

Herstel ActionList.tsx:
```typescript
export function ActionList({ actions }: { actions: DashboardAction[] }) {
  const hotCount = actions.filter(a => a.tone === 'hot').length
  return (
    <Card pad="none" className={styles.card}>
      <ul>
        {actions.map(a => (
          <li onClick={() => go(a)}>{a.title} ... {a.subtitle} ... {a.waitLabel}</li>
        ))}
      </ul>
    </Card>
  )
}
```

Gelijkaardige updates voor OmzetCard, KpiTiles, AgendaCard.

### Stap 4: Navigatie-acties (client-side, geen mutations)

De v2-componenten gebruiken al `useRouter()` om door te klikken naar /dashboard/v2/leads, /dashboard/v2/analyses, enz. Dit blijft ongewijzigd: zuiver client-side navigatie, geen server-actions nodig.

### Stap 5: Auth & tenant-scoping (reuse bestaande pattern)

- `/app/dashboard/v2/page.tsx` roept `requireApprovedUser()` aan → werpt ongoedgekeurde users af
- Alle Supabase-queries gebruiken `getDashboardSupabase()` → RLS-gated client
- RLS-policies op leads-tabel filteren al op tenant_id / user_id; geen extra filtering nodig in code

### Stap 6: E2E test-strategie (voor volgende fase)

1. Test data-mapping: unit-tests op `buildKpiMetrics()`, `deriveActions()`, `buildSurfaceSummary()` (bestaan al, zie .test.ts files)
2. Test query-performance: verify dat alle Promise.all([...]) queries in parallel draaien, geen N+1 queries
3. Test auth: requireApprovedUser() moet 401 gooien voor unauth users
4. Test RLS: RLS-policies moeten leads uit andere tenants verbergen

## Hergebruikt bestaande code (NIET herschrijven)

- `lib/dashboard/stats-queries.ts` → countLeads, countConverted, avgOfferteWaarde, etc.
- `lib/dashboard/overzicht-data.ts` → buildKpiMetrics, buildActivityFeed, pickUpcomingAppointments
- `lib/dashboard/erst-dit-doen.ts` → deriveActions, countByTone
- `lib/dashboard/surface-summary.ts` → buildSurfaceSummary
- `lib/dashboard/agenda-queries.ts` → getAppointmentsForMonth, getAppointmentsForRange
- `lib/dashboard/period.ts` → periodToRange, thisWeekRolling, etc.
- `lib/dashboard/require-approved-user.ts` → auth-gate
- `lib/dashboard/supabase-server.ts` → getDashboardSupabase client

## Demo-data overschrijving

Vervang hardcoded `BRIEF`, `OWNER_ACTIONS`, `OMZET`, `KPIS`, `SPARK` in `/components/dashboard/v2/demo-data.ts` NIET. In plaats daarvan:

1. Hou demo-data voor v2-preview (visueel vergelijken); bestaande setup met componenten die props accepteren
2. De echte Supabase-koppeling gebeurt in /app/dashboard/v2/page.tsx via server-side fetch + props-passing
3. Wanneer v2-preview klaar is → switch naar echte data door de page-level props in te voeren

## Gotchas & edge-cases

- Afspraak-tijdzone: `afspraak_geboekt_op` is reeds UTC instant (afgeleid uit afspraak_datum + afspraak_starttijd), klaar voor display
- Omzet-doel: `tenant_settings.omzet_doel_maand` kan null zijn (migratie 045); fallback naar KPI_DOELEN.omzet_maand
- Reactietijd: LAGER is beter, dus delta-pil moet invert (positief = afname = goed)
- Vandaag-filter: gebruik Europe/Amsterdam timeZone voor consistentie met bestaande queries
- Leads-lijstje: getLeadsList() filtert gearchiveerde leads weg standaard; deriveActions() werkt op volledige leads-set
