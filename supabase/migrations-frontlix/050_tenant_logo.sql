-- 050: bedrijfslogo (upload via dashboard-bedrijfsprofiel)
--
-- Kolom op tenant_settings voor de publieke logo-URL + een publieke
-- storage-bucket waarin het logo wordt bewaard. Upload gebeurt server-side via
-- de service-role (uploadTenantLogo); read is publiek via de bucket-URL. NULL
-- = geen logo, het dashboard toont dan de initiaal-fallback.
--
-- Additief + idempotent: verandert niets aan bestaand gedrag tot een tenant
-- een logo uploadt.

alter table public.tenant_settings
  add column if not exists logo_url text;

comment on column public.tenant_settings.logo_url is
  'Publieke URL van het geuploade bedrijfslogo (storage-bucket tenant-logos). NULL = geen logo; dashboard toont initiaal-fallback.';

-- Publieke bucket (read via URL), met een harde grens op grootte + types als
-- extra laag bovenop de validatie in de server-action.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tenant-logos', 'tenant-logos', true, 2097152,
        array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;
