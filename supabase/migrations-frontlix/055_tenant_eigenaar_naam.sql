-- 055: eigenaar_naam op tenant_settings (ondertekening klant-mails + owner-templates)
-- De bot leest tenant_settings.eigenaar_naam (CONFIG_SOURCE=db). Tot nu toe
-- bestond de kolom niet en viel de naam terug op ''. Voeg toe zodat de naam uit
-- de DB komt en via het dashboard live wijzigbaar is.
alter table public.tenant_settings
  add column if not exists eigenaar_naam text;

comment on column public.tenant_settings.eigenaar_naam is
  'Voornaam eigenaar, ondertekening in klant-mails en eigenaar-WhatsApp-templates. Live gelezen door de bot bij CONFIG_SOURCE=db.';
