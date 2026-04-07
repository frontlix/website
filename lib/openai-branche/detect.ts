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
        content: `Je classificeert WhatsApp-berichten van klanten in een van drie branches.

Geef ALLEEN JSON terug in dit formaat: { "branche": "<waarde>" }

Toegestane waarden:
- "zonnepanelen" — klant wil zonnepanelen, solar, PV, panelen op het dak, energie opwekken
- "dakdekker"   — klant heeft dakproblemen, lekkage, wil dak vervangen, isoleren of repareren, dakwerk
- "schoonmaak"  — klant wil schoonmaak, poetsen, glazenwasser, kantoor/woning/horeca laten reinigen
- "null"        — onduidelijk, klant heeft nog geen branche genoemd

Wees ruim met herkenning — typo's en synoniemen toegestaan. Bij twijfel: "null".`,
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
