import { getOpenAI, formatHistory, type ConversationMessage } from './_client'
import type { BrancheId } from '@/lib/branches'

/**
 * Bepaalt aan de hand van het klantbericht welke branche bedoeld wordt.
 * Wordt alleen één keer aangeroepen wanneer lead.demo_type nog null is.
 *
 * Deze LLM is bewust mini en simpel: de prompt is < 500 tokens en doet
 * één ding — branche herkennen of `null` returnen als het onduidelijk is.
 */
export async function detectBranche(history: ConversationMessage[]): Promise<BrancheId | null> {
  const chatHistory = formatHistory(history)

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You classify Dutch WhatsApp messages into one of three industries.

Return ONLY JSON in this format: { "branche": "<value>" }

Allowed values:
- "zonnepanelen" — customer wants solar panels, PV, panels on the roof, energy generation
- "dakdekker" — customer has roof problems, leaks, wants roof replaced, insulated or repaired
- "schoonmaak" — customer wants cleaning services for office/home/hospitality/retail
- "null" — unclear, customer has not mentioned an industry yet

Be generous with recognition — typos and Dutch synonyms are fine. When in doubt: "null".`,
      },
      {
        role: 'user',
        content: chatHistory,
      },
    ],
  })

  const text = response.choices[0]?.message?.content ?? '{}'
  try {
    const parsed = JSON.parse(text) as { branche?: string }
    const v = parsed.branche
    if (v === 'zonnepanelen' || v === 'dakdekker' || v === 'schoonmaak') return v
    return null
  } catch {
    console.error('detectBranche: failed to parse:', text)
    return null
  }
}
