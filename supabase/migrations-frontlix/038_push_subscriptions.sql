-- 038_push_subscriptions.sql
-- =================================================
-- Push notifications — per-user subscriptions opslag.
--
-- Elke gebruiker kan meerdere subscriptions hebben (telefoon + desktop +
-- tablet — één per browser-installatie). Endpoint is uniek per subscription
-- en wordt door de browser-vendor (Apple/Google/Mozilla) uitgegeven.
--
-- Bij delete: subscription wordt direct verwijderd door /api/.../push/
-- unsubscribe of door /api/.../deliver (op HTTP 410 Gone — subscription
-- is door de browser ingetrokken).

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint            text NOT NULL UNIQUE,
  p256dh              text NOT NULL,
  auth                text NOT NULL,
  user_agent          text,
  aangemaakt_op       timestamptz NOT NULL DEFAULT now(),
  laatst_gebruikt_op  timestamptz
);

COMMENT ON TABLE push_subscriptions IS
  'Web Push subscriptions per user; één rij per browser-installatie.';

CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx
  ON push_subscriptions (user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- User mag z'n eigen subscriptions zien + deleten.
DROP POLICY IF EXISTS "users zien eigen push subs" ON push_subscriptions;
CREATE POLICY "users zien eigen push subs"
  ON push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users deleten eigen push subs" ON push_subscriptions;
CREATE POLICY "users deleten eigen push subs"
  ON push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- Insert + update via service-role (subscribe-endpoint gebruikt admin client).
-- Geen INSERT/UPDATE policy → dashboard-credentials kunnen niet direct schrijven.
