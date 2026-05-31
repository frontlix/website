'use server'

import OpenAI from 'openai'
import { getCurrentUser, getCurrentUserProfile } from './auth'

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
  // Array zodat de owner zowel oprit/terras als onkruidbeheersing
  // kan kiezen. Leeg = onbekend / niet vermeld.
  hoofdcategorie: Array<'oprit_terras_terrein' | 'onkruidbeheersing'>
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
  korstmos: boolean | null
  // Onderhoud-frequentie — alleen als 'onderhoud' in sub_diensten zit
  // én klant een interval noemt. Restrict tot de 4 toegestane waardes.
  onderhoud_weken: 4 | 8 | 12 | 16 | null
  // Extra arbeid — alleen als klant aangeeft dat er extra werk nodig
  // is bovenop de standaard regels (bv. "verwijderen oude plantenbak",
  // "lossen + opruimen rondom"). Minuten + personen geven we apart
  // door zodat de offerte ze als regel "Extra arbeid" kan optellen.
  extra_arbeid_minuten: number | null
  extra_arbeid_personen: number | null
  extra_arbeid_omschrijving: string | null
  // Korting — als klant erom vraagt of jij 'm aanbiedt in de tekst.
  // Percentage tussen 0-100. Omschrijving is de reden ("klant via
  // Henk", "buurtgenoot van bestaande klant", etc.).
  korting_percentage: number | null
  korting_omschrijving: string | null
  // Verzendingskanaal — als klant aangeeft hoe ze de offerte willen
  // ontvangen. Default in de wizard is 'wa' (WhatsApp).
  kanaal: 'mail' | 'manual' | null
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
    'korstmos',
    'onderhoud_weken',
    'extra_arbeid_minuten',
    'extra_arbeid_personen',
    'extra_arbeid_omschrijving',
    'korting_percentage',
    'korting_omschrijving',
    'kanaal',
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
      type: 'array',
      items: {
        type: 'string',
        enum: ['oprit_terras_terrein', 'onkruidbeheersing'],
      },
      description:
        'Welke hoofddiensten — mag meerdere. oprit_terras_terrein: bestrating reinigen + voegzand. onkruidbeheersing: onkruidbestrijding / onderhoudsplan. Bij twijfel: lege array.',
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
    voegzand_normaal: { type: ['boolean', 'null'], description: 'ALLEEN true als klant LETTERLIJK woorden gebruikt als "normaal voegzand", "standaard voegzand", "kwarts", "zilverzand". Het woord "invegen" of "voegzand" zónder type-aanduiding is ONVOLDOENDE — dan null. Bij twijfel: null.' },
    voegzand_normaal_zakken: { type: ['number', 'null'], description: 'Aantal zakken normaal voegzand — alleen als concreet getal genoemd.' },
    voegzand_normaal_prijs: { type: ['number', 'null'], description: 'Prijs per zak normaal voegzand in euro\'s — alleen als concreet bedrag genoemd. Komma → punt (3,10 → 3.10).' },
    voegzand_onkruidwerend: { type: ['boolean', 'null'], description: 'ALLEEN true als klant LETTERLIJK woorden gebruikt als "onkruidwerend", "onkruidwerend voegzand", "polymeer", "polymeer voegzand". Anders null.' },
    voegzand_onkruidwerend_zakken: { type: ['number', 'null'], description: 'Aantal zakken onkruidwerend voegzand — alleen als concreet getal genoemd.' },
    voegzand_onkruidwerend_prijs: { type: ['number', 'null'], description: 'Prijs per zak onkruidwerend voegzand in euro\'s — alleen als concreet bedrag genoemd.' },
    kleur_naturel: { type: ['boolean', 'null'], description: 'true als klant naturel/zandkleur voegzand wil. Mag tegelijk met antraciet (mix).' },
    kleur_antraciet: { type: ['boolean', 'null'], description: 'true als klant antraciet/zwart voegzand wil. Mag tegelijk met naturel (mix).' },
    planten_afschermen: { type: ['boolean', 'null'], description: 'true als klant beplanting/borders wil afschermen' },
    planten_afschermen_rollen: { type: ['number', 'null'], description: 'Aantal rollen afschermfolie — alleen als concreet genoemd.' },
    planten_afschermen_prijs: { type: ['number', 'null'], description: 'Prijs per rol in euro\'s — alleen als concreet bedrag genoemd.' },
    groene_aanslag: { type: ['boolean', 'null'], description: 'true als klant groene aanslag/mos noemt' },
    korstmos: { type: ['boolean', 'null'], description: 'true als klant korstmos (gele/witte aanslag op tegels) noemt — geeft een toeslag op de offerte' },
    onderhoud_weken: {
      type: ['integer', 'null'],
      enum: [4, 8, 12, 16, null],
      description:
        'Onderhoud-interval in weken — alleen als sub_diensten "onderhoud" bevat én klant een frequentie noemt. Map ongeveer: maandelijks=4, 2-maandelijks=8, kwartaal=12, 4-maandelijks=16.',
    },
    extra_arbeid_minuten: {
      type: ['number', 'null'],
      description:
        'Extra arbeid in minuten — alleen als klant expliciet aangeeft dat er handwerk nodig is bovenop de standaard regels ("oude plantenbak weg", "rondom opruimen", "afval afvoeren"). Schat conservatief.',
    },
    extra_arbeid_personen: {
      type: ['number', 'null'],
      description: 'Aantal personen voor de extra arbeid — meestal 1, soms 2 bij zwaar werk. Alleen invullen als extra_arbeid_minuten ook gevuld is.',
    },
    extra_arbeid_omschrijving: {
      type: ['string', 'null'],
      description: 'Korte omschrijving van de extra arbeid — wat moet er extra gebeuren. Alleen invullen als extra_arbeid_minuten gevuld is.',
    },
    korting_percentage: {
      type: ['number', 'null'],
      description:
        'Korting in procenten (0-100, getal zonder %). Alleen invullen als de klant of de tekst expliciet om korting vraagt of een actie noemt ("buurtgenoot", "via [naam] gehoord", "kortingsactie"). Bij twijfel null.',
    },
    korting_omschrijving: {
      type: ['string', 'null'],
      description: 'Reden van de korting (bv. "via Henk", "actie maart", "klant van X"). Alleen als korting_percentage gevuld is.',
    },
    kanaal: {
      type: ['string', 'null'],
      enum: ['mail', 'manual', null],
      description:
        'Hoe wil de klant de offerte ontvangen? mail=per e-mail met PDF, manual=alleen download (owner stuurt zelf door). Alleen invullen als de klant een voorkeur uitspreekt; bij twijfel null (default in de wizard is e-mail). WhatsApp is geen optie meer.',
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

VOEGZAND — KRITIEK ONDERSCHEID:
- "invegen" is een WERKZAAMHEID (sub-dienst) — NIET een keuze voor type voegzand.
- voegzand_normaal en voegzand_onkruidwerend zijn MATERIAAL-keuzes. Vink ze ALLEEN aan als de klant LETTERLIJK het type noemt.
- voegzand_normaal=true ALLEEN bij woorden: "normaal voegzand", "standaard voegzand", "kwarts", "zilverzand".
- voegzand_onkruidwerend=true ALLEEN bij woorden: "onkruidwerend", "polymeer".
- Klant noemt alleen "invegen" of "voegzand" zonder type → BEIDE booleans null. NIET aanvinken om "veilig" te zijn.
- Klant noemt alleen één type → alleen die ene true, de andere null/false. NOOIT beide aanvinken als er maar één genoemd wordt.

VOORBEELD (volg dit precies):
Input: "120m2 oprit. invegen. onkruidwerend 7 zakken @ 3,10"
Output: m2=120, sub_diensten=["invegen"], voegzand_normaal=null, voegzand_onkruidwerend=true, voegzand_onkruidwerend_zakken=7, voegzand_onkruidwerend_prijs=3.10
→ voegzand_normaal blijft null omdat "invegen" alleen niet "normaal voegzand" betekent.

KLEUR:
- "naturel" / "zand" / "lichtgrijs" → kleur_naturel=true. "antraciet" / "donker" / "zwart" → kleur_antraciet=true. Mag beide tegelijk als de klant beide noemt.

BEDRAGEN: komma → punt (3,10 → 3.10).

Onderhoud-interval:
- Alleen relevant als sub_diensten "onderhoud" bevat. Anders altijd null.
- "maandelijks" / "elke maand" → 4. "om de maand" / "2-maandelijks" → 8. "kwartaal" / "elke 3 maanden" → 12. "3 keer per jaar" / "elke 4 maanden" → 16.

Extra arbeid:
- Alleen invullen als klant aangeeft dat er handwerk bovenop de standaard regels nodig is (afval afvoeren, oude planten verwijderen, plantenbak weg, etc.).
- Schat tijd conservatief in minuten. Default 1 persoon, 2 als het zwaar werk is.
- Bij geen vermelding → alle drie velden null.

Korting:
- Alleen vullen bij expliciet kortings-signaal: "buurtkorting", "actie", "via [naam]", "kortingsactie", concreet percentage genoemd.
- Bij twijfel null. Liever niets dan een verzonnen korting.

Verzendingskanaal:
- "wil per mail" / "stuur per e-mail" → mail. "alleen PDF" / "ik download zelf" / "ik stuur het zelf" → manual.
- "via WhatsApp" / "app me 'm" → mail (WhatsApp-verzending is op dit moment niet beschikbaar; e-mail is de geautomatiseerde fallback).
- Bij geen voorkeur → null (wizard default = mail).

Korstmos:
- "korstmos" / "gele aanslag" / "witte vlekken op tegels" → true. Wordt als toeslag op de offerte gerekend.

Factuur-adres:
- Het normale adres is het werk-adres (waar de klus uitgevoerd wordt).
- ALLEEN als de klant expliciet een ánder adres noemt voor de factuur (bv. "factuur naar...", "factuuradres is...", "factureren op..."), vul dan factuur_postcode/huisnummer/straat/plaats in.
- Bij twijfel of als er maar één adres genoemd wordt: factuur-velden allemaal null.`

/**
 * Extract klant- en werkvelden uit een ruwe bericht-tekst via OpenAI.
 * Auth-gated zodat alleen ingelogde, approved dashboard-users de OpenAI-API
 * kunnen aanroepen (anders is het een open relay op onze tokens — ook een
 * pending/rejected user mag dit niet triggeren).
 *
 * Deze action geeft JSON terug; we gebruiken daarom een NON-redirecting
 * gate (getCurrentUser + profiel-check) i.p.v. requireApprovedUser(), zodat
 * een niet-approved user een nette { ok:false }-fout krijgt i.p.v. een
 * redirect die de client-flow breekt.
 *
 * Model: gpt-4o-mini — snel, goedkoop ($0.15 per 1M input tokens),
 * en met structured-output betrouwbaar voor dit soort extractie.
 */
export async function extractFieldsFromMessage(
  text: string,
): Promise<ExtractResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: 'Niet ingelogd.' }
  const profile = await getCurrentUserProfile()
  if (!profile || profile.tenant_status !== 'approved') {
    return { ok: false, error: 'Geen toegang.' }
  }

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
