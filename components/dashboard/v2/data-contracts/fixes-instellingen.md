# Fix-brief: Instellingen (data-koppeling)

Los onderstaande parity-issues op. Houd de v2-look + scroll/hoogte ongewijzigd; verander alleen wat nodig is. Gebruik de bestaande (app)-implementatie als referentie (hergebruik geocode/validatie/acties, verzin niets nieuws). Behoud de demo-fallback (geen sessie -> demo).

## 1. [HIGH] `components/dashboard/v2/instellingen/instellingen-mappers.ts`

**Probleem:** De Diensten-prijs-koppeling neemt aan dat service_offerings.dienst_key gelijk is aan pricing_rules.rule_key. toDiensten doet prijsByKey.get(s.dienst_key), buildPrijsKeyLookup gate't op ruleKeys.has(s.dienst_key) en bewaar() roept updatePricingRule(s.dienst_key) aan. In de (app)-implementatie worden deze tabellen NOOIT gejoind: DienstenSection toont alleen toggles, prijzen leven apart gekeyd op rule_key. Vallen de keyspaces niet samen (niet bevestigbaar uit de repo, beide tabellen buiten de migraties geseed), dan toont elke dienst een lege prijs en schrijft Opslaan nooit een prijs weg: stille regressie t.o.v. de v1 Prijzen-editor.

**Fix:** Bevestig of dienst_key gelijk is aan rule_key voor prijs-dragende diensten. Zo niet: expliciete dienst_key->rule_key mapping invoeren, of de prijs-kolom uit DienstenPanel halen en prijzen bij rule_key houden zoals v1.

## 2. [MEDIUM] `components/dashboard/v2/instellingen/InstellingenClient.tsx`

**Probleem:** De thuisbasis (Vertrekadres/basis) is in v1 persistent via saveTenantBase (geocoding postcode.tech naar base_lat/lng). In v2 is basis een gewoon Field met setBasis en wordt nergens opgeslagen; bewaar() voor Bedrijfsprofiel schrijft alleen het maanddoel. Het veld lijkt bewerkbaar, toont Opgeslagen, maar de wijziging is bij refresh weg en base_lat/lng worden nooit hergeocodeerd. Mutatie-parity-regressie.

**Fix:** Koppel het basis-veld aan de bestaande saveTenantBase-action (huisnummer/label/postcode zoals TenantBaseForm), of maak het read-only tot de geocoding-flow gewired is.

## 3. [MEDIUM] `components/dashboard/v2/instellingen/panels/BedrijfsprofielPanel.tsx`

**Probleem:** Bedrijfsnaam, KvK, Adres, Telefoon en E-mail zijn bewerkbare Field-inputs, maar bewaar() persisteert ze niet (in v1 zijn dit expliciet ReadOnlyField met Read-only-pill). Gebruiker kan ze wijzigen, Opslaan klikken, Opgeslagen zien en de wijziging is bij refresh weg. Silent data-loss / misleidende UI.

**Fix:** Maak deze velden read-only (consistent met v1) of wire ze aan een bestaande tenant-update-action. KvK bestaat niet op tenant_settings en hoort niet bewerkbaar.
