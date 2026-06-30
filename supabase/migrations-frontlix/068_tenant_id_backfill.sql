-- 068_tenant_id_backfill.sql
-- NOG NIET TOEGEPAST op live. Eerst testen op een kopie.
-- Multitenant-fundament (Project 1, fase 1).
--
-- Historische correctie/backfill (idempotent) + wees-rapport. Met de SS-default uit 067 staan root-
-- en afgeleide rijen al op SS; dit is de expliciete herleiding vanuit de parent-lead, de profiel-
-- koppeling van de bekende SS-owner (welkom@schoon-straatje.nl) en de deterministische vulling van
-- external_calendar_events / notifications / error_logs. notifications en error_logs mogen bewust
-- NULL blijven (= platform/superadmin-scope).
--
-- Rollback: niet-destructief (default uit 067 herstelt SS).

begin;

-- AFGELEID expliciet herleiden vanuit parent-lead (nu no-op want default = SS; vangt afwijkingen)
update public.offertes o              set tenant_id = l.tenant_id from public.leads l where o.lead_id  = l.lead_id and o.tenant_id  is distinct from l.tenant_id;
update public.berichten b             set tenant_id = l.tenant_id from public.leads l where b.lead_id  = l.lead_id and b.tenant_id  is distinct from l.tenant_id;
update public.fotos f                 set tenant_id = l.tenant_id from public.leads l where f.lead_id  = l.lead_id and f.tenant_id  is distinct from l.tenant_id;
update public.prijsregels p           set tenant_id = l.tenant_id from public.leads l where p.lead_id  = l.lead_id and p.tenant_id  is distinct from l.tenant_id;
update public.lead_tags lt            set tenant_id = l.tenant_id from public.leads l where lt.lead_id = l.lead_id and lt.tenant_id is distinct from l.tenant_id;
update public.lead_notes ln           set tenant_id = l.tenant_id from public.leads l where ln.lead_id = l.lead_id and ln.tenant_id is distinct from l.tenant_id;
update public.lead_status_history h   set tenant_id = l.tenant_id from public.leads l where h.lead_id  = l.lead_id and h.tenant_id  is distinct from l.tenant_id;
update public.pending_delivery_checks pc set tenant_id = l.tenant_id from public.leads l where pc.lead_id = l.lead_id and pc.tenant_id is distinct from l.tenant_id;

-- Profielen: alleen de bekende SS-owner, nooit blanket alle tenants
update public.dashboard_user_profiles
   set tenant_id = '00000000-0000-0000-0000-000000000001'
 where tenant_id is null
   and platform_role = 'tenant'
   and tenant_status = 'approved'
   and user_id in ('7ea749b4-33c9-4c36-a8f7-b1d0595e6843');

-- external_calendar_events: alle bestaande events zijn SS
update public.external_calendar_events set tenant_id = '00000000-0000-0000-0000-000000000001' where tenant_id is null;

-- notifications: per-tenant via lead, anders via user-profiel; rest blijft bewust NULL
update public.notifications n set tenant_id = l.tenant_id from public.leads l                  where n.lead_id = l.lead_id and n.tenant_id is null;
update public.notifications n set tenant_id = p.tenant_id from public.dashboard_user_profiles p where n.user_id = p.user_id and n.tenant_id is null and p.tenant_id is not null;

-- error_logs via lead waar mogelijk (rest blijft NULL = global)
update public.error_logs er set tenant_id = l.tenant_id from public.leads l where er.lead_id = l.lead_id and er.tenant_id is null;

commit;

-- Wees-rapport (informatief): afgeleide rijen met een lead_id dat niet in leads bestaat.
-- Bij wezen (>0): eerst beslissen (koppelen / forceren naar SS / archiveren) VOOR de NOT NULL-stap (071).
do $$
declare v_orphans bigint;
begin
  select coalesce(sum(c),0) into v_orphans from (
    select count(*) c from public.offertes              o  left join public.leads l on o.lead_id  = l.lead_id where l.lead_id is null
    union all select count(*) from public.berichten      b  left join public.leads l on b.lead_id  = l.lead_id where l.lead_id is null
    union all select count(*) from public.fotos          f  left join public.leads l on f.lead_id  = l.lead_id where l.lead_id is null
    union all select count(*) from public.prijsregels    p  left join public.leads l on p.lead_id  = l.lead_id where l.lead_id is null
    union all select count(*) from public.lead_tags      lt left join public.leads l on lt.lead_id = l.lead_id where l.lead_id is null
    union all select count(*) from public.lead_notes     ln left join public.leads l on ln.lead_id = l.lead_id where l.lead_id is null
    union all select count(*) from public.lead_status_history h left join public.leads l on h.lead_id = l.lead_id where l.lead_id is null
    union all select count(*) from public.pending_delivery_checks pc left join public.leads l on pc.lead_id = l.lead_id where l.lead_id is null
  ) s;
  raise notice 'WEES-RAPPORT: % afgeleide rij(en) zonder bestaande parent-lead (>0 = eerst oplossen voor 071)', v_orphans;
end $$;
