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
  voegzand_normaal: boolean | null
  voegzand_onkruidwerend: boolean | null
  planten_afschermen: boolean | null
  groene_aanslag: boolean | null
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
    'voegzand_onkruidwerend',
    'planten_afschermen',
    'groene_aanslag',
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
    voegzand_normaal: { type: ['boolean', 'null'], description: 'true als klant standaard voegzand wil' },
    voegzand_onkruidwerend: { type: ['boolean', 'null'], description: 'true als klant onkruidwerend voegzand wil' },
    planten_afschermen: { type: ['boolean', 'null'], description: 'true als klant beplanting/borders wil afschermen' },
    groene_aanslag: { type: ['boolean', 'null'], description: 'true als klant groene aanslag/mos noemt' },
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
