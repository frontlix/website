/**
 * Twee dedicated LLMs voor de dakdekker-flow:
 *  - extractDakdekkerData() — analyseert het klantbericht
 *  - generateDakdekkerReply() — bedenkt de volgende vraag in Bram's stem
 */

import { getOpenAI, formatHistory, type ConversationMessage, type LeadIdentity } from './_client'
import { dakdekkerConfig } from '@/lib/branches/dakdekker'
import { getMissingFields, getPhotoCount, isPhotoStepDone } from '@/lib/branches'

export interface DakdekkerData {
  adres?: string
  type_werk?: string
  daktype?: string
  huidig_dakmateriaal?: string
  dakoppervlakte?: string
  isolatie?: string
  spoed?: string
}

export interface ExtractedDakdekkerResult {
  naam?: string
  email?: string
  data?: Partial<DakdekkerData>
}

export async function extractDakdekkerData(
  history: ConversationMessage[],
  identity: LeadIdentity,
  current: DakdekkerData
): Promise<ExtractedDakdekkerResult> {
  const chatHistory = formatHistory(history)

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `Je bent een data-extractor voor een dakdekkersbedrijf. Lees het WhatsApp gesprek en geef ALLEEN nieuw gevonden of gecorrigeerde velden terug als JSON.

Velden:
- naam: voornaam of volledige naam (top-level)
- email: geldig e-mailadres met @ (top-level)
- adres: straat + huisnummer of postcode + huisnummer
- type_werk: "vervangen", "repareren" of "isoleren" (lekkage of nieuw dak nodig = "vervangen", klein gat dichten = "repareren")
- daktype: "plat" of "schuin"
- huidig_dakmateriaal: vrije tekst — "dakpannen", "bitumen", "EPDM", "leisteen", "zink", "roofing", etc.
- dakoppervlakte: getal in m² ("60", "ongeveer 80 m2" → 80)
- isolatie: "ja" of "nee" (wil de klant isolatie bij laten plaatsen)
- spoed: "ja" of "nee" (lekkage NU = ja, "kan wachten" = nee)

Bekende waarden:
- naam: ${identity.naam ?? 'onbekend'}
- email: ${identity.email ?? 'onbekend'}
- adres: ${current.adres ?? 'onbekend'}
- type_werk: ${current.type_werk ?? 'onbekend'}
- daktype: ${current.daktype ?? 'onbekend'}
- huidig_dakmateriaal: ${current.huidig_dakmateriaal ?? 'onbekend'}
- dakoppervlakte: ${current.dakoppervlakte ?? 'onbekend'}
- isolatie: ${current.isolatie ?? 'onbekend'}
- spoed: ${current.spoed ?? 'onbekend'}

Output formaat (alleen NIEUW of GECORRIGEERD):
{
  "naam": "...",
  "email": "...",
  "data": { "type_werk": "vervangen", "daktype": "plat" }
}

Bij niets nieuws: {} terug. Geen uitleg, alleen JSON.`,
      },
      { role: 'user', content: chatHistory },
    ],
  })

  const text = response.choices[0]?.message?.content ?? '{}'
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>
    const result: ExtractedDakdekkerResult = {}
    if (typeof parsed.naam === 'string' && parsed.naam) result.naam = parsed.naam
    if (typeof parsed.email === 'string' && parsed.email && parsed.email.includes('@')) result.email = parsed.email
    if (parsed.data && typeof parsed.data === 'object') {
      const d = parsed.data as Record<string, unknown>
      const data: Partial<DakdekkerData> = {}
      const keys: (keyof DakdekkerData)[] = [
        'adres', 'type_werk', 'daktype', 'huidig_dakmateriaal',
        'dakoppervlakte', 'isolatie', 'spoed',
      ]
      for (const k of keys) {
        const v = d[k]
        if (v !== null && v !== undefined && v !== '' && v !== 'null') {
          data[k] = String(v)
        }
      }
      if (Object.keys(data).length > 0) result.data = data
    }
    return result
  } catch {
    console.error('extractDakdekkerData: parse error:', text)
    return {}
  }
}

export async function generateDakdekkerReply(
  history: ConversationMessage[],
  identity: LeadIdentity,
  data: DakdekkerData,
  collectedData: Record<string, unknown>
): Promise<string> {
  const chatHistory = formatHistory(history)
  const missingDataFields = getMissingFields(dakdekkerConfig, data as Record<string, unknown>)
  const photoCount = getPhotoCount(collectedData)
  const photoStepDone = isPhotoStepDone(collectedData)

  const missing: string[] = []
  if (!identity.naam) missing.push('naam')
  if (!identity.email) missing.push('e-mailadres')
  for (const key of missingDataFields) {
    const field = dakdekkerConfig.fields.find((f) => f.key === key)
    if (field) missing.push(`${field.label} (sleutel: ${key})`)
  }

  const inPhotoStep = missing.length === 0 && !photoStepDone
  const allComplete = missing.length === 0 && photoStepDone

  if (inPhotoStep) {
    missing.push(
      `OPTIONEEL: vraag of de klant 1 of meer foto's van het dak wil sturen via WhatsApp ` +
      `(maximaal 12). Zeg dat het mag en niet hoeft — als ze geen foto hebben mogen ze "geen foto" ` +
      `of "klaar" typen. Houd het kort en praktisch zoals Bram dat doet.`
    )
  }

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.7,
    messages: [
      {
        role: 'system',
        content: `Je bent Bram, een no-nonsense dakdekker bij Dakwerken Holland B.V. Je bent een vakman: kort, helder en praktisch. Je gebruikt informeel Nederlands (je/jij). Je maakt geen omhaal en stelt direct de juiste vraag. Je hebt geen tijd voor poespas maar bent wel vriendelijk.

Wat al bekend is:
- Naam: ${identity.naam ?? 'nog niet bekend'}
- Email: ${identity.email ?? 'nog niet bekend'}
- Adres: ${data.adres ?? 'nog niet bekend'}
- Type werk: ${data.type_werk ?? 'nog niet bekend'}
- Daktype: ${data.daktype ?? 'nog niet bekend'}
- Huidig dakmateriaal: ${data.huidig_dakmateriaal ?? 'nog niet bekend'}
- Dakoppervlakte: ${data.dakoppervlakte ? data.dakoppervlakte + ' m²' : 'nog niet bekend'}
- Isolatie gewenst: ${data.isolatie ?? 'nog niet bekend'}
- Spoed: ${data.spoed ?? 'nog niet bekend'}
- Foto's ontvangen: ${photoCount}

${allComplete
  ? 'ALLES binnen. Bevestig kort dat je alle info hebt en dat er zo een mail komt met de offerte ter goedkeuring. Max 3 zinnen.'
  : `Vraag NU het volgende ontbrekende item: ${missing[0]}\nNiets anders vragen.`}

Regels:
- 1 vraag per bericht, max 3 zinnen
- Bram klinkt direct en praktisch — geen "leuk om te horen!" gedoe
- Begin niet met de naam van de klant
- Geen bullets, gewone WhatsApp-tekst
- Klink als vakman, niet als bot

Geef ALLEEN het WhatsApp-bericht terug.`,
      },
      {
        role: 'user',
        content: `Gespreksgeschiedenis:\n${chatHistory}\n\nSchrijf het volgende bericht van Bram.`,
      },
    ],
  })

  return response.choices[0]?.message?.content?.trim() ?? 'Sorry, er ging iets mis. Probeer het opnieuw.'
}
