-- 055_owner_contact_routing.sql
-- E-mailrollen: per-rol override-adressen voor waar de eigenaar dingen ontvangt.
-- NULL = volg het basis-adres (eigenaar_email). Geen backfill nodig: bestaande
-- rijen houden NULL en volgen dus eigenaar_email, wat het huidige gedrag is.
alter table public.tenant_settings
  add column if not exists goedkeuring_email text,
  add column if not exists meldingen_email  text;

comment on column public.tenant_settings.goedkeuring_email is
  'Override: ontvangadres voor de offerte-goedkeuringsmail (bot). NULL = volg eigenaar_email.';
comment on column public.tenant_settings.meldingen_email is
  'Override: ontvangadres voor dashboard-meldingen. NULL = volg eigenaar_email.';
