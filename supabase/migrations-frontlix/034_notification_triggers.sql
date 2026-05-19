-- 034_notification_triggers.sql
-- =================================================
-- DB-triggers die automatisch notification-rijen aanmaken bij de
-- relevante lead-events. Werkt ongeacht of de bot of het dashboard de
-- mutatie veroorzaakt — alles loopt via dezelfde leads-tabel.
--
-- Gedekt door deze migratie (6 events):
--   - nieuwe_lead          → INSERT op leads
--   - owner_review_nodig   → UPDATE waar pending_eigenaar_review van NULL → NOT NULL
--   - klant_vraagt_korting → UPDATE waar gesprek_fase → 'onderhandelen'
--   - offerte_goedgekeurd  → UPDATE waar akkoord_op van NULL → NOT NULL
--   - offerte_afgewezen    → UPDATE waar dashboard_status → 'geen_interesse'
--   - afspraak_ingepland   → UPDATE waar afspraak_geboekt_op van NULL → NOT NULL
--
-- Niet in deze migratie:
--   - nieuwe_review            → wacht op reviews-tabel (latere fase)
--   - dagelijkse_samenvatting  → cron-based (geen state-change trigger)

-- ─── 1) Helper-function ────────────────────────────────────
-- Insert één notification-rij per approved dashboard-user, MITS de
-- (event_type, in_app)-pref op true staat. Dit is dezelfde logica als
-- notify.ts in TypeScript — kept hier in SQL voor performance (één
-- statement, geen round-trip per gebruiker).
CREATE OR REPLACE FUNCTION create_notification_for_all_users(
  p_event_type notification_event_type,
  p_titel      text,
  p_body       text,
  p_lead_id    text DEFAULT NULL,
  p_payload    jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER  -- bypasst RLS — we hebben service-role power voor inserts
SET search_path = public
AS $$
DECLARE
  v_in_app_enabled boolean;
BEGIN
  -- Pref-check voor in_app kanaal (fase 1). Andere kanalen (email/push/
  -- whatsapp) hebben hun eigen delivery-laag die straks gehookt wordt op
  -- dezelfde notification-rijen of via aparte triggers.
  SELECT enabled INTO v_in_app_enabled
  FROM notification_preferences
  WHERE event_type = p_event_type AND kanaal = 'in_app';

  IF v_in_app_enabled IS NULL OR v_in_app_enabled = false THEN
    RETURN;
  END IF;

  INSERT INTO notifications (user_id, event_type, lead_id, titel, body, payload)
  SELECT
    p.user_id,
    p_event_type,
    p_lead_id,
    p_titel,
    p_body,
    p_payload
  FROM dashboard_user_profiles p
  WHERE p.approved_op IS NOT NULL;
END;
$$;

COMMENT ON FUNCTION create_notification_for_all_users IS
  'Maakt notification-rijen voor alle approved users mits in_app-pref aan staat.';

-- ─── 2) Trigger-function: nieuwe lead ────────────────────────
CREATE OR REPLACE FUNCTION trigger_notify_nieuwe_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_titel text;
  v_body  text;
BEGIN
  v_titel := 'Nieuwe lead: ' || COALESCE(NEW.naam, 'naamloos');
  v_body  := 'Aanvraag via ' || COALESCE(NEW.bron, NEW.kanaal::text, 'web');

  PERFORM create_notification_for_all_users(
    'nieuwe_lead'::notification_event_type,
    v_titel,
    v_body,
    NEW.lead_id,
    jsonb_build_object(
      'hoofdcategorie', NEW.hoofdcategorie,
      'kanaal', NEW.kanaal
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lead_insert_notify ON leads;
CREATE TRIGGER lead_insert_notify
  AFTER INSERT ON leads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_notify_nieuwe_lead();

-- ─── 3) Trigger-function: lead UPDATE-events ─────────────────
-- Eén trigger-function vangt alle 5 update-events af. Gebruikt OLD/NEW om
-- te detecteren WAT er veranderde — vermindert het aantal triggers en
-- voorkomt dubbele firings bij multi-veld-updates.
CREATE OR REPLACE FUNCTION trigger_notify_lead_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_naam text;
  v_prijs_label text;
BEGIN
  v_naam := COALESCE(NEW.naam, 'naamloos');
  v_prijs_label := CASE
    WHEN NEW.totaal_prijs IS NOT NULL
      THEN '€' || to_char(NEW.totaal_prijs, 'FM999G999G990')
    ELSE 'geen bedrag'
  END;

  -- owner_review_nodig: pending_eigenaar_review nieuw gezet
  IF (OLD.pending_eigenaar_review IS NULL AND NEW.pending_eigenaar_review IS NOT NULL) THEN
    PERFORM create_notification_for_all_users(
      'owner_review_nodig'::notification_event_type,
      'Owner-review nodig: ' || v_naam,
      'Surface wacht op je goedkeuring · ' || v_prijs_label,
      NEW.lead_id,
      jsonb_build_object('totaal_prijs', NEW.totaal_prijs)
    );
  END IF;

  -- klant_vraagt_korting: gesprek_fase werd 'onderhandelen'
  IF (NEW.gesprek_fase = 'onderhandelen' AND
      (OLD.gesprek_fase IS DISTINCT FROM 'onderhandelen')) THEN
    PERFORM create_notification_for_all_users(
      'klant_vraagt_korting'::notification_event_type,
      'Klant in onderhandeling: ' || v_naam,
      'Mogelijk korting-vraag · ' || v_prijs_label,
      NEW.lead_id,
      jsonb_build_object('totaal_prijs', NEW.totaal_prijs)
    );
  END IF;

  -- offerte_goedgekeurd: akkoord_op nieuw gezet
  IF (OLD.akkoord_op IS NULL AND NEW.akkoord_op IS NOT NULL) THEN
    PERFORM create_notification_for_all_users(
      'offerte_goedgekeurd'::notification_event_type,
      'Offerte goedgekeurd: ' || v_naam,
      'Klant ging akkoord · ' || v_prijs_label,
      NEW.lead_id,
      jsonb_build_object(
        'totaal_prijs', NEW.totaal_prijs,
        'akkoord_via', NEW.akkoord_via
      )
    );
  END IF;

  -- offerte_afgewezen: dashboard_status werd 'geen_interesse'
  IF (NEW.dashboard_status = 'geen_interesse' AND
      (OLD.dashboard_status IS DISTINCT FROM 'geen_interesse')) THEN
    PERFORM create_notification_for_all_users(
      'offerte_afgewezen'::notification_event_type,
      'Offerte afgewezen: ' || v_naam,
      'Klant haakt af · ' || v_prijs_label,
      NEW.lead_id,
      jsonb_build_object('totaal_prijs', NEW.totaal_prijs)
    );
  END IF;

  -- afspraak_ingepland: afspraak_geboekt_op nieuw gezet
  IF (OLD.afspraak_geboekt_op IS NULL AND NEW.afspraak_geboekt_op IS NOT NULL) THEN
    PERFORM create_notification_for_all_users(
      'afspraak_ingepland'::notification_event_type,
      'Afspraak ingepland: ' || v_naam,
      COALESCE(
        'Op ' || to_char(NEW.afspraak_datum, 'DD-MM-YYYY')
          || COALESCE(' ' || NEW.afspraak_starttijd::text, ''),
        'Datum gekozen'
      ),
      NEW.lead_id,
      jsonb_build_object(
        'afspraak_datum', NEW.afspraak_datum,
        'afspraak_starttijd', NEW.afspraak_starttijd
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lead_update_notify ON leads;
CREATE TRIGGER lead_update_notify
  AFTER UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_notify_lead_update();
