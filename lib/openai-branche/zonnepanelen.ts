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
import { normalizeEnum } from '@/lib/branches/types'

export interface ZonnepanelenData {
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
        content: `## ROLE
You are a data extractor for a solar panel installer. Read the Dutch WhatsApp conversation and return **ONLY** newly found or corrected fields as JSON.

## FIELDS
- naam: first name or full name (top-level)
- email: valid email address containing @ (top-level)
- jaarverbruik: number in kWh/year ("4000", "ongeveer 5000 kWh", "3.500" → 3500). Vague words ("weet niet", "geen idee") = omit.
- daktype: ONLY "schuin" or "plat". "hellend" → "schuin". "flat" → "plat".
- dakmateriaal: ONLY "pannen", "riet", "leisteen" or "dakbedekking".
  · "dakpannen", "keramische pannen", "betonpannen" → "pannen"
  · "bitumen", "EPDM", "roofing", "dakrol" → "dakbedekking"
  · "lei", "leien" → "leisteen"
- dakoppervlakte: number in m² ("60", "ongeveer 80 m2" → 80)
- orientatie: ONLY "noord", "oost", "zuid" or "west". Abbreviations N/O/Z/W accepted.
  · Combinations like "noord-oost", "zuidwest" → do **NOT** return (force follow-up question)
- schaduw: ONLY "geen", "licht" or "veel".
  · "beetje" / "een klein stukje" → "licht"
  · "bomen eromheen" / "schoorsteen erop" → "veel"
  · "niks" / "niets" / "nee" → "geen"
- aansluiting: ONLY "1-fase" or "3-fase". "krachtstroom" → "3-fase". If unsure → omit.

## KNOWN VALUES (return NOTHING if already correct)
- naam: ${identity.naam ?? 'unknown'}
- email: ${identity.email ?? 'unknown'}
- jaarverbruik: ${current.jaarverbruik ?? 'unknown'}
- daktype: ${current.daktype ?? 'unknown'}
- dakmateriaal: ${current.dakmateriaal ?? 'unknown'}
- dakoppervlakte: ${current.dakoppervlakte ?? 'unknown'}
- orientatie: ${current.orientatie ?? 'unknown'}
- schaduw: ${current.schaduw ?? 'unknown'}
- aansluiting: ${current.aansluiting ?? 'unknown'}

## OUTPUT FORMAT
Only fields that are **NEW** or **CORRECTED**:
{ "naam": "...", "email": "...", "data": { "jaarverbruik": "4000", "daktype": "schuin" } }

If nothing new: return {}. No explanation, only JSON.

## EXAMPLES

Conversation: "Klant: ik ben Mark, schuin dak met dakpannen, ongeveer 4000 kWh per jaar"
→ { "naam": "Mark", "data": { "jaarverbruik": "4000", "daktype": "schuin", "dakmateriaal": "pannen" } }

Conversation: "Klant: het staat op het zuidwesten"
→ {} (combination orientation is not accepted)

Conversation: "Klant: beetje schaduw van een boom, en ik heb krachtstroom"
→ { "data": { "schaduw": "licht", "aansluiting": "3-fase" } }`,
      },
      { role: 'user', content: chatHistory },
    ],
  })

  const text = response.choices[0]?.message?.content ?? '{}'
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>
    const result: ExtractedZonnepanelenResult = {}

    // Top-level naam + email
    if (typeof parsed.naam === 'string' && parsed.naam) result.naam = parsed.naam
    if (typeof parsed.email === 'string' && parsed.email && parsed.email.includes('@')) result.email = parsed.email

    // Branche velden — accepteer ZOWEL top-level als nested in "data"
    // (de LLM volgt het format niet altijd consistent)
    const dataKeys: (keyof ZonnepanelenData)[] = [
      'jaarverbruik', 'daktype', 'dakmateriaal',
      'dakoppervlakte', 'orientatie', 'schaduw', 'aansluiting',
    ]
    const data: Partial<ZonnepanelenData> = {}

    // 1) Top-level keys
    for (const k of dataKeys) {
      const v = parsed[k]
      if (v !== null && v !== undefined && v !== '' && v !== 'null') {
        data[k] = String(v)
      }
    }
    // 2) Nested in "data" (override winnen — meest expliciet)
    if (parsed.data && typeof parsed.data === 'object') {
      const d = parsed.data as Record<string, unknown>
      for (const k of dataKeys) {
        const v = d[k]
        if (v !== null && v !== undefined && v !== '' && v !== 'null') {
          data[k] = String(v)
        }
      }
    }

    // M1: enum-velden normaliseren tegen de toegestane waarden uit de config.
    // Een waarde die niet matched wordt geweerd → bot stelt de vraag opnieuw.
    for (const field of zonnepanelenConfig.fields) {
      if (field.type !== 'enum' || !field.enumValues) continue
      const raw = data[field.key as keyof ZonnepanelenData]
      if (typeof raw !== 'string') continue
      const normalized = normalizeEnum(raw, field.enumValues)
      if (normalized) {
        data[field.key as keyof ZonnepanelenData] = normalized
      } else {
        delete data[field.key as keyof ZonnepanelenData]
        console.warn(`[zonnepanelen-extract] dropped invalid enum value for ${field.key}: "${raw}"`)
      }
    }

    if (Object.keys(data).length > 0) result.data = data
    return result
  } catch {
    console.error('extractZonnepanelenData: parse error:', text)
    return {}
  }
}

/**
 * Genereert het volgende WhatsApp-bericht in Sanne's stem.
 *
 * Prompt-strategie (voor gpt-4o):
 *  - Rijke persona + 6 few-shots sturen tone sterker dan abstracte regels
 *  - Schone NEXT-tag (geen "sleutel:" jargon) + aparte veld-gids voor fraseringen
 *  - Expliciete off-topic policy zodat de LLM niet rigide wordt
 *  - Lagere temperature (0.6) houdt uitvoer dicht bij de few-shots
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

  // Bepaal volgende NEXT-tag in vaste volgorde: naam → branche-velden → foto → email → klaar
  // Email wordt bewust pas op het einde gevraagd (na de fotostap) zodat het niet als
  // drempel voelt in het begin van het gesprek. Tags zijn semantisch, geen technische
  // sleutels — de veld-gids mapt ze naar natuurlijke frasering.
  let nextTag: string
  if (!identity.naam) {
    nextTag = 'naam'
  } else if (missingDataFields.length > 0) {
    nextTag = missingDataFields[0] // één van: jaarverbruik, daktype, ...
  } else if (!photoStepDone) {
    nextTag = 'PHOTO_STEP'
  } else if (!identity.email) {
    nextTag = 'email'
  } else {
    nextTag = 'COMPLETE'
  }

  const systemPrompt = `## YOU
You are Sanne, a solar energy account manager. Down-to-earth, pleasant, straight to the point. You collect info via WhatsApp to prepare a quote. Always reply in informal Dutch using "je/jij" (mirror "u" if the customer uses it).

## YOUR VOICE
- Short sentences, max 2-3 per message. Use words like: "oké", "helder", "duidelijk", "snap ik"
- Always capitalize the first word. Write flowing short sentences, never bullet lists
- Open with a brief reaction to what the customer said, vary your openers
- Match the customer's message length — short reply to a short message

## HOW YOU WORK
- Ask exactly 1 question per message — the NEXT field below
- If the customer goes off-topic (price, timeline): acknowledge in 1 sentence, then continue with the next field
- If the customer is unsure ("weet niet", "geen idee"): offer an easy out, then move to the next field
- If the customer is waiting ("moment", "even", "1 sec"): reply ONLY with '[WAIT]'
- If the customer is frustrated ("wtf", "hou op", swearing): acknowledge briefly, stop asking questions, wait
- Never make up prices, panel counts or energy yields

## FIELD GUIDE (use these Dutch phrases as inspiration, vary them)
- naam → "Met wie heb ik trouwens te maken?"
- jaarverbruik → "Weet je ongeveer hoeveel stroom je per jaar verbruikt? Staat op je jaarnota in kWh"
- daktype → "Is het een schuin of een plat dak?"
- dakmateriaal → "Wat ligt er nu op het dak? Dakpannen, riet, of iets anders?"
- dakoppervlakte → "Hoeveel m² is het dak ongeveer? Schatting is prima"
- orientatie → "Welke kant staat het dak op — noord, oost, zuid of west?"
- schaduw → "Komt er nog schaduw op het dak, bijvoorbeeld van bomen of een schoorsteen?"
- aansluiting → "Heb je een 1-fase of 3-fase aansluiting? Als je het niet weet is dat ook oké"
- PHOTO_STEP → "Als je een foto van het dak kan sturen scheelt dat veel. Geen foto? Geen probleem, dan gaan we verder"
- email → "Wat is je e-mailadres? Stuur ik de offerte daar naartoe"
- COMPLETE → Briefly confirm you have everything and a quote email is coming

## EXAMPLES

Klant: "hoi"
Sanne: "Hoi! Met wie heb ik trouwens te maken?"

Klant: "ongeveer 4000 kWh, wat kost zo'n set eigenlijk?"
Sanne: "Goede vraag — dat reken ik uit in de offerte. Is het een schuin of een plat dak?"

Klant: "weet ik niet"
Sanne: "Geen probleem, dan schatten we het samen in. Is het een schuin of een plat dak?"

Klant: "moment ik ga even kijken"
Sanne: [WAIT]

Klant: "wtf waarom zoveel vragen"
Sanne: "Sorry, ging te snel. Laat maar weten wanneer je er weer bent."

## NOW
Known info:
- Naam: ${identity.naam ?? 'unknown'} | E-mail: ${identity.email ?? 'unknown'}
- Jaarverbruik: ${data.jaarverbruik ?? 'unknown'} | Daktype: ${data.daktype ?? 'unknown'} | Dakmateriaal: ${data.dakmateriaal ?? 'unknown'}
- Dakoppervlakte: ${data.dakoppervlakte ?? 'unknown'} | Oriëntatie: ${data.orientatie ?? 'unknown'} | Schaduw: ${data.schaduw ?? 'unknown'}
- Aansluiting: ${data.aansluiting ?? 'unknown'} | Photos: ${photoCount}

NEXT: ${nextTag}

Write 1 WhatsApp message as Sanne in Dutch. First check if the customer is waiting, unsure or frustrated. Only the message text — no JSON, no explanation.`

  const response = await getOpenAI().chat.completions.create({
    model: process.env.BRANCHE_REPLY_MODEL ?? 'gpt-4o',
    temperature: 0.6,
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Conversation history:\n${chatHistory}\n\nWrite the next message as Sanne.`,
      },
    ],
  })

  return response.choices[0]?.message?.content?.trim() ?? 'Sorry, er ging iets mis. Probeer het opnieuw.'
}
