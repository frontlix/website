-- 041_prijsregels_bron.sql
-- ============================================
-- Voegt een `bron` kolom toe aan prijsregels om onderscheid te maken
-- tussen regels die automatisch uit lead-data berekend zijn (computeRules)
-- en handmatig toegevoegde regels door de eigenaar.
--
-- Dit is nodig voor de redesignde Offerte-tab waar:
--   - auto-regels niet handmatig verwijderbaar zijn (worden herberekend
--     bij wijziging van bron-velden in de Info-tab)
--   - handmatige regels (voorrijden, meerwerk, etc.) door eigenaar
--     vrij toegevoegd/verwijderd worden en niet meegaan in recalculatie
--
-- Default = 'manual' zodat bestaande rijen (uit huidige flow) als
-- handmatig worden gezien. Dat is veilig — recalculatie raakt ze niet.
-- Nieuwe auto-rijen krijgen expliciet bron='auto_lead' van de
-- computeRules-flow.
--
-- IDEMPOTENT: ADD COLUMN IF NOT EXISTS is no-op bij her-uitvoeren.
-- ============================================

ALTER TABLE prijsregels
  ADD COLUMN IF NOT EXISTS bron text NOT NULL DEFAULT 'manual'
  CHECK (bron IN ('auto_lead', 'manual'));

-- Index op (lead_id, bron) zodat het filteren van auto-regels bij
-- recalculatie snel gaat (DELETE WHERE lead_id=? AND bron='auto_lead').
CREATE INDEX IF NOT EXISTS idx_prijsregels_lead_bron
  ON prijsregels (lead_id, bron);

COMMENT ON COLUMN prijsregels.bron IS
  'auto_lead = berekend uit lead-velden door computeRules; manual = handmatig toegevoegd door eigenaar. Bepaalt of regel meegaat in recalculatie bij Info-tab wijziging.';
