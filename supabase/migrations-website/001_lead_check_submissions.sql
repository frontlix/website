-- Migratie 001 (Frontlix WEBSITE-database, ref zsiokl…): lead_check_submissions
--
-- DOEL: elke mail-lead uit de lead-lek-check blijvend opslaan (backup naast de
-- notificatie- en analyse-mail). Insert gebeurt server-side via de service-role
-- in app/api/lead-check/route.ts.
--
-- DRAAIEN: op de Frontlix-website Supabase (zelfde DB als contact_submissions
-- en form_abandonment). NIET op de schoon-straatje/dashboard-database; daarvoor
-- bestaat supabase/migrations-frontlix.
--
-- SECURITY: RLS aan zonder policies. Anon en authenticated kunnen er dus niet
-- bij, ook niet als de tabel via de Data API wordt geëxposeerd; de service-role
-- bypasst RLS en is de enige schrijver/lezer.

create table if not exists public.lead_check_submissions (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  score integer not null,
  invoer jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.lead_check_submissions enable row level security;

comment on table public.lead_check_submissions is
  'Mail-leads uit de lead-lek-check op frontlix.com (insert via service-role in /api/lead-check).';
