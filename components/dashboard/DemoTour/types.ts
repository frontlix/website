import type { ComponentType } from 'react'
import type { LucideIcon } from 'lucide-react'

/**
 * Uniforme interface waarmee DemoTour elke scène aanstuurt (spec §4).
 * - playing=false pauzeert de lopende fase-timer
 * - finished=true slaat de animatie over en toont direct de eindstand
 * - onSceneEnd wordt één keer aangeroepen zodra de eindstand is bereikt
 */
export type SceneProps = {
  playing: boolean
  finished: boolean
  onSceneEnd: () => void
}

/** Soort hoofdstuk: welkomstscherm, gewone tour-stap of slotscherm. */
export type ChapterKind = 'welcome' | 'tour' | 'outro'

export type DemoTourStep = {
  id: string
  kind: ChapterKind
  /** korte naam bij het hoofdstukpunt op de tijdbalk */
  menuLabel: string
  title: string
  /** uitgeschreven uitleg naast het podium */
  uitleg: string
  /** opsomming onder de uitleg (leeg bij welkom/slot) */
  bullets: readonly string[]
  /** hoofdstukduur in seconden (bepaalt de voortgangsbalk en autoplay) */
  durSec: number
  Icon: LucideIcon
  Scene: ComponentType<SceneProps>
}
