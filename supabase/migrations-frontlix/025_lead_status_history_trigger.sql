-- Migratie 025 (Frontlix dashboard): auto-fill trigger voor dashboard_status changes
--
-- Logt elke wijziging van leads.dashboard_status automatisch naar
-- lead_status_history. Voorkomt dat dashboard-server-actions de history
-- expliciet hoeven te schrijven (en daarmee per ongeluk overslaan).
--
-- Schiet alleen op echte STATUS-wijzigingen — als de UI een UPDATE doet
-- maar dashboard_status niet verandert (bv. notitie toegevoegd elders),
-- gebeurt er niets.
--
-- DRAAIEN: handmatig in schoon-straatje Supabase Studio.
-- AFHANKELIJKHEDEN: 023_dashboard_data_tables.sql (lead_status_history bestaat).

CREATE OR REPLACE FUNCTION log_dashboard_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Alleen loggen bij echte wijziging. NULL → 'open' is een wijziging,
  -- 'open' → 'open' niet.
  IF NEW.dashboard_status IS DISTINCT FROM OLD.dashboard_status THEN
    INSERT INTO lead_status_history (
      lead_id,
      oude_status,
      nieuwe_status,
      gewijzigd_door,
      gewijzigd_op
    )
    VALUES (
      NEW.lead_id,
      OLD.dashboard_status,
      COALESCE(NEW.dashboard_status, 'NULL'),  -- nieuwe_status is NOT NULL
      auth.uid(),                              -- service-key writes geven NULL
      now()
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_lead_dashboard_status_change ON leads;
CREATE TRIGGER on_lead_dashboard_status_change
  AFTER UPDATE OF dashboard_status ON leads
  FOR EACH ROW
  EXECUTE FUNCTION log_dashboard_status_change();

COMMENT ON TRIGGER on_lead_dashboard_status_change ON leads IS
  'Logt elke wijziging van leads.dashboard_status naar lead_status_history. Service-key writes (bot) zetten gewijzigd_door=NULL — onschadelijk omdat de bot deze kolom niet gebruikt.';
