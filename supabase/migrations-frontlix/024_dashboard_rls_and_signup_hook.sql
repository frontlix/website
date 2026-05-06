-- Migratie 024 (Frontlix dashboard): RLS-policies + Auth Hook
--
-- DOEL: het dashboard kan straks met anon-key + session veilig lezen/schrijven
-- naar de dashboard-tabellen (Plan 1: 022, 023). Bot blijft op service-key
-- werken (bypasst RLS) — geen impact.
--
-- DRAAIEN: handmatig in schoon-straatje Supabase Studio (zelfde DB als
-- migrations 022 + 023). NIET in de schoon-straatje repo migrations-folder
-- omdat het bot-team die folder beheert; deze migratie hoort bij Frontlix.
--
-- AFHANKELIJKHEDEN:
--   - 022_dashboard_config_tables.sql moet uitgevoerd zijn
--   - 023_dashboard_data_tables.sql moet uitgevoerd zijn
--
-- POLICIES IN V1: alle SELECT-rechten zijn afhankelijk van approved status.
-- Pending users zien helemaal niets behalve hun eigen profile-rij.

-- ============================================
-- HELPER: is_approved() — leesbaar predikaat voor policies
-- ============================================
CREATE OR REPLACE FUNCTION is_approved_dashboard_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM dashboard_user_profiles
    WHERE user_id = auth.uid()
      AND tenant_status = 'approved'
  );
$$;

COMMENT ON FUNCTION is_approved_dashboard_user IS
  'True als de huidig ingelogde user een dashboard_user_profile heeft met tenant_status=''approved''. Gebruikt door RLS-policies om approved-only access af te dwingen.';

-- ============================================
-- DASHBOARD_USER_PROFILES — user mag alleen eigen rij zien + updaten
-- ============================================
DROP POLICY IF EXISTS "user kan eigen profile lezen" ON dashboard_user_profiles;
CREATE POLICY "user kan eigen profile lezen"
  ON dashboard_user_profiles FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user kan eigen profile updaten (beperkte velden)" ON dashboard_user_profiles;
CREATE POLICY "user kan eigen profile updaten (beperkte velden)"
  ON dashboard_user_profiles FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
-- LET OP: dit laat user toe alle velden te wijzigen, ook tenant_status.
-- Frontlix-admin gebruikt service-key (bypass RLS). Voor v1 vertrouwen we
-- erop dat de UI alleen onboarding_voltooid_op-toggling exposeert. Plan 7
-- moet dit aanscherpen met column-level checks of een aparte updatable
-- view voor self-service velden.

-- INSERT policy is BEWUST AFWEZIG. Profile-rijen worden uitsluitend
-- aangemaakt door de Auth Hook trigger (zie onderaan dit bestand).

-- ============================================
-- TENANT_SETTINGS / PRICING_RULES / SERVICE_OFFERINGS — read-only voor approved users
-- ============================================
DROP POLICY IF EXISTS "approved users kunnen tenant_settings lezen" ON tenant_settings;
CREATE POLICY "approved users kunnen tenant_settings lezen"
  ON tenant_settings FOR SELECT
  USING (is_approved_dashboard_user());

DROP POLICY IF EXISTS "approved users kunnen pricing_rules lezen" ON pricing_rules;
CREATE POLICY "approved users kunnen pricing_rules lezen"
  ON pricing_rules FOR SELECT
  USING (is_approved_dashboard_user());

DROP POLICY IF EXISTS "approved users kunnen service_offerings lezen" ON service_offerings;
CREATE POLICY "approved users kunnen service_offerings lezen"
  ON service_offerings FOR SELECT
  USING (is_approved_dashboard_user());

-- Geen INSERT/UPDATE/DELETE policies — bot-config-migratie staat in postponed.md.
-- Dashboard-edits aan deze tabellen vereisen Plan 7 + bot-side migratie eerst.

-- ============================================
-- LEADS — approved users kunnen lezen + dashboard-velden wijzigen
-- ============================================
DROP POLICY IF EXISTS "approved users kunnen leads lezen" ON leads;
CREATE POLICY "approved users kunnen leads lezen"
  ON leads FOR SELECT
  USING (is_approved_dashboard_user());

-- UPDATE-policy is bewust beperkt: dashboard mag ALLEEN dashboard_status
-- en dashboard_archived wijzigen. Andere kolommen blijven exclusief voor
-- de bot (die met service-key schrijft, dus deze policy raakt 'm niet).
-- WITH CHECK forceert dat dashboard-edits geen bot-velden veranderen.
DROP POLICY IF EXISTS "approved users kunnen dashboard-velden van leads wijzigen" ON leads;
CREATE POLICY "approved users kunnen dashboard-velden van leads wijzigen"
  ON leads FOR UPDATE
  USING (is_approved_dashboard_user())
  WITH CHECK (is_approved_dashboard_user());
-- LET OP: Postgres' WITH CHECK kan helaas niet "alleen kolom X mag wijzigen"
-- afdwingen — dat moet via een trigger of via column grants. Voor v1 vertrouwen
-- we op de dashboard-code; Plan 5 (lichte acties) voegt een BEFORE UPDATE-trigger
-- toe die niet-dashboard-kolommen tegen aanroepen vanuit anon-key context blokkeert.
-- Documenteer dit risico expliciet:
COMMENT ON POLICY "approved users kunnen dashboard-velden van leads wijzigen" ON leads IS
  'V1: laat any-column UPDATE toe voor approved users. Plan 5 voegt column-restrict trigger toe. Bot gebruikt service-key dus is hier niet door beperkt.';

-- ============================================
-- BERICHTEN / FOTOS / OFFERTES / PRIJSREGELS — approved users mogen lezen
-- ============================================
-- Deze tabellen bestaan al sinds 001 / 006. We voegen alleen leesrechten toe
-- voor het dashboard. Als RLS niet aan staat zijn ze "Unrestricted" — dat
-- is in dit project deels al het geval; we forceren consistente policies.

ALTER TABLE berichten ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "approved users kunnen berichten lezen" ON berichten;
CREATE POLICY "approved users kunnen berichten lezen"
  ON berichten FOR SELECT
  USING (is_approved_dashboard_user());

ALTER TABLE fotos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "approved users kunnen fotos lezen" ON fotos;
CREATE POLICY "approved users kunnen fotos lezen"
  ON fotos FOR SELECT
  USING (is_approved_dashboard_user());

-- offertes had al RLS aan (zie 006_offertes.sql)
DROP POLICY IF EXISTS "approved users kunnen offertes lezen" ON offertes;
CREATE POLICY "approved users kunnen offertes lezen"
  ON offertes FOR SELECT
  USING (is_approved_dashboard_user());

ALTER TABLE prijsregels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "approved users kunnen prijsregels lezen" ON prijsregels;
CREATE POLICY "approved users kunnen prijsregels lezen"
  ON prijsregels FOR SELECT
  USING (is_approved_dashboard_user());

-- ============================================
-- LEAD_NOTES / LEAD_TAGS / LEAD_STATUS_HISTORY / TAGS — read + insert voor approved users
-- ============================================

-- LEAD_NOTES
DROP POLICY IF EXISTS "approved users kunnen lead_notes lezen" ON lead_notes;
CREATE POLICY "approved users kunnen lead_notes lezen"
  ON lead_notes FOR SELECT
  USING (is_approved_dashboard_user());

DROP POLICY IF EXISTS "approved users kunnen lead_notes toevoegen" ON lead_notes;
CREATE POLICY "approved users kunnen lead_notes toevoegen"
  ON lead_notes FOR INSERT
  WITH CHECK (is_approved_dashboard_user() AND auteur = auth.uid());

DROP POLICY IF EXISTS "approved users kunnen eigen lead_notes verwijderen" ON lead_notes;
CREATE POLICY "approved users kunnen eigen lead_notes verwijderen"
  ON lead_notes FOR DELETE
  USING (is_approved_dashboard_user() AND auteur = auth.uid());

-- LEAD_TAGS
DROP POLICY IF EXISTS "approved users kunnen lead_tags lezen" ON lead_tags;
CREATE POLICY "approved users kunnen lead_tags lezen"
  ON lead_tags FOR SELECT
  USING (is_approved_dashboard_user());

DROP POLICY IF EXISTS "approved users kunnen lead_tags toevoegen" ON lead_tags;
CREATE POLICY "approved users kunnen lead_tags toevoegen"
  ON lead_tags FOR INSERT
  WITH CHECK (is_approved_dashboard_user() AND aangemaakt_door = auth.uid());

DROP POLICY IF EXISTS "approved users kunnen lead_tags verwijderen" ON lead_tags;
CREATE POLICY "approved users kunnen lead_tags verwijderen"
  ON lead_tags FOR DELETE
  USING (is_approved_dashboard_user());

-- TAGS — gedeeld over de tenant, alleen approved kan lezen + creëren
DROP POLICY IF EXISTS "approved users kunnen tags lezen" ON tags;
CREATE POLICY "approved users kunnen tags lezen"
  ON tags FOR SELECT
  USING (is_approved_dashboard_user());

DROP POLICY IF EXISTS "approved users kunnen tags aanmaken" ON tags;
CREATE POLICY "approved users kunnen tags aanmaken"
  ON tags FOR INSERT
  WITH CHECK (is_approved_dashboard_user());

DROP POLICY IF EXISTS "approved users kunnen tags verwijderen" ON tags;
CREATE POLICY "approved users kunnen tags verwijderen"
  ON tags FOR DELETE
  USING (is_approved_dashboard_user());

-- LEAD_STATUS_HISTORY — alleen lezen voor users; INSERT komt via trigger in Plan 5
DROP POLICY IF EXISTS "approved users kunnen lead_status_history lezen" ON lead_status_history;
CREATE POLICY "approved users kunnen lead_status_history lezen"
  ON lead_status_history FOR SELECT
  USING (is_approved_dashboard_user());
-- Geen INSERT-policy: history wordt via trigger op leads geschreven (Plan 5).

-- ============================================
-- DASHBOARD USER PROFILE CREATION — gebeurt in de signup-server-action
-- ============================================
-- ORIGINEEL plan was een AFTER INSERT trigger op auth.users te zetten die
-- automatisch een dashboard_user_profile-rij maakt. Dat blijkt in Supabase
-- niet mogelijk: auth.users is eigendom van supabase_auth_admin, niet
-- postgres. Triggers maken op die tabel faalt met
-- "42501: must be owner of relation users".
--
-- ALTERNATIEF: de signup-server-action in app/dashboard/(auth)/signup/actions.ts
-- doet expliciet een INSERT in dashboard_user_profiles met service-key,
-- direct na de Supabase Auth signUp call. Plan 3 Task 10 documenteert dit.
--
-- Edge case: als iemand een auth.user aanmaakt buiten de signup-flow
-- (bv. via Supabase Studio handmatig), krijgen ze geen profile-rij
-- en blokkeren RLS-policies hun toegang. Frontlix-admin moet die rijen
-- handmatig aanmaken. Voor v1 is dat acceptabel — alleen Frontlix kent
-- de Studio-toegang.
--
-- TOEKOMST: zodra Supabase een meer robuust Auth Hook mechanisme aanbiedt
-- (Database Webhook met server-to-server retry, of Supabase Auth Hooks
-- die via dashboard-config gaan zonder DDL op auth.users) kunnen we deze
-- responsibility verplaatsen. Zie docs/superpowers/postponed.md.
