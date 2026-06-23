-- 056_gmail_connections.sql
-- Per-tenant Gmail OAuth-koppeling voor het automatisch labelen van
-- "Offerte ter goedkeuring"-mails. Refresh-token staat versleuteld
-- (AES-256-GCM, base64), enkel leesbaar via service-role (getDashboardAdmin).

create table if not exists public.gmail_connections (
  id                      uuid primary key default gen_random_uuid(),
  tenant_id               uuid not null references public.tenant_settings(id) on delete cascade,
  google_email            text,
  refresh_token_encrypted text not null,
  label_name              text not null,
  label_id                text,
  filter_id               text,
  connected_at            timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (tenant_id)
);

alter table public.gmail_connections enable row level security;

-- Geen policies voor anon/authenticated: onbereikbaar vanuit de browser.
-- De service-role-sleutel bypasst RLS en is de enige toegang.
