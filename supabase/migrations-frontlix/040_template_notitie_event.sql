-- 040_template_notitie_event.sql
-- ============================================
-- Derde event-type voor de template-aanvragen-flow: notitie zonder
-- status-wijziging. Wordt afgevuurd wanneer Frontlix-support de
-- "Notitie toevoegen"-knop in Slack gebruikt zonder approve/reject.
--
-- LET OP: net als 039 in TWEE delen runnen — ALTER TYPE en INSERT
-- mogen niet in dezelfde transactie zitten.
--
-- IDEMPOTENT: ADD VALUE IF NOT EXISTS + ON CONFLICT.

ALTER TYPE notification_event_type ADD VALUE IF NOT EXISTS 'template_notitie';

INSERT INTO notification_preferences (event_type, kanaal, enabled)
SELECT
  e.evt::notification_event_type,
  k.kn::notification_kanaal,
  (k.kn = 'in_app')
FROM (
  VALUES ('template_notitie')
) AS e(evt)
CROSS JOIN (
  VALUES ('in_app'), ('email'), ('push'), ('whatsapp')
) AS k(kn)
ON CONFLICT (event_type, kanaal) DO NOTHING;
