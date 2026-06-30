-- 080_superadmin_view_as_audit.sql
-- NOG NIET TOEGEPAST op live. Volgt na 074-079.
-- Audit-tabel voor superadmin view-as + db_pre_request-hook voor de GUC.

create table if not exists public.superadmin_view_as_audit (
  id bigint generated always as identity primary key,
  superadmin_user_id uuid not null references auth.users(id) on delete cascade,
  acting_tenant_id uuid references public.tenant_settings(id) on delete set null,
  action text not null,            -- 'start' | 'stop' | 'write'
  detail jsonb,
  created_at timestamptz not null default now()
);

alter table public.superadmin_view_as_audit enable row level security;

-- Alleen de superadmin mag de audit lezen; schrijven gebeurt via service-role.
drop policy if exists "view_as_audit_superadmin_select" on public.superadmin_view_as_audit;
create policy "view_as_audit_superadmin_select" on public.superadmin_view_as_audit
  for select to authenticated using ( (select public.is_superadmin()) );

revoke all on public.superadmin_view_as_audit from anon, authenticated;
grant select on public.superadmin_view_as_audit to authenticated;

-- db_pre_request-hook: kopieer de x-frontlix-acting-tenant request-header naar
-- de GUC request.frontlix_acting_tenant (transaction-local). effective_tenant_id()
-- gate't zelf op is_superadmin(), dus een non-superadmin-header heeft geen effect.
create or replace function public.frontlix_pre_request() returns void
  language plpgsql security definer set search_path = public as $$
declare v_hdr text;
begin
  v_hdr := current_setting('request.headers', true)::json ->> 'x-frontlix-acting-tenant';
  if v_hdr is not null and v_hdr <> '' then
    perform set_config('request.frontlix_acting_tenant', v_hdr, true);
  end if;
exception when others then
  -- nooit de request laten crashen op een ontbrekende/ongeldige header
  null;
end; $$;

-- Activeren (EENMALIG, los van deze migratie, infra-stap):
--   alter role authenticator set pgrst.db_pre_request = 'public.frontlix_pre_request';
--   notify pgrst, 'reload config';
--
-- LET OP: dit maakt effective_tenant_id() correct op het anon-pad, maar de RLS
-- SELECT-policies in 075 gebruiken (is_superadmin() OR auth_tenant_id()), niet
-- effective_tenant_id(). Voor echte read-scoping in view-as: zie open_questions
-- (optionele migr 081 die SELECT op effective_tenant_id() zet). Tot dan is de
-- app-laag forEffectiveTenant() de autoritatieve view-as-scoping.
