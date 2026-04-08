import type { BrancheConfig } from './types'
import { parseNumber, withBtw, round2 } from './types'

/**
 * Branche-config voor dakdekker.
 *
 * Prijsmodel:
 *  - Tarief per m² afhankelijk van type werk:
 *      vervangen → €120/m²
 *      repareren → €60/m²
 *      isoleren  → €90/m²
 *  - Optioneel isolatiepakket: €1.500 forfait
 *  - Spoedtoeslag: +25% op subtotaal als spoed=ja
 *  - 21% BTW
 */
export const dakdekkerConfig: BrancheConfig = {
  id: 'dakdekker',
  label: 'Dakdekker',
  agentName: 'Bram',
  personality:
    'Bram werkt voor Dakwerken Holland B.V. Hij is een no-nonsense vakman: kort, helder en praktisch. ' +
    'Hij gebruikt informeel Nederlands (je/jij) en vraagt door als iets onduidelijk is. Hij maakt geen ' +
    'omhaal en stelt direct de juiste vraag.',
  company: {
    name: 'Dakwerken Holland B.V.',
    addressLines: ['Industrieweg 42', '3542 AD Utrecht', 'Nederland'],
    phone: '+31 30 234 5678',
    email: 'info@dakwerken-holland.nl',
    website: 'www.dakwerken-holland.nl',
    kvk: '23456789',
    btw: 'NL234567890B01',
    iban: 'NL30 RABO 0123 4567 89',
    contactPerson: 'M. van Dijk',
  },
  introOfferte:
    'Naar aanleiding van het voorgaande WhatsApp-gesprek ontvangt u hierbij ons voorstel voor de gewenste ' +
    'werkzaamheden aan uw dak.',
  aanbodBeschrijving:
    'Uitvoering van dakwerkzaamheden inclusief materiaal, arbeid, afvoer en afwerking. Wij werken volgens ' +
    'de geldende garantievoorwaarden van het Vakbond Dakdekkers Nederland.',
  actieKort: 'Dakwerk inplannen',
  actieLang: 'het dakwerk',
  plaatsingDuurMin: 480, // 8 uur = hele werkdag
  fields: [
    {
      key: 'type_werk',
      label: 'type werkzaamheden',
      exampleQuestion: 'Wat moet er gebeuren — dak vervangen, repareren of isoleren?',
      type: 'enum',
      enumValues: ['vervangen', 'repareren', 'isoleren'],
    },
    {
      key: 'daktype',
      label: 'type dak',
      exampleQuestion: 'Is het een plat of schuin dak?',
      type: 'enum',
      enumValues: ['plat', 'schuin'],
    },
    {
      key: 'huidig_dakmateriaal',
      label: 'huidig dakmateriaal',
      exampleQuestion: 'Wat ligt er nu op het dak? (bv. dakpannen, bitumen, EPDM, leisteen)',
      type: 'text',
      hints: ['dakpannen', 'bitumen', 'epdm', 'leisteen', 'zink', 'roofing'],
    },
    {
      key: 'dakoppervlakte',
      label: 'dakoppervlakte in m²',
      exampleQuestion: 'Hoe groot is het dakvlak ongeveer in m²?',
      type: 'number',
      unit: 'm²',
      hints: ['50', '80 m2', 'ongeveer 120'],
    },
    {
      key: 'isolatie',
      label: 'isolatie gewenst',
      exampleQuestion: 'Wil je het dak ook laten isoleren? (ja of nee)',
      type: 'enum',
      enumValues: ['ja', 'nee'],
    },
    {
      key: 'spoed',
      label: 'spoed',
      exampleQuestion: 'Is het spoed of mag het binnen een paar weken ingepland worden?',
      type: 'enum',
      enumValues: ['ja', 'nee'],
    },
  ],
  pricing: (answers) => {
    const m2 = parseNumber(answers.dakoppervlakte) || 50
    const typeWerk = (answers.type_werk || 'repareren').toLowerCase()

    const tarieven: Record<string, number> = {
      vervangen: 120,
      repareren: 60,
      isoleren: 90,
    }
    const tarief = tarieven[typeWerk] ?? 80

    const lines = [
      {
        omschrijving: `Dakwerk: ${typeWerk}`,
        aantal: m2,
        eenheid: 'm²',
        prijsPerEenheid: tarief,
        totaal: round2(m2 * tarief),
      },
    ]

    // Apart isolatiepakket — alleen toegevoegd als type_werk niet al 'isoleren' is
    if ((answers.isolatie || '').toLowerCase() === 'ja' && typeWerk !== 'isoleren') {
      lines.push({
        omschrijving: 'Isolatiepakket (PIR-platen + dampscherm)',
        aantal: 1,
        eenheid: 'pakket',
        prijsPerEenheid: 1500,
        totaal: 1500,
      })
    }

    let subtotaal = lines.reduce((sum, l) => sum + l.totaal, 0)

    // Spoedtoeslag = 25% bovenop het subtotaal
    if ((answers.spoed || '').toLowerCase() === 'ja') {
      const spoedBedrag = round2(subtotaal * 0.25)
      lines.push({
        omschrijving: 'Spoedtoeslag (binnen 5 werkdagen)',
        aantal: 1,
        eenheid: 'stuks',
        prijsPerEenheid: spoedBedrag,
        totaal: spoedBedrag,
      })
      subtotaal += spoedBedrag
    }

    return { lines, ...withBtw(subtotaal) }
  },
}
