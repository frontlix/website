-- 076_singletons_per_tenant.sql
-- NOG NIET TOEGEPAST op live. Eerst testen op een kopie.
-- Multitenant-fundament (Project 1, fase D).
--
-- De doorlopende offertenummer-teller leeft op tenant_settings (offerte_nummer_teller/_jaar/_prefix,
-- aangemaakt in 051). De oude next_offerte_nummer() uit 051 pakt "limit 1" de eerste tenant_settings-
-- rij = tenant-blind en dus fout zodra er >1 tenant is. Deze migratie vervangt 'm door een tenant-
-- bewuste overload next_offerte_nummer(p_tenant_id uuid) die:
--   * weigert wanneer de aanroeper niet superadmin is en p_tenant_id != de eigen auth_tenant_id();
--   * de teller race-veilig ophoogt met SELECT ... FOR UPDATE op de tenant_settings-rij van DIE tenant;
--   * het volgnummer reset bij jaarwissel.
-- De helpers is_superadmin()/auth_tenant_id() bestaan vanaf 074 (deze migratie draait in fase D, na 074).
-- notification_preferences-PK is samengesteld vanaf 072; provisioning (077) seedt de 32 rijen per tenant.
-- app_config/notification_config blijven bewust globaal.
--
-- Rollback (zet de tenant-blinde singleton-versie uit 051 terug; alleen zinvol binnen het single-tenant-venster):
--   drop function if exists public.next_offerte_nummer(uuid);
--   create or replace function public.next_offerte_nummer() returns text language plpgsql as $$
--   declare v_prefix text; v_jaar int; v_teller int; v_huidig int := extract(year from now())::int; v_nieuw int;
--   begin
--     select coalesce(offerte_nummer_prefix,'OFF'), coalesce(offerte_nummer_jaar,v_huidig), coalesce(offerte_nummer_teller,0)
--       into v_prefix, v_jaar, v_teller from public.tenant_settings limit 1 for update;
--     if not found then return 'OFF-' || v_huidig::text || '-001'; end if;
--     if v_jaar <> v_huidig then v_jaar := v_huidig; v_teller := 0; end if;
--     v_nieuw := v_teller + 1;
--     update public.tenant_settings set offerte_nummer_teller = v_nieuw, offerte_nummer_jaar = v_jaar;
--     return v_prefix || '-' || v_jaar::text || '-' || lpad(v_nieuw::text, 3, '0');
--   end $$;

-- ── Tenant-bewuste teller ────────────────────────────────────────────────────
-- LET OP: in een multi-tenant DB nummert die op de verkeerde tenant.
create or replace function public.next_offerte_nummer(p_tenant_id uuid)
returns text
language plpgsql
as $$
declare
  v_teller int;
  v_jaar   int;
  v_prefix text;
  v_huidig int := extract(year from now())::int;
begin
  -- Tenant-isolatie: alleen de eigen tenant of een superadmin mag nummeren.
  if not ((select public.is_superadmin()) or p_tenant_id = (select public.auth_tenant_id())) then
    raise exception 'tenant mismatch';
  end if;

  select offerte_nummer_teller, offerte_nummer_jaar, offerte_nummer_prefix
    into v_teller, v_jaar, v_prefix
  from public.tenant_settings
  where id = p_tenant_id
  for update;

  if not found then
    raise exception 'tenant_settings-rij ontbreekt voor tenant %', p_tenant_id;
  end if;

  v_prefix := coalesce(v_prefix, 'OFF');
  v_teller := coalesce(v_teller, 0);

  -- Jaarwissel (of eerste gebruik): volgnummer opnieuw vanaf 1.
  if v_jaar is distinct from v_huidig then
    v_teller := 0;
    v_jaar   := v_huidig;
  end if;

  v_teller := v_teller + 1;

  update public.tenant_settings
     set offerte_nummer_teller = v_teller,
         offerte_nummer_jaar   = v_jaar
   where id = p_tenant_id;

  -- PREFIX-JAAR-### (3-cijferig volgnummer, groeit vanzelf door bij >999).
  return v_prefix || '-' || v_jaar::text || '-' || lpad(v_teller::text, 3, '0');
end;
$$;

comment on function public.next_offerte_nummer(uuid) is
  'Tenant-bewuste, race-veilige offertenummer-teller (PREFIX-JAAR-###). Weigert cross-tenant aanroepen tenzij superadmin.';

-- Anon mag nooit nummeren; authenticated (dashboard, tenant-gecheckt in de functie) en service_role wel.
revoke execute on function public.next_offerte_nummer(uuid) from anon;

-- Verwijder de tenant-blinde singleton-versie uit 051: in een multi-tenant DB nummert die op de
-- verkeerde tenant. Vereist dat app EN bot al de tenant-arg-versie aanroepen (fase C draait vóór fase D).
drop function if exists public.next_offerte_nummer();

