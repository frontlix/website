-- 027_lead_coordinates.sql
-- Voegt geocoded coördinaten toe aan leads, zodat de Routekaart-view in het
-- dashboard pins op een echte Google Map kan plaatsen zonder per render
-- opnieuw te geocoden.
--
-- Semantiek:
--   - NULL = nog niet (of niet succesvol) gegeocodeerd
--   - Worden gevuld door de geocoding-flow (postcode.tech) bij creatie/edit
--     van een lead, of via de backfill in scripts/backfill-lead-coords.mjs.
--
-- Precisie: double precision (≈15 significante decimalen — ruim genoeg voor
-- geografische coördinaten in graden).

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision,
  ADD COLUMN IF NOT EXISTS coords_geocoded_op timestamptz;

COMMENT ON COLUMN public.leads.lat IS
  'Latitude (graden, WGS84). NULL = nog niet gegeocodeerd.';
COMMENT ON COLUMN public.leads.lng IS
  'Longitude (graden, WGS84). NULL = nog niet gegeocodeerd.';
COMMENT ON COLUMN public.leads.coords_geocoded_op IS
  'Tijdstempel van de laatst succesvolle geocoding. Wordt bijgewerkt bij adres-wijzigingen.';

-- Index zodat de Routekaart-query (alle leads-met-coords in week) snel is.
CREATE INDEX IF NOT EXISTS leads_coords_idx
  ON public.leads (lat, lng)
  WHERE lat IS NOT NULL AND lng IS NOT NULL;
