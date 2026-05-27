-- 045_tenant_omzet_doel_maand.sql
-- ============================================
-- Voegt een numeric kolom `omzet_doel_maand` toe aan `tenant_settings`.
-- Voedt de Hero KPI goal-ring op de nieuwe mobiele Overzicht-pagina:
-- als 'm gevuld is toont de ring (omzet / doel) * 100, anders een
-- placeholder met CTA "Stel je maanddoel in" naar Instellingen.
--
-- NULL = geen doel ingesteld → geen ring tonen.
-- Eenheid: hele euros (geen cents).

alter table tenant_settings
  add column if not exists omzet_doel_maand numeric null;

comment on column tenant_settings.omzet_doel_maand is
  'Maand-omzet-doel in euros voor de Hero KPI ring op MobileOverzicht. NULL = niet ingesteld.';
