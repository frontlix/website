-- Additive — adds appointment metadata columns to branche_settings.
-- Run AFTER migrations 001 + 002. Safe to re-run (IF NOT EXISTS).
--
-- These are populated by scripts/migrate_config_to_db.py from clients/<id>/config.json.
-- All nullable with safe defaults so CONFIG_SOURCE=db loaders don't trip on legacy rows.

ALTER TABLE branche_settings
  ADD COLUMN IF NOT EXISTS appointment_label TEXT NOT NULL DEFAULT 'afspraak';

ALTER TABLE branche_settings
  ADD COLUMN IF NOT EXISTS appointment_label_short TEXT NOT NULL DEFAULT 'afspraak';

ALTER TABLE branche_settings
  ADD COLUMN IF NOT EXISTS appointment_duration_min INT NOT NULL DEFAULT 60;

ALTER TABLE branche_settings
  ADD COLUMN IF NOT EXISTS appointment_purpose TEXT NOT NULL DEFAULT '';
