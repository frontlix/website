-- 060_offerte_concepten.sql
-- Gedeelde handmatige-offerte-concepten (cross-device sync). Concepten stonden
-- in localStorage (per browser/apparaat); deze tabel maakt ze accountbreed
-- gedeeld. LOSSTAAND van leads/offertes: de bot ziet deze rijen nooit, dus
-- geen halve leads in de pijplijn.
--
-- data     = canonieke ManualOfferteData (gedeelde, cross-wizard vorm)
-- v2_state = rijke OfferteDraftState van de v2-wizard (incl. losse vrije
--            meerwerk-regels); null bij een legacy(mobiel)-concept.

create table if not exists public.offerte_concepten (
  id            uuid primary key default gen_random_uuid(),
  data          jsonb not null,
  v2_state      jsonb,
  label         text not null default '',
  totaal        numeric not null default 0,
  bijgewerkt_op timestamptz not null default now(),
  aangemaakt_op timestamptz not null default now()
);

-- Lijst toont nieuwste eerst.
create index if not exists offerte_concepten_bijgewerkt_idx
  on public.offerte_concepten (bijgewerkt_op desc);
