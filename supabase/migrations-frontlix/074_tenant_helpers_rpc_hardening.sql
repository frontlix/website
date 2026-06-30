-- 074_tenant_helpers_rpc_hardening.sql
-- NOG NIET TOEGEPAST op live. Eerst testen op een kopie (lokale Supabase-CLI of 2e gratis project).
-- Multitenant-fundament (Project 1, fase 5). Zie multitenant-fundament-plan.md regels 339-402.
--
-- Wat deze migratie doet:
--   1) Tenant-helper-functies: auth_tenant_id(), is_superadmin(), effective_tenant_id()
--      (worden door de RLS-policies in 075 gebruikt). SECURITY DEFINER + search_path=public.
--   2) RPC-hardening: trek EXECUTE in op de interne dispatch-/trigger-/log-functies zodat ze
--      niet rechtstreeks vanuit de browser (anon/authenticated) aangeroepen kunnen worden.
--      Triggers blijven gewoon vuren (trigger-uitvoering vraagt geen EXECUTE-recht).
--   3) create_notification_for_all_users: IN-PLACE vervangen (GEEN overload). De oude 5-arg
--      signatuur uit migr 034 wordt eerst GEDROPT, daarna opnieuw aangemaakt met p_tenant_id +
--      tenant-scope. Vervolgens worden ALLE PERFORM-callers (trigger_notify_nieuwe_lead +
--      trigger_notify_lead_update uit migr 034) atomisch herschreven zodat ze NEW.tenant_id
--      meegeven. Zonder de in-place-vervanging ontstond een overload die het cross-tenant
--      broadcast-lek open liet.
--
-- Afhankelijk van: 066 (platform_role_t + dashboard_user_profiles.tenant_id/platform_role),
--                  067 (notifications.tenant_id), 034 (notify-functies + triggers).
--
-- Rollback (niet-destructief, herstelt de pre-074 staat):
--   -- helpers terugtrekken
--   drop function if exists public.effective_tenant_id();
--   drop function if exists public.is_superadmin();
--   drop function if exists public.auth_tenant_id();
--   -- notify terug naar de 5-arg versie uit migr 034 (her-run migr 034 sectie 1+2+3),
--   -- en EXECUTE-grants herstellen waar nodig:
--   --   grant execute on function public.create_notification_for_all_users(...) to ...;
--   --   grant execute on function public.dispatch_notification_delivery(uuid, public.notification_kanaal) to ...;
--   --   grant execute on function public.log_dashboard_status_change() to ...;
--   --   grant execute on function public.trigger_notification_dispatch() to ...;
--   --   grant execute on function public.trigger_notify_nieuwe_lead() to ...;
--   --   grant execute on function public.trigger_notify_lead_update() to ...;


-- ─── 1) Tenant-helper-functies ───────────────────────────────────────

create or replace function public.auth_tenant_id() returns uuid
  language sql stable security definer set search_path = public as $$
  select tenant_id from public.dashboard_user_profiles
  where user_id = auth.uid() and tenant_status = 'approved';
$$;

create or replace function public.is_superadmin() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.dashboard_user_profiles
    where user_id = auth.uid()
      and platform_role = 'superadmin'
      and tenant_status = 'approved'
  );
$$;

create or replace function public.effective_tenant_id() returns uuid
  language sql stable security definer set search_path = public as $$
  select case
    when (select public.is_superadmin())
         and coalesce(current_setting('request.frontlix_acting_tenant', true), '') <> ''
    then current_setting('request.frontlix_acting_tenant', true)::uuid
    else (select public.auth_tenant_id())
  end;
$$;

-- anon mag geen tenant-context kunnen uitlezen
revoke execute on function public.auth_tenant_id()      from anon;
revoke execute on function public.is_superadmin()       from anon;
revoke execute on function public.effective_tenant_id() from anon;


-- ─── 2) RPC-hardening: interne dispatch-/trigger-/log-functies afschermen ─────
-- LET OP: de echte signatuur van dispatch_notification_delivery is
-- (uuid, public.notification_kanaal) — NIET (uuid, text) zoals de spec gokte
-- (zie migr 035/058). De andere vier zijn arg-loze trigger-/log-functies.
revoke execute on function public.dispatch_notification_delivery(uuid, public.notification_kanaal)
  from anon, authenticated, public;
revoke execute on function public.log_dashboard_status_change()
  from anon, authenticated, public;
revoke execute on function public.trigger_notification_dispatch()
  from anon, authenticated, public;
revoke execute on function public.trigger_notify_nieuwe_lead()
  from anon, authenticated, public;
revoke execute on function public.trigger_notify_lead_update()
  from anon, authenticated, public;


-- ─── 3) create_notification_for_all_users IN-PLACE vervangen (geen overload!) ─
-- 3a) DROP de EXACTE bestaande signatuur uit migr 034 (eerste param = de ENUM, niet text).
drop function if exists public.create_notification_for_all_users(
  public.notification_event_type, text, text, text, jsonb
);

-- 3b) Opnieuw aanmaken met p_tenant_id + tenant-scope. Insert één notification-rij per
--     approved dashboard-user BINNEN de meegegeven tenant.
create or replace function public.create_notification_for_all_users(
  p_event_type public.notification_event_type,
  p_titel      text,
  p_body       text,
  p_lead_id    text,
  p_payload    jsonb,
  p_tenant_id  uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, tenant_id, event_type, titel, body, lead_id, payload)
  select p.user_id, p_tenant_id, p_event_type, p_titel, p_body, p_lead_id, p_payload
  from public.dashboard_user_profiles p
  where p.tenant_status = 'approved'
    and p.tenant_id = p_tenant_id;
end;
$$;

comment on function public.create_notification_for_all_users(
  public.notification_event_type, text, text, text, jsonb, uuid
) is 'Maakt notification-rijen voor alle approved users BINNEN p_tenant_id (tenant-scoped, geen cross-tenant broadcast).';

revoke execute on function public.create_notification_for_all_users(
  public.notification_event_type, text, text, text, jsonb, uuid
) from anon, authenticated, public;

-- 3c) ALLE PERFORM-callers uit migr 034 atomisch herschrijven zodat ze NEW.tenant_id meegeven.
--     Titel/body/payload-logica is 1-op-1 overgenomen uit migr 034.

create or replace function public.trigger_notify_nieuwe_lead()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_titel text;
  v_body  text;
begin
  v_titel := 'Nieuwe lead: ' || coalesce(new.naam, 'naamloos');
  v_body  := 'Aanvraag via ' || coalesce(new.bron, new.kanaal::text, 'web');

  perform public.create_notification_for_all_users(
    'nieuwe_lead'::public.notification_event_type,
    v_titel,
    v_body,
    new.lead_id,
    jsonb_build_object(
      'hoofdcategorie', new.hoofdcategorie,
      'kanaal', new.kanaal
    ),
    new.tenant_id
  );
  return new;
end;
$$;

create or replace function public.trigger_notify_lead_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_naam text;
  v_prijs_label text;
begin
  v_naam := coalesce(new.naam, 'naamloos');
  v_prijs_label := case
    when new.totaal_prijs is not null
      then '€' || to_char(new.totaal_prijs, 'FM999G999G990')
    else 'geen bedrag'
  end;

  -- owner_review_nodig: pending_eigenaar_review nieuw gezet
  if (old.pending_eigenaar_review is null and new.pending_eigenaar_review is not null) then
    perform public.create_notification_for_all_users(
      'owner_review_nodig'::public.notification_event_type,
      'Owner-review nodig: ' || v_naam,
      'Surface wacht op je goedkeuring · ' || v_prijs_label,
      new.lead_id,
      jsonb_build_object('totaal_prijs', new.totaal_prijs),
      new.tenant_id
    );
  end if;

  -- klant_vraagt_korting: gesprek_fase werd 'onderhandelen'
  if (new.gesprek_fase = 'onderhandelen' and
      (old.gesprek_fase is distinct from 'onderhandelen')) then
    perform public.create_notification_for_all_users(
      'klant_vraagt_korting'::public.notification_event_type,
      'Klant in onderhandeling: ' || v_naam,
      'Mogelijk korting-vraag · ' || v_prijs_label,
      new.lead_id,
      jsonb_build_object('totaal_prijs', new.totaal_prijs),
      new.tenant_id
    );
  end if;

  -- offerte_goedgekeurd: akkoord_op nieuw gezet
  if (old.akkoord_op is null and new.akkoord_op is not null) then
    perform public.create_notification_for_all_users(
      'offerte_goedgekeurd'::public.notification_event_type,
      'Offerte goedgekeurd: ' || v_naam,
      'Klant ging akkoord · ' || v_prijs_label,
      new.lead_id,
      jsonb_build_object(
        'totaal_prijs', new.totaal_prijs,
        'akkoord_via', new.akkoord_via
      ),
      new.tenant_id
    );
  end if;

  -- offerte_afgewezen: dashboard_status werd 'geen_interesse'
  if (new.dashboard_status = 'geen_interesse' and
      (old.dashboard_status is distinct from 'geen_interesse')) then
    perform public.create_notification_for_all_users(
      'offerte_afgewezen'::public.notification_event_type,
      'Offerte afgewezen: ' || v_naam,
      'Klant haakt af · ' || v_prijs_label,
      new.lead_id,
      jsonb_build_object('totaal_prijs', new.totaal_prijs),
      new.tenant_id
    );
  end if;

  -- afspraak_ingepland: afspraak_geboekt_op nieuw gezet
  if (old.afspraak_geboekt_op is null and new.afspraak_geboekt_op is not null) then
    perform public.create_notification_for_all_users(
      'afspraak_ingepland'::public.notification_event_type,
      'Afspraak ingepland: ' || v_naam,
      coalesce(
        'Op ' || to_char(new.afspraak_datum, 'DD-MM-YYYY')
          || coalesce(' ' || new.afspraak_starttijd::text, ''),
        'Datum gekozen'
      ),
      new.lead_id,
      jsonb_build_object(
        'afspraak_datum', new.afspraak_datum,
        'afspraak_starttijd', new.afspraak_starttijd
      ),
      new.tenant_id
    );
  end if;

  return new;
end;
$$;

-- De triggers lead_insert_notify / lead_update_notify (migr 034) blijven ongewijzigd:
-- CREATE OR REPLACE FUNCTION hangt de nieuwe body automatisch onder dezelfde triggers.


-- ─── Verificatie (verplicht, na uitvoering handmatig draaien) ─────────────────
-- Moet PRECIES één rij geven: de 6-arg tenant-versie. De oude 5-arg variant mag NIET bestaan.
--   select proname, pg_get_function_identity_arguments(oid)
--   from pg_proc where proname = 'create_notification_for_all_users';
-- Verwacht resultaat:
--   create_notification_for_all_users | p_event_type notification_event_type, p_titel text, p_body text, p_lead_id text, p_payload jsonb, p_tenant_id uuid

