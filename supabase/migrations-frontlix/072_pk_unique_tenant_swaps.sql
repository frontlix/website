-- 072_pk_unique_tenant_swaps.sql
-- NOG NIET TOEGEPAST op live. Eerst testen op een kopie (lokale Supabase-CLI of 2e gratis project).
-- Multitenant-fundament (Project 1, fase 5).
--
-- Zet de single-tenant PK's en UNIQUE-constraints om naar tenant-gescopete varianten
-- (tenant_id, ...), zodat een 2e tenant dezelfde rule_key/dienst_key/tagnaam mag hebben
-- zonder botsing. Voegt daarnaast een samengestelde FK toe op lead_tags zodat een lead-tag
-- alleen een tag van DEZELFDE tenant kan aanhaken (cross-tenant-koppeling onmogelijk).
--
-- ONOMKEERBAAR NA CUTOVER: deze swaps zijn ALLEEN veilig omkeerbaar binnen het single-tenant-
-- venster. Zodra een 2e tenant overlappende keys heeft, faalt terugkeer naar UNIQUE(rule_key)/
-- UNIQUE(naam)/PK(dienst_key) op duplicaten. Draai dit in een onderhoudsraam MET DB-snapshot vooraf.
-- Echte rollback na cutover = SNAPSHOT-RESTORE, geen omgekeerde migratie.
--
-- Vereist: 067 (tenant_id-kolommen) + 071 (NOT NULL op de SS-default-tabellen) zijn toegepast.
--
-- Rollback (UITSLUITEND binnen single-tenant-venster, vóór een 2e tenant data heeft):
--   alter table public.lead_tags drop constraint if exists lead_tags_tag_same_tenant;
--   alter table public.lead_tags add constraint lead_tags_tag_id_fkey
--     foreign key (tag_id) references public.tags(id) on delete cascade;
--   alter table public.tags drop constraint if exists tags_tenant_id_uniq;
--   alter table public.external_calendar_events drop constraint if exists external_calendar_events_pkey;
--   alter table public.external_calendar_events add primary key (google_event_id);
--   alter table public.notification_preferences drop constraint if exists notification_preferences_pkey;
--   alter table public.notification_preferences add primary key (event_type, kanaal);
--   alter table public.tags drop constraint if exists tags_tenant_naam;
--   alter table public.tags add constraint tags_naam_key unique (naam);
--   alter table public.kostprijzen_per_dienst drop constraint if exists kostprijzen_per_dienst_pkey;
--   alter table public.kostprijzen_per_dienst add primary key (rule_key);
--   alter table public.service_offerings drop constraint if exists service_offerings_pkey;
--   alter table public.service_offerings add primary key (dienst_key);
--   alter table public.pricing_rules drop constraint if exists pricing_rules_tenant_rule_key;
--   alter table public.pricing_rules add constraint pricing_rules_rule_key_key unique (rule_key);

begin;

-- pricing_rules: UNIQUE(rule_key) -> UNIQUE(tenant_id, rule_key)
alter table public.pricing_rules drop constraint if exists pricing_rules_rule_key_key;
alter table public.pricing_rules
  add constraint pricing_rules_tenant_rule_key unique (tenant_id, rule_key);

-- service_offerings: PK(dienst_key) -> PK(tenant_id, dienst_key)
alter table public.service_offerings drop constraint if exists service_offerings_pkey;
alter table public.service_offerings
  add constraint service_offerings_pkey primary key (tenant_id, dienst_key);

-- kostprijzen_per_dienst: PK(rule_key) -> PK(tenant_id, rule_key)
alter table public.kostprijzen_per_dienst drop constraint if exists kostprijzen_per_dienst_pkey;
alter table public.kostprijzen_per_dienst
  add constraint kostprijzen_per_dienst_pkey primary key (tenant_id, rule_key);

-- tags: UNIQUE(naam) -> UNIQUE(tenant_id, naam). PK(id) blijft (id is FK-doel elders).
alter table public.tags drop constraint if exists tags_naam_key;
alter table public.tags
  add constraint tags_tenant_naam unique (tenant_id, naam);

-- notification_preferences: PK(event_type, kanaal) -> PK(tenant_id, event_type, kanaal)
alter table public.notification_preferences drop constraint if exists notification_preferences_pkey;
alter table public.notification_preferences
  add constraint notification_preferences_pkey primary key (tenant_id, event_type, kanaal);

-- external_calendar_events: PK(google_event_id) -> PK(tenant_id, google_event_id)
alter table public.external_calendar_events drop constraint if exists external_calendar_events_pkey;
alter table public.external_calendar_events
  add constraint external_calendar_events_pkey primary key (tenant_id, google_event_id);

-- Samengestelde FK: een lead_tag mag alleen een tag van DEZELFDE tenant aanhaken.
-- Vereist een UNIQUE(tenant_id, id) op tags als FK-doel; de oude FK op alleen tag_id vervalt.
alter table public.tags
  add constraint tags_tenant_id_uniq unique (tenant_id, id);

alter table public.lead_tags drop constraint if exists lead_tags_tag_id_fkey;
alter table public.lead_tags
  add constraint lead_tags_tag_same_tenant
  foreign key (tenant_id, tag_id) references public.tags(tenant_id, id) on delete cascade;

commit;

-- Verificatie (handmatig, na commit):
--   \d public.pricing_rules   -- pricing_rules_tenant_rule_key UNIQUE (tenant_id, rule_key)
--   \d public.service_offerings
--   \d public.lead_tags       -- lead_tags_tag_same_tenant FOREIGN KEY (tenant_id, tag_id) -> tags(tenant_id, id)
-- Controleer dat geen enkele FK nog naar de oude losse PK's verwijst.

