-- 037_dispatch_config_table.sql
-- =================================================
-- FIX voor migratie 035: Supabase Cloud staat geen `ALTER DATABASE SET
-- app.*` toe (superuser-only), dus de pg_settings-aanpak werkt niet. We
-- vervangen 'm door een eigen `app_config` single-row-key-value-tabel
-- waar de helper-function uit leest.
--
-- Idempotent — drop + re-create van function/trigger zodat 035 deels-
-- of geheel-uitgevoerd mag zijn. Geen DROP TABLE op pg_net (mocht 035
-- die hebben gecreëerd).

-- ─── 1) app_config: globale key/value-store ──────────────────
CREATE TABLE IF NOT EXISTS app_config (
  key           text PRIMARY KEY,
  value         text NOT NULL,
  bijgewerkt_op timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE app_config IS
  'Globale config-pairs (single-tenant). Vervangt pg_settings die Supabase Cloud niet toestaat.';

-- RLS aan, geen policies = alleen service-role mag lezen/schrijven.
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- ─── 2) pg_net (idempotent, mocht 035 niet gerund zijn) ──────
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ─── 3) Helper-function: nu uit app_config ipv current_setting ──
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
  SELECT value INTO v_url    FROM app_config WHERE key = 'notification_delivery_url';
  SELECT value INTO v_secret FROM app_config WHERE key = 'notification_webhook_secret';

  IF v_url IS NULL OR v_secret IS NULL THEN
    -- Niet hard-falen — log en stop. Zo blokkeert ontbrekende config
    -- niet de hele INSERT op notifications/leads.
    RAISE WARNING 'dispatch_notification_delivery: app_config mist notification_delivery_url of notification_webhook_secret — bericht niet verzonden';
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

-- ─── 4) Trigger-function (idempotent) ────────────────────────
CREATE OR REPLACE FUNCTION trigger_notification_dispatch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kanaal notification_kanaal;
BEGIN
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

-- ─── 5) Trigger op notifications (idempotent) ────────────────
DROP TRIGGER IF EXISTS notification_dispatch_trigger ON notifications;
CREATE TRIGGER notification_dispatch_trigger
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION trigger_notification_dispatch();
