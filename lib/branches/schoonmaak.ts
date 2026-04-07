import type { BrancheConfig } from './types'
import { parseNumber, withBtw, round2 } from './types'

/**
 * Branche-config voor schoonmaak.
 *
 * Prijsmodel:
 *  - m² × tarief per frequentie:
 *      eenmalig    → €1.20/m²
 *      wekelijks   → €0.80/m²
 *      2-wekelijks → €0.95/m²
 *      maandelijks → €1.10/m²
 *  - Ramen meedoen: +€0.50/m² (eenmalig per beurt)
 *  - 21% BTW
 *
 * Bedrag op de PDF is per beurt — bij wekelijks/2-wekelijks/maandelijks is dat
 * dus per terugkerende beurt, niet maandelijks of jaarlijks totaal.
 */
export const schoonmaakConfig: BrancheConfig = {
  id: 'schoonmaak',
  label: 'Schoonmaak',
  agentName: 'Lotte',
  personality:
    'Lotte werkt voor Glanz Schoonmaak B.V. Ze is warm, behulpzaam en informeel. Ze gebruikt informeel ' +
    'Nederlands (je/jij), is service-gericht en zorgt dat de klant zich op zijn gemak voelt. Geen jargon, ' +
    'gewoon menselijk en duidelijk.',
  company: {
    name: 'Glanz Schoonmaak B.V.',
    addressLines: ['Bloemstraat 88', '1016 ML Amsterdam', 'Nederland'],
    phone: '+31 20 456 7890',
    email: 'info@glanz-schoonmaak.nl',
    website: 'www.glanz-schoonmaak.nl',
    kvk: '34567890',
    btw: 'NL345678901B01',
    iban: 'NL40 ABNA 0234 5678 90',
    contactPerson: 'S. Bakker',
  },
  introOfferte:
    'Bedankt voor je interesse in onze schoonmaakdiensten. Hieronder vind je het voorstel op basis van het ' +
    'WhatsApp-gesprek dat we hadden.',
  aanbodBeschrijving:
    'Professionele schoonmaakdienst inclusief alle benodigde materialen, milieuvriendelijke producten en ' +
    'aansprakelijkheidsverzekering. Wij werken met vaste medewerkers zodat je altijd hetzelfde gezicht over de vloer hebt.',
  fields: [
    {
      key: 'adres',
      label: 'adres of postcode + huisnummer',
      exampleQuestion: 'Wat is het adres van het pand dat schoongemaakt moet worden?',
      type: 'text',
    },
    {
      key: 'type_pand',
      label: 'type pand',
      exampleQuestion: 'Wat voor pand is het — woning, kantoor, horeca of winkel?',
      type: 'enum',
      enumValues: ['woning', 'kantoor', 'horeca', 'winkel'],
    },
    {
      key: 'oppervlakte',
      label: 'oppervlakte in m²',
      exampleQuestion: 'Hoeveel m² moet er schoongemaakt worden?',
      type: 'number',
      unit: 'm²',
      hints: ['80', '120 m2', 'ongeveer 200'],
    },
    {
      key: 'frequentie',
      label: 'frequentie van de schoonmaak',
      exampleQuestion: 'Hoe vaak wil je het laten doen — eenmalig, wekelijks, 2-wekelijks of maandelijks?',
      type: 'enum',
      enumValues: ['eenmalig', 'wekelijks', '2-wekelijks', 'maandelijks'],
    },
    {
      key: 'ramen',
      label: 'ramen meedoen',
      exampleQuestion: 'Wil je dat we de ramen ook meenemen? (ja of nee)',
      type: 'enum',
      enumValues: ['ja', 'nee'],
    },
  ],
  pricing: (answers) => {
    const m2 = parseNumber(answers.oppervlakte) || 80
    const frequentie = (answers.frequentie || 'eenmalig').toLowerCase()

    const tarieven: Record<string, number> = {
      eenmalig: 1.2,
      wekelijks: 0.8,
      '2-wekelijks': 0.95,
      maandelijks: 1.1,
    }
    const tarief = tarieven[frequentie] ?? 1.0

    const lines = [
      {
        omschrijving: `Schoonmaak ${frequentie} (per beurt)`,
        aantal: m2,
        eenheid: 'm²',
        prijsPerEenheid: tarief,
        totaal: round2(m2 * tarief),
      },
    ]

    if ((answers.ramen || '').toLowerCase() === 'ja') {
      lines.push({
        omschrijving: 'Ramen meenemen',
        aantal: m2,
        eenheid: 'm²',
        prijsPerEenheid: 0.5,
        totaal: round2(m2 * 0.5),
      })
    }

    const subtotaal = lines.reduce((sum, l) => sum + l.totaal, 0)
    return { lines, ...withBtw(subtotaal) }
  },
}
