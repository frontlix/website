import {
  BarChart3,
  CalendarDays,
  FileText,
  LayoutDashboard,
  MessageCircle,
  PartyPopper,
  PenLine,
  Sparkles,
  Star,
  Users,
} from 'lucide-react'
import type { DemoTourStep } from './types'
import { STEP_CONTENT } from './steps-content'
import { WelkomScene } from './scenes/WelkomScene'
import { OverzichtScene } from './scenes/OverzichtScene'
import { LeadsScene } from './scenes/LeadsScene'
import { InboxScene } from './scenes/InboxScene'
import { OfferteAutoScene } from './scenes/OfferteAutoScene'
import { OfferteHandmatigScene } from './scenes/OfferteHandmatigScene'
import { AgendaScene } from './scenes/AgendaScene'
import { ReviewsScene } from './scenes/ReviewsScene'
import { StatistiekenScene } from './scenes/StatistiekenScene'
import { KlaarScene } from './scenes/KlaarScene'

/** Visuele invulling (icoon + scène) per stap-id uit steps-content.ts. */
const VISUALS: Record<string, Pick<DemoTourStep, 'Icon' | 'Scene'>> = {
  welkom: { Icon: Sparkles, Scene: WelkomScene },
  overzicht: { Icon: LayoutDashboard, Scene: OverzichtScene },
  leads: { Icon: Users, Scene: LeadsScene },
  inbox: { Icon: MessageCircle, Scene: InboxScene },
  'offerte-automatisch': { Icon: FileText, Scene: OfferteAutoScene },
  'offerte-handmatig': { Icon: PenLine, Scene: OfferteHandmatigScene },
  agenda: { Icon: CalendarDays, Scene: AgendaScene },
  reviews: { Icon: Star, Scene: ReviewsScene },
  statistieken: { Icon: BarChart3, Scene: StatistiekenScene },
  klaar: { Icon: PartyPopper, Scene: KlaarScene },
}

/** De 10 stappen van de rondleiding, in vaste volgorde (spec §3). */
export const DEMO_TOUR_STEPS: readonly DemoTourStep[] = STEP_CONTENT.map((content) => {
  const visual = VISUALS[content.id]
  if (!visual) throw new Error(`Geen scène geregistreerd voor tourstap "${content.id}"`)
  return { ...content, ...visual }
})
