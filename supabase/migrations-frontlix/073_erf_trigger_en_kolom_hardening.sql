-- 073_erf_trigger_en_kolom_hardening.sql
-- NOG NIET TOEGEPAST op live. Eerst testen op een kopie (lokale Supabase-CLI of 2e gratis project).
-- Multitenant-fundament (Project 1, fase 5).
--
-- Drie hardening-stappen:
--  (1) DWINGENDE erf-trigger tenant_enforce_from_parent() op alle 8 afgeleide tabellen: de
--      tenant_id van een child wordt ALTIJD overgenomen van de parent-lead, en bij een
--      expliciete mismatch faalt de write hard (raise). Een service-role-bot-bug kan zo geen
--      stille cross-tenant rij meer wegschrijven.
--  (2) log_dashboard_status_change() schrijft tenant_id mee in lead_status_history (anders zou
--      de history-rij op de NOT NULL / erf-trigger stuk lopen).
--  (3) Kolom-hardening op leads via het BEWEZEN 065-GRANT-patroon: table-brede UPDATE intrekken
--      en alleen de dashboard-bewerkbare kolommen teruggeven aan authenticated. De service-role-
--      bot houdt volledige UPDATE (omzeilt GRANT/RLS) en wordt door de erf-trigger afgedekt.
--
-- Vereist: 067 (tenant_id-kolommen) + 071 (NOT NULL) zijn toegepast.
--
-- Rollback:
--   -- (3) leads-GRANT terug naar table-breed:
--   grant update on public.leads to authenticated;
--   -- (2) log_dashboard_status_change terug naar de 025-versie (zonder tenant_id).
--   -- (1) erf-triggers + functie verwijderen:
--   drop trigger if exists trg_enforce_tenant on public.offertes;
--   drop trigger if exists trg_enforce_tenant on public.berichten;
--   drop trigger if exists trg_enforce_tenant on public.fotos;
--   drop trigger if exists trg_enforce_tenant on public.prijsregels;
--   drop trigger if exists trg_enforce_tenant on public.lead_tags;
--   drop trigger if exists trg_enforce_tenant on public.lead_notes;
--   drop trigger if exists trg_enforce_tenant on public.lead_status_history;
--   drop trigger if exists trg_enforce_tenant on public.pending_delivery_checks;
--   drop function if exists public.tenant_enforce_from_parent();

begin;

-- ─────────────────────────────────────────────────────────────────────
-- (1) DWINGENDE erf-trigger: child.tenant_id ALTIJD gelijk aan parent-lead.
--     De child-tabellen koppelen via kolom lead_id (text) aan leads.lead_id.
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.tenant_enforce_from_parent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent uuid;
begin
  select l.tenant_id into v_parent from public.leads l where l.lead_id = new.lead_id;
  if v_parent is null then
    raise exception 'parent lead % onbekend voor %', new.lead_id, tg_table_name;
  end if;
  if new.tenant_id is null then
    new.tenant_id := v_parent;
  elsif new.tenant_id is distinct from v_parent then
    raise exception 'cross-tenant mismatch op %: child % != parent %',
      tg_table_name, new.tenant_id, v_parent;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_tenant on public.offertes;
create trigger trg_enforce_tenant before insert or update on public.offertes
  for each row execute function public.tenant_enforce_from_parent();

drop trigger if exists trg_enforce_tenant on public.berichten;
create trigger trg_enforce_tenant before insert or update on public.berichten
  for each row execute function public.tenant_enforce_from_parent();

drop trigger if exists trg_enforce_tenant on public.fotos;
create trigger trg_enforce_tenant before insert or update on public.fotos
  for each row execute function public.tenant_enforce_from_parent();

drop trigger if exists trg_enforce_tenant on public.prijsregels;
create trigger trg_enforce_tenant before insert or update on public.prijsregels
  for each row execute function public.tenant_enforce_from_parent();

drop trigger if exists trg_enforce_tenant on public.lead_tags;
create trigger trg_enforce_tenant before insert or update on public.lead_tags
  for each row execute function public.tenant_enforce_from_parent();

drop trigger if exists trg_enforce_tenant on public.lead_notes;
create trigger trg_enforce_tenant before insert or update on public.lead_notes
  for each row execute function public.tenant_enforce_from_parent();

drop trigger if exists trg_enforce_tenant on public.lead_status_history;
create trigger trg_enforce_tenant before insert or update on public.lead_status_history
  for each row execute function public.tenant_enforce_from_parent();

drop trigger if exists trg_enforce_tenant on public.pending_delivery_checks;
create trigger trg_enforce_tenant before insert or update on public.pending_delivery_checks
  for each row execute function public.tenant_enforce_from_parent();

-- ─────────────────────────────────────────────────────────────────────
-- (2) log_dashboard_status_change: tenant_id meeschrijven naar lead_status_history.
--     Behoudt de 025-semantiek: alleen loggen bij ECHTE statuswijziging en gewijzigd_door
--     = auth.uid() (service-key writes -> NULL). tenant_id komt van de parent-lead (NEW),
--     waardoor de erf-trigger op lead_status_history zonder mismatch passeert.
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.log_dashboard_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.dashboard_status is distinct from old.dashboard_status then
    insert into public.lead_status_history (
      lead_id,
      tenant_id,
      oude_status,
      nieuwe_status,
      gewijzigd_door,
      gewijzigd_op
    )
    values (
      new.lead_id,
      new.tenant_id,
      old.dashboard_status,
      new.dashboard_status,  -- mag NULL zijn (status leeggemaakt)
      auth.uid(),            -- service-key writes geven NULL
      now()
    );
  end if;
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- (3) Kolom-hardening op leads (065-patroon): table-brede UPDATE intrekken,
--     alleen dashboard-bewerkbare kolommen teruggeven aan authenticated.
--     Allowlist afgeleid uit lib/dashboard/lead-actions.ts + agenda-actions.ts
--     (de enige plekken die leads muteren via de user-sessie/authenticated-client;
--     alle overige leads-writes lopen via de service-role admin-client en zijn dus
--     niet door GRANT begrensd). Er bestaat GEEN dashboard_notitie-kolom: notities
--     zitten in lead_notes. bot_gepauzeerd/klus_geblokkeerd/eigenaar_overgenomen
--     worden via de bot-API (service-role) gezet en horen daarom NIET in de allowlist.
-- ─────────────────────────────────────────────────────────────────────
revoke update on public.leads from authenticated, anon;

grant update (
  -- info-tab (updateLeadFields: EDITABLE_TEXT/NUMERIC/ARRAY_FIELDS)
  naam,
  bedrijfsnaam,
  telefoon,
  email,
  straat,
  huisnummer,
  postcode,
  plaats,
  bron,
  hoofdcategorie,
  zand_kleur,
  voegzand_type,
  groene_aanslag,
  korstmos,
  planten,
  planten_afschermen,
  toelichting,
  afstand_km,
  m2,
  sub_diensten,
  -- status- en archief-acties (setDashboardStatus, archiveLead, unarchiveLead,
  -- markeerGeenEchteLead, markInboxRead, agenda-actions)
  dashboard_status,
  dashboard_archived,
  uitgesloten_van_stats,
  inbox_gelezen_op
) on public.leads to authenticated;

commit;

-- Verificatie (handmatig, na commit):
--   -- erf-trigger blokkeert cross-tenant write:
--   --   insert into public.berichten (lead_id, tenant_id, ...) values ('<ss-lead>', '<andere-tenant>', ...);  -- moet falen
--   -- kolom-GRANT: per toegestaan veld blijft een authenticated UPDATE staan,
--   --   per niet-toegestaan veld (bv. bot_gepauzeerd, totaal_prijs, klus_geblokkeerd) wordt geweigerd.
--   select grantee, privilege_type, column_name
--     from information_schema.column_privileges
--    where table_schema = 'public' and table_name = 'leads' and grantee = 'authenticated'
--    order by column_name;

