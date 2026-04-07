/**
 * Twee dedicated LLMs voor de schoonmaak-flow:
 *  - extractSchoonmaakData() — analyseert het klantbericht
 *  - generateSchoonmaakReply() — bedenkt de volgende vraag in Lotte's stem
 */

import { getOpenAI, formatHistory, type ConversationMessage, type LeadIdentity } from './_client'
import { schoonmaakConfig } from '@/lib/branches/schoonmaak'
import { getMissingFields, getPhotoCount, isPhotoStepDone } from '@/lib/branches'

export interface SchoonmaakData {
  adres?: string
  type_pand?: string
  oppervlakte?: string
  frequentie?: string
  ramen?: string
}

export interface ExtractedSchoonmaakResult {
  naam?: string
  email?: string
  data?: Partial<SchoonmaakData>
}

export async function extractSchoonmaakData(
  history: ConversationMessage[],
  identity: LeadIdentity,
  current: SchoonmaakData
): Promise<ExtractedSchoonmaakResult> {
  const chatHistory = formatHistory(history)

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `Je bent een data-extractor voor een schoonmaakbedrijf. Lees het WhatsApp gesprek en geef ALLEEN nieuw gevonden of gecorrigeerde velden terug als JSON.

Velden:
- naam: voornaam of volledige naam (top-level)
- email: geldig e-mailadres met @ (top-level)
- adres: straat + huisnummer of postcode + huisnummer
- type_pand: "woning", "kantoor", "horeca" of "winkel"
- oppervlakte: getal in m² ("80", "ongeveer 120 m2" → 120)
- frequentie: "eenmalig", "wekelijks", "2-wekelijks" of "maandelijks" (om de week → 2-wekelijks)
- ramen: "ja" of "nee" (wil de klant dat de ramen ook meedoen)

Bekende waarden:
- naam: ${identity.naam ?? 'onbekend'}
- email: ${identity.email ?? 'onbekend'}
- adres: ${current.adres ?? 'onbekend'}
- type_pand: ${current.type_pand ?? 'onbekend'}
- oppervlakte: ${current.oppervlakte ?? 'onbekend'}
- frequentie: ${current.frequentie ?? 'onbekend'}
- ramen: ${current.ramen ?? 'onbekend'}

Output formaat (alleen NIEUW of GECORRIGEERD):
{
  "naam": "...",
  "email": "...",
  "data": { "type_pand": "kantoor", "oppervlakte": "120" }
}

Bij niets nieuws: {} terug. Geen uitleg, alleen JSON.`,
      },
      { role: 'user', content: chatHistory },
    ],
  })

  const text = response.choices[0]?.message?.content ?? '{}'
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>
    const result: ExtractedSchoonmaakResult = {}
    if (typeof parsed.naam === 'string' && parsed.naam) result.naam = parsed.naam
    if (typeof parsed.email === 'string' && parsed.email && parsed.email.includes('@')) result.email = parsed.email
    if (parsed.data && typeof parsed.data === 'object') {
      const d = parsed.data as Record<string, unknown>
      const data: Partial<SchoonmaakData> = {}
      const keys: (keyof SchoonmaakData)[] = [
        'adres', 'type_pand', 'oppervlakte', 'frequentie', 'ramen',
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
    console.error('extractSchoonmaakData: parse error:', text)
    return {}
  }
}

export async function generateSchoonmaakReply(
  history: ConversationMessage[],
  identity: LeadIdentity,
  data: SchoonmaakData,
  collectedData: Record<string, unknown>
): Promise<string> {
  const chatHistory = formatHistory(history)
  const missingDataFields = getMissingFields(schoonmaakConfig, data as Record<string, unknown>)
  const photoCount = getPhotoCount(collectedData)
  const photoStepDone = isPhotoStepDone(collectedData)

  const missing: string[] = []
  if (!identity.naam) missing.push('naam')
  if (!identity.email) missing.push('e-mailadres')
  for (const key of missingDataFields) {
    const field = schoonmaakConfig.fields.find((f) => f.key === key)
    if (field) missing.push(`${field.label} (sleutel: ${key})`)
  }

  const inPhotoStep = missing.length === 0 && !photoStepDone
  const allComplete = missing.length === 0 && photoStepDone

  if (inPhotoStep) {
    missing.push(
      `OPTIONEEL: vraag warm of de klant 1 of meer foto's van het pand of de ruimte wil sturen ` +
      `via WhatsApp (maximaal 12). Zeg dat het mag en niet hoeft — als ze geen foto hebben mogen ` +
      `ze "geen foto" of "klaar" typen.`
    )
  }

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.7,
    messages: [
      {
        role: 'system',
        content: `Je bent Lotte, een warme en behulpzame medewerker van Glanz Schoonmaak B.V. Je verzamelt via WhatsApp informatie om een passend voorstel te doen. Je spreekt informeel Nederlands (je/jij), bent service-gericht en zorgt dat de klant zich op zijn gemak voelt. Geen jargon — gewoon menselijk en duidelijk.

Wat al bekend is:
- Naam: ${identity.naam ?? 'nog niet bekend'}
- Email: ${identity.email ?? 'nog niet bekend'}
- Adres: ${data.adres ?? 'nog niet bekend'}
- Type pand: ${data.type_pand ?? 'nog niet bekend'}
- Oppervlakte: ${data.oppervlakte ? data.oppervlakte + ' m²' : 'nog niet bekend'}
- Frequentie: ${data.frequentie ?? 'nog niet bekend'}
- Ramen meedoen: ${data.ramen ?? 'nog niet bekend'}
- Foto's ontvangen: ${photoCount}

${allComplete
  ? 'ALLES binnen. Bevestig warm dat je alle info hebt en zeg dat er zo een mail komt met het voorstel ter goedkeuring. Max 3 zinnen.'
  : `Vraag NU het volgende ontbrekende item: ${missing[0]}\nNiets anders vragen.`}

Regels:
- 1 vraag per bericht, max 3-4 zinnen
- Lotte is warm en service-gericht — laat dat doorklinken zonder overdreven te worden
- Begin niet met de naam van de klant
- Geen bullets, gewone WhatsApp-tekst
- Klink als een echte persoon

Geef ALLEEN het WhatsApp-bericht terug.`,
      },
      {
        role: 'user',
        content: `Gespreksgeschiedenis:\n${chatHistory}\n\nSchrijf het volgende bericht van Lotte.`,
      },
    ],
  })

  return response.choices[0]?.message?.content?.trim() ?? 'Sorry, er ging iets mis. Probeer het opnieuw.'
}
