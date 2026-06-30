-- 075_rls_tenant_aware.sql
-- NOG NIET TOEGEPAST op live. Eerst testen op een kopie.
-- Multitenant-fundament (Project 1, fase 5).
--
-- RLS volledig herschrijven naar tenant-aware policies. De oude policies (migraties 024-065) zijn
-- tenant-BLIND: elke approved dashboard-user ziet/muteert ALLE rijen. Postgres combineert permissive
-- policies met OR, dus een achtergebleven tenant-blinde policy zou de hele rewrite tot no-op maken.
-- Daarom: drop ELKE bestaande policy op zijn ECHTE (Nederlandstalige) naam, en maak per tabel x
-- commando een nieuwe tenant-aware policy.
--   - LEZEN  (SELECT): (select public.is_superadmin()) OR <tenantkolom> = (select public.auth_tenant_id())
--   - SCHRIJVEN (INSERT/UPDATE/DELETE): UITSLUITEND <tenantkolom> = (select public.auth_tenant_id()),
--     GEEN is_superadmin()-OR. Een superadmin schrijft cross-tenant alleen via de view-as-laag
--     (service-role + assertSuperadmin + forTenant + audit), nooit via een normaal dashboard-scherm.
-- Bestaande auth.uid()-auteurchecks blijven behouden (lead_notes.auteur, template_aanvragen.aanvrager_user_id).
-- tenant_settings gebruikt kolom 'id' als tenantsleutel. notifications blijft user-scoped
-- (user_id = auth.uid()) met superadmin-SELECT erbij; inserts lopen via de SECURITY DEFINER notify-functie.
--
-- Helpers auth_tenant_id() / is_superadmin() (SECURITY DEFINER STABLE) zijn aangemaakt in 074 en moeten
-- bestaan voor deze migratie. De approved-check zit ingevouwen in auth_tenant_id() (niet-approved => NULL).
--
-- VEILIGHEID: alles loopt in EEN transactie. De verplichte pre-check (geen lockout) en de post-gate
-- (geen tenant-blinde policy achtergebleven) raise'n exception bij falen, waardoor de hele transactie
-- terugrolt en er geen half-toegepaste, lekkende staat ontstaat.
--
-- push_subscriptions en social_* tabellen krijgen GEEN tenant_id in Project 1 en blijven BUITEN deze
-- migratie (niet in de drop, niet in de post-gate).
--
-- Rollback (klaarhouden tegen lockout in DEZELFDE sessie): herstel de bewaarde oude policy-definities
-- uit de pg_policies-inventaris (pre-check 2 hieronder) en drop de hier aangemaakte *_tenant_*-policies.

begin;

-- ============================================================================
-- PRE-CHECK 1 (verplicht, blokkeert de flip): geen lockout.
-- Elke actieve SS-tenant-user MOET approved zijn EN tenant_id = SS-uuid hebben. Anders geeft
-- auth_tenant_id() NULL en sluit de nieuwe RLS die user buiten -> directe outage. Niet flippen tot leeg.
-- ============================================================================
do $$
declare v_bad bigint;
begin
  select count(*) into v_bad
  from public.dashboard_user_profiles
  where platform_role = 'tenant'
    and (tenant_status <> 'approved'
         or tenant_id is distinct from '00000000-0000-0000-0000-000000000001');
  if v_bad > 0 then
    raise exception
      'PRE-CHECK 1 FAALT: % tenant-user(s) zonder approved+SS-tenant_id; eerst herstellen voor de RLS-flip (lockout-risico).',
      v_bad;
  end if;
  raise notice 'PRE-CHECK 1 OK: alle tenant-users zijn approved + gekoppeld aan de SS-tenant.';
end $$;

-- ============================================================================
-- PRE-CHECK 2 (informatief, bewaar dit als rollback-vangnet): tel de huidige policies op de
-- tenant-aware tabellen. Print deze inventaris (en kopieer de volledige pg_policies-output apart
-- weg) zodat je bij een lockout exact de oude definities kunt terugzetten.
-- ============================================================================
do $$
declare v_oud bigint;
begin
  select count(*) into v_oud
  from pg_policies
  where schemaname = 'public'
    and tablename in (
      'leads','offertes','berichten','fotos','prijsregels','pricing_rules',
      'service_offerings','tags','lead_tags','lead_notes','lead_status_history',
      'notification_preferences','kostprijzen_per_dienst','offerte_concepten',
      'template_aanvragen','external_calendar_events','notifications','tenant_settings'
    );
  raise notice 'PRE-CHECK 2: % bestaande policy(s) op tenant-aware tabellen voor de rewrite (bewaar de pg_policies-dump als rollback).', v_oud;
end $$;

-- ============================================================================
-- RLS borgen (idempotent): zorg dat RLS aanstaat op elke tenant-aware tabel. Tabellen die eerder
-- geen policy hadden (kostprijzen_per_dienst, offerte_concepten) zouden anders met enkel policies
-- maar zonder ingeschakelde RLS niet afgedwongen worden. Service-role omzeilt RLS sowieso (bot).
-- ============================================================================
alter table public.leads                    enable row level security;
alter table public.offertes                 enable row level security;
alter table public.berichten                enable row level security;
alter table public.fotos                    enable row level security;
alter table public.prijsregels              enable row level security;
alter table public.pricing_rules            enable row level security;
alter table public.service_offerings        enable row level security;
alter table public.tags                     enable row level security;
alter table public.lead_tags                enable row level security;
alter table public.lead_notes               enable row level security;
alter table public.lead_status_history      enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.kostprijzen_per_dienst   enable row level security;
alter table public.offerte_concepten        enable row level security;
alter table public.template_aanvragen       enable row level security;
alter table public.external_calendar_events enable row level security;
alter table public.notifications            enable row level security;
alter table public.tenant_settings          enable row level security;

-- ============================================================================
-- DROP: alle bestaande (tenant-blinde) policies op hun ECHTE Nederlandstalige namen.
-- ============================================================================

-- leads
drop policy if exists "approved users kunnen leads lezen" on public.leads;
drop policy if exists "approved users kunnen dashboard-velden van leads wijzigen" on public.leads;

-- offertes
drop policy if exists "approved users kunnen offertes lezen" on public.offertes;

-- berichten
drop policy if exists "approved users kunnen berichten lezen" on public.berichten;

-- fotos
drop policy if exists "approved users kunnen fotos lezen" on public.fotos;

-- prijsregels
drop policy if exists "approved users kunnen prijsregels lezen" on public.prijsregels;

-- pricing_rules
drop policy if exists "approved users kunnen pricing_rules lezen" on public.pricing_rules;
drop policy if exists "approved users kunnen pricing_rules updaten" on public.pricing_rules;

-- service_offerings
drop policy if exists "approved users kunnen service_offerings lezen" on public.service_offerings;
drop policy if exists "service_offerings_update_owner" on public.service_offerings;

-- tags
drop policy if exists "approved users kunnen tags lezen" on public.tags;
drop policy if exists "approved users kunnen tags aanmaken" on public.tags;
drop policy if exists "approved users kunnen tags verwijderen" on public.tags;
drop policy if exists "tags_insert_owner" on public.tags;
drop policy if exists "tags_update_owner" on public.tags;
drop policy if exists "tags_delete_owner" on public.tags;

-- lead_tags
drop policy if exists "approved users kunnen lead_tags lezen" on public.lead_tags;
drop policy if exists "approved users kunnen lead_tags toevoegen" on public.lead_tags;
drop policy if exists "approved users kunnen lead_tags verwijderen" on public.lead_tags;

-- lead_notes
drop policy if exists "approved users kunnen lead_notes lezen" on public.lead_notes;
drop policy if exists "approved users kunnen lead_notes toevoegen" on public.lead_notes;
drop policy if exists "approved users kunnen lead_notes bewerken" on public.lead_notes;
drop policy if exists "approved users kunnen lead_notes verwijderen" on public.lead_notes;

-- lead_status_history
drop policy if exists "approved users kunnen lead_status_history lezen" on public.lead_status_history;

-- notification_preferences
drop policy if exists "approved users zien prefs" on public.notification_preferences;
drop policy if exists "approved users insert prefs" on public.notification_preferences;
drop policy if exists "approved users updaten prefs" on public.notification_preferences;

-- template_aanvragen
drop policy if exists "approved users zien template_aanvragen" on public.template_aanvragen;
drop policy if exists "approved users insert template_aanvragen" on public.template_aanvragen;

-- external_calendar_events
drop policy if exists "approved users kunnen externe agenda-events lezen" on public.external_calendar_events;

-- notifications
drop policy if exists "users zien eigen notifications" on public.notifications;
drop policy if exists "users updaten eigen notifications" on public.notifications;

-- tenant_settings
drop policy if exists "approved users kunnen tenant_settings lezen" on public.tenant_settings;

-- ============================================================================
-- CREATE: tenant-aware policies per tabel x commando (dekkingsmatrix uit het plan).
--   SELECT = OR-superadmin; INSERT/UPDATE/DELETE = tenant-only (GEEN superadmin-OR).
--   Alle policies gericht op de authenticated-rol (service-role omzeilt RLS).
-- ============================================================================

-- LEADS (SELECT OR-lezen; UPDATE tenant-only; INSERT/DELETE n.v.t. = bot/service-role)
create policy "leads_tenant_select" on public.leads for select to authenticated
  using ( (select public.is_superadmin()) or tenant_id = (select public.auth_tenant_id()) );
create policy "leads_tenant_update" on public.leads for update to authenticated
  using ( tenant_id = (select public.auth_tenant_id()) )
  with check ( tenant_id = (select public.auth_tenant_id()) );

-- OFFERTES (SELECT OR; INSERT/UPDATE/DELETE tenant-only)
create policy "offertes_tenant_select" on public.offertes for select to authenticated
  using ( (select public.is_superadmin()) or tenant_id = (select public.auth_tenant_id()) );
create policy "offertes_tenant_insert" on public.offertes for insert to authenticated
  with check ( tenant_id = (select public.auth_tenant_id()) );
create policy "offertes_tenant_update" on public.offertes for update to authenticated
  using ( tenant_id = (select public.auth_tenant_id()) )
  with check ( tenant_id = (select public.auth_tenant_id()) );
create policy "offertes_tenant_delete" on public.offertes for delete to authenticated
  using ( tenant_id = (select public.auth_tenant_id()) );

-- BERICHTEN (SELECT OR; INSERT/UPDATE tenant-only; DELETE n.v.t.)
create policy "berichten_tenant_select" on public.berichten for select to authenticated
  using ( (select public.is_superadmin()) or tenant_id = (select public.auth_tenant_id()) );
create policy "berichten_tenant_insert" on public.berichten for insert to authenticated
  with check ( tenant_id = (select public.auth_tenant_id()) );
create policy "berichten_tenant_update" on public.berichten for update to authenticated
  using ( tenant_id = (select public.auth_tenant_id()) )
  with check ( tenant_id = (select public.auth_tenant_id()) );

-- FOTOS (SELECT OR; INSERT/UPDATE/DELETE tenant-only)
create policy "fotos_tenant_select" on public.fotos for select to authenticated
  using ( (select public.is_superadmin()) or tenant_id = (select public.auth_tenant_id()) );
create policy "fotos_tenant_insert" on public.fotos for insert to authenticated
  with check ( tenant_id = (select public.auth_tenant_id()) );
create policy "fotos_tenant_update" on public.fotos for update to authenticated
  using ( tenant_id = (select public.auth_tenant_id()) )
  with check ( tenant_id = (select public.auth_tenant_id()) );
create policy "fotos_tenant_delete" on public.fotos for delete to authenticated
  using ( tenant_id = (select public.auth_tenant_id()) );

-- PRIJSREGELS (SELECT OR; INSERT/UPDATE/DELETE tenant-only)
create policy "prijsregels_tenant_select" on public.prijsregels for select to authenticated
  using ( (select public.is_superadmin()) or tenant_id = (select public.auth_tenant_id()) );
create policy "prijsregels_tenant_insert" on public.prijsregels for insert to authenticated
  with check ( tenant_id = (select public.auth_tenant_id()) );
create policy "prijsregels_tenant_update" on public.prijsregels for update to authenticated
  using ( tenant_id = (select public.auth_tenant_id()) )
  with check ( tenant_id = (select public.auth_tenant_id()) );
create policy "prijsregels_tenant_delete" on public.prijsregels for delete to authenticated
  using ( tenant_id = (select public.auth_tenant_id()) );

-- PRICING_RULES (SELECT OR; INSERT/UPDATE/DELETE tenant-only; sluit de tenant-blinde UPDATE uit migr 030)
create policy "pricing_rules_tenant_select" on public.pricing_rules for select to authenticated
  using ( (select public.is_superadmin()) or tenant_id = (select public.auth_tenant_id()) );
create policy "pricing_rules_tenant_insert" on public.pricing_rules for insert to authenticated
  with check ( tenant_id = (select public.auth_tenant_id()) );
create policy "pricing_rules_tenant_update" on public.pricing_rules for update to authenticated
  using ( tenant_id = (select public.auth_tenant_id()) )
  with check ( tenant_id = (select public.auth_tenant_id()) );
create policy "pricing_rules_tenant_delete" on public.pricing_rules for delete to authenticated
  using ( tenant_id = (select public.auth_tenant_id()) );

-- SERVICE_OFFERINGS (SELECT OR; INSERT/UPDATE/DELETE tenant-only)
create policy "service_offerings_tenant_select" on public.service_offerings for select to authenticated
  using ( (select public.is_superadmin()) or tenant_id = (select public.auth_tenant_id()) );
create policy "service_offerings_tenant_insert" on public.service_offerings for insert to authenticated
  with check ( tenant_id = (select public.auth_tenant_id()) );
create policy "service_offerings_tenant_update" on public.service_offerings for update to authenticated
  using ( tenant_id = (select public.auth_tenant_id()) )
  with check ( tenant_id = (select public.auth_tenant_id()) );
create policy "service_offerings_tenant_delete" on public.service_offerings for delete to authenticated
  using ( tenant_id = (select public.auth_tenant_id()) );

-- TAGS (SELECT OR; INSERT/UPDATE/DELETE tenant-only; sluit de tenant-blinde DELETE uit oude migratie)
create policy "tags_tenant_select" on public.tags for select to authenticated
  using ( (select public.is_superadmin()) or tenant_id = (select public.auth_tenant_id()) );
create policy "tags_tenant_insert" on public.tags for insert to authenticated
  with check ( tenant_id = (select public.auth_tenant_id()) );
create policy "tags_tenant_update" on public.tags for update to authenticated
  using ( tenant_id = (select public.auth_tenant_id()) )
  with check ( tenant_id = (select public.auth_tenant_id()) );
create policy "tags_tenant_delete" on public.tags for delete to authenticated
  using ( tenant_id = (select public.auth_tenant_id()) );

-- LEAD_TAGS (SELECT OR; INSERT/UPDATE/DELETE tenant-only; sluit de tenant-blinde DELETE/INSERT uit)
create policy "lead_tags_tenant_select" on public.lead_tags for select to authenticated
  using ( (select public.is_superadmin()) or tenant_id = (select public.auth_tenant_id()) );
create policy "lead_tags_tenant_insert" on public.lead_tags for insert to authenticated
  with check ( tenant_id = (select public.auth_tenant_id()) );
create policy "lead_tags_tenant_update" on public.lead_tags for update to authenticated
  using ( tenant_id = (select public.auth_tenant_id()) )
  with check ( tenant_id = (select public.auth_tenant_id()) );
create policy "lead_tags_tenant_delete" on public.lead_tags for delete to authenticated
  using ( tenant_id = (select public.auth_tenant_id()) );

-- LEAD_NOTES (SELECT OR; INSERT tenant-only + auteur=auth.uid(); UPDATE/DELETE tenant-only)
create policy "lead_notes_tenant_select" on public.lead_notes for select to authenticated
  using ( (select public.is_superadmin()) or tenant_id = (select public.auth_tenant_id()) );
create policy "lead_notes_tenant_insert" on public.lead_notes for insert to authenticated
  with check ( tenant_id = (select public.auth_tenant_id()) and auteur = (select auth.uid()) );
create policy "lead_notes_tenant_update" on public.lead_notes for update to authenticated
  using ( tenant_id = (select public.auth_tenant_id()) )
  with check ( tenant_id = (select public.auth_tenant_id()) );
create policy "lead_notes_tenant_delete" on public.lead_notes for delete to authenticated
  using ( tenant_id = (select public.auth_tenant_id()) );

-- LEAD_STATUS_HISTORY (SELECT OR; INSERT via trigger/definer; UPDATE/DELETE n.v.t.)
create policy "lead_status_history_tenant_select" on public.lead_status_history for select to authenticated
  using ( (select public.is_superadmin()) or tenant_id = (select public.auth_tenant_id()) );

-- NOTIFICATION_PREFERENCES (SELECT OR; INSERT/UPDATE/DELETE tenant-only; sluit tenant-blinde INSERT/UPDATE migr 033)
create policy "notification_preferences_tenant_select" on public.notification_preferences for select to authenticated
  using ( (select public.is_superadmin()) or tenant_id = (select public.auth_tenant_id()) );
create policy "notification_preferences_tenant_insert" on public.notification_preferences for insert to authenticated
  with check ( tenant_id = (select public.auth_tenant_id()) );
create policy "notification_preferences_tenant_update" on public.notification_preferences for update to authenticated
  using ( tenant_id = (select public.auth_tenant_id()) )
  with check ( tenant_id = (select public.auth_tenant_id()) );
create policy "notification_preferences_tenant_delete" on public.notification_preferences for delete to authenticated
  using ( tenant_id = (select public.auth_tenant_id()) );

-- KOSTPRIJZEN_PER_DIENST (SELECT OR; INSERT/UPDATE/DELETE tenant-only)
create policy "kostprijzen_per_dienst_tenant_select" on public.kostprijzen_per_dienst for select to authenticated
  using ( (select public.is_superadmin()) or tenant_id = (select public.auth_tenant_id()) );
create policy "kostprijzen_per_dienst_tenant_insert" on public.kostprijzen_per_dienst for insert to authenticated
  with check ( tenant_id = (select public.auth_tenant_id()) );
create policy "kostprijzen_per_dienst_tenant_update" on public.kostprijzen_per_dienst for update to authenticated
  using ( tenant_id = (select public.auth_tenant_id()) )
  with check ( tenant_id = (select public.auth_tenant_id()) );
create policy "kostprijzen_per_dienst_tenant_delete" on public.kostprijzen_per_dienst for delete to authenticated
  using ( tenant_id = (select public.auth_tenant_id()) );

-- OFFERTE_CONCEPTEN (SELECT OR; INSERT/UPDATE/DELETE tenant-only)
create policy "offerte_concepten_tenant_select" on public.offerte_concepten for select to authenticated
  using ( (select public.is_superadmin()) or tenant_id = (select public.auth_tenant_id()) );
create policy "offerte_concepten_tenant_insert" on public.offerte_concepten for insert to authenticated
  with check ( tenant_id = (select public.auth_tenant_id()) );
create policy "offerte_concepten_tenant_update" on public.offerte_concepten for update to authenticated
  using ( tenant_id = (select public.auth_tenant_id()) )
  with check ( tenant_id = (select public.auth_tenant_id()) );
create policy "offerte_concepten_tenant_delete" on public.offerte_concepten for delete to authenticated
  using ( tenant_id = (select public.auth_tenant_id()) );

-- TEMPLATE_AANVRAGEN (SELECT OR; INSERT tenant-only + aanvrager=auth.uid(); UPDATE/DELETE tenant-only)
create policy "template_aanvragen_tenant_select" on public.template_aanvragen for select to authenticated
  using ( (select public.is_superadmin()) or tenant_id = (select public.auth_tenant_id()) );
create policy "template_aanvragen_tenant_insert" on public.template_aanvragen for insert to authenticated
  with check ( tenant_id = (select public.auth_tenant_id()) and aanvrager_user_id = (select auth.uid()) );
create policy "template_aanvragen_tenant_update" on public.template_aanvragen for update to authenticated
  using ( tenant_id = (select public.auth_tenant_id()) )
  with check ( tenant_id = (select public.auth_tenant_id()) );
create policy "template_aanvragen_tenant_delete" on public.template_aanvragen for delete to authenticated
  using ( tenant_id = (select public.auth_tenant_id()) );

-- EXTERNAL_CALENDAR_EVENTS (SELECT OR; INSERT/UPDATE/DELETE tenant-only)
create policy "external_calendar_events_tenant_select" on public.external_calendar_events for select to authenticated
  using ( (select public.is_superadmin()) or tenant_id = (select public.auth_tenant_id()) );
create policy "external_calendar_events_tenant_insert" on public.external_calendar_events for insert to authenticated
  with check ( tenant_id = (select public.auth_tenant_id()) );
create policy "external_calendar_events_tenant_update" on public.external_calendar_events for update to authenticated
  using ( tenant_id = (select public.auth_tenant_id()) )
  with check ( tenant_id = (select public.auth_tenant_id()) );
create policy "external_calendar_events_tenant_delete" on public.external_calendar_events for delete to authenticated
  using ( tenant_id = (select public.auth_tenant_id()) );

-- NOTIFICATIONS (user-scoped: SELECT = superadmin OR eigen rij; UPDATE/DELETE = eigen rij;
--                INSERT = alleen via SECURITY DEFINER notify-functie, dus GEEN client-INSERT-policy)
create policy "notifications_user_select" on public.notifications for select to authenticated
  using ( (select public.is_superadmin()) or user_id = (select auth.uid()) );
create policy "notifications_user_update" on public.notifications for update to authenticated
  using ( user_id = (select auth.uid()) )
  with check ( user_id = (select auth.uid()) );
create policy "notifications_user_delete" on public.notifications for delete to authenticated
  using ( user_id = (select auth.uid()) );

-- TENANT_SETTINGS (tenantsleutel = kolom 'id'; SELECT OR; UPDATE tenant-only)
create policy "tenant_settings_self_select" on public.tenant_settings for select to authenticated
  using ( (select public.is_superadmin()) or id = (select public.auth_tenant_id()) );
create policy "tenant_settings_self_update" on public.tenant_settings for update to authenticated
  using ( id = (select public.auth_tenant_id()) )
  with check ( id = (select public.auth_tenant_id()) );

-- ============================================================================
-- POST-GATE (verplicht, faalt de migratie als niet groen): geen tenant-blinde policy achtergebleven.
-- Faalt als er op een tenant-aware tabel nog een policy staat waarvan USING+WITH CHECK geen van
-- auth_tenant_id / is_superadmin / tenant_id bevat (= een tenant-blinde policy die met OR de
-- isolatie zou opheffen). notifications is bewust user-scoped (user_id) en valt buiten deze gate.
-- ============================================================================
do $$
declare
  v_blind bigint;
  v_detail text;
begin
  select count(*),
         string_agg(tablename || '.' || policyname || ' (' || cmd || ')', ', ')
    into v_blind, v_detail
  from pg_policies
  where schemaname = 'public'
    and tablename in (
      'leads','offertes','berichten','fotos','prijsregels','pricing_rules',
      'service_offerings','tags','lead_tags','lead_notes','lead_status_history',
      'notification_preferences','kostprijzen_per_dienst','offerte_concepten',
      'template_aanvragen','external_calendar_events','tenant_settings'
    )
    and coalesce(qual,'')       || coalesce(with_check,'') not ilike '%auth_tenant_id%'
    and coalesce(qual,'')       || coalesce(with_check,'') not ilike '%is_superadmin%'
    and coalesce(qual,'')       || coalesce(with_check,'') not ilike '%tenant_id%';
  if v_blind > 0 then
    raise exception 'POST-GATE FAALT: % tenant-blinde policy(s) achtergebleven: %', v_blind, v_detail;
  end if;
  raise notice 'POST-GATE OK: geen tenant-blinde policies op tenant-aware tabellen.';
end $$;

commit;
