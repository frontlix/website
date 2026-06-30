-- 067_tenant_id_kolommen.sql
-- NOG NIET TOEGEPAST op live. Eerst testen op een kopie.
-- Multitenant-fundament (Project 1, fase 1).
--
-- Voeg tenant_id toe MET SS-default in dezelfde stap. In PostgreSQL 11+ is een kolom met een
-- niet-volatiele constante default een metadata-operatie: bestaande rijen lezen meteen als SS en
-- nieuwe writes tijdens de ombouw krijgen automatisch SS, dus er is geen NULL-window. SS-tenant =
-- 00000000-0000-0000-0000-000000000001. Alle FK's ON DELETE RESTRICT (een tenant verwijderen mag
-- nooit klantdata cascaderen). SS draait ongewijzigd door.
--
-- Rollback (niet-destructief): alter table <tabel> drop column if exists tenant_id;

-- ROOT (eigen tenant_id, SS-default)
alter table public.leads                    add column if not exists tenant_id uuid references public.tenant_settings(id) on delete restrict default '00000000-0000-0000-0000-000000000001';
alter table public.pricing_rules            add column if not exists tenant_id uuid references public.tenant_settings(id) on delete restrict default '00000000-0000-0000-0000-000000000001';
alter table public.service_offerings        add column if not exists tenant_id uuid references public.tenant_settings(id) on delete restrict default '00000000-0000-0000-0000-000000000001';
alter table public.tags                     add column if not exists tenant_id uuid references public.tenant_settings(id) on delete restrict default '00000000-0000-0000-0000-000000000001';
alter table public.notification_preferences add column if not exists tenant_id uuid references public.tenant_settings(id) on delete restrict default '00000000-0000-0000-0000-000000000001';
alter table public.kostprijzen_per_dienst   add column if not exists tenant_id uuid references public.tenant_settings(id) on delete restrict default '00000000-0000-0000-0000-000000000001';
alter table public.offerte_concepten        add column if not exists tenant_id uuid references public.tenant_settings(id) on delete restrict default '00000000-0000-0000-0000-000000000001';
alter table public.template_aanvragen       add column if not exists tenant_id uuid references public.tenant_settings(id) on delete restrict default '00000000-0000-0000-0000-000000000001';
alter table public.external_calendar_events add column if not exists tenant_id uuid references public.tenant_settings(id) on delete restrict default '00000000-0000-0000-0000-000000000001';

-- AFGELEID (SS-default; dwingende erf-trigger volgt in 073)
alter table public.offertes                 add column if not exists tenant_id uuid references public.tenant_settings(id) on delete restrict default '00000000-0000-0000-0000-000000000001';
alter table public.berichten                add column if not exists tenant_id uuid references public.tenant_settings(id) on delete restrict default '00000000-0000-0000-0000-000000000001';
alter table public.fotos                    add column if not exists tenant_id uuid references public.tenant_settings(id) on delete restrict default '00000000-0000-0000-0000-000000000001';
alter table public.prijsregels              add column if not exists tenant_id uuid references public.tenant_settings(id) on delete restrict default '00000000-0000-0000-0000-000000000001';
alter table public.lead_tags                add column if not exists tenant_id uuid references public.tenant_settings(id) on delete restrict default '00000000-0000-0000-0000-000000000001';
alter table public.lead_notes               add column if not exists tenant_id uuid references public.tenant_settings(id) on delete restrict default '00000000-0000-0000-0000-000000000001';
alter table public.lead_status_history      add column if not exists tenant_id uuid references public.tenant_settings(id) on delete restrict default '00000000-0000-0000-0000-000000000001';
alter table public.pending_delivery_checks  add column if not exists tenant_id uuid references public.tenant_settings(id) on delete restrict default '00000000-0000-0000-0000-000000000001';

-- NULLABLE, geen default (NULL = global/superadmin-scope)
alter table public.error_logs    add column if not exists tenant_id uuid references public.tenant_settings(id) on delete set null;
alter table public.notifications add column if not exists tenant_id uuid references public.tenant_settings(id) on delete restrict;
