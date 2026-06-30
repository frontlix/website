-- 077_provision_tenant.sql
-- NOG NIET TOEGEPAST op live. Eerst testen op een kopie.
-- Multitenant-fundament (Project 1, fase E).
--
-- Provisioning-functie (service-role / superadmin-only) die in EEN transactie een nieuwe tenant opzet:
--   1. tenant_settings-rij aanmaken (eigen id, naam, chatbot-naam, offertenummer-state);
--   2. het owner-profiel aan die tenant koppelen + activeren (tenant_id, is_owner, platform_role, approved);
--   3. functionele defaults seeden: notification_preferences (8 events x 4 kanalen = 32 rijen) en
--      kostprijzen_per_dienst (8 categorie-defaults die de marge-berekening in de offerte-tab verwacht).
--   4. pricing_rules / service_offerings / tags worden BEWUST LEEG gelaten (sectie 11, beslispunt 6:
--      aanbeveling = neutrale/lege seed + onboarding-wizard, want elke klant heeft eigen prijzen). De
--      onboarding-wizard / view-as vult deze per tenant; zie open_items voor de SS-template-variant.
-- De PK's van notification_preferences/kostprijzen_per_dienst zijn samengesteld met tenant_id vanaf 072;
-- deze migratie draait in fase E (na 072), dus de ON CONFLICT-targets bevatten tenant_id.
-- Provisioning roept GEEN whatsapp_connections aan (dat doet de app-laag provisionTenant(), sectie 7).
--
-- Aanroep alleen via service-role (PostgREST service_role) of de superadmin-server-action met
-- assertSuperadmin(); execute is ingetrokken voor anon/authenticated/public.
--
-- Rollback (niet-destructief): drop function if exists public.provision_tenant(text, text, uuid);
--   Reeds geprovisionde tenants blijven bestaan (handmatig opruimen indien nodig).

create or replace function public.provision_tenant(
  p_bedrijfsnaam   text,
  p_chatbot_naam   text,
  p_owner_user_id  uuid
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid := gen_random_uuid();
  v_prefix text;
  v_rows   int;
  v_owner_tenant uuid;
begin
  if coalesce(btrim(p_bedrijfsnaam), '') = '' then
    raise exception 'bedrijfsnaam is verplicht';
  end if;

  -- Owner moet bestaan en mag nog niet aan een tenant hangen (geen dubbele provisioning).
  select tenant_id into v_owner_tenant
  from public.dashboard_user_profiles
  where user_id = p_owner_user_id;

  if not found then
    raise exception 'geen dashboard_user_profiles-rij voor owner %', p_owner_user_id;
  end if;
  if v_owner_tenant is not null then
    raise exception 'owner % is al gekoppeld aan tenant %', p_owner_user_id, v_owner_tenant;
  end if;

  -- Offertenummer-prefix: eerste 4 letters van de bedrijfsnaam (alleen a-z), fallback 'OFF'.
  v_prefix := upper(left(regexp_replace(p_bedrijfsnaam, '[^a-zA-Z]', '', 'g'), 4));
  if coalesce(v_prefix, '') = '' then
    v_prefix := 'OFF';
  end if;

  -- 1) tenant_settings (BTW/betaaltermijn/radius e.d. nemen hun kolom-defaults uit 051/057).
  insert into public.tenant_settings (
    id, bedrijfsnaam, chatbot_naam,
    offerte_nummer_prefix, offerte_nummer_jaar, offerte_nummer_teller
  ) values (
    v_tenant, p_bedrijfsnaam, p_chatbot_naam,
    v_prefix, extract(year from now())::int, 0
  );

  -- 2) Owner koppelen + activeren.
  update public.dashboard_user_profiles
     set tenant_id     = v_tenant,
         is_owner      = true,
         platform_role = 'tenant',
         tenant_status = 'approved'
   where user_id = p_owner_user_id;
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    raise exception 'owner-profiel koppelen faalde (% rijen geraakt) voor %', v_rows, p_owner_user_id;
  end if;

  -- 3a) notification_preferences: 32 rijen (in_app standaard AAN, rest UIT), per tenant.
  insert into public.notification_preferences (tenant_id, event_type, kanaal, enabled)
  select v_tenant, e.evt::public.notification_event_type, k.kn::public.notification_kanaal, (k.kn = 'in_app')
  from (values
    ('nieuwe_lead'),
    ('owner_review_nodig'),
    ('klant_vraagt_korting'),
    ('offerte_goedgekeurd'),
    ('offerte_afgewezen'),
    ('afspraak_ingepland'),
    ('nieuwe_review'),
    ('dagelijkse_samenvatting')
  ) as e(evt)
  cross join (values ('in_app'), ('email'), ('push'), ('whatsapp')) as k(kn)
  on conflict (tenant_id, event_type, kanaal) do nothing;

  -- 3b) kostprijzen_per_dienst: 8 categorie-defaults (RULE_KEYS die marge-calc.ts verwacht), per tenant.
  insert into public.kostprijzen_per_dienst (tenant_id, rule_key, label, kost_pct)
  values
    (v_tenant, 'reiniging_straatwerk',     'Reiniging straatwerk',       42),
    (v_tenant, 'arbeid_invegen',           'Voegen invegen (arbeid)',    38),
    (v_tenant, 'voegzand',                 'Voegzand (materiaal)',       55),
    (v_tenant, 'beschermlaag_impregneren', 'Beschermlaag impregneren',   30),
    (v_tenant, 'plantenafscherming_folie', 'Plantenafscherming folie',   35),
    (v_tenant, 'reiskosten',               'Reiskosten',                 18),
    (v_tenant, 'onderhoud_abonnement',     'Onderhoud / abonnement',     35),
    (v_tenant, 'overig_handmatig',         'Overig / handmatige regels', 38)
  on conflict (tenant_id, rule_key) do nothing;

  -- 4) pricing_rules / service_offerings / tags: bewust leeg (neutrale seed, sectie 11 beslispunt 6).
  return v_tenant;
end;
$$;

comment on function public.provision_tenant(text, text, uuid) is
  'Service-role/superadmin-only: maakt een nieuwe tenant (tenant_settings + owner-koppeling + 32 notif-prefs + 8 kostprijzen). Prijzen/diensten/tags leeg = neutrale seed (sectie 11).';

revoke execute on function public.provision_tenant(text, text, uuid) from anon, authenticated, public;

