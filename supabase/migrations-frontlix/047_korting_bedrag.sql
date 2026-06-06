-- 047_korting_bedrag.sql
-- ============================================
-- Voegt een numeric kolom `korting_bedrag` toe aan `leads` voor een
-- vaste actiekorting in euro's, naast de bestaande `korting_percentage`.
--
-- Conventie: korting_bedrag > 0 ⇒ vast-bedrag-modus (het euro-bedrag,
-- gecapt op de kortbare grondslag); 0 ⇒ percentage-modus.

alter table public.leads
  add column if not exists korting_bedrag numeric not null default 0;
comment on column public.leads.korting_bedrag is
  'Vaste actiekorting in euro (>0 = vast bedrag i.p.v. percentage). 0 = percentage-modus.';
