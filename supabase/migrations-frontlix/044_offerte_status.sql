-- 044_offerte_status.sql
-- ============================================
-- Status-kolom voor offertes (Fix A: offerte zichtbaar vanaf review-moment).
--
-- WAT VOEGT DEZE MIGRATIE TOE:
--   offertes.status (text) — 'verstuurd' | 'wacht_op_goedkeuring'.
--
-- WAAROM:
--   De bot schreef de offerte-rij pas bij goedkeuring (approveQuote);
--   tot die tijd was er in het lead-dossier niets te zien. Met deze
--   kolom archiveert processQuote de offerte al op het review-moment
--   als 'wacht_op_goedkeuring'; approveQuote promoot diezelfde rij
--   naar 'verstuurd' (zelfde versienummer, verse PDF + totalen).
--
--   We gebruiken bewust NIET is_concept=true voor de pending-rij:
--   die vlag is van het dashboard-draftsysteem (max één concept per
--   lead via unique partial index, migratie 042) en zou ermee botsen.
--
-- VEILIG VOOR PROD:
--   - Kolom met default 'verstuurd': alle bestaande rijen (incl.
--     dashboard-concepten) krijgen de juiste/neutrale waarde.
--   - IF NOT EXISTS / idempotent.
--   - VOLGORDE: eerst deze migratie draaien, DAARNA pas de bot-deploy
--     (de nieuwe bot-code selecteert/schrijft de status-kolom).
-- ============================================

ALTER TABLE offertes
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'verstuurd';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'offertes_status_check'
  ) THEN
    ALTER TABLE offertes
      ADD CONSTRAINT offertes_status_check
      CHECK (status IN ('verstuurd', 'wacht_op_goedkeuring'));
  END IF;
END $$;

-- Snelle lookup van de pending-rij per lead (bot: promote-pad).
CREATE INDEX IF NOT EXISTS offertes_lead_pending_idx
  ON offertes (lead_id)
  WHERE status = 'wacht_op_goedkeuring';
