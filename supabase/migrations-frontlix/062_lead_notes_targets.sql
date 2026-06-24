-- 062_lead_notes_targets.sql
-- Per-notitie sturen waar hij verschijnt: op de afspraak-print en/of de
-- opdrachtbon. Twee booleans, beide default true zodat bestaande notities
-- meteen op beide prints staan (en de bestaande opdrachtbon-koppeling uit
-- migratie 061/commit 0603aa9 ongewijzigd blijft tot de gebruiker iets uitzet).
--
-- Backward-compatible: kolommen met veilige default, geen downtime.

alter table public.lead_notes
  add column if not exists op_afspraak boolean not null default true,
  add column if not exists op_opdrachtbon boolean not null default true;
