-- 039_template_notification_events.sql
-- ============================================
-- Voegt twee nieuwe notification_event_type-waardes toe voor de
-- template-aanvragen-flow:
--
--   template_goedgekeurd  → Frontlix-support klikt "Goedkeuren" in Slack
--   template_afgewezen    → Frontlix-support klikt "Afkeuren" in Slack
--
-- Bell in het dashboard piept dan voor de owner zodra Frontlix iets
-- doet met hun aanvraag. Notitie-only-updates (geen status-change)
-- triggeren geen bell — anders te veel ruis.
--
-- IDEMPOTENT: `ALTER TYPE ... ADD VALUE IF NOT EXISTS` is no-op bij
-- her-uitvoeren. INSERT met ON CONFLICT idem.

ALTER TYPE notification_event_type ADD VALUE IF NOT EXISTS 'template_goedgekeurd';
ALTER TYPE notification_event_type ADD VALUE IF NOT EXISTS 'template_afgewezen';

-- Seed default preferences: in_app ON, andere kanalen OFF. Owner kan
-- 'm in /instellingen?section=notificaties later naar wens aanpassen.
INSERT INTO notification_preferences (event_type, kanaal, enabled)
SELECT
  e.evt::notification_event_type,
  k.kn::notification_kanaal,
  (k.kn = 'in_app')
FROM (
  VALUES
    ('template_goedgekeurd'),
    ('template_afgewezen')
) AS e(evt)
CROSS JOIN (
  VALUES ('in_app'), ('email'), ('push'), ('whatsapp')
) AS k(kn)
ON CONFLICT (event_type, kanaal) DO NOTHING;
