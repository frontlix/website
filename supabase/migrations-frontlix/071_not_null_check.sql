-- 071_not_null_check.sql
-- NOG NIET TOEGEPAST op live. Eerst testen op een kopie.
-- Multitenant-fundament (Project 1, fase 5).
--
-- Maak tenant_id verplicht op alle SS-default ROOT- en AFGELEID-tabellen. We gebruiken bewust een
-- CHECK (tenant_id is not null) NOT VALID + VALIDATE i.p.v. ALTER ... SET NOT NULL: NOT VALID neemt
-- alleen een korte ACCESS EXCLUSIVE-lock voor de catalogus-wijziging en de VALIDATE-scan draait onder
-- een lichtere SHARE UPDATE EXCLUSIVE-lock die schrijvers niet blokkeert. Voorwaarde: de gate uit 069
-- staat groen (geen NULL meer), anders faalt VALIDATE. Draait transactioneel (alles of niets).
--
-- error_logs en notifications krijgen GEEN NOT NULL: NULL = global/superadmin-scope (bewust toegestaan).
--
-- dashboard_user_profiles: tenant_id is verplicht voor een 'tenant'-rol maar mag NULL blijven voor de
-- superadmin (Chris, user_id 1f0901de-dac3-495a-839d-5079086fe5c5), die alle tenants via view-as ziet.
--
-- Rollback (niet-destructief, geen data-impact):
--   alter table public.<tabel> drop constraint if exists <tabel>_tenant_nn;
--   alter table public.dashboard_user_profiles drop constraint if exists tenant_id_required_for_tenants;

begin;

-- ============================================================================
-- SS-default ROOT-tabellen
-- ============================================================================
alter table public.leads                    add constraint leads_tenant_nn                    check (tenant_id is not null) not valid;
alter table public.leads                    validate constraint leads_tenant_nn;

alter table public.pricing_rules            add constraint pricing_rules_tenant_nn            check (tenant_id is not null) not valid;
alter table public.pricing_rules            validate constraint pricing_rules_tenant_nn;

alter table public.service_offerings        add constraint service_offerings_tenant_nn        check (tenant_id is not null) not valid;
alter table public.service_offerings        validate constraint service_offerings_tenant_nn;

alter table public.tags                     add constraint tags_tenant_nn                     check (tenant_id is not null) not valid;
alter table public.tags                     validate constraint tags_tenant_nn;

alter table public.notification_preferences add constraint notification_preferences_tenant_nn check (tenant_id is not null) not valid;
alter table public.notification_preferences validate constraint notification_preferences_tenant_nn;

alter table public.kostprijzen_per_dienst   add constraint kostprijzen_per_dienst_tenant_nn   check (tenant_id is not null) not valid;
alter table public.kostprijzen_per_dienst   validate constraint kostprijzen_per_dienst_tenant_nn;

alter table public.offerte_concepten        add constraint offerte_concepten_tenant_nn        check (tenant_id is not null) not valid;
alter table public.offerte_concepten        validate constraint offerte_concepten_tenant_nn;

alter table public.template_aanvragen       add constraint template_aanvragen_tenant_nn       check (tenant_id is not null) not valid;
alter table public.template_aanvragen       validate constraint template_aanvragen_tenant_nn;

alter table public.external_calendar_events add constraint external_calendar_events_tenant_nn check (tenant_id is not null) not valid;
alter table public.external_calendar_events validate constraint external_calendar_events_tenant_nn;

-- ============================================================================
-- SS-default AFGELEID-tabellen
-- ============================================================================
alter table public.offertes                 add constraint offertes_tenant_nn                 check (tenant_id is not null) not valid;
alter table public.offertes                 validate constraint offertes_tenant_nn;

alter table public.berichten                add constraint berichten_tenant_nn                check (tenant_id is not null) not valid;
alter table public.berichten                validate constraint berichten_tenant_nn;

alter table public.fotos                    add constraint fotos_tenant_nn                    check (tenant_id is not null) not valid;
alter table public.fotos                    validate constraint fotos_tenant_nn;

alter table public.prijsregels              add constraint prijsregels_tenant_nn              check (tenant_id is not null) not valid;
alter table public.prijsregels              validate constraint prijsregels_tenant_nn;

alter table public.lead_tags                add constraint lead_tags_tenant_nn                check (tenant_id is not null) not valid;
alter table public.lead_tags                validate constraint lead_tags_tenant_nn;

alter table public.lead_notes               add constraint lead_notes_tenant_nn               check (tenant_id is not null) not valid;
alter table public.lead_notes               validate constraint lead_notes_tenant_nn;

alter table public.lead_status_history      add constraint lead_status_history_tenant_nn      check (tenant_id is not null) not valid;
alter table public.lead_status_history      validate constraint lead_status_history_tenant_nn;

alter table public.pending_delivery_checks  add constraint pending_delivery_checks_tenant_nn  check (tenant_id is not null) not valid;
alter table public.pending_delivery_checks  validate constraint pending_delivery_checks_tenant_nn;

-- ============================================================================
-- dashboard_user_profiles: tenant_id verplicht voor 'tenant', vrij voor 'superadmin'
-- ============================================================================
alter table public.dashboard_user_profiles
  add constraint tenant_id_required_for_tenants
  check (platform_role = 'superadmin' or tenant_id is not null) not valid;
alter table public.dashboard_user_profiles
  validate constraint tenant_id_required_for_tenants;

commit;

