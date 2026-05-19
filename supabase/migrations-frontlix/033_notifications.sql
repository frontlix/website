-- 033_notifications.sql
-- ============================================
-- Notificatie-systeem — Fase 1 (in-app).
--
-- Twee nieuwe tabellen:
--   1. notification_preferences — per (event_type, kanaal) of de tenant
--      het wil ontvangen. Single-tenant: één set globaal.
--   2. notifications            — de feed zelf, per user, met titel/body/
--      payload + gelezen-status.
--
-- Plus: tenant_settings krijgt `daily_digest_tijd` (HH:MM, default 08:00)
-- voor de "Dagelijkse samenvatting" event.
--
-- Latere fases (e-mail/push/whatsapp) gebruiken dezelfde preferences-tabel;
-- alleen de delivery-laag in code (lib/dashboard/notifications/notify.ts)
-- wordt uitgebreid. Hier geen schema-wijzigingen meer nodig.

-- 1) Enum types ───────────────────────────────────────────────
-- 8 event-types die de UI-toggles representeren. Volgorde matcht de
-- volgorde in de Notificaties-tab onder /instellingen.
DO $$ BEGIN
  CREATE TYPE notification_event_type AS ENUM (
    'nieuwe_lead',
    'owner_review_nodig',
    'klant_vraagt_korting',
    'offerte_goedgekeurd',
    'offerte_afgewezen',
    'afspraak_ingepland',
    'nieuwe_review',
    'dagelijkse_samenvatting'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 4 kanalen — matcht de 4 kolommen in de UI (IN-APP / E-MAIL / PUSH / WHATSAPP).
-- 'sms' bewust niet opgenomen: vervangen door 'whatsapp' (besloten 2026-05-19).
DO $$ BEGIN
  CREATE TYPE notification_kanaal AS ENUM (
    'in_app',
    'email',
    'push',
    'whatsapp'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2) notification_preferences ────────────────────────────────
-- Single-tenant: één rij per (event, kanaal). 8 × 4 = 32 rijen max.
-- Geen tenant_id veld — als multi-tenant later nodig is voegen we 'm dan
-- toe via ALTER TABLE + backfill.
CREATE TABLE IF NOT EXISTS notification_preferences (
  event_type      notification_event_type NOT NULL,
  kanaal          notification_kanaal NOT NULL,
  enabled         boolean NOT NULL DEFAULT false,
  bijgewerkt_op   timestamptz NOT NULL DEFAULT now(),
  bijgewerkt_door uuid REFERENCES auth.users(id),
  PRIMARY KEY (event_type, kanaal)
);

COMMENT ON TABLE notification_preferences IS
  'Tenant-wide aan/uit-instellingen voor notificaties. Eén rij per (event, kanaal).';

-- 3) notifications (feed) ────────────────────────────────────
-- Per user — elke owner/teamlid heeft eigen ongelezen-count. Insert
-- gebeurt server-side via service-role (notify-helper); geen INSERT-policy
-- voor dashboard-credentials.
CREATE TABLE IF NOT EXISTS notifications (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type    notification_event_type NOT NULL,
  lead_id       text REFERENCES leads(lead_id) ON DELETE CASCADE,
  titel         text NOT NULL,
  body          text NOT NULL,
  payload       jsonb NOT NULL DEFAULT '{}'::jsonb,
  aangemaakt_op timestamptz NOT NULL DEFAULT now(),
  gelezen_op    timestamptz
);

-- Hot path: "geef me alle ongelezen voor user X, nieuwste eerst".
-- NULLS FIRST zorgt dat ongelezen (gelezen_op = NULL) bovenaan staan;
-- combineert met de tweede sort-column (aangemaakt_op DESC).
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON notifications (user_id, gelezen_op NULLS FIRST, aangemaakt_op DESC);

-- Voor "toon alle notificaties voor lead X" (bv. op lead-detailpagina).
CREATE INDEX IF NOT EXISTS notifications_lead_idx
  ON notifications (lead_id) WHERE lead_id IS NOT NULL;

COMMENT ON TABLE notifications IS
  'In-app notificatie-feed. Eén rij per (user, event-instantie).';

-- 4) tenant_settings — daily digest tijd ────────────────────
-- Instelbaar via /instellingen?section=notificaties. Format HH:MM in
-- Europe/Amsterdam tijdzone. Cron job (later) leest deze waarde om te
-- bepalen wanneer de "Dagelijkse samenvatting" notificatie afgaat.
ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS daily_digest_tijd text NOT NULL DEFAULT '08:00'
    CHECK (daily_digest_tijd ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');

-- 5) RLS ────────────────────────────────────────────────────
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 5a) notification_preferences: alle approved users mogen lezen/updaten
-- (single-tenant — iedereen werkt aan dezelfde set).
DROP POLICY IF EXISTS "approved users zien prefs" ON notification_preferences;
CREATE POLICY "approved users zien prefs"
  ON notification_preferences FOR SELECT
  USING (is_approved_dashboard_user());

DROP POLICY IF EXISTS "approved users insert prefs" ON notification_preferences;
CREATE POLICY "approved users insert prefs"
  ON notification_preferences FOR INSERT
  WITH CHECK (is_approved_dashboard_user());

DROP POLICY IF EXISTS "approved users updaten prefs" ON notification_preferences;
CREATE POLICY "approved users updaten prefs"
  ON notification_preferences FOR UPDATE
  USING (is_approved_dashboard_user())
  WITH CHECK (is_approved_dashboard_user());

-- 5b) notifications: user ziet en update alleen eigen rij.
-- GEEN insert-policy — alleen service-role mag rijen aanmaken (server-side
-- notify-helper). Voorkomt dat een gecompromitteerde dashboard-sessie
-- valse notificaties kan injecten.
DROP POLICY IF EXISTS "users zien eigen notifications" ON notifications;
CREATE POLICY "users zien eigen notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users updaten eigen notifications" ON notifications;
CREATE POLICY "users updaten eigen notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6) Seed default preferences ───────────────────────────────
-- Alle 32 combinaties aanmaken; standaard ON voor in_app, OFF voor de rest.
-- Latere fases zetten zelf nieuwe defaults na release (push/whatsapp).
INSERT INTO notification_preferences (event_type, kanaal, enabled)
SELECT
  e.evt::notification_event_type,
  k.kn::notification_kanaal,
  (k.kn = 'in_app')
FROM (
  VALUES
    ('nieuwe_lead'),
    ('owner_review_nodig'),
    ('klant_vraagt_korting'),
    ('offerte_goedgekeurd'),
    ('offerte_afgewezen'),
    ('afspraak_ingepland'),
    ('nieuwe_review'),
    ('dagelijkse_samenvatting')
) AS e(evt)
CROSS JOIN (
  VALUES ('in_app'), ('email'), ('push'), ('whatsapp')
) AS k(kn)
ON CONFLICT (event_type, kanaal) DO NOTHING;
