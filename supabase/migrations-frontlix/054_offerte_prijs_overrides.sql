-- 054: per-offerte eenheidsprijs-overrides (dashboard offerte-editor)
--
-- De owner kan in het goedkeur-/wijzigingsscherm per regel de eenheidsprijs
-- handmatig aanpassen voor déze offerte (bijv. reiskosten bij een hogere
-- benzineprijs). De overrides leven als JSON op de lead zodat ze blijven staan
-- bij heropenen en niet stilletjes terugdraaien. Vorm:
--   { "reiskosten_per_km_override": 0.30, "onderhoud_per_m2_override": 1.40, ... }
-- (alleen de daadwerkelijk afgeweken regels; ontbrekend = prijslijst.)
--
-- Additief + idempotent: verandert niets aan bestaand gedrag; computeRules past
-- de overrides toe als `override ?? pricing.*`, dus zonder overrides identiek.

alter table public.leads
  add column if not exists offerte_prijs_overrides jsonb;

comment on column public.leads.offerte_prijs_overrides is
  'Per-offerte eenheidsprijs-overrides (dashboard offerte-editor), JSON van ManualOfferteData *_override-velden. NULL/leeg = prijslijst.';
