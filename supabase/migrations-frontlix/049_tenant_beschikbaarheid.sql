-- 049: tenant-beschikbaarheid (werkdagen + tijden voor Surface-scheduling)
--
-- Per weekdag (Ma..Zo, index 0..6) of Surface bezoeken/klussen mag plannen en
-- binnen welke tijden. NULL = standaard (7 dagen, 07:00-18:00), het bestaande
-- bot-gedrag, zodat deze migratie niets verandert tot een tenant het instelt.
--
-- Vorm (array van 7, Ma..Zo):
--   [{ "dag": "Maandag", "aan": true, "van": "08:00", "tot": "17:00" }, ...]

alter table public.tenant_settings
  add column if not exists beschikbaarheid jsonb;

comment on column public.tenant_settings.beschikbaarheid is
  'Werkdagen/-tijden voor Surface-scheduling. Array van 7 (Ma..Zo): [{ dag, aan, van: "HH:MM", tot: "HH:MM" }]. NULL = standaard 7 dagen 07:00-18:00.';
