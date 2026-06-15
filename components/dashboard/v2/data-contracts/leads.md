# Data-contract: Leads (list + pipeline) — bestaand dashboard naar v2

**Auth/tenant:** Bestaand app: requireApprovedUser() server-cache op page-level (checks Supabase Auth + dashboard_user_profiles.tenant_status='approved'). V2 preview: geen auth-check op dit moment (LS-preview layout beperkt geen routes). Bij integratie v2 met echte data: dezelfde requireApprovedUser() pattern + getDashboardSupabase() nodig. RLS impliceert: leads-tabel gefilterd op tenant (postulaat: tenant_id kolom in leads voor RLS-policy). Huidige code: geen tenant-explicitiet in getLeadsList query, dus vermoedelijk één-tenant-per-Supabase-user (auth.uid = user_id → dashboard_user_profiles → tenant context)."

**Realtime:** geen

## Bestaande bestanden (bron)

- `/Users/christiaantromp/Desktop/Frontlix website/app/dashboard/(app)/leads/page.tsx`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/lead-queries.ts`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/lead-actions.ts`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/lead-status-meta.ts`
- `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/leads/LeadsPipeline.tsx`
- `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/leads/LeadsTable.tsx`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/lead-filters.ts`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/database.types.ts`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/require-approved-user.ts`

## Leest (weergave-data)

- **Lead list (tabel + kaarten view)**
  - bron: `Supabase `leads` tabel via lib/dashboard/lead-queries.ts: getLeadsList()`
  - vorm: LeadListItem array: lead_id, naam, telefoon, email, straat, huisnummer, postcode, plaats, hoofdcategorie, sub_diensten, m2, totaal_prijs, afstand_km, status, gesprek_fase, dashboard_status, bron, afspraak_datum, afspraak_starttijd, aangemaakt, bijgewerkt, kanaal, pending_eigenaar_review, klus_geblokkeerd, offerte_pending_sinds, offerte_verstuurd, offerte_verstuurd_op, akkoord_op
- **Pipeline 5-kolom indeling met leads per kolom**
  - bron: `lib/dashboard/lead-queries.ts: getLeadsList() gefilterde resultaten, gemapped via conversation-fase + dashboard_status matching in components/dashboard/leads/LeadsPipeline.tsx STAGES array`
  - vorm: 5 vaste pipeline-kolommen (In gesprek, Offerte review, Offerte uit, Ingepland, Afgerond), count per kolom, gegroepeerde leads per kolom. Pipeline-kolom-som = som van totaal_prijs per kolom (EUR-geformatteerd).
- **Lead-tabel kolommen (Dienst, m2, Status, Gespreksfase, Offerte, Laatste actie)**
  - bron: `lib/dashboard/lead-queries.ts LeadListItem, met format-helpers: formatEuro (totaal_prijs), formatRelative (aangemaakt = binnenkomst, NIET bijgewerkt), gesprekFaseLabel (gesprek_fase), leadStatusMeta (status)`
  - vorm: LeadListItem met render-helpers: naam+plaats, sub_diensten array, m2 numeric, status enum (nieuw/in_gesprek/offerte_verstuurd/etc.), gesprek_fase enum (info_verzamelen/onderhandelen/offerte_besproken/datum_kiezen/afspraak_bevestigd), totaal_prijs numeric EUR, bijgewerkt ISO-string
- **Filter-tabs (All, In gesprek, Review, Offerte uit, Ingepland, Afgerond, Archief)**
  - bron: `app/dashboard/(app)/leads/page.tsx searchParams + matchesFilter() logic: activeFilter key ('all'|'in_gesprek'|'review'|'offerte_uit'|'ingepland'|'afgerond'|'archief'), counts per tab berekend client-side door matchesFilter() over de leads array`
  - vorm: FilterKey enum, counts: Record<FilterKey, number>, matching rules op gesprek_fase + dashboard_status
- **Geavanceerde filters (bron, urgent, sortering)**
  - bron: `app/dashboard/(app)/leads/page.tsx searchParams: bron ('form'|'wa'), urgent ('1'), sort ('prijs'|'naam'|'fase')`
  - vorm: bronFilter: 'form' → kanaal='web' | 'wa' → kanaal!='web'; isLeadUrgent() helper; sort-keys matched op lead array
- **Zoeken / search**
  - bron: `app/dashboard/(app)/leads/page.tsx searchParams.q → client-side filter op naam, telefoon (genormaliseerd), adres (straat+huisnummer+postcode+plaats)`
  - vorm: string search query, client-side ilike-match op naam/telefoon/adres
- **Web chat kanaal count**
  - bron: `app/dashboard/(app)/leads/page.tsx: allLeads.filter(l => l.kanaal === 'web').length over ALLE niet-gearchiveerde leads`
  - vorm: number count van web-channel leads
- **Totaal counts (actief, totaal)**
  - bron: `lib/dashboard/lead-queries.ts: countAllLeads() (alle niet-gearchiveerde), page-level: actief = allLeads.filter(l => l.dashboard_status !== 'afgehandeld').length`
  - vorm: number actief, number totaal
- **Laatste inkomend bericht per lead (mobile 'binnen'-indicator)**
  - bron: `lib/dashboard/lead-queries.ts: getLastInboundByLeadIds(leadIds) → Map<lead_id, timestamp> van inkomende berichten (berichten.richting='inkomend') ordered DESC`
  - vorm: Map<string, string> lead_id → ISO-timestamp string

## Muteert (acties/knoppen)

- **Verwijzigen naar dossier-view**  (client-supabase)
  - hergebruik: `Link naar /leads/[lead_id] (app/dashboard/(app)/leads/[lead_id]/page.tsx voor bestaand app, /v2/leads/[lead_id]/page.tsx voor v2 preview)`
  - Click op lead-kaart in pipeline of rij in tabel opent detail-page; geen explicit action, pure Next.js routing
- **Export leads (CSV)**  (server-action)
  - hergebruik: `app/dashboard/(app)/leads/page.tsx export-button: href='/leads?export=1' (nog niet geimplementeerd op v2)`
  - Link + export-query param, verwacht separate export-endpoint
- **Nieuwe offerte aanmaken**  (integration)
  - hergebruik: `app/dashboard/(app)/leads/page.tsx: href='/leads?nieuwe-offerte=1' opent offerte-wizard (MODAL, NewOfferteMount in v2-layout.tsx)`
  - Global event 'rb:new-offerte' triggered vanuit UI; details in NewOfferteMount component
- **Lead status wijzigen (dashboard_status)**  (server-action)
  - hergebruik: `lib/dashboard/lead-actions.ts: setDashboardStatus(leadId, status: DashboardStatus | null)`
  - Enum VALID_STATUSES = ['open', 'opgevolgd', 'afgehandeld', 'no_show', 'geen_interesse', 'archief']. Trigger voor status-history audit. revalidatePath('/leads')
- **Lead archiveren**  (server-action)
  - hergebruik: `lib/dashboard/lead-actions.ts: archiveLead(leadId)`
  - Zet dashboard_archived=true, revalidatePath('/leads'). Gearchiveerde leads verdwijnen uit getLeadsList() tenzij {archived:true} option meegegeven
- **Lead uit archief halen**  (server-action)
  - hergebruik: `lib/dashboard/lead-actions.ts: unarchiveLead(leadId)`
  - Zet dashboard_archived=false, revalidatePath('/leads'). Inverse van archiveren
- **Lead-info velden bewerken (name, telefoon, adres, etc.)**  (server-action)
  - hergebruik: `lib/dashboard/lead-actions.ts: updateLeadFields(leadId, patch: LeadEditPatch)`
  - Whitelist EDITABLE_TEXT_FIELDS, EDITABLE_NUMERIC_FIELDS, EDITABLE_ARRAY_FIELDS. Type-validation, revalidatePath('/leads'). Kan auto-offerte-regels triggeren als prijs-velden raken.
- **Inbox markeren als gelezen**  (server-action)
  - hergebruik: `lib/dashboard/lead-actions.ts: markInboxRead(leadId)`
  - Zet inbox_gelezen_op=now(), revalidatePath('/inbox'). Synced met unread-count in filter-tabs

## Gedeelde helpers (hergebruiken)

- `lib/dashboard/lead-queries.ts: getLeadsList(filters?, {archived?, limit?}), countAllLeads(), getLastInboundByLeadIds(leadIds), getLeadDetail(leadId), aggregateActivityTimeline(detail)`
- `lib/dashboard/lead-actions.ts: setDashboardStatus(), archiveLead(), unarchiveLead(), updateLeadFields(), markInboxRead()`
- `lib/dashboard/lead-status-meta.ts: leadStatusMeta(status), dashboardStatusMeta(status), headerStatusMeta(lead)`
- `lib/dashboard/lead-filters.ts: parseLeadsFilters(), serializeLeadsFilters(), countActiveFilters(), hasActiveFilters(), normalizePhone()`
- `lib/dashboard/format.ts: formatEuro(), formatRelative(), gesprekFaseLabel()`
- `lib/dashboard/require-approved-user.ts: requireApprovedUser() → {user, profile}`
- `components/dashboard/mobile/leads/lead-mappers.ts: mapLeadToCard(), leadStage(), isLeadUrgent()`

## Koppel-stappenplan (v2)

V2 WIRING STAPPENPLAN voor Leads-pagina:

1. FETCH-LAYER (replace demo-data):
   - EraseLeads demo array + LeadsSearch static component
   - Maak 'use server' fetch-wrapper in app/dashboard/v2/leads/page.tsx of aparte lib-file:
     * Call getLeadsList() + countAllLeads() parallel (parallel await Promise.all)
     * Pass searchParams (q, filter, kanaal, bron, urgent, sort, view) → match existing page.tsx logic
     * Filter client-side (searchParams → displayed array) ÓFREWARD: move to server query via parseLeadsFilters() helpers
   
2. COMPONENT-LEVEL ADAPTERS (map existing data shapes to v2):
   - LeadsPipeline (v2): replace hardcoded PIPELINE demo met buildPipeline() maar gevoeed van SERVER fetch
     * Input: LeadListItem[], gesprek_fase+dashboard_status matching logic zelfde als huidige LeadsPipeline.tsx
     * Output: PipelineCol[] met som, count, leads-verdeling
   - LeadsList (v2): replace LEADS demo met server-fetched LeadListItem[]
     * Map LeadListItem → display shape (naam, plaats, dienst (sub_diensten), bron (kanaal), waarde (totaal_prijs), status (leadStatusMeta), tijd (formatRelative(aangemaakt = binnenkomst)))
     * Links naar /v2/leads/[lead_id]
   - LeadsSearch: bind searchParams.q input, update URL via router.push (client-side)
   - ViewSwitcher: persist leads_view cookie (already done in existing app) óf use localStorage in v2

3. MUTATIONS (click → server-action):
   - Dossier-click: Link href already points /v2/leads/[id], resolved in /v2/leads/[id]/page.tsx via getLeadDetail() + RLS
   - Status-wijzigen (pipeline drag-drop, future): setDashboardStatus() server-action via client-component event
   - Export: create new app/api/dashboard/v2/leads/export route (CSV) óf reuse existing export-endpoint
   - Nieuwe offerte: trigger 'rb:new-offerte' event (already in v2-layout Shell, check NewOfferteMount wiring)
   
4. FILTER-LOGIC (tab switches, advanced filters):
   - FilterTabs: replicate matchesFilter() logic (gesprek_fase enums → tab match)
   - Counts: fetch totals server-side (countAllLeads), then client-side per-tab count via filter()
   - BronFilter + UrgentFilter: add advanced-filter UI, wire search-params
   - Sort-dropdown: serialize sort=prijs|naam|fase → re-sort server-side óf client-side

5. REAL-TIME (optional, Phase 2):
   - getLastInboundByLeadIds() for mobile 'binnen'-indicator: fetch server-side in page-wrapper, pass to cards
   - Realtime-subscriptions (LeadsRealtimeToast in existing app): add Supabase realtime listener on 'leads' table changes, invalidate ISR/revalidatePath('/v2/leads')

6. AUTH/TENANT (via require-approved-user):
   - Wrap v2 page-layout in requireApprovedUser() check, redirect /login | /wachtkamer
   - getDashboardSupabase() automatically scoped to user (RLS policies handle tenant isolation)

7. DATA-SHAPE MAPPING (v2 demo → real):
   - LEADS → getLeadsList() result (LeadListItem[])
   - Lead.statusKind ('hot'|'new'|'plan'|'sent') ← leadStatusMeta(status).tone OR custom mapping van status enum → statusKind
   - Lead.status (vrije tekst in demo) ← status string (enum-like in DB, zie LEAD_STATUS_META)
   - Lead.bron (WhatsApp|Telefoon|Website) ← kanaal enum PLUS custom source-mapping
   - Lead.waarde (EUR string) ← formatEuro(totaal_prijs)
   - Lead.tijd (relative, "2 min") ← formatRelative(aangemaakt) óf getLastInboundByLeadIds timestamp
   - Lead.initials ← extract from naam (eerste 2 letters)
   - Lead.dienst (string) ← sub_diensten array join + DIENST_LABELS mapping
   - Pipeline.som (EUR string) ← aggregated formatEuro(sum of totaal_prijs per column)

8. ROUTES + PARAM-HANDLING:
   - /v2/leads → list + pipeline toggle
   - /v2/leads?filter=in_gesprek&q=Anna&bron=form&urgent=1&sort=prijs&view=tabel
   - /v2/leads/[lead_id] → dossier detail (getLeadDetail + real data)
   - Param-parsing: reuse parseLeadsFilters() + serializeLeadsFilters() helpers
