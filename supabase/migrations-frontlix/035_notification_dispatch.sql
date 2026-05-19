-- 035_notification_dispatch.sql
-- =================================================
-- Dispatch-laag: zodra een notification-rij wordt aangemaakt, vuren we
-- per pref-aanstaand kanaal (behalve in_app — die ís de notification-rij)
-- een HTTP-POST naar onze delivery-endpoint.
--
-- pg_net wordt gebruikt voor de outbound call: async, non-blocking, met
-- ingebouwde retry. Standaard actief in Supabase Cloud.
--
-- Auth tussen DB en API: shared secret via env-var NOTIFICATION_WEBHOOK_SECRET.
-- Die env-var moet zowel:
--   - op de VPS staan (.env.local) zodat de Next.js route 'm kan checken
--   - in Supabase staan via vault.secrets (zodat de trigger 'm kan lezen)
--
-- Latere fases (push/whatsapp) hoeven deze trigger NIET aan te passen —
-- ze worden vanzelf opgepakt zodra hun pref op true gezet wordt + de
-- delivery-endpoint hun kanaal implementeert.

-- ─── 1) Zorg dat pg_net actief is ─────────────────────────────
-- Op Supabase Cloud is dit al actief, maar veilig om idempotent te zetten.
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ─── 2) Helper: stuur één delivery-POST ──────────────────────
-- Roept de Next.js endpoint aan. URL + secret via vault (settings, hieronder).
-- Geeft pg_net-request-id terug; relevant als we later willen tracken
-- welke deliveries faalden.
CREATE OR REPLACE FUNCTION dispatch_notification_delivery(
  p_notification_id uuid,
  p_kanaal          notification_kanaal
) RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, net
AS $$
DECLARE
  v_url    text;
  v_secret text;
  v_req_id bigint;
BEGIN
  -- URL en secret komen uit pg_settings die buiten deze migratie gezet
  -- moeten zijn. Default URL is productie; voor dev kun je 'm met
  -- ALTER DATABASE ... SET overschrijven.
  v_url    := current_setting('app.notification_delivery_url',  true);
  v_secret := current_setting('app.notification_webhook_secret', true);

  IF v_url IS NULL OR v_secret IS NULL THEN
    -- Niet hard-falen — log en stop. Voorkomt dat een ontbrekende env
    -- de hele lead-INSERT laat falen.
    RAISE WARNING 'dispatch_notification_delivery: app.notification_delivery_url of app.notification_webhook_secret niet gezet — bericht niet verzonden';
    RETURN NULL;
  END IF;

  SELECT net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-notification-secret', v_secret
    ),
    body := jsonb_build_object(
      'notificationId', p_notification_id::text,
      'kanaal', p_kanaal::text
    )
  ) INTO v_req_id;

  RETURN v_req_id;
END;
$$;

-- ─── 3) Trigger: bij INSERT op notifications dispatchen ───────
-- Voor elk kanaal waarvoor de tenant-pref op true staat (behalve in_app)
-- en dat kanaal niet al via de in-app-feed wordt afgehandeld.
CREATE OR REPLACE FUNCTION trigger_notification_dispatch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kanaal notification_kanaal;
BEGIN
  -- Loop over alle aan-staande pref-kanalen voor dit event-type, behalve
  -- in_app (die wordt al gerepresenteerd door de notification-rij zelf).
  FOR v_kanaal IN
    SELECT kanaal FROM notification_preferences
    WHERE event_type = NEW.event_type
      AND enabled = true
      AND kanaal <> 'in_app'
  LOOP
    PERFORM dispatch_notification_delivery(NEW.id, v_kanaal);
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notification_dispatch_trigger ON notifications;
CREATE TRIGGER notification_dispatch_trigger
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION trigger_notification_dispatch();

-- ─── 4) Setup-instructies voor de eigenaar ────────────────────
-- Na het draaien van deze migratie moeten deze TWEE settings worden
-- aangezet in Supabase Studio (SQL Editor):
--
--   ALTER DATABASE postgres SET app.notification_delivery_url
--     = 'https://app.frontlix.com/api/dashboard/notifications/deliver';
--
--   ALTER DATABASE postgres SET app.notification_webhook_secret
--     = '<genereer-een-lange-random-string>';
--
-- Dezelfde random string moet als env-var NOTIFICATION_WEBHOOK_SECRET op
-- de VPS in .env.local staan. Daarna PM2 restart frontlix.
--
-- Verifieer met:
--   SELECT current_setting('app.notification_delivery_url',  true);
--   SELECT current_setting('app.notification_webhook_secret', true);
