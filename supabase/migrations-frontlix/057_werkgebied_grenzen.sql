-- 057_werkgebied_grenzen.sql
-- Twee instelbare werkgebied-grenzen naast radius_max_km (de Werkstraal):
--  - radius_min_m2_buiten_straal: onder dit aantal m2 neemt de bot klussen
--    BUITEN de straal niet aan (default 200 = de tot nu toe hardcoded waarde).
--  - radius_max_afstand_km: harde bovengrens; daarboven weigert de bot altijd,
--    ook grote klussen. NULL = geen bovengrens (= huidig gedrag).
--
-- Backward-compatible: kolommen toevoegen met veilige defaults, geen downtime.

alter table public.tenant_settings
  add column if not exists radius_min_m2_buiten_straal integer not null default 200,
  add column if not exists radius_max_afstand_km integer;
