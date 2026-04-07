/**
 * Branche-config registry.
 *
 * Importeer hier nooit `lib/openai.ts` of andere runtime-side dingen — dit
 * bestand is puur data en moet bruikbaar blijven in zowel server- als
 * client-context (bv. voor de PDF renderer).
 */

import type { BrancheConfig, BrancheId } from './types'
import { zonnepanelenConfig } from './zonnepanelen'
import { dakdekkerConfig } from './dakdekker'
import { schoonmaakConfig } from './schoonmaak'

export const BRANCHES: Record<BrancheId, BrancheConfig> = {
  zonnepanelen: zonnepanelenConfig,
  dakdekker: dakdekkerConfig,
  schoonmaak: schoonmaakConfig,
}

export const BRANCHE_IDS: readonly BrancheId[] = ['zonnepanelen', 'dakdekker', 'schoonmaak']

/** Returnt config of `null` als het geen geldige branche is */
export function getBranche(id: string | null | undefined): BrancheConfig | null {
  if (!id) return null
  return BRANCHES[id as BrancheId] ?? null
}

/**
 * Lead-status voor de branche-flow. Wordt opgeslagen in `leads.status` (text).
 * Volgorde van de flow: awaiting_choice → collecting → pending_approval → quote_sent → scheduling → appointment_booked
 */
export type BrancheStatus =
  | 'awaiting_choice'      // template gestuurd, nog geen branche gekozen
  | 'collecting'           // branche bekend, vragen + foto's verzamelen
  | 'pending_approval'     // alle data binnen, wachten op klik op approval-link in mail
  | 'quote_sent'           // PDF + WhatsApp document verstuurd, wachten op "ja" voor afspraak
  | 'scheduling'           // bot heeft slots voorgesteld, wachten op keuze
  | 'appointment_booked'   // Google Calendar event aangemaakt, flow klaar

/**
 * Bepaalt welke velden uit de config nog ontbreken in de huidige collected_data.
 * Naam en email zijn top-level kolommen op `leads` en zitten dus NIET in de
 * BrancheConfig.fields lijst — die check je direct op de lead row.
 *
 * Volgorde = volgorde uit BrancheConfig.fields. De webhook-loop gebruikt het
 * eerste ontbrekende veld als de "volgende vraag" voor de reply-LLM.
 */
export function getMissingFields(
  branche: BrancheConfig,
  collectedData: Record<string, unknown>
): string[] {
  return branche.fields
    .filter((f) => {
      const v = collectedData[f.key]
      return v === undefined || v === null || v === '' || v === 'null'
    })
    .map((f) => f.key)
}

/** Tellen hoeveel foto's de klant al heeft gestuurd */
export function getPhotoCount(collectedData: Record<string, unknown>): number {
  const photos = collectedData.photos
  if (!Array.isArray(photos)) return 0
  return photos.length
}

/**
 * Foto's zijn optioneel. De klant mag er 0 t/m 12 sturen.
 * Bij 12 foto's gaan we automatisch door (max bereikt).
 * Bij minder foto's wachten we 30 seconden na de laatste foto, en als er
 * dan geen nieuwe foto komt gaan we ook automatisch door.
 */
export const MAX_PHOTOS = 12
export const PHOTO_WAIT_MS = 30_000

/**
 * De foto-stap is "actief" als alle reguliere velden ingevuld zijn maar
 * we nog wachten op foto's (of de bevestiging dat de klant geen foto heeft).
 */
export function isPhotoStepDone(collectedData: Record<string, unknown>): boolean {
  return collectedData._photo_step_done === true
}

/** Tijdstempel van de laatst-ontvangen foto (epoch ms) */
export function getLastPhotoAt(collectedData: Record<string, unknown>): number {
  const v = collectedData._last_photo_at
  return typeof v === 'number' ? v : 0
}

/**
 * Zachte keyword-detectie voor "ik heb geen foto / sla over / dat was alles".
 * Wordt door de webhook gebruikt als de klant in de foto-stap een tekstbericht
 * stuurt — zo hoeven we niet voor elk bericht een extra LLM call te doen.
 */
export function userSkipsPhotoStep(text: string): boolean {
  const t = text.toLowerCase().trim()
  if (!t) return false
  // Korte ja/nee patronen + expliciete skip-zinnen
  if (/^(nee|nope|geen|klaar|skip|stop|niets|niks)$/i.test(t)) return true
  if (/\b(geen foto|geen fotos|geen foto's|heb geen|heb er geen|sla over|dat (is|was) alles|ben klaar|niks meer|niets meer)\b/i.test(t)) return true
  return false
}

export type { BrancheConfig, BrancheId, BrancheField, PricingResult, PriceLine, CompanyInfo } from './types'
