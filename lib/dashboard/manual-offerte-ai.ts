'use server'

import OpenAI from 'openai'
import { getDashboardSupabase } from './supabase-server'

/**
 * Geëxtraheerde velden uit een ruw bericht (WhatsApp / e-mail). Alles
 * is `null`-baar — de LLM vult alleen wat ie écht in de tekst vindt,
 * zodat we geen hallucinaties in de wizard mergen.
 */
export type ExtractedFields = {
  naam: string | null
  bedrijf: string | null
  telefoon: string | null
  email: string | null
  postcode: string | null
  huisnummer: string | null
  straat: string | null
  plaats: string | null
  // Factuur-adres — alleen invullen als de tekst expliciet een ánder
  // adres voor de factuur noemt. Bij één adres of impliciet hetzelfde
  // adres → alle factuur-velden null (de wizard houdt dan factuur_zelfde
  // op true).
  factuur_postcode: string | null
  factuur_huisnummer: string | null
  factuur_straat: string | null
  factuur_plaats: string | null
  hoofdcategorie: 'oprit_terras_terrein' | 'onkruidbeheersing' | null
  sub_diensten: Array<'invegen' | 'preventieve_onkruid' | 'beschermlaag' | 'onderhoud'>
  m2: number | null
  // Voegzand — booleans schakelen het type aan in de wizard, aantal
  // zakken / prijs vullen alleen als die concreet in de tekst staan.
  voegzand_normaal: boolean | null
  voegzand_normaal_zakken: number | null
  voegzand_normaal_prijs: number | null
  voegzand_onkruidwerend: boolean | null
  voegzand_onkruidwerend_zakken: number | null
  voegzand_onkruidwerend_prijs: number | null
  // Kleur voegzand. Mag beide tegelijk (mix) als de klant dat noemt.
  kleur_naturel: boolean | null
  kleur_antraciet: boolean | null
  // Plantenafscherming — boolean schakelt aan, rollen/prijs alleen
  // als concreet genoemd.
  planten_afschermen: boolean | null
  planten_afschermen_rollen: number | null
  planten_afschermen_prijs: number | null
  groene_aanslag: boolean | null
  // Onderhoud-frequentie — alleen als 'onderhoud' in sub_diensten zit
  // én klant een interval noemt. Restrict tot de 4 toegestane waardes.
  onderhoud_weken: 4 | 8 | 12 | 16 | null
  wensen: string | null
}

export type ExtractResult =
  | { ok: true; fields: ExtractedFields }
  | { ok: false; error: string }

/**
 * JSON-schema voor OpenAI structured-output. Alle keys zijn `required`
 * (verplicht door strict-mode); optionele velden geven we via `["type",
 * "null"]` aan zodat het model expliciet null teruggeeft i.p.v. te
 * hallucineren of te omitten.
 */
const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'naam',
    'bedrijf',
    'telefoon',
    'email',
    'postcode',
    'huisnummer',
    'straat',
    'plaats',
    'factuur_postcode',
    'factuur_huisnummer',
    'factuur_straat',
    'factuur_plaats',
    'hoofdcategorie',
    'sub_diensten',
    'm2',
    'voegzand_normaal',
    'voegzand_normaal_zakken',
    'voegzand_normaal_prijs',
    'voegzand_onkruidwerend',
    'voegzand_onkruidwerend_zakken',
    'voegzand_onkruidwerend_prijs',
    'kleur_naturel',
    'kleur_antraciet',
    'planten_afschermen',
    'planten_afschermen_rollen',
    'planten_afschermen_prijs',
    'groene_aanslag',
    'onderhoud_weken',
    'wensen',
  ],
  properties: {
    naam: { type: ['string', 'null'], description: 'Voor- en achternaam, of voornaam alleen als rest niet genoemd' },
    bedrijf: { type: ['string', 'null'], description: 'Bedrijfs- of VVE-naam, alleen als expliciet genoemd' },
    telefoon: { type: ['string', 'null'], description: 'NL-telefoonnummer in elke vorm (06.., +31.., 0031..)' },
    email: { type: ['string', 'null'], description: 'E-mailadres' },
    postcode: { type: ['string', 'null'], description: 'NL-postcode (1234 AB of 1234AB)' },
    huisnummer: { type: ['string', 'null'], description: 'Huisnummer met optionele toevoeging (14, 14A, 14-2)' },
    straat: { type: ['string', 'null'] },
    plaats: { type: ['string', 'null'] },
    factuur_postcode: {
      type: ['string', 'null'],
      description:
        'Postcode van het factuur-adres — ALLEEN invullen als klant expliciet een ander adres voor de factuur noemt (woorden als "factuur", "facturatie", "factuuradres", "rekening naar"). Anders null.',
    },
    factuur_huisnummer: {
      type: ['string', 'null'],
      description: 'Huisnummer van het factuur-adres. Zelfde regel: alleen bij expliciet ander adres.',
    },
    factuur_straat: { type: ['string', 'null'] },
    factuur_plaats: { type: ['string', 'null'] },
    hoofdcategorie: {
      type: ['string', 'null'],
      enum: ['oprit_terras_terrein', 'onkruidbeheersing', null],
      description:
        'oprit_terras_terrein: oprit/terras/bestrating reiniging+voegzand. onkruidbeheersing: alleen onkruidbestrijding.',
    },
    sub_diensten: {
      type: 'array',
      items: {
        type: 'string',
        enum: ['invegen', 'preventieve_onkruid', 'beschermlaag', 'onderhoud'],
      },
      description:
        'invegen=reiniging+voegzand. preventieve_onkruid=eenmalige onkruidbehandeling. beschermlaag=impregneer-coating. onderhoud=terugkerende beurten.',
    },
    m2: { type: ['number', 'null'], description: 'Oppervlakte in m². Som van alle stukken indien meerdere genoemd.' },
    voegzand_normaal: { type: ['boolean', 'null'], description: 'true als klant standaard voegzand wil. Bij twijfel: false; alleen true bij expliciete vermelding.' },
    voegzand_normaal_zakken: { type: ['number', 'null'], description: 'Aantal zakken normaal voegzand — alleen als concreet getal genoemd.' },
    voegzand_normaal_prijs: { type: ['number', 'null'], description: 'Prijs per zak normaal voegzand in euro\'s — alleen als concreet bedrag genoemd. Komma → punt (3,10 → 3.10).' },
    voegzand_onkruidwerend: { type: ['boolean', 'null'], description: 'true als klant onkruidwerend voegzand wil' },
    voegzand_onkruidwerend_zakken: { type: ['number', 'null'], description: 'Aantal zakken onkruidwerend voegzand — alleen als concreet getal genoemd.' },
    voegzand_onkruidwerend_prijs: { type: ['number', 'null'], description: 'Prijs per zak onkruidwerend voegzand in euro\'s — alleen als concreet bedrag genoemd.' },
    kleur_naturel: { type: ['boolean', 'null'], description: 'true als klant naturel/zandkleur voegzand wil. Mag tegelijk met antraciet (mix).' },
    kleur_antraciet: { type: ['boolean', 'null'], description: 'true als klant antraciet/zwart voegzand wil. Mag tegelijk met naturel (mix).' },
    planten_afschermen: { type: ['boolean', 'null'], description: 'true als klant beplanting/borders wil afschermen' },
    planten_afschermen_rollen: { type: ['number', 'null'], description: 'Aantal rollen afschermfolie — alleen als concreet genoemd.' },
    planten_afschermen_prijs: { type: ['number', 'null'], description: 'Prijs per rol in euro\'s — alleen als concreet bedrag genoemd.' },
    groene_aanslag: { type: ['boolean', 'null'], description: 'true als klant groene aanslag/mos noemt' },
    onderhoud_weken: {
      type: ['integer', 'null'],
      enum: [4, 8, 12, 16, null],
      description:
        'Onderhoud-interval in weken — alleen als sub_diensten "onderhoud" bevat én klant een frequentie noemt. Map ongeveer: maandelijks=4, 2-maandelijks=8, kwartaal=12, 4-maandelijks=16.',
    },
    wensen: {
      type: ['string', 'null'],
      description:
        'Vrije tekst die niet in een ander veld past — gewenste behandeling, opmerking, kleurvoorkeur, planning, etc. Kort houden.',
    },
  },
} as const

const SYSTEM_PROMPT = `Je bent een Nederlandse assistent die uit een ruw bericht (WhatsApp of e-mail) van een potentiële klant van een bestratingsbedrijf de relevante velden haalt voor een offerte.

Belangrijk:
- Vul alleen velden waar je 90%+ zeker van bent. Bij twijfel: null.
- Verzin NIETS — geen plausibele postcodes, geen "waarschijnlijk de hoofdcategorie", niets. Liever leeg.
- Telefoonnummer: laat de originele schrijfwijze staan (geen normalisatie).
- m²: enkel als er een concreet getal staat ("ongeveer 120m²" → 120).
- sub_diensten: kies meerdere als de klant meerdere wensen noemt.
- wensen: alles wat geen ander veld past — kleurvoorkeur, urgentie, opmerkingen — kort samengevat.

Voegzand & kleur:
- "voegzand" / "voegen invegen" / "voegen vullen" zonder type → voegzand_normaal=true.
- "onkruidwerend" / "onkruidwerend voegzand" / "polymeer" → voegzand_onkruidwerend=true.
- Klant mag beide types kiezen (mix). Aantal zakken / prijs alleen als concreet genoemd.
- Kleur "naturel" / "zand" / "lichtgrijs" → kleur_naturel=true. "antraciet" / "donker" / "zwart" → kleur_antraciet=true. Mag beide tegelijk.
- Bedragen met komma → punt (3,10 → 3.10).

Onderhoud-interval:
- Alleen relevant als sub_diensten "onderhoud" bevat. Anders altijd null.
- "maandelijks" / "elke maand" → 4. "om de maand" / "2-maandelijks" → 8. "kwartaal" / "elke 3 maanden" → 12. "3 keer per jaar" / "elke 4 maanden" → 16.

Factuur-adres:
- Het normale adres is het werk-adres (waar de klus uitgevoerd wordt).
- ALLEEN als de klant expliciet een ánder adres noemt voor de factuur (bv. "factuur naar...", "factuuradres is...", "factureren op..."), vul dan factuur_postcode/huisnummer/straat/plaats in.
- Bij twijfel of als er maar één adres genoemd wordt: factuur-velden allemaal null.`

/**
 * Extract klant- en werkvelden uit een ruwe bericht-tekst via OpenAI.
 * Auth-gated zodat alleen ingelogde dashboard-users de OpenAI-API
 * kunnen aanroepen (anders is het een open relay op onze tokens).
 *
 * Model: gpt-4o-mini — snel, goedkoop ($0.15 per 1M input tokens),
 * en met structured-output betrouwbaar voor dit soort extractie.
 */
export async function extractFieldsFromMessage(
  text: string,
): Promise<ExtractResult> {
  const supabase = await getDashboardSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Niet ingelogd.' }

  const trimmed = text.trim()
  if (trimmed.length < 10) {
    return { ok: false, error: 'Bericht te kort — plak het hele bericht van de klant.' }
  }
  if (trimmed.length > 4000) {
    return { ok: false, error: 'Bericht te lang — kort het in tot het relevante deel.' }
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return { ok: false, error: 'OpenAI niet geconfigureerd op deze server.' }
  }

  try {
    const client = new OpenAI({ apiKey })
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: trimmed },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'manual_offerte_extract',
          strict: true,
          schema: SCHEMA,
        },
      },
      temperature: 0,
    })

    const raw = completion.choices[0]?.message?.content
    if (!raw) {
      return { ok: false, error: 'OpenAI gaf geen antwoord terug.' }
    }
    const parsed = JSON.parse(raw) as ExtractedFields
    return { ok: true, fields: parsed }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'onbekend'
    console.error('[extractFieldsFromMessage] OpenAI failed:', err)
    return { ok: false, error: `Extractie mislukt: ${msg}` }
  }
}
