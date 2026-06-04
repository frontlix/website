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

/** De 10 stappen van de rondleiding, in vaste volgorde (spec §3). */
export const DEMO_TOUR_STEPS: readonly DemoTourStep[] = [
  {
    id: 'welkom',
    menuLabel: 'Welkom',
    title: 'Welkom bij Frontlix',
    uitleg:
      'In deze rondleiding zie je in tien korte stappen hoe Frontlix werk uit handen neemt, van de eerste aanvraag tot de review achteraf. Elke stap speelt een korte demonstratie af. Klik op Volgende wanneer je verder wilt, of spring via het menu links direct naar een onderwerp.',
    Icon: Sparkles,
    Scene: WelkomScene,
  },
  {
    id: 'overzicht',
    menuLabel: 'Overzicht',
    title: 'Het overzicht is je startpunt',
    uitleg:
      'Hier zie je in één oogopslag hoeveel aanvragen er binnenkomen, hoeveel offertes er uitstaan en wat er vandaag gebeurt. In de live activiteit zie je elke nieuwe aanvraag direct binnenkomen, zoals hier de aanvraag van familie Jansen.',
    Icon: LayoutDashboard,
    Scene: OverzichtScene,
  },
  {
    id: 'leads',
    menuLabel: 'Leads',
    title: 'Elke aanvraag wordt een complete lead',
    uitleg:
      'Frontlix verzamelt naam, adres, dienst en oppervlakte automatisch uit het gesprek, jij hoeft niets over te typen. Klik op een lead en je ziet alle gegevens, het gesprek en de status overzichtelijk bij elkaar.',
    Icon: Users,
    Scene: LeadsScene,
  },
  {
    id: 'inbox',
    menuLabel: 'Inbox',
    title: 'De bot beantwoordt WhatsApp voor je',
    uitleg:
      'In de inbox lees je live mee met elk gesprek. De bot beantwoordt vragen, stelt de juiste vervolgvragen en werkt toe naar een offerte. Jij kunt op elk moment het gesprek overnemen, de bot stapt dan netjes opzij.',
    Icon: MessageCircle,
    Scene: InboxScene,
  },
  {
    id: 'offerte-automatisch',
    menuLabel: 'Offerte automatisch',
    title: 'Offertes maken zichzelf',
    uitleg:
      'Zodra de bot genoeg weet, stelt Frontlix automatisch een offerte op met jouw diensten en tarieven. De klant ontvangt hem direct per WhatsApp en jij ziet de status veranderen zodra hij bekeken wordt.',
    Icon: FileText,
    Scene: OfferteAutoScene,
  },
  {
    id: 'offerte-handmatig',
    menuLabel: 'Offerte handmatig',
    title: 'Zelf een offerte bouwen kan altijd',
    uitleg:
      'Liever zelf aan de knoppen? Via de knop Nieuwe offerte stel je in een paar klikken zelf de regels, aantallen en prijzen samen. Versturen gaat daarna net zo makkelijk, per WhatsApp of mail.',
    Icon: PenLine,
    Scene: OfferteHandmatigScene,
  },
  {
    id: 'agenda',
    menuLabel: 'Agenda',
    title: 'Afspraken plannen zichzelf in',
    uitleg:
      'Geboekte afspraken landen automatisch in je agenda. Frontlix plant slim en rekent zelfs je rijroute uit, zodat je niet onnodig heen en weer rijdt.',
    Icon: CalendarDays,
    Scene: AgendaScene,
  },
  {
    id: 'reviews',
    menuLabel: 'Reviews',
    title: 'Reviews verzamelen gaat vanzelf',
    uitleg:
      'Na een afgeronde klus vraagt Frontlix automatisch om een review. Tevreden klanten worden zo zichtbaar voor nieuwe klanten, zonder dat jij eraan hoeft te denken.',
    Icon: Star,
    Scene: ReviewsScene,
  },
  {
    id: 'statistieken',
    menuLabel: 'Statistieken',
    title: 'Je cijfers, altijd actueel',
    uitleg:
      'Onder Analyses zie je precies hoe je bedrijf ervoor staat: hoeveel aanvragen er binnenkomen, hoeveel daarvan offerte en klus worden, en wat dat oplevert. Zo zie je meteen waar je kunt groeien.',
    Icon: BarChart3,
    Scene: StatistiekenScene,
  },
  {
    id: 'klaar',
    menuLabel: 'Klaar',
    title: 'Dat was de rondleiding!',
    uitleg:
      'Frontlix staat klaar om voor jou aan het werk te gaan. Stel nu in een paar minuten je bedrijfsgegevens, prijzen en WhatsApp-koppeling in, daarna kan de eerste echte aanvraag binnenkomen.',
    Icon: PartyPopper,
    Scene: KlaarScene,
  },
]
