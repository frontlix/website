-- 052_email_connections.sql
-- Per-tenant e-mail-koppeling (uitgaande SMTP vanuit het eigen adres van het
-- bedrijf). Alleen het SMTP-wachtwoord staat versleuteld (AES-256-GCM, base64,
-- format base64(iv[12] + authTag[16] + ciphertext), identiek aan 048). Host,
-- poort en beveiliging zijn niet geheim en blijven leesbaar.
-- Alleen leesbaar/schrijfbaar via service-role: de bot (SUPABASE_SERVICE_KEY)
-- en de dashboard-routes (getDashboardAdmin). RLS aan, geen policies.

create table if not exists public.email_connections (
  id                       uuid primary key default gen_random_uuid(),
  tenant_id                uuid not null references public.tenant_settings(id) on delete cascade,
  provider                 text,
  smtp_host                text not null,
  smtp_port                integer not null,
  security                 text not null default 'ssl',         -- 'ssl' of 'starttls'
  email_adres              text not null,                       -- afzender- en login-adres
  smtp_password_encrypted  text not null,
  sender_name              text not null default '',            -- weergavenaam in de From
  reply_to                 text,                                -- optioneel afwijkend reply-to
  test_passed_at           timestamptz,                         -- laatste geslaagde test
  needs_reconnect          boolean not null default false,      -- gezet bij EAUTH op het verzendpad
  connected_at             timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique (tenant_id),
  check (security in ('ssl', 'starttls')),
  check (smtp_port between 1 and 65535)
);

alter table public.email_connections enable row level security;

-- Geen policies voor anon/authenticated: de tabel is dus onbereikbaar vanuit
-- de browser. De service-role-sleutel bypasst RLS en is de enige toegang.
