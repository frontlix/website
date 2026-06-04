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

export type DemoTourStep = {
  id: string
  /** korte naam in het stappenmenu links */
  menuLabel: string
  title: string
  /** uitgeschreven uitleg onder het podium */
  uitleg: string
  Icon: LucideIcon
  Scene: ComponentType<SceneProps>
}
