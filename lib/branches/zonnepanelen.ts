import type { BrancheConfig } from './types'
import { parseNumber, withBtw, round2 } from './types'

/**
 * Branche-config voor zonnepanelen.
 *
 * Prijsmodel (matched het patroon van de referentie-PDF):
 *  - panelen-aantal = ceil(jaarverbruik / 380 kWh per paneel)
 *  - €175 per paneel (levering)
 *  - €40 per paneel (montage)
 *  - €1.100 omvormer
 *  - €450 steiger plaatsen (alleen bij schuin dak)
 *  - €3.300 toeslag rietdak (alleen als dakmateriaal = riet)
 *  - 21% BTW over alles
 */
export const zonnepanelenConfig: BrancheConfig = {
  id: 'zonnepanelen',
  label: 'Zonnepanelen',
  agentName: 'Sanne',
  personality:
    'Sanne werkt voor SolarPower Nederland B.V. Ze is technisch onderlegd, vriendelijk en to-the-point. Ze stelt ' +
    'duidelijke vragen om snel een passende offerte te kunnen maken. Ze gebruikt informeel Nederlands (je/jij) en ' +
    'klinkt enthousiast over duurzame energie zonder overdreven te worden.',
  company: {
    name: 'SolarPower Nederland B.V.',
    addressLines: ['Zonneweg 15', '2511 BK Den Haag', 'Nederland'],
    phone: '+31 70 345 6789',
    email: 'info@solarpower-nl.nl',
    website: 'www.solarpower-nl.nl',
    kvk: '12345678',
    btw: 'NL123456789B01',
    iban: 'NL20 INGB 0001 2345 67',
    contactPerson: 'J. de Groot',
  },
  introOfferte:
    'Naar aanleiding van de voorgaande gesprekken sturen wij u graag een zakelijk voorstel voor de hieronder ' +
    'beschreven werkzaamheden.',
  aanbodBeschrijving:
    'Levering en installatie van een compleet zonnepanelensysteem, inclusief panelen, omvormer, montagesysteem ' +
    'en aansluiting op het elektriciteitsnet.',
  actieKort: 'Plaatsing inplannen',
  actieLang: 'de plaatsing van de zonnepanelen',
  plaatsingDuurMin: 480, // 8 uur = hele werkdag
  fields: [
    {
      key: 'adres',
      label: 'adres of postcode + huisnummer',
      exampleQuestion: 'Wat is het adres of de postcode + huisnummer van de woning?',
      type: 'text',
    },
    {
      key: 'jaarverbruik',
      label: 'jaarverbruik in kWh',
      exampleQuestion: 'Hoeveel stroom verbruik je ongeveer per jaar in kWh? (staat op je jaarafrekening)',
      type: 'number',
      unit: 'kWh',
      hints: ['3500', '4000 kWh', '5.000', 'ongeveer 6000'],
    },
    {
      key: 'daktype',
      label: 'type dak',
      exampleQuestion: 'Heb je een schuin of een plat dak?',
      type: 'enum',
      enumValues: ['schuin', 'plat'],
    },
    {
      key: 'dakmateriaal',
      label: 'dakmateriaal',
      exampleQuestion: 'En wat voor dakmateriaal heb je? (pannen, riet, leisteen of dakbedekking bij plat dak)',
      type: 'enum',
      enumValues: ['pannen', 'riet', 'leisteen', 'dakbedekking'],
    },
    {
      key: 'dakoppervlakte',
      label: 'dakoppervlakte in m²',
      exampleQuestion: 'Hoe groot is het dakvlak waar de panelen op kunnen, in m²?',
      type: 'number',
      unit: 'm²',
      hints: ['40', '60 m2', 'ongeveer 80'],
    },
    {
      key: 'orientatie',
      label: 'oriëntatie van het dak',
      exampleQuestion: 'Naar welke kant ligt het dak? (noord, oost, zuid of west)',
      type: 'enum',
      enumValues: ['noord', 'oost', 'zuid', 'west'],
    },
    {
      key: 'schaduw',
      label: 'mate van schaduw op het dak',
      exampleQuestion: 'Is er schaduw op het dak gedurende de dag? (geen, licht of veel)',
      type: 'enum',
      enumValues: ['geen', 'licht', 'veel'],
    },
    {
      key: 'aansluiting',
      label: 'type aansluiting',
      exampleQuestion: 'Heb je een 1-fase of 3-fase aansluiting? (staat in de meterkast)',
      type: 'enum',
      enumValues: ['1-fase', '3-fase'],
    },
  ],
  pricing: (answers) => {
    const jaarverbruik = parseNumber(answers.jaarverbruik) || 4000
    // Een zonnepaneel produceert ongeveer 380 kWh/jaar in NL
    const aantalPanelen = Math.max(1, Math.ceil(jaarverbruik / 380))

    const lines = [
      {
        omschrijving: 'Zonnepanelen levering',
        aantal: aantalPanelen,
        eenheid: 'stuks',
        prijsPerEenheid: 175,
        totaal: round2(aantalPanelen * 175),
      },
      {
        omschrijving: 'Montage en installatie',
        aantal: aantalPanelen,
        eenheid: 'stuks',
        prijsPerEenheid: 40,
        totaal: round2(aantalPanelen * 40),
      },
      {
        omschrijving: 'Omvormer levering en installatie',
        aantal: 1,
        eenheid: 'stuks',
        prijsPerEenheid: 1100,
        totaal: 1100,
      },
    ]

    // Steiger alleen bij schuin dak nodig
    if ((answers.daktype || '').toLowerCase() === 'schuin') {
      lines.push({
        omschrijving: 'Steiger plaatsen en verwijderen',
        aantal: 1,
        eenheid: 'stuks',
        prijsPerEenheid: 450,
        totaal: 450,
      })
    }

    // Rietdak vereist extra werk en speciale montage
    if ((answers.dakmateriaal || '').toLowerCase() === 'riet') {
      lines.push({
        omschrijving: 'Toeslag rietdak montage',
        aantal: 1,
        eenheid: 'stuks',
        prijsPerEenheid: 3300,
        totaal: 3300,
      })
    }

    const subtotaal = lines.reduce((sum, l) => sum + l.totaal, 0)
    return { lines, ...withBtw(subtotaal) }
  },
}
