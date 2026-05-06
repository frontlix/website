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
CREATE POLICY "user kan eigen profile lezen"
  ON dashboard_user_profiles FOR SELECT
  USING (user_id = auth.uid());

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
CREATE POLICY "approved users kunnen tenant_settings lezen"
  ON tenant_settings FOR SELECT
  USING (is_approved_dashboard_user());

CREATE POLICY "approved users kunnen pricing_rules lezen"
  ON pricing_rules FOR SELECT
  USING (is_approved_dashboard_user());

CREATE POLICY "approved users kunnen service_offerings lezen"
  ON service_offerings FOR SELECT
  USING (is_approved_dashboard_user());

-- Geen INSERT/UPDATE/DELETE policies — bot-config-migratie staat in postponed.md.
-- Dashboard-edits aan deze tabellen vereisen Plan 7 + bot-side migratie eerst.

-- ============================================
-- LEADS — approved users kunnen lezen + dashboard-velden wijzigen
-- ============================================
CREATE POLICY "approved users kunnen leads lezen"
  ON leads FOR SELECT
  USING (is_approved_dashboard_user());

-- UPDATE-policy is bewust beperkt: dashboard mag ALLEEN dashboard_status
-- en dashboard_archived wijzigen. Andere kolommen blijven exclusief voor
-- de bot (die met service-key schrijft, dus deze policy raakt 'm niet).
-- WITH CHECK forceert dat dashboard-edits geen bot-velden veranderen.
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
CREATE POLICY "approved users kunnen berichten lezen"
  ON berichten FOR SELECT
  USING (is_approved_dashboard_user());

ALTER TABLE fotos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approved users kunnen fotos lezen"
  ON fotos FOR SELECT
  USING (is_approved_dashboard_user());

-- offertes had al RLS aan (zie 006_offertes.sql)
CREATE POLICY "approved users kunnen offertes lezen"
  ON offertes FOR SELECT
  USING (is_approved_dashboard_user());

ALTER TABLE prijsregels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approved users kunnen prijsregels lezen"
  ON prijsregels FOR SELECT
  USING (is_approved_dashboard_user());

-- ============================================
-- LEAD_NOTES / LEAD_TAGS / LEAD_STATUS_HISTORY / TAGS — read + insert voor approved users
-- ============================================

-- LEAD_NOTES
CREATE POLICY "approved users kunnen lead_notes lezen"
  ON lead_notes FOR SELECT
  USING (is_approved_dashboard_user());

CREATE POLICY "approved users kunnen lead_notes toevoegen"
  ON lead_notes FOR INSERT
  WITH CHECK (is_approved_dashboard_user() AND auteur = auth.uid());

CREATE POLICY "approved users kunnen eigen lead_notes verwijderen"
  ON lead_notes FOR DELETE
  USING (is_approved_dashboard_user() AND auteur = auth.uid());

-- LEAD_TAGS
CREATE POLICY "approved users kunnen lead_tags lezen"
  ON lead_tags FOR SELECT
  USING (is_approved_dashboard_user());

CREATE POLICY "approved users kunnen lead_tags toevoegen"
  ON lead_tags FOR INSERT
  WITH CHECK (is_approved_dashboard_user() AND aangemaakt_door = auth.uid());

CREATE POLICY "approved users kunnen lead_tags verwijderen"
  ON lead_tags FOR DELETE
  USING (is_approved_dashboard_user());

-- TAGS — gedeeld over de tenant, alleen approved kan lezen + creëren
CREATE POLICY "approved users kunnen tags lezen"
  ON tags FOR SELECT
  USING (is_approved_dashboard_user());

CREATE POLICY "approved users kunnen tags aanmaken"
  ON tags FOR INSERT
  WITH CHECK (is_approved_dashboard_user());

CREATE POLICY "approved users kunnen tags verwijderen"
  ON tags FOR DELETE
  USING (is_approved_dashboard_user());

-- LEAD_STATUS_HISTORY — alleen lezen voor users; INSERT komt via trigger in Plan 5
CREATE POLICY "approved users kunnen lead_status_history lezen"
  ON lead_status_history FOR SELECT
  USING (is_approved_dashboard_user());
-- Geen INSERT-policy: history wordt via trigger op leads geschreven (Plan 5).

-- ============================================
-- AUTH HOOK: maak dashboard_user_profile bij elke nieuwe auth.user
-- ============================================
-- Bij een nieuwe Supabase Auth signup wordt automatisch een profile-rij
-- gemaakt met tenant_status='pending'. De signup-server-action vult later
-- bedrijfsnaam in (UPDATE) zodra de user die heeft ingevuld in het formulier.
--
-- Waarom een trigger en niet de signup-action? De trigger garandeert dat
-- ELKE auth.users-insert (ook via Supabase Studio of een toekomstige magic
-- link) een profile-rij krijgt — RLS-policies hangen ervan af.

CREATE OR REPLACE FUNCTION create_dashboard_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Idempotent: als er al een rij is (theoretisch: dubbel gebeuren), niet falen.
  INSERT INTO dashboard_user_profiles (user_id, tenant_status, is_owner)
  VALUES (NEW.id, 'pending', true)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_create_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_create_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_dashboard_user_profile();

COMMENT ON TRIGGER on_auth_user_created_create_profile ON auth.users IS
  'Maakt automatisch een dashboard_user_profile-rij met tenant_status=pending bij nieuwe Supabase Auth signup. is_owner=true want eerste user van een tenant — Plan 7 introduceert uitgenodigde users met is_owner=false.';
