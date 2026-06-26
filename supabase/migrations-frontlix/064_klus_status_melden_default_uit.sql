-- 064: standaard-default van de "Klus afronden"-herinnering naar UIT.
--
-- We gaan ervan uit dat een klus gewoon doorgaat, dus standaard geen
-- herinnering in "Eerst dit doen" na een voorbije afspraak. De owner kan 'm
-- alsnog aanzetten in Instellingen > Meldingen als hij wel een geheugensteun
-- wil. (063 zette de kolom nog op default true.)
--
-- Veilig additief: raakt alleen de kolom-default voor nieuwe rijen.
alter table public.tenant_settings
  alter column klus_status_melden set default false;
