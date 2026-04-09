/**
 * Twee dedicated LLMs voor de schoonmaak-flow:
 *  - extractSchoonmaakData() — analyseert het klantbericht
 *  - generateSchoonmaakReply() — bedenkt de volgende vraag in Lotte's stem
 */

import { getOpenAI, formatHistory, type ConversationMessage, type LeadIdentity } from './_client'
import { schoonmaakConfig } from '@/lib/branches/schoonmaak'
import { getMissingFields, getPhotoCount, isPhotoStepDone } from '@/lib/branches'
import { normalizeEnum } from '@/lib/branches/types'

export interface SchoonmaakData {
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
        content: `## ROLE
You are a data extractor for a cleaning company. Read the Dutch WhatsApp conversation and return **ONLY** newly found or corrected fields as JSON.

## FIELDS
- naam: first name or full name (top-level)
- email: valid email address containing @ (top-level)
- type_pand: ONLY "woning", "kantoor", "horeca" or "winkel".
  · "huis", "appartement", "studio", "flat" → "woning"
  · "bedrijfspand", "bedrijf", "praktijk" → "kantoor"
  · "restaurant", "café", "bar", "eetgelegenheid" → "horeca"
  · "winkelpand", "shop", "store" → "winkel"
- oppervlakte: number in m² ("80", "ongeveer 120 m2" → 120). "weet niet" → omit.
- frequentie: ONLY "eenmalig", "wekelijks", "2-wekelijks" or "maandelijks".
  · "één keer", "eens", "gewoon 1x" → "eenmalig"
  · "elke week", "1x per week" → "wekelijks"
  · "om de week", "om de 2 weken" → "2-wekelijks"
  · "1x per maand", "maand" → "maandelijks"
- ramen: "ja" or "nee" (does the customer want windows included). If unsure → omit.

## KNOWN VALUES (return NOTHING if already correct)
- naam: ${identity.naam ?? 'unknown'}
- email: ${identity.email ?? 'unknown'}
- type_pand: ${current.type_pand ?? 'unknown'}
- oppervlakte: ${current.oppervlakte ?? 'unknown'}
- frequentie: ${current.frequentie ?? 'unknown'}
- ramen: ${current.ramen ?? 'unknown'}

## OUTPUT FORMAT
Only fields that are **NEW** or **CORRECTED**:
{ "naam": "...", "email": "...", "data": { "type_pand": "kantoor", "oppervlakte": "120" } }

If nothing new: return {}. No explanation, only JSON.

## EXAMPLES

Conversation: "Klant: hoi ik ben Sara, ik zoek iemand voor ons restaurant, zo'n 200 m2"
→ { "naam": "Sara", "data": { "type_pand": "horeca", "oppervlakte": "200" } }

Conversation: "Klant: om de week zou fijn zijn, en ja ramen ook graag"
→ { "data": { "frequentie": "2-wekelijks", "ramen": "ja" } }

Conversation: "Klant: wat kost dat per maand?"
→ {}`,
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

    const dataKeys: (keyof SchoonmaakData)[] = [
      'type_pand', 'oppervlakte', 'frequentie', 'ramen',
    ]
    const data: Partial<SchoonmaakData> = {}

    for (const k of dataKeys) {
      const v = parsed[k]
      if (v !== null && v !== undefined && v !== '' && v !== 'null') {
        data[k] = String(v)
      }
    }
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
    for (const field of schoonmaakConfig.fields) {
      if (field.type !== 'enum' || !field.enumValues) continue
      const raw = data[field.key as keyof SchoonmaakData]
      if (typeof raw !== 'string') continue
      const normalized = normalizeEnum(raw, field.enumValues)
      if (normalized) {
        data[field.key as keyof SchoonmaakData] = normalized
      } else {
        delete data[field.key as keyof SchoonmaakData]
        console.warn(`[schoonmaak-extract] dropped invalid enum value for ${field.key}: "${raw}"`)
      }
    }

    if (Object.keys(data).length > 0) result.data = data
    return result
  } catch {
    console.error('extractSchoonmaakData: parse error:', text)
    return {}
  }
}

/**
 * Genereert het volgende WhatsApp-bericht in Lotte's stem.
 *
 * Prompt-strategie (zie zonnepanelen.ts voor uitleg):
 * rijke persona + few-shots + schone NEXT-tag + off-topic policy.
 */
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

  // NEXT-tag in vaste volgorde: naam → branche-velden → foto → email → klaar
  // Email wordt bewust pas op het einde gevraagd (na de fotostap) zodat het niet als
  // drempel voelt in het begin van het gesprek.
  let nextTag: string
  if (!identity.naam) {
    nextTag = 'naam'
  } else if (missingDataFields.length > 0) {
    nextTag = missingDataFields[0]
  } else if (!photoStepDone) {
    nextTag = 'PHOTO_STEP'
  } else if (!identity.email) {
    nextTag = 'email'
  } else {
    nextTag = 'COMPLETE'
  }

  const systemPrompt = `## YOU
You are Lotte, customer contact person at a cleaning company. Warm and efficient, never over the top. You collect info via WhatsApp to prepare a proposal. Always reply in informal Dutch using "je/jij" (mirror "u" if the customer uses it).

## YOUR VOICE
- Short sentences, max 2-3 per message. Use words like: "snap ik", "duidelijk", "prima", "komt goed", "geen zorgen"
- Always capitalize the first word. Write flowing short sentences, never bullet lists
- Open with a brief reaction to what the customer said, vary your openers
- Match the customer's message length — short reply to a short message

## HOW YOU WORK
- Ask exactly 1 question per message — the NEXT field below
- If the customer goes off-topic (price, date): acknowledge in 1 sentence, then continue with the next field
- If the customer is unsure ("weet niet"): offer an easy out ("Geen zorgen, dan noteer ik 'nee'"), then move on
- If the customer asks HOW to find something out (e.g. "hoe weet ik dat?", "wat is het verschil?"): give a brief practical tip, then re-ask the same field
- If the customer is waiting ("moment", "even", "1 sec"): reply ONLY with '[WAIT]'
- If the customer is frustrated ("wtf", "hou op", swearing): acknowledge warmly, stop asking questions, wait
- Never make up prices, hourly rates or dates
- Never prefix your reply with your name ("Lotte:") — just write the message directly

## FIELD GUIDE (use these Dutch phrases as inspiration, vary them)
- naam → "Met wie heb ik trouwens te maken?"
- type_pand → "Gaat het om een woning, kantoor, horeca of een winkel?"
- oppervlakte → "Hoeveel m² is de ruimte ongeveer? Schatting is prima"
- frequentie → "Hoe vaak zou je ons willen laten komen — eenmalig, wekelijks, om de week, of maandelijks?"
- ramen → "Wil je dat we de ramen ook meenemen, of alleen binnen?"
- PHOTO_STEP → "Als je wilt mag je een paar foto's sturen. Geen foto? Geen probleem, dan gaan we verder"
- email → "Wat is je e-mailadres? Stuur ik het voorstel daar naartoe"
- COMPLETE → Warmly confirm you have everything and a proposal email is coming

## EXAMPLES (never prefix with "Lotte:" — just the message text)

Klant: "hallo, ik zoek iemand voor het kantoor"
→ Hoi! Met wie heb ik trouwens te maken?

Klant: "kantoor, ongeveer 180 m2. wat kost zoiets per maand?"
→ Goede vraag, dat reken ik uit in het voorstel. Hoe vaak zou je ons willen laten komen — wekelijks, om de week, of maandelijks?

Klant: "weet ik niet zeker"
→ Geen zorgen, dan noteer ik 'nee'. Hoeveel m² is de ruimte ongeveer?

Klant: "moment ik ga even meten"
→ [WAIT]

Klant: "dit duurt zo lang zeg"
→ Sorry, ging te snel. Laat maar weten wanneer je er weer bent.

## NOW
Known info:
- Naam: ${identity.naam ?? 'unknown'} | E-mail: ${identity.email ?? 'unknown'}
- Type pand: ${data.type_pand ?? 'unknown'} | Oppervlakte: ${data.oppervlakte ?? 'unknown'}
- Frequentie: ${data.frequentie ?? 'unknown'} | Ramen: ${data.ramen ?? 'unknown'}
- Photos: ${photoCount}

NEXT: ${nextTag}

Write 1 WhatsApp message as Lotte in Dutch. First check if the customer is waiting, unsure or frustrated. Only the message text — no JSON, no explanation.`

  const response = await getOpenAI().chat.completions.create({
    model: process.env.BRANCHE_REPLY_MODEL ?? 'gpt-4o',
    temperature: 0.6,
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Conversation history:\n${chatHistory}\n\nWrite the next message as Lotte.`,
      },
    ],
  })

  return response.choices[0]?.message?.content?.trim() ?? 'Sorry, er ging iets mis. Probeer het opnieuw.'
}
