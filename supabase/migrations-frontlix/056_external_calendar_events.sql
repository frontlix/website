-- 056_external_calendar_events.sql
-- Agenda-sync fase 2 (Google -> dashboard).
--
-- (A) syncToken op de Google-koppeling, zodat de bot incrementeel kan pollen
--     (events.list met syncToken) i.p.v. elke tick de hele agenda op te halen.
-- (B) index op leads.google_event_id, zodat de sync-job per Google-event snel
--     de bijbehorende lead kan vinden.
-- (C) external_calendar_events: handmatig in Google aangemaakte afspraken
--     (zonder lead) die de dashboard-agenda als READ-ONLY items toont. De bot
--     (service-role) schrijft; approved dashboard-users lezen via RLS.

alter table public.calendar_connections
  add column if not exists sync_token text;

create index if not exists idx_leads_google_event_id
  on public.leads (google_event_id)
  where google_event_id is not null;

create table if not exists public.external_calendar_events (
  google_event_id text primary key,
  summary         text,
  start_at        timestamptz not null,
  end_at          timestamptz,
  all_day         boolean not null default false,
  last_synced_at  timestamptz not null default now()
);

alter table public.external_calendar_events enable row level security;

drop policy if exists "approved users kunnen externe agenda-events lezen"
  on public.external_calendar_events;

create policy "approved users kunnen externe agenda-events lezen"
  on public.external_calendar_events
  for select
  using (is_approved_dashboard_user());
