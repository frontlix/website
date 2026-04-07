/**
 * Branche-LLM dispatcher.
 *
 * De webhook gebruikt `getBrancheLLMs(branche)` om het juiste paar
 * extract+reply functies op te halen op basis van lead.demo_type.
 *
 * Elke branche heeft 2 dedicated LLMs (extract + reply) met eigen prompts
 * — geen gedeelde generieke template.
 */

import type { BrancheId } from '@/lib/branches'
import type { ConversationMessage, LeadIdentity } from './_client'

import {
  extractZonnepanelenData,
  generateZonnepanelenReply,
  type ZonnepanelenData,
  type ExtractedZonnepanelenResult,
} from './zonnepanelen'
import {
  extractDakdekkerData,
  generateDakdekkerReply,
  type DakdekkerData,
  type ExtractedDakdekkerResult,
} from './dakdekker'
import {
  extractSchoonmaakData,
  generateSchoonmaakReply,
  type SchoonmaakData,
  type ExtractedSchoonmaakResult,
} from './schoonmaak'

export type AnyBrancheData = ZonnepanelenData | DakdekkerData | SchoonmaakData
export type AnyExtractedResult =
  | ExtractedZonnepanelenResult
  | ExtractedDakdekkerResult
  | ExtractedSchoonmaakResult

/**
 * Generieke signature die de webhook aanroept. Onder water dispatcht naar
 * de branche-specifieke LLM. Het type van `current` en het returntype
 * worden door de webhook als unknown JSON behandeld en daarna gemerged
 * in de `collected_data` jsonb kolom.
 */
export interface BrancheLLMs {
  extract: (
    history: ConversationMessage[],
    identity: LeadIdentity,
    current: Record<string, string | undefined>
  ) => Promise<AnyExtractedResult>
  reply: (
    history: ConversationMessage[],
    identity: LeadIdentity,
    data: Record<string, string | undefined>,
    collectedData: Record<string, unknown>
  ) => Promise<string>
}

export function getBrancheLLMs(branche: BrancheId): BrancheLLMs {
  switch (branche) {
    case 'zonnepanelen':
      return {
        extract: (h, i, c) => extractZonnepanelenData(h, i, c as ZonnepanelenData),
        reply: (h, i, d, cd) => generateZonnepanelenReply(h, i, d as ZonnepanelenData, cd),
      }
    case 'dakdekker':
      return {
        extract: (h, i, c) => extractDakdekkerData(h, i, c as DakdekkerData),
        reply: (h, i, d, cd) => generateDakdekkerReply(h, i, d as DakdekkerData, cd),
      }
    case 'schoonmaak':
      return {
        extract: (h, i, c) => extractSchoonmaakData(h, i, c as SchoonmaakData),
        reply: (h, i, d, cd) => generateSchoonmaakReply(h, i, d as SchoonmaakData, cd),
      }
  }
}

export { detectBranche } from './detect'
export type { ConversationMessage, LeadIdentity }
