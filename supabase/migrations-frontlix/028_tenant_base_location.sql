-- 028_tenant_base_location.sql
-- Configureerbare thuisbasis per tenant voor de routekaart.
--
-- `tenant_settings.postcode` bestond al (vestigingsadres) maar zonder
-- huisnummer / gegeocodeerde coords. Voor de routekaart hebben we exacte
-- lat/lng nodig zodat alle dag-routes vanuit het juiste vertrekpunt
-- berekend kunnen worden — anders moet elke tenant z'n eigen Biervliet-
-- hardcode in de code regelen.

ALTER TABLE public.tenant_settings
  ADD COLUMN IF NOT EXISTS base_huisnummer text,
  ADD COLUMN IF NOT EXISTS base_lat double precision,
  ADD COLUMN IF NOT EXISTS base_lng double precision,
  ADD COLUMN IF NOT EXISTS base_label text;

COMMENT ON COLUMN public.tenant_settings.base_huisnummer IS
  'Huisnummer van de thuisbasis (samen met `postcode` gebruikt voor geocoding).';
COMMENT ON COLUMN public.tenant_settings.base_lat IS
  'Latitude van de thuisbasis (WGS84). Wordt gevuld door de server-action.';
COMMENT ON COLUMN public.tenant_settings.base_lng IS
  'Longitude van de thuisbasis (WGS84).';
COMMENT ON COLUMN public.tenant_settings.base_label IS
  'Pin-label voor de routekaart (bv. "BASIS" of "Hoofdkantoor").';
