-- 066_multitenant_voorbereiding.sql
-- NOG NIET TOEGEPAST op live (ntew). Eerst testen op een kopie (lokale Supabase-CLI of 2e gratis project).
-- Multitenant-fundament (Project 1, fase 0). Zie multitenant-masterplan.md / multitenant-fundament-plan.md.
--
-- Voorbereiding, geen data-impact: voeg de superadmin/tenant-rol en de user->tenant-koppeling toe aan
-- dashboard_user_profiles en markeer Chris (frontlixx@gmail.com) als superadmin. De superadmin houdt
-- tenant_id = NULL (ziet alle tenants via view-as); tenant-owners krijgen hun tenant_id in 068.
-- SS-tenant-uuid = 00000000-0000-0000-0000-000000000001 (tenant_settings.id), gebruikt als default in 067.
--
-- Rollback (niet-destructief):
--   alter table public.dashboard_user_profiles drop column if exists tenant_id;
--   alter table public.dashboard_user_profiles drop column if exists platform_role;
--   drop type if exists public.platform_role_t;

do $$ begin
  create type public.platform_role_t as enum ('tenant','superadmin');
exception when duplicate_object then null; end $$;

alter table public.dashboard_user_profiles
  add column if not exists platform_role public.platform_role_t not null default 'tenant',
  add column if not exists tenant_id uuid references public.tenant_settings(id) on delete restrict;

-- Chris = superadmin (eigen tenant_id blijft bewust NULL)
update public.dashboard_user_profiles
   set platform_role = 'superadmin'
 where user_id = '1f0901de-dac3-495a-839d-5079086fe5c5';
