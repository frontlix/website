-- 063: toggle voor de "Klus afronden"-actie in het Overzicht.
--
-- Na een afspraak die voorbij is wil de owner kunnen melden of de klus
-- DOORGING (afgerond) of NIET (geblokkeerd). Deze toggle bepaalt of het
-- dashboard daarvoor een herinnering toont in "Eerst dit doen". Default aan;
-- de owner kan 'm uitzetten in Instellingen > Meldingen.
--
-- Veilig additief: de bot leest tenant_settings met select('*') en negeert
-- onbekende kolommen, dus deze kolom raakt de bot niet.
alter table public.tenant_settings
  add column if not exists klus_status_melden boolean not null default true;
