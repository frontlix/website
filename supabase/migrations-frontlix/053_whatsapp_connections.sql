-- 053_whatsapp_connections.sql
-- Per-tenant WhatsApp-koppeling (eigen WhatsApp Business-nummer van het bedrijf,
-- gekoppeld via Meta Embedded Signup). Het access-token en de registratie-PIN
-- staan versleuteld (AES-256-GCM, base64, format base64(iv[12] + authTag[16] +
-- ciphertext), identiek aan 048/052). waba_id, phone_number_id en
-- display_phone_number zijn niet geheim.
-- Alleen leesbaar/schrijfbaar via service-role: de bot en de dashboard-routes.

create table if not exists public.whatsapp_connections (
  id                          uuid primary key default gen_random_uuid(),
  tenant_id                   uuid not null references public.tenant_settings(id) on delete cascade,
  waba_id                     text not null,
  phone_number_id             text not null,
  display_phone_number        text,
  access_token_encrypted      text not null,
  registration_pin_encrypted  text,
  needs_reconnect             boolean not null default false,
  connected_at                timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  unique (tenant_id)
);

-- Idempotent: voegt de PIN-kolom toe als de tabel al bestond uit een eerdere run.
alter table public.whatsapp_connections add column if not exists registration_pin_encrypted text;

alter table public.whatsapp_connections enable row level security;

-- Geen policies voor anon/authenticated: onbereikbaar vanuit de browser.
-- De service-role-sleutel bypasst RLS en is de enige toegang.
