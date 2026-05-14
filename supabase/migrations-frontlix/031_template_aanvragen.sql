-- 031_template_aanvragen.sql
-- ============================================
-- Voorgestelde template-wijzigingen vanuit het dashboard. De owner
-- bewerkt een template (bv. lead_intake_oprit) in /instellingen?section=opening
-- en dient een aanvraag in. De aanvraag landt:
--   1. in deze tabel (audit-trail + status-tracking)
--   2. als Slack-melding in het Frontlix-supportkanaal (server-side webhook)
--
-- Frontlix-support pakt de aanvraag op, submit naar Meta voor approval,
-- en update de status hier (forwarded → approved → applied).
--
-- RLS: approved dashboard-users mogen hun eigen aanvragen zien én aanmaken.
-- Niemand kan ze updaten/deleten via dashboard-credentials — dat doet
-- Frontlix-admin via service-role.

CREATE TABLE IF NOT EXISTS template_aanvragen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_naam text NOT NULL,
  voorgestelde_tekst text NOT NULL,
  aanvrager_user_id uuid NOT NULL REFERENCES auth.users(id),
  aanvrager_email text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'forwarded', 'approved', 'rejected', 'applied')),
  notitie text,
  aangemaakt_op timestamptz NOT NULL DEFAULT now(),
  bijgewerkt_op timestamptz
);

CREATE INDEX IF NOT EXISTS template_aanvragen_aanvrager_idx
  ON template_aanvragen (aanvrager_user_id, aangemaakt_op DESC);

ALTER TABLE template_aanvragen ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "approved users zien template_aanvragen" ON template_aanvragen;
CREATE POLICY "approved users zien template_aanvragen"
  ON template_aanvragen FOR SELECT
  USING (is_approved_dashboard_user());

DROP POLICY IF EXISTS "approved users insert template_aanvragen" ON template_aanvragen;
CREATE POLICY "approved users insert template_aanvragen"
  ON template_aanvragen FOR INSERT
  WITH CHECK (is_approved_dashboard_user() AND aanvrager_user_id = auth.uid());
