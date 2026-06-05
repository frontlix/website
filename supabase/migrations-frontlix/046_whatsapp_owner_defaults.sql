-- 046_whatsapp_owner_defaults.sql
-- ============================================
-- Zet WhatsApp default AAN voor de 5 events waar de assistent een
-- owner-WhatsApp voor stuurt. De gebruiker kan ze daarna uitzetten via
-- /instellingen?section=notificaties. De overige WhatsApp-cellen blijven
-- "Binnenkort"/disabled in de UI.
--
-- IDEMPOTENT: UPSERT op de primary key (event_type, kanaal), zodat dit ook
-- werkt wanneer een rij nog ontbreekt en her-uitvoeren veilig is.

INSERT INTO notification_preferences (event_type, kanaal, enabled)
VALUES
  ('owner_review_nodig',   'whatsapp', true),
  ('klant_vraagt_korting', 'whatsapp', true),
  ('offerte_goedgekeurd',  'whatsapp', true),
  ('offerte_afgewezen',    'whatsapp', true),
  ('afspraak_ingepland',   'whatsapp', true)
ON CONFLICT (event_type, kanaal) DO UPDATE SET enabled = EXCLUDED.enabled;
