-- 044_prijsregels_label_existing_as_auto.sql
-- ============================================
-- Eenmalige data-fix: alle prijsregels die destijds door
-- computeRules() (de wizard / manual-offerte-actions) zijn gegenereerd
-- staan na migratie 041 op `bron='manual'` (de safe default). Hierdoor
-- creëert regenerateAutoRegels() bij een info-tab-edit DUPLICATEN
-- ipv ze te vervangen.
--
-- Deze update labelt regels her op basis van een trefwoord-heuristiek
-- die overeenkomt met de output-omschrijvingen van computeRules:
--   - "reiniging" / "schoonmaak"
--   - "invegen" / "arbeid voegzand"
--   - "voegzand" (materiaal)
--   - "beschermlaag" / "impregneren"
--   - "plantenafscherming" / "folie"
--   - "reiskosten" / "voorrijden"
--   - "onderhoud" / "abonnement"
--   - "preventieve" / "preventief" (onkruidbehandeling)
--   - "extra arbeid" / "meerwerk" — bewust ALS HANDMATIG behouden
--     omdat dit veld typisch eenmalig is en niet automatisch
--     gegenereerd wordt voor elke offerte.
--
-- Echte handmatige toevoegingen (bv. "Voorrijden Tilburg specifiek",
-- "Korting Pasen 2026") blijven 'manual' want ze matchen geen
-- trefwoord. Hierdoor blijven ze bij regenerate ongemoeid.
--
-- IDEMPOTENT: re-run heeft geen effect (rijen die al auto_lead zijn
-- worden overgeslagen door de WHERE-clause).
-- ============================================

UPDATE prijsregels
SET bron = 'auto_lead'
WHERE bron = 'manual'
  AND (
       omschrijving ILIKE '%reiniging%'
    OR omschrijving ILIKE '%schoonmaak%'
    OR omschrijving ILIKE '%invegen%'
    OR omschrijving ILIKE '%voegzand%'
    OR omschrijving ILIKE '%beschermlaag%'
    OR omschrijving ILIKE '%impregneren%'
    OR omschrijving ILIKE '%plantenafscherming%'
    OR omschrijving ILIKE '%reiskosten%'
    OR omschrijving ILIKE '%onderhoud %'   -- spatie voorkomt false-positives als "onderhoud" in een andere context
    OR omschrijving ILIKE 'onderhoud'
    OR omschrijving ILIKE '%abonnement%'
    OR omschrijving ILIKE '%preventieve%'
    OR omschrijving ILIKE '%preventief%'
  );
