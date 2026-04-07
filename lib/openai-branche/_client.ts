/**
 * Gedeelde OpenAI client (lazy init).
 *
 * Belangrijk: dit bestand bevat ZELF GEEN prompts of business-logica.
 * Elke branche-LLM importeert alleen de client en schrijft zijn eigen prompt.
 * Zo blijft het principe "kort, gefocuste prompts per LLM" gehandhaafd.
 */

import OpenAI from 'openai'

let _openai: OpenAI | null = null

export function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return _openai
}

export interface ConversationMessage {
  role: 'assistant' | 'user'
  content: string
}

/** Top-level lead velden die in alle branches gelijk zijn */
export interface LeadIdentity {
  naam: string | null
  email: string | null
}

/** Format a conversation history for inclusion in a prompt */
export function formatHistory(history: ConversationMessage[]): string {
  return history
    .map((m) => `${m.role === 'user' ? 'Klant' : 'Assistent'}: ${m.content}`)
    .join('\n')
}
