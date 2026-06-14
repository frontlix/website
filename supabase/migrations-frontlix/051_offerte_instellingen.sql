-- 051_offerte_instellingen.sql
-- Maakt de Offertes-instellingen (BTW, betaaltermijn, offertenummer-formaat)
-- echt configureerbaar per tenant, plus een atomische teller voor doorlopende
-- offertenummers (PREFIX-JAAR-volgnummer, bv. SS-2026-001).
--
-- Single-tenant setup: er is precies één tenant_settings-rij. De teller-functie
-- werkt daarom op die ene rij (geen tenant_id-param).

-- ── Instellingen op tenant_settings ──────────────────────────────────────
alter table tenant_settings
  add column if not exists offerte_btw_tarief numeric not null default 21,
  add column if not exists offerte_betaaltermijn_dagen integer not null default 14,
  add column if not exists offerte_nummer_prefix text not null default 'SS',
  -- Teller-state voor de doorlopende nummering. Jaar = null → eerste gebruik
  -- zet 'm op het huidige jaar; teller reset bij jaarwissel.
  add column if not exists offerte_nummer_teller integer not null default 0,
  add column if not exists offerte_nummer_jaar integer;

-- ── Toegekend nummer per offerte (eenmalig toegekend, daarna vast) ────────
alter table offertes
  add column if not exists offertenummer text;

-- ── Atomische teller: geeft het volgende offertenummer en hoogt op ────────
-- Race-veilig dankzij SELECT ... FOR UPDATE op de tenant_settings-rij, zodat
-- twee gelijktijdige offertes nooit hetzelfde nummer krijgen. Reset het
-- volgnummer bij een jaarwissel.
create or replace function next_offerte_nummer()
returns text
language plpgsql
as $$
declare
  v_prefix  text;
  v_jaar    int;
  v_teller  int;
  v_huidig  int := extract(year from now())::int;
  v_nieuw   int;
begin
  select coalesce(offerte_nummer_prefix, 'OFF'),
         coalesce(offerte_nummer_jaar, v_huidig),
         coalesce(offerte_nummer_teller, 0)
    into v_prefix, v_jaar, v_teller
  from tenant_settings
  limit 1
  for update;

  if not found then
    -- Geen tenant_settings-rij (zou niet mogen): veilige fallback.
    return 'OFF-' || v_huidig::text || '-001';
  end if;

  -- Jaarwissel → volgnummer opnieuw vanaf 1.
  if v_jaar <> v_huidig then
    v_jaar := v_huidig;
    v_teller := 0;
  end if;

  v_nieuw := v_teller + 1;

  update tenant_settings
     set offerte_nummer_teller = v_nieuw,
         offerte_nummer_jaar = v_jaar;

  -- PREFIX-JAAR-### (volgnummer 3-cijferig, groeit vanzelf door bij >999).
  return v_prefix || '-' || v_jaar::text || '-' || lpad(v_nieuw::text, 3, '0');
end;
$$;
