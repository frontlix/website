-- 060: per-onderdeel offerte-opmerkingen (dashboard offerte-editor + wizard)
--
-- De owner kan bij elk offerte-onderdeel een opmerking zetten (waarom hij voor
-- een keuze/prijs ging). Met de schakelaar AAN verschijnt die opmerking in de
-- offerte als subregel direct onder het bijbehorende onderdeel; UIT = alleen
-- intern. De opmerkingen leven als JSON op de lead (net als
-- offerte_prijs_overrides) zodat ze + de schakelaar-stand blijven staan bij
-- heropenen. Vorm (key = OpmerkingKey uit manual-offerte-types):
--   {
--     "beschermlaag": { "tekst": "Aangeraden, poreuze stenen", "zichtbaar": true },
--     "reiskosten":   { "tekst": "Buiten servicegebied",        "zichtbaar": false }
--   }
-- (alleen onderdelen met een niet-lege tekst; ontbrekend = geen opmerking.)
--
-- Additief + idempotent: verandert niets aan bestaand gedrag. Zonder opmerkingen
-- rendert de offerte exact zoals voorheen (geen lege regels).

alter table public.leads
  add column if not exists offerte_regel_opmerkingen jsonb;

comment on column public.leads.offerte_regel_opmerkingen is
  'Per-onderdeel offerte-opmerkingen (dashboard offerte-editor + wizard), JSON: { <onderdeel>: { tekst, zichtbaar } }. NULL/leeg = geen opmerkingen.';
