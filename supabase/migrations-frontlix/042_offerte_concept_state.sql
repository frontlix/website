-- 042_offerte_concept_state.sql
-- ============================================
-- Concept-state voor offertes (Fase 2 van Offerte-tab redesign).
--
-- WAT VOEGT DEZE MIGRATIE TOE:
--   1. offertes.is_concept (boolean) — markeert een offerte-rij als
--      concept (nog niet verstuurd, alleen lokale draft).
--   2. offertes.regels_snapshot (jsonb) — snapshot van de prijsregels op
--      het moment van versturen. Nodig om "Terug naar verzonden versie"
--      te ondersteunen, omdat prijsregels-rijen aan de LEAD hangen
--      (niet aan een specifieke offerte-versie) en dus altijd "live" zijn.
--   3. Unique partial index: per lead maximaal ÉÉN concept tegelijk.
--
-- WAAROM:
--   - Een edit op een verstuurde offerte mag de verstuurde versie niet
--     muteren. We maken automatisch een concept-kopie.
--   - Bij "revert" lezen we de snapshot terug naar prijsregels.
--   - Bij "verstuur" wordt de concept naar non-concept gepromoveerd en
--     een verse snapshot opgeslagen.
--
-- VEILIG VOOR PROD:
--   - Beide kolommen nullable / met default. Geen breaking change.
--   - Unique-index gebruikt WHERE-clause, dus bestaande rijen
--     (is_concept=false) raken 'm niet.
--   - IF NOT EXISTS overal voor idempotentie.
-- ============================================

ALTER TABLE offertes
  ADD COLUMN IF NOT EXISTS is_concept boolean NOT NULL DEFAULT false;

ALTER TABLE offertes
  ADD COLUMN IF NOT EXISTS regels_snapshot jsonb;

-- Maximaal 1 concept per lead. WHERE-clause zorgt dat dit alleen
-- afgedwongen wordt voor concept-rijen; verstuurde versies (false)
-- mogen vrij meerdere zijn (uiteraard met verschillende versie-nummers).
CREATE UNIQUE INDEX IF NOT EXISTS one_concept_per_lead
  ON offertes (lead_id)
  WHERE is_concept = true;

COMMENT ON COLUMN offertes.is_concept IS
  'true = lokale draft (nog niet verstuurd); false = historische / verstuurde versie. Per lead maximaal 1 concept tegelijk (unique partial index).';

COMMENT ON COLUMN offertes.regels_snapshot IS
  'JSON snapshot van prijsregels op moment van versturen. Bevat array van { omschrijving, aantal, eenheid, stukprijs, totaal, bron, volgorde }. Gebruikt door revertConcept() om naar verzonden regels terug te keren.';
