-- 036_daily_digest_tracking.sql
-- =================================================
-- Trackingvoor de "Dagelijkse samenvatting" cron: wanneer is de laatste
-- digest succesvol verstuurd? Zonder deze kolom zou een cron-call die
-- meerdere keren per minuut binnenkomt dubbele digests genereren.
--
-- Type DATE (geen TIMESTAMPTZ) omdat we tijdgranulariteit "per dag" willen
-- — vergelijking is `last_run_op < current_date_amsterdam`.

ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS daily_digest_laatste_run_op date;

COMMENT ON COLUMN tenant_settings.daily_digest_laatste_run_op IS
  'Laatste datum (Europe/Amsterdam) dat de dagelijkse samenvatting succesvol is verstuurd. Gebruikt door /api/cron/daily-digest om dubbele runs te voorkomen.';
