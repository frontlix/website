-- 043_kostprijzen_per_dienst.sql
-- ============================================
-- Globale kostprijs-percentages per dienst-categorie (Fase 3 van het
-- Offerte-tab redesign — marge-zicht voor de owner).
--
-- WAT DOET DEZE TABEL:
--   Per categorie van dienst (reiniging, voegzand, beschermlaag, etc.)
--   bewaren we welk percentage van de omzet als KOSTEN wordt aangenomen.
--   De marge-kaart in de offerte-tab gebruikt deze waardes om per regel
--   te berekenen: kosten = regel.totaal * kost_pct/100, marge = rest.
--
-- WAAROM GLOBAAL (geen tenant_id):
--   Frontlix dashboard draait single-user-per-bedrijf (één owner per
--   tenant, geen multi-tenant data-isolatie nodig op dit veld). De
--   kostprijzen zijn voor de hele installatie hetzelfde en worden alleen
--   door de owner aangepast. Patroon volgt `app_config` en `pricing_rules`
--   die ook globaal zijn.
--
-- DEFAULTS:
--   De ON CONFLICT DO NOTHING-seed zorgt dat verse installaties direct
--   bruikbare percentages krijgen. Bij her-uitvoeren van de migratie
--   blijven user-overrides bewaard (CONFLICT = bestaande rij). De
--   reset-functie in lib/dashboard/kostprijzen-actions.ts hard-codeert
--   dezelfde defaults voor "Standaard terugzetten".
--
-- VEILIG VOOR PROD:
--   - CREATE TABLE IF NOT EXISTS + ON CONFLICT DO NOTHING = idempotent
--   - Geen breaking changes — nieuwe tabel, niet aangeraakt door bestaande
--     code paths
--   - Geen RLS-policies = alleen service-role kan lezen/schrijven
--     (acties gaan via getDashboardAdmin)
-- ============================================

CREATE TABLE IF NOT EXISTS kostprijzen_per_dienst (
  rule_key      text PRIMARY KEY,
  label         text NOT NULL,
  kost_pct      numeric(5,2) NOT NULL CHECK (kost_pct >= 0 AND kost_pct <= 100),
  bijgewerkt_op timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE kostprijzen_per_dienst IS
  'Globale kost_pct per dienst-categorie voor marge-berekening in de offerte-tab. Single-tenant model — geen tenant_id, eenmalig per installatie geconfigureerd door de owner.';

COMMENT ON COLUMN kostprijzen_per_dienst.rule_key IS
  'Stabiele categorie-key (zie lib/dashboard/marge-calc.ts RULE_KEYS). Mapping van prijsregel-omschrijving → categorie gebeurt in code via categoriseerRegel().';

COMMENT ON COLUMN kostprijzen_per_dienst.kost_pct IS
  'Percentage van regel-totaal dat als kosten wordt gerekend (0–100). Marge = 100 - kost_pct.';

-- RLS aan, geen policies = alleen service-role mag lezen/schrijven.
ALTER TABLE kostprijzen_per_dienst ENABLE ROW LEVEL SECURITY;

-- ─── Seed: 8 default-categorieën ─────────────────────────────
-- Percentages komen uit het Canva-design / spec sectie 3.1.
-- ON CONFLICT DO NOTHING zodat herhaalde migratie user-aangepaste waardes
-- niet overschrijft.
INSERT INTO kostprijzen_per_dienst (rule_key, label, kost_pct) VALUES
  ('reiniging_straatwerk',     'Reiniging straatwerk',          42),
  ('arbeid_invegen',           'Voegen invegen (arbeid)',       38),
  ('voegzand',                 'Voegzand (materiaal)',          55),
  ('beschermlaag_impregneren', 'Beschermlaag impregneren',      30),
  ('plantenafscherming_folie', 'Plantenafscherming folie',      35),
  ('reiskosten',               'Reiskosten',                    18),
  ('onderhoud_abonnement',     'Onderhoud / abonnement',        35),
  ('overig_handmatig',         'Overig / handmatige regels',    38)
ON CONFLICT (rule_key) DO NOTHING;
