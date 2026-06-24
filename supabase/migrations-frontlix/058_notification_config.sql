-- 058_notification_config.sql
-- =================================================
-- Fix voor de notification-dispatch (035): die las de delivery-URL en het
-- shared secret uit current_setting('app.notification_delivery_url' / '...secret'),
-- maar die GUC's kunnen op Supabase NIET via ALTER DATABASE worden gezet
-- (permission denied, de rol is geen superuser). Gevolg: push/e-mail-delivery
-- ging stil dood (alleen de in-app bel werkte).
--
-- Oplossing: url + secret uit een config-tabel halen die via de service-role
-- gevuld kan worden. De config-rij (met het secret) wordt BUITEN deze migratie
-- gevuld (het secret hoort niet in git), zie onderaan.

-- ─── 1) Config-tabel (singleton) ─────────────────────────────
create table if not exists public.notification_config (
  id             int primary key default 1,
  delivery_url   text not null,
  webhook_secret text not null,
  updated_at     timestamptz not null default now(),
  constraint notification_config_singleton check (id = 1)
);

alter table public.notification_config enable row level security;
-- Geen policies: onbereikbaar vanuit de browser. Alleen de service-role en
-- SECURITY DEFINER-functies (zoals hieronder) lezen deze tabel.

-- ─── 2) Herschreven dispatch-helper: leest uit de config-tabel ─
create or replace function dispatch_notification_delivery(
  p_notification_id uuid,
  p_kanaal          notification_kanaal
) returns bigint
language plpgsql
security definer
set search_path = public, extensions, net
as $$
declare
  v_url    text;
  v_secret text;
  v_req_id bigint;
begin
  select delivery_url, webhook_secret into v_url, v_secret
  from public.notification_config
  where id = 1;

  if v_url is null or v_secret is null then
    raise warning 'dispatch_notification_delivery: notification_config (id=1) niet gevuld — bericht niet verzonden';
    return null;
  end if;

  select net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-notification-secret', v_secret
    ),
    body := jsonb_build_object(
      'notificationId', p_notification_id::text,
      'kanaal', p_kanaal::text
    )
  ) into v_req_id;

  return v_req_id;
end;
$$;

-- ─── 3) Config vullen (BUITEN git, via service-role) ──────────
-- Na deze migratie eenmalig draaien met het echte secret (= env-var
-- NOTIFICATION_WEBHOOK_SECRET op de VPS):
--
--   insert into public.notification_config (id, delivery_url, webhook_secret)
--   values (1, 'https://app.frontlix.com/api/dashboard/notifications/deliver', '<secret>')
--   on conflict (id) do update
--     set delivery_url = excluded.delivery_url,
--         webhook_secret = excluded.webhook_secret,
--         updated_at = now();
