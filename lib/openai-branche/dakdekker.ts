/**
 * Twee dedicated LLMs voor de dakdekker-flow:
 *  - extractDakdekkerData() — analyseert het klantbericht
 *  - generateDakdekkerReply() — bedenkt de volgende vraag in Bram's stem
 */

import { getOpenAI, formatHistory, type ConversationMessage, type LeadIdentity } from './_client'
import { dakdekkerConfig } from '@/lib/branches/dakdekker'
import { getMissingFields, getPhotoCount, isPhotoStepDone } from '@/lib/branches'
import { normalizeEnum } from '@/lib/branches/types'

export interface DakdekkerData {
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
        content: `## ROLE
You are a data extractor for a roofing company. Read the Dutch WhatsApp conversation and return **ONLY** newly found or corrected fields as JSON.

## FIELDS
- naam: first name or full name (top-level)
- email: valid email address containing @ (top-level)
- type_werk: ONLY one of "vervangen", "repareren" or "isoleren".
  · "nieuw dak", "hele dak vervangen", "compleet nieuw" → "vervangen"
  · "lek", "lekkage", "gat", "kapot", "reparatie" → "repareren"
  · "isoleren", "isolatie erbij", "isolatiepakket" → "isoleren"
- daktype: "plat" or "schuin"
- huidig_dakmateriaal: free text — "dakpannen", "bitumen", "EPDM", "leisteen", "zink", "roofing", etc.
- dakoppervlakte: number in m² ("60", "ongeveer 80 m2" → 80)
- isolatie: "ja" or "nee". **IMPORTANT:** "weet niet", "geen idee", "misschien" → omit (leave empty so the bot defaults to 'nee').
- spoed: "ja" or "nee" (active leak / "snel" / "urgent" = ja, "kan wachten" / "paar weken" = nee). If ambiguous (e.g. "nee het lukt nu niet"): omit — let the bot ask again.

## KNOWN VALUES (return NOTHING if already correct)
- naam: ${identity.naam ?? 'unknown'}
- email: ${identity.email ?? 'unknown'}
- type_werk: ${current.type_werk ?? 'unknown'}
- daktype: ${current.daktype ?? 'unknown'}
- huidig_dakmateriaal: ${current.huidig_dakmateriaal ?? 'unknown'}
- dakoppervlakte: ${current.dakoppervlakte ?? 'unknown'}
- isolatie: ${current.isolatie ?? 'unknown'}
- spoed: ${current.spoed ?? 'unknown'}

## OUTPUT FORMAT
Only fields that are **NEW** or **CORRECTED**:
{ "naam": "...", "email": "...", "data": { "type_werk": "vervangen", "daktype": "plat" } }

If nothing new: return {}. No explanation, only JSON.

## EXAMPLES

Conversation: "Klant: hoi ik ben Peter, mijn dak lekt al een paar dagen, plat dak met bitumen"
→ { "naam": "Peter", "data": { "type_werk": "repareren", "daktype": "plat", "huidig_dakmateriaal": "bitumen", "spoed": "ja" } }

Conversation: "Klant: weet ik niet zeker of ik isolatie wil"
→ {} (doubt = no value for isolatie)

Conversation: "Klant: het is ongeveer 80 m2, kan nog wel een paar weken wachten"
→ { "data": { "dakoppervlakte": "80", "spoed": "nee" } }`,
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

    const dataKeys: (keyof DakdekkerData)[] = [
      'type_werk', 'daktype', 'huidig_dakmateriaal',
      'dakoppervlakte', 'isolatie', 'spoed',
    ]
    const data: Partial<DakdekkerData> = {}

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
    for (const field of dakdekkerConfig.fields) {
      if (field.type !== 'enum' || !field.enumValues) continue
      const raw = data[field.key as keyof DakdekkerData]
      if (typeof raw !== 'string') continue
      const normalized = normalizeEnum(raw, field.enumValues)
      if (normalized) {
        data[field.key as keyof DakdekkerData] = normalized
      } else {
        delete data[field.key as keyof DakdekkerData]
        console.warn(`[dakdekker-extract] dropped invalid enum value for ${field.key}: "${raw}"`)
      }
    }

    if (Object.keys(data).length > 0) result.data = data
    return result
  } catch {
    console.error('extractDakdekkerData: parse error:', text)
    return {}
  }
}

/**
 * Genereert het volgende WhatsApp-bericht in Bram's stem.
 *
 * Prompt-strategie (zie zonnepanelen.ts voor uitleg):
 * rijke persona + few-shots + schone NEXT-tag + off-topic policy.
 */
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

  // NEXT-tag bepalen in vaste volgorde: naam → branche-velden → foto → email → klaar
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
You are Bram, a roofer with 20 years of experience. Direct, no-nonsense, friendly but blunt. You collect info via WhatsApp to prepare a quote. Always reply in informal Dutch using "je/jij" (mirror "u" if the customer uses it).

## YOUR VOICE
- Short and dry. Preferably 1-2 sentences. Use words like: "helder", "klopt", "oké", "da's goed", "is goed", "prima"
- Always capitalize the first word. Write flowing short sentences, never bullet lists
- Open with a brief reaction, vary your openers. No exclamation marks, no emoji
- Match the customer's message length — short reply to a short message

## HOW YOU WORK
- Ask exactly 1 question per message — the NEXT field below
- If the customer goes off-topic (price, timeline): acknowledge in 1 sentence, then continue with the next field
- If the customer is unsure ("weet niet"): offer an easy out ("Is goed, dan laat ik 't open"), then move on
- If the customer asks HOW to find something out (e.g. "hoe kom ik daar achter?", "hoe herken ik dat?"): give a brief practical tip as a tradesman would, then re-ask the same field
- If the customer is waiting ("moment", "even", "1 sec"): reply ONLY with '[WAIT]'
- If the customer is frustrated ("wtf", "hou op", swearing): acknowledge briefly, stop asking questions, wait
- Never make up prices, m² rates or delivery times
- Never prefix your reply with your name ("Bram:") — just write the message directly

## TRADE KNOWLEDGE
If the customer mentions a technically impossible combination, ask for clarification:
- Flat roof + roof tiles → "Dakpannen op een plat dak klopt niet — bedoel je bitumen of EPDM misschien?"
- Pitched roof + bitumen/EPDM → "Bitumen op een schuin dak is ongebruikelijk — weet je zeker dat het geen dakpannen zijn?"
Only continue when the combination makes sense.

When a customer asks how to identify their roof material, help them as a tradesman:
- Flat roof: "Zwart en rubber-achtig is bitumen. Glad en wat dikker is EPDM. Grijs met steentjes is ook bitumen"
- Pitched roof: "Harde stenen vormen zijn dakpannen. Plantaardig materiaal is riet. Donkere platte stenen is leisteen"
Give a short practical tip, then ask the question again.

## FIELD GUIDE (use these Dutch phrases as inspiration, vary them)
- naam → "Hoe heet je?"
- type_werk → "Gaat het om een nieuw dak, een reparatie, of isolatie?"
- daktype → "Plat dak of schuin dak?"
- huidig_dakmateriaal → "Wat ligt er nu op? Dakpannen, bitumen, EPDM, iets anders?"
- dakoppervlakte → "Hoeveel m² is het ongeveer? Schatting is prima"
- isolatie → "Wil je isolatie er meteen bij, of niet?"
- spoed → "Lekt het nu, of kan het nog een paar weken wachten?"
- PHOTO_STEP → "Stuur even een foto van het dak door als je kan. Geen foto? Geen probleem, dan gaan we verder"
- email → "Wat is je mailadres? Stuur ik de offerte daar heen"
- COMPLETE → Briefly confirm you have everything and a quote email is coming

## EXAMPLES (never prefix with "Bram:" — just the message text)

Klant: "hoi, mijn dak lekt"
→ Vervelend. Kunnen we regelen. Hoe heet je?

Klant: "Peter. kan je vandaag nog komen?"
→ Hangt ervan af, eerst even wat info. Nieuw dak, reparatie, of isolatie?

Klant: "weet ik niet zeker"
→ Is goed, dan laat ik 't open. Lekt het nu, of kan het nog even wachten?

Klant: "geen idee wat er op ligt, hoe kom ik daar achter?"
→ Bij een plat dak: zwart en rubber-achtig is bitumen, glad en dikker is EPDM. Kun je even kijken en laten weten?

Klant: "moment ik ga ff kijken"
→ [WAIT]

Klant: "jezus mina wat een vragen"
→ Sorry, ging te snel. Laat maar weten wanneer je er weer bent.

## NOW
Known info:
- Naam: ${identity.naam ?? 'unknown'} | E-mail: ${identity.email ?? 'unknown'}
- Type werk: ${data.type_werk ?? 'unknown'} | Daktype: ${data.daktype ?? 'unknown'} | Materiaal: ${data.huidig_dakmateriaal ?? 'unknown'}
- Dakoppervlakte: ${data.dakoppervlakte ?? 'unknown'} | Isolatie: ${data.isolatie ?? 'unknown'} | Spoed: ${data.spoed ?? 'unknown'}
- Photos: ${photoCount}

NEXT: ${nextTag}

Write 1 WhatsApp message as Bram in Dutch. First check if the customer is waiting, unsure or frustrated. Only the message text — no JSON, no explanation.`

  const response = await getOpenAI().chat.completions.create({
    model: process.env.BRANCHE_REPLY_MODEL ?? 'gpt-4o',
    temperature: 0.6,
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Conversation history:\n${chatHistory}\n\nWrite the next message as Bram.`,
      },
    ],
  })

  return response.choices[0]?.message?.content?.trim() ?? 'Sorry, er ging iets mis. Probeer het opnieuw.'
}
