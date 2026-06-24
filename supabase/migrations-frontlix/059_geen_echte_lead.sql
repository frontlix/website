-- 059_geen_echte_lead.sql
-- "Geen echte lead"-markering: spam/test/dubbel/verkeerd-nummer-leads die uit
-- ALLE statistieken gehaald moeten worden (ze waren nooit een echte lead).
-- Aparte as dan dashboard_archived: gearchiveerde ECHTE leads tellen wel mee in
-- de periode-cijfers (geschiedenis), alleen uitgesloten_van_stats=true valt overal weg.
--
-- Backward-compatible: kolom met veilige default, geen downtime.

alter table public.leads
  add column if not exists uitgesloten_van_stats boolean not null default false;
