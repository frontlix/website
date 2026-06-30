-- 070_indexen.sql
-- NOG NIET TOEGEPAST op live. Eerst testen op een kopie.
-- Multitenant-fundament (Project 1, fase 5).
--
-- LET OP: NIET-TRANSACTIONEEL DRAAIEN. CREATE INDEX CONCURRENTLY mag NIET in een transactieblok.
-- Voer dit bestand uit als losse, niet-transactionele migratie (psql met --single-transaction UIT,
-- of `supabase ... --no-transaction`, of statement-voor-statement via execute_sql). NOOIT via
-- apply_migration/MCP dat het geheel in BEGIN/COMMIT wikkelt; dan faalt elke CONCURRENTLY-regel.
--
-- Bouw de tenant-indexen VOOR 071 de NOT NULL valideert (de constraint-VALIDATE-scan wordt dan
-- goedkoper en de runtime-queries die per tenant filteren krijgen meteen een index). Elke SS-default
-- ROOT- en AFGELEID-tabel krijgt index-dekking op tenant_id: tabellen met een samengestelde index die
-- met tenant_id begint (leads, berichten, pending_delivery_checks, offerte_concepten) hebben geen
-- losse (tenant_id)-index nodig want de prefix-kolom dekt enkelvoudige tenant-lookups; de overige
-- tabellen krijgen een enkelvoudige (tenant_id)-index. `if not exists` maakt het herhaalbaar.
--
-- Rollback (eveneens niet-transactioneel): drop index concurrently if exists <indexnaam>;  (zie onderaan)

-- ============================================================================
-- leads: samengestelde indexen voor de zwaarste dashboard-filters (alle met tenant_id als prefix,
--        dus dekken tevens de enkelvoudige (tenant_id)-lookup)
-- ============================================================================
create index concurrently if not exists idx_leads_tenant            on public.leads (tenant_id);
create index concurrently if not exists idx_leads_tenant_status     on public.leads (tenant_id, dashboard_status);
create index concurrently if not exists idx_leads_tenant_aangemaakt on public.leads (tenant_id, aangemaakt desc);
create index concurrently if not exists idx_leads_tenant_archived   on public.leads (tenant_id, dashboard_archived);
create index concurrently if not exists idx_leads_tenant_telefoon   on public.leads (tenant_id, telefoon);

-- ============================================================================
-- Samengestelde indexen op afgeleide/hot-path tabellen (tenant_id als prefix)
-- ============================================================================
create index concurrently if not exists idx_berichten_tenant_lead   on public.berichten (tenant_id, lead_id);
create index concurrently if not exists idx_pdc_tenant_verlopen      on public.pending_delivery_checks (tenant_id, verlopen_op);
create index concurrently if not exists idx_offconcept_tenant_bij    on public.offerte_concepten (tenant_id, bijgewerkt_op desc);

-- ============================================================================
-- Enkelvoudige (tenant_id)-index op de overige SS-default ROOT-tabellen
-- ============================================================================
create index concurrently if not exists idx_pricing_rules_tenant            on public.pricing_rules (tenant_id);
create index concurrently if not exists idx_service_offerings_tenant        on public.service_offerings (tenant_id);
create index concurrently if not exists idx_tags_tenant                     on public.tags (tenant_id);
create index concurrently if not exists idx_notification_preferences_tenant on public.notification_preferences (tenant_id);
create index concurrently if not exists idx_kostprijzen_per_dienst_tenant   on public.kostprijzen_per_dienst (tenant_id);
create index concurrently if not exists idx_template_aanvragen_tenant       on public.template_aanvragen (tenant_id);
create index concurrently if not exists idx_external_calendar_events_tenant on public.external_calendar_events (tenant_id);

-- ============================================================================
-- Enkelvoudige (tenant_id)-index op de overige SS-default AFGELEID-tabellen
-- ============================================================================
create index concurrently if not exists idx_offertes_tenant            on public.offertes (tenant_id);
create index concurrently if not exists idx_fotos_tenant               on public.fotos (tenant_id);
create index concurrently if not exists idx_prijsregels_tenant         on public.prijsregels (tenant_id);
create index concurrently if not exists idx_lead_tags_tenant           on public.lead_tags (tenant_id);
create index concurrently if not exists idx_lead_notes_tenant          on public.lead_notes (tenant_id);
create index concurrently if not exists idx_lead_status_history_tenant on public.lead_status_history (tenant_id);

-- ============================================================================
-- NULLABLE tabellen (tenant_id mag NULL = global/superadmin-scope): index helpt het per-tenant filter
-- ============================================================================
create index concurrently if not exists idx_notifications_tenant on public.notifications (tenant_id);
create index concurrently if not exists idx_error_logs_tenant    on public.error_logs (tenant_id);

-- ============================================================================
-- Verificatie (apart draaien): geen enkele zojuist gebouwde index mag invalid zijn.
--   select indexrelid::regclass, indisvalid from pg_index where not indisvalid;
-- moet een lege uitkomst geven. Een invalid index = afgebroken CONCURRENTLY-build:
--   drop index concurrently <naam>;  en de betreffende create opnieuw draaien.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Rollback (niet-transactioneel, los draaien):
--   drop index concurrently if exists public.idx_leads_tenant;
--   drop index concurrently if exists public.idx_leads_tenant_status;
--   drop index concurrently if exists public.idx_leads_tenant_aangemaakt;
--   drop index concurrently if exists public.idx_leads_tenant_archived;
--   drop index concurrently if exists public.idx_leads_tenant_telefoon;
--   drop index concurrently if exists public.idx_berichten_tenant_lead;
--   drop index concurrently if exists public.idx_pdc_tenant_verlopen;
--   drop index concurrently if exists public.idx_offconcept_tenant_bij;
--   drop index concurrently if exists public.idx_pricing_rules_tenant;
--   drop index concurrently if exists public.idx_service_offerings_tenant;
--   drop index concurrently if exists public.idx_tags_tenant;
--   drop index concurrently if exists public.idx_notification_preferences_tenant;
--   drop index concurrently if exists public.idx_kostprijzen_per_dienst_tenant;
--   drop index concurrently if exists public.idx_template_aanvragen_tenant;
--   drop index concurrently if exists public.idx_external_calendar_events_tenant;
--   drop index concurrently if exists public.idx_offertes_tenant;
--   drop index concurrently if exists public.idx_fotos_tenant;
--   drop index concurrently if exists public.idx_prijsregels_tenant;
--   drop index concurrently if exists public.idx_lead_tags_tenant;
--   drop index concurrently if exists public.idx_lead_notes_tenant;
--   drop index concurrently if exists public.idx_lead_status_history_tenant;
--   drop index concurrently if exists public.idx_notifications_tenant;
--   drop index concurrently if exists public.idx_error_logs_tenant;

