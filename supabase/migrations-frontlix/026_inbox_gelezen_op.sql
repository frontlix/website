-- 026_inbox_gelezen_op.sql
-- Voegt owner-specifieke "laatst gelezen" tijdstempel toe per lead, zodat
-- de inbox-pagina kan tonen welke gesprekken nog ongelezen zijn.
--
-- Semantiek:
--   - NULL = nooit geopend door owner
--   - Een gesprek is "ongelezen" als het meest recente inkomende bericht
--     een timestamp > inbox_gelezen_op heeft (of inbox_gelezen_op NULL is
--     én er een inkomend bericht bestaat).
--   - Wordt geüpdatet door de markInboxRead server-action zodra een owner
--     de chat in de inbox opent.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS inbox_gelezen_op timestamptz;

COMMENT ON COLUMN public.leads.inbox_gelezen_op IS
  'Owner-specifiek tijdstempel: tot wanneer is dit gesprek door de owner gelezen in de inbox. NULL = nog niet geopend.';
