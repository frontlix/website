-- 069_tenant_id_verificatie_gate.sql
-- NOG NIET TOEGEPAST op live. Eerst testen op een kopie.
-- Multitenant-fundament (Project 1, fase 1).
--
-- Laatste vangnet-sweep + verplichte verificatie-gate. Zet eventuele resterende NULL terug op SS voor
-- alle tabellen die een SS-default horen te hebben, en FAAL hard (raise exception) als er daarna nog
-- NULL is. error_logs en notifications zijn UITGEZONDERD (NULL = global/superadmin-scope).
-- Pas door naar fase 5 (070+) bij een groene gate.
--
-- Rollback: niet van toepassing (idempotente sweep).

do $$
declare
  t text;
  v_null bigint;
  v_tables text[] := array[
    'leads','pricing_rules','service_offerings','tags','notification_preferences',
    'kostprijzen_per_dienst','offerte_concepten','template_aanvragen','external_calendar_events',
    'offertes','berichten','fotos','prijsregels','lead_tags','lead_notes',
    'lead_status_history','pending_delivery_checks'
  ];
begin
  -- Vangnet-sweep
  foreach t in array v_tables loop
    execute format('update public.%I set tenant_id = ''00000000-0000-0000-0000-000000000001'' where tenant_id is null', t);
  end loop;

  -- Gate: faal bij resterende NULL
  foreach t in array v_tables loop
    execute format('select count(*) from public.%I where tenant_id is null', t) into v_null;
    if v_null > 0 then
      raise exception 'GATE FAALT: % rij(en) met tenant_id IS NULL in public.%', v_null, t;
    end if;
  end loop;

  raise notice 'GATE OK: alle SS-default-tabellen hebben tenant_id gevuld.';
end $$;
