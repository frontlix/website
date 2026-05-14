-- 030_pricing_rules_update_policy.sql
-- ============================================
-- Voegt een UPDATE-policy toe voor pricing_rules. Zonder deze policy
-- blokkeert RLS de UPDATE stil (0 rijen geraakt), waardoor de Prijzen-
-- editor in /instellingen een "Prijsregel niet gevonden"-fout toont
-- terwijl de regel wél bestaat.
--
-- Patroon is identiek aan andere UPDATE-policies in 024 (leads, etc.):
-- approved dashboard-users mogen muteren. RLS regelt de gate; de server
-- action valideert de waarde (>= 0, finite number, niet-lege rule_key).
--
-- Idempotent: DROP IF EXISTS + CREATE.

DROP POLICY IF EXISTS "approved users kunnen pricing_rules updaten" ON pricing_rules;
CREATE POLICY "approved users kunnen pricing_rules updaten"
  ON pricing_rules FOR UPDATE
  USING (is_approved_dashboard_user())
  WITH CHECK (is_approved_dashboard_user());
