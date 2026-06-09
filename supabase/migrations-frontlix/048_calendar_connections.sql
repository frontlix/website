-- 048_calendar_connections.sql
-- Per-tenant Google Calendar OAuth-koppeling. Token staat versleuteld
-- (AES-256-GCM, base64). Alleen leesbaar/schrijfbaar via service-role:
-- de bot (SUPABASE_SERVICE_KEY) en de dashboard-callback (getDashboardAdmin).

create table if not exists public.calendar_connections (
  id                      uuid primary key default gen_random_uuid(),
  tenant_id               uuid not null references public.tenant_settings(id) on delete cascade,
  google_email            text,
  calendar_id             text not null default 'primary',
  refresh_token_encrypted text not null,
  connected_at            timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (tenant_id)
);

alter table public.calendar_connections enable row level security;

-- Geen policies voor anon/authenticated: de tabel is dus onbereikbaar vanuit
-- de browser. De service-role-sleutel bypasst RLS en is de enige toegang.
