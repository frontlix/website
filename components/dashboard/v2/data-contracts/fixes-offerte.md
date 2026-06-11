# Fix-brief: Offerte-wizard (data-koppeling)

Los onderstaande parity-issues op. Houd de v2-look + scroll/hoogte ongewijzigd; verander alleen wat nodig is. Gebruik de bestaande (app)-implementatie als referentie (hergebruik geocode/validatie/acties, verzin niets nieuws). Behoud de demo-fallback (geen sessie -> demo).

## 1. [HIGH] `components/dashboard/v2/offerte/StapKlant.tsx`

**Probleem:** Postcode-autofill (regels 80-91) schrijft hardcoded demo-data in de echte klant: zodra een NIEUWE klant postcode (>=6 tekens) + nr heeft en straat leeg is, wordt straat=Stationsweg, plaats=Amersfoort gezet. Die velden gaan via mapWizardToManualOfferte naar createManualLeadEnOfferte rechtstreeks de leads-tabel in en in de PDF. Elke handmatige nieuwe offerte zonder ingetypte straat krijgt zo een fictief Amersfoorts adres. De bestaande app doet hier een ECHTE geocode-lookup (getAutoAfstandKm -> res.street/res.city) i.p.v. een vaste demo-string.

**Fix:** Verwijder de demo-autofill useEffect, of vervang door de bestaande geocode-helper getAutoAfstandKm(postcode, huisnummer) zoals ManualOfferteModal.tsx (regels 185-201): alleen straat/plaats vullen als ze leeg zijn en res.ok. Schrijf nooit een constante adres-string naar invulbare velden.

## 2. [HIGH] `components/dashboard/v2/offerte/StapKlant.tsx`

**Probleem:** De AI-plak Vul-automatisch-in-knop (regels 117-138) zet een vaste demo-klant in de state: naam Familie Bakker, Dorpsstraat 41, Amersfoort, tel 06 23 45 67 81 (uit AI_PLAK in offerte-data.ts). Dit is geen echte AI-extractie maar een UI-demo; de waarden zijn wel submitbaar en belanden bij verzenden als echte lead in de DB. Een klik creeert een fictieve klant in productie.

**Fix:** AI-plak-kaart verbergen tot echte extractie bestaat, of de knop disabled/no-op maken in de gekoppelde versie. Laat de knop in elk geval geen hardcoded persoonsgegevens in de submit-state schrijven.

## 3. [MEDIUM] `components/dashboard/v2/offerte/OfferteWizard.tsx`

**Probleem:** Geen e-mailvalidatie-gate voor submit en e-mailkanaal degradeert stilzwijgend. De bestaande app gate't stap 1 met isValidEmail(data.email) (StepKlant.tsx regel 464; e-mail verplicht+geldig). De v2-wizard gate't alleen op klant.naam (klantOk). Als kanaal email is maar het e-mailveld leeg/ongeldig is, mapt het naar kanaal mail, maar de server-action slaat de mailverzending over (manual-offerte-actions.ts regel 223: if data.kanaal === mail && data.email.trim()) en geeft ok:true ZONDER mailError. De wizard toont dan OfferteVerzonden Offerte verstuurd via e-mail terwijl er niets verstuurd is.

**Fix:** Neem dezelfde isValidEmail-gate over voor de e-mailkanaal-keuze/submit (blokkeer e-mail-versturen zonder geldig adres), of detecteer in handleVerstuur dat kanaal mail is met leeg/ongeldig adres en toon dan dezelfde inline-fout i.p.v. de verzonden-staat.

## 4. [MEDIUM] `components/dashboard/v2/offerte/offerte-mappers.ts`

**Probleem:** Vrije meerwerk-regels worden niet gepersisteerd. De wizard-state vrij (bv. Meerwerk: rij tegels recht leggen EUR 45) telt mee in het live totaal en de rail (OfferteWizard.tsx regel 197), maar mapWizardToManualOfferte negeert vrij volledig. De server recomputet alleen de auto-regels (computeRules); de opgeslagen offerte mist de meerwerk-regel en heeft een lager totaal dan wat de gebruiker zag en goedkeurde. De bestaande app vangt extra werk op via extra_arbeid_minuten/personen/omschrijving.

**Fix:** Map de vrije regels naar de bestaande extra_arbeid-velden (omschrijving + minuten/bedrag) of geef ze door op een manier die de server-action begrijpt. Geef geen offerte op die zichtbaar afwijkt van het getoonde totaal zonder dat de gebruiker dat weet.

## 5. [MEDIUM] `components/dashboard/v2/offerte/offerte-mappers.ts`

**Probleem:** BTW-keuze en vast-bedrag-korting worden genegeerd. De v2-UI laat de gebruiker btw kiezen (21%/9%/0%/Verlegd, StapOfferte) en toont dat in de rail, maar de mapper geeft btw niet door en de server rekent altijd 21% (TotalsComputed.btw = 21% over total). Ook korting_bedrag (vast euro) wordt nooit gezet; alleen korting_percentage. Een 9%/verlegd-offerte wordt dus als 21% opgeslagen/gemaild.

**Fix:** Als 9%/0%/Verlegd echt ondersteund moet zijn, breid payload/server-action uit (anders bewuste follow-up). Anders: verberg/disable de niet-21%-opties in de v2-UI zodat de getoonde BTW overeenkomt met wat wordt opgeslagen. Documenteer de afwijking als die blijft staan.

## 6. [MEDIUM] `components/dashboard/v2/offerte/offerte-mappers.ts`

**Probleem:** afstand_km wordt nooit gezet en blijft op DEFAULTS (25). De rules-engine voegt reiskosten toe zodra afstand_km > reiskosten_drempel_km (manual-offerte-rules.ts regel 197). De bestaande app geocodet het echte adres en zet afstand_km op de werkelijke enkele-reis-afstand (ManualOfferteModal.tsx regel 197). Bij tenants met drempel < 25 km krijgt elke v2-offerte een onbedoelde reiskosten-regel; bij grote afstanden mist juist de reiskosten. Het persisted totaal kan afwijken zonder dat de gebruiker iets invoerde.

**Fix:** Bereken afstand_km via dezelfde getAutoAfstandKm/geocode-flow als de bestaande modal en zet die in de payload, of geef expliciet afstand_km: 0 mee zodat er nooit een onbedoelde reiskosten-regel ontstaat. Niet op DEFAULT 25 laten staan.
