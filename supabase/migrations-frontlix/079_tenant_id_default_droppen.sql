-- 079_tenant_id_default_droppen.sql
-- NOG NIET TOEGEPAST op live. Eerst testen op een kopie.
-- Multitenant-fundament (Project 1, fase E -> F-overgang).
--
-- LET OP TIMING: draai deze migratie PAS NADAT (a) app EN bot bewezen altijd expliciet tenant_id
-- meesturen/filteren, gevalideerd met een INTERNE test-tenant (eigen WABA-testnummer onder de Frontlix-
-- app), EN (b) VOORDAT een echte betalende 2e klant schrijft. Niet eerder, niet later.
--
-- Wat het doet: verwijdert de SS-default ('00000000-0000-0000-0000-000000000001') op tenant_id voor alle
-- ROOT- en AFGELEID-tabellen uit 067. Daarna faalt een vergeten tenant_id-write HARD (NOT NULL uit 071)
-- in plaats van stil als SS-data te landen. De NULLABLE-tabellen (notifications, error_logs) hadden nooit
-- een default en blijven ongemoeid.
--
-- Rollback (zet de SS-default terug; alleen zinvol binnen het single-tenant-venster):
--   alter table public.leads alter column tenant_id set default '00000000-0000-0000-0000-000000000001';
--   -- ... idem voor elke tabel hieronder ...

-- ── ROOT-tabellen (SS-default uit 067) ───────────────────────────────────
alter table public.leads                    alter column tenant_id drop default;
alter table public.pricing_rules            alter column tenant_id drop default;
alter table public.service_offerings        alter column tenant_id drop default;
alter table public.tags                     alter column tenant_id drop default;
alter table public.notification_preferences alter column tenant_id drop default;
alter table public.kostprijzen_per_dienst   alter column tenant_id drop default;
alter table public.offerte_concepten        alter column tenant_id drop default;
alter table public.template_aanvragen       alter column tenant_id drop default;
alter table public.external_calendar_events alter column tenant_id drop default;

-- ── AFGELEID-tabellen (SS-default uit 067) ───────────────────────────
alter table public.offertes                 alter column tenant_id drop default;
alter table public.berichten                alter column tenant_id drop default;
alter table public.fotos                    alter column tenant_id drop default;
alter table public.prijsregels              alter column tenant_id drop default;
alter table public.lead_tags                alter column tenant_id drop default;
alter table public.lead_notes               alter column tenant_id drop default;
alter table public.lead_status_history      alter column tenant_id drop default;
alter table public.pending_delivery_checks  alter column tenant_id drop default;

