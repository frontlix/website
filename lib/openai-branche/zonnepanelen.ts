/**
 * Twee dedicated LLMs voor de zonnepanelen-flow:
 *  - extractZonnepanelenData() — analyseert het klantbericht en returnt nieuwe data
 *  - generateZonnepanelenReply() — bedenkt de volgende vraag in Sanne's stem
 *
 * Beide prompts zijn bewust kort en branche-specifiek — geen gedeelde
 * boilerplate die de LLM kan verwarren.
 */

import { getOpenAI, formatHistory, type ConversationMessage, type LeadIdentity } from './_client'
import { zonnepanelenConfig } from '@/lib/branches/zonnepanelen'
import { getMissingFields, getPhotoCount, isPhotoStepDone } from '@/lib/branches'

export interface ZonnepanelenData {
  adres?: string
  jaarverbruik?: string
  daktype?: string
  dakmateriaal?: string
  dakoppervlakte?: string
  orientatie?: string
  schaduw?: string
  aansluiting?: string
}

export interface ExtractedZonnepanelenResult {
  /** Top-level lead velden — alleen aanwezig als de LLM ze nieuw vindt */
  naam?: string
  email?: string
  /** Branche-specifieke velden — alleen aanwezig als de LLM ze nieuw vindt */
  data?: Partial<ZonnepanelenData>
}

/**
 * Analyseert het hele gesprek en returnt nieuwe of gecorrigeerde data.
 * Velden die ontbreken in de output blijven onveranderd in de lead.
 */
export async function extractZonnepanelenData(
  history: ConversationMessage[],
  identity: LeadIdentity,
  current: ZonnepanelenData
): Promise<ExtractedZonnepanelenResult> {
  const chatHistory = formatHistory(history)

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `Je bent een data-extractor voor een zonnepanelen-installateur. Lees het WhatsApp gesprek en geef ALLEEN nieuw gevonden of gecorrigeerde velden terug als JSON.

Velden:
- naam: voornaam of volledige naam (top-level)
- email: geldig e-mailadres met @ (top-level)
- adres: straat + huisnummer of postcode + huisnummer
- jaarverbruik: getal in kWh per jaar (bv "4000", "ongeveer 5000 kWh", "3.500" → 3500). Vage woorden = niet meegeven.
- daktype: "schuin" of "plat"
- dakmateriaal: "pannen", "riet", "leisteen" of "dakbedekking" (voor plat dak: bitumen/EPDM telt als "dakbedekking")
- dakoppervlakte: getal in m² ("60", "ongeveer 80 m2" → 80)
- orientatie: "noord", "oost", "zuid" of "west" (afkortingen N/O/Z/W ook goed)
- schaduw: "geen", "licht" of "veel"
- aansluiting: "1-fase" of "3-fase"

Bekende waarden (geef NIETS terug als ze al kloppen):
- naam: ${identity.naam ?? 'onbekend'}
- email: ${identity.email ?? 'onbekend'}
- adres: ${current.adres ?? 'onbekend'}
- jaarverbruik: ${current.jaarverbruik ?? 'onbekend'}
- daktype: ${current.daktype ?? 'onbekend'}
- dakmateriaal: ${current.dakmateriaal ?? 'onbekend'}
- dakoppervlakte: ${current.dakoppervlakte ?? 'onbekend'}
- orientatie: ${current.orientatie ?? 'onbekend'}
- schaduw: ${current.schaduw ?? 'onbekend'}
- aansluiting: ${current.aansluiting ?? 'onbekend'}

Output formaat (alleen velden die NIEUW of GECORRIGEERD zijn):
{
  "naam": "...",
  "email": "...",
  "data": { "jaarverbruik": "4000", "daktype": "schuin" }
}

Bij niets nieuws: {} terug. Geen uitleg, alleen JSON.`,
      },
      { role: 'user', content: chatHistory },
    ],
  })

  const text = response.choices[0]?.message?.content ?? '{}'
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>
    const result: ExtractedZonnepanelenResult = {}
    if (typeof parsed.naam === 'string' && parsed.naam) result.naam = parsed.naam
    if (typeof parsed.email === 'string' && parsed.email && parsed.email.includes('@')) result.email = parsed.email
    if (parsed.data && typeof parsed.data === 'object') {
      const d = parsed.data as Record<string, unknown>
      const data: Partial<ZonnepanelenData> = {}
      const keys: (keyof ZonnepanelenData)[] = [
        'adres', 'jaarverbruik', 'daktype', 'dakmateriaal',
        'dakoppervlakte', 'orientatie', 'schaduw', 'aansluiting',
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
    console.error('extractZonnepanelenData: parse error:', text)
    return {}
  }
}

/**
 * Genereert het volgende WhatsApp-bericht in Sanne's stem.
 * De prompt krijgt expliciet wat ALLEMAAL al binnen is en wat nog mist.
 */
export async function generateZonnepanelenReply(
  history: ConversationMessage[],
  identity: LeadIdentity,
  data: ZonnepanelenData,
  collectedData: Record<string, unknown>
): Promise<string> {
  const chatHistory = formatHistory(history)
  const missingDataFields = getMissingFields(zonnepanelenConfig, data as Record<string, unknown>)
  const photoCount = getPhotoCount(collectedData)
  const photoStepDone = isPhotoStepDone(collectedData)

  // Bepaal volgende stap in volgorde: naam → email → branche-velden → foto-stap → klaar
  const missing: string[] = []
  if (!identity.naam) missing.push('naam (voornaam)')
  if (!identity.email) missing.push('e-mailadres')
  for (const key of missingDataFields) {
    const field = zonnepanelenConfig.fields.find((f) => f.key === key)
    if (field) missing.push(`${field.label} (sleutel: ${key})`)
  }

  // Foto-stap: alleen als alle reguliere velden binnen zijn EN de stap nog niet afgerond is
  const inPhotoStep = missing.length === 0 && !photoStepDone
  const allComplete = missing.length === 0 && photoStepDone

  if (inPhotoStep) {
    missing.push(
      `OPTIONEEL: vraag de klant of hij/zij 1 of meer foto's van het dak wil sturen via WhatsApp ` +
      `(maximaal 3). Maak duidelijk dat het mag en niet hoeft — als ze geen foto hebben mogen ze ` +
      `gewoon "geen foto" of "klaar" typen. Stel deze vraag warm en persoonlijk.`
    )
  }

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.7,
    messages: [
      {
        role: 'system',
        content: `Je bent Sanne, een vriendelijke en technisch onderlegde medewerker van SolarPower Nederland B.V. Je verzamelt via WhatsApp informatie om een offerte voor zonnepanelen op te stellen. Je spreekt informeel Nederlands (je/jij) en bent enthousiast over duurzame energie zonder overdreven te worden.

Wat al bekend is:
- Naam: ${identity.naam ?? 'nog niet bekend'}
- Email: ${identity.email ?? 'nog niet bekend'}
- Adres: ${data.adres ?? 'nog niet bekend'}
- Jaarverbruik: ${data.jaarverbruik ? data.jaarverbruik + ' kWh' : 'nog niet bekend'}
- Daktype: ${data.daktype ?? 'nog niet bekend'}
- Dakmateriaal: ${data.dakmateriaal ?? 'nog niet bekend'}
- Dakoppervlakte: ${data.dakoppervlakte ? data.dakoppervlakte + ' m²' : 'nog niet bekend'}
- Oriëntatie: ${data.orientatie ?? 'nog niet bekend'}
- Schaduw: ${data.schaduw ?? 'nog niet bekend'}
- Aansluiting: ${data.aansluiting ?? 'nog niet bekend'}
- Foto's ontvangen: ${photoCount}

${allComplete
  ? 'ALLES is binnen. Bevestig kort dat je alle info hebt en zeg dat er zo een e-mail komt met de offerte ter goedkeuring. Maximaal 3 zinnen.'
  : `Vraag NU het volgende ontbrekende item: ${missing[0]}\nNiets anders vragen.`}

Regels:
- Stel maximaal 1 vraag per bericht
- Maximaal 3-4 zinnen per bericht
- Varieer je openers, niet altijd hetzelfde
- Begin niet met de naam van de klant
- Gewone WhatsApp-tekst, geen bullets of opsommingen
- Klink als een echte persoon, niet als een bot
- Geen afsluitende zinnen zoals "laat me weten als je vragen hebt"

Geef ALLEEN het WhatsApp-bericht terug, geen JSON, geen uitleg.`,
      },
      {
        role: 'user',
        content: `Gespreksgeschiedenis:\n${chatHistory}\n\nSchrijf het volgende bericht van Sanne.`,
      },
    ],
  })

  return response.choices[0]?.message?.content?.trim() ?? 'Sorry, er ging iets mis. Probeer het opnieuw.'
}
