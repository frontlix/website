import type { ChapterKind } from './types'

/**
 * Pure tekstinhoud van de hoofdstukken (welkom, 9 tour-stappen, slot),
 * los van de scène-componenten zodat vitest dit zonder JSX-transform
 * kan testen. Toon: instructief ("Klik op..."), bot heet Surface,
 * en nergens streepjes in zichtbare tekst (huisstijl).
 */

export type DemoTourStepContent = {
  id: string
  kind: ChapterKind
  /** korte naam bij het hoofdstukpunt op de tijdbalk */
  menuLabel: string
  title: string
  /** uitgeschreven uitleg naast het podium */
  uitleg: string
  /** opsomming onder de uitleg (leeg bij welkom/slot) */
  bullets: readonly string[]
  /** hoofdstukduur in seconden */
  durSec: number
}

export const STEP_CONTENT: readonly DemoTourStepContent[] = [
  {
    id: 'welkom',
    kind: 'welcome',
    menuLabel: 'Welkom',
    title: 'Welkom! Zo werkt je dashboard',
    uitleg:
      'In een paar minuten lopen we elke functie langs: van je leads tot offertes, de bot en je agenda. De video speelt vanzelf af. Pauzeer of spoel terug wanneer je wilt via de balk onderaan.',
    bullets: [],
    durSec: 8,
  },
  {
    id: 'overzicht',
    kind: 'tour',
    menuLabel: 'Overzicht',
    title: 'Je dashboard',
    uitleg:
      'Zodra je inlogt opent het Overzicht. Bovenaan zie je je cijfers, daaronder loopt de live activiteit mee met alles wat er nú gebeurt.',
    bullets: [
      'Je aanvragen, offertes en afspraken in één blik',
      'De live activiteit loopt automatisch mee',
      'Nieuwe aanvragen lichten direct op',
    ],
    durSec: 12,
  },
  {
    id: 'leads',
    kind: 'tour',
    menuLabel: 'Leads',
    title: 'Al je leads',
    uitleg:
      'Klik in de zijbalk op Leads. Hier staan al je aanvragen, met naam, adres en dienst automatisch ingevuld vanuit het gesprek.',
    bullets: [
      'Elke aanvraag wordt vanzelf een complete lead',
      'Nieuwe leads verschijnen bovenaan je lijst',
      'Klik op een lead voor het volledige dossier',
    ],
    durSec: 13,
  },
  {
    id: 'inbox',
    kind: 'tour',
    menuLabel: 'Inbox',
    title: 'Inbox en de bot Surface',
    uitleg:
      'In de Inbox beantwoordt Surface, je slimme assistent, de WhatsApp berichten automatisch. Jij leest live mee in elk gesprek.',
    bullets: [
      'Surface stelt de juiste vervolgvragen',
      'Het gesprek werkt vanzelf toe naar een offerte',
      'Zelf reageren? Jij kunt het gesprek altijd overnemen',
    ],
    durSec: 14,
  },
  {
    id: 'offerte-automatisch',
    kind: 'tour',
    menuLabel: 'Offerte automatisch',
    title: 'Offertes maken zichzelf',
    uitleg:
      'Zodra Surface genoeg weet, rolt er vanzelf een offerte uit met jouw diensten en tarieven. De klant ontvangt hem direct per WhatsApp.',
    bullets: [
      'Regels en prijzen worden automatisch berekend',
      'Versturen gaat direct via WhatsApp',
      'Jij ziet de status live veranderen',
    ],
    durSec: 12,
  },
  {
    id: 'offerte-handmatig',
    kind: 'tour',
    menuLabel: 'Offerte handmatig',
    title: 'Zelf een offerte maken',
    uitleg:
      'Sprak je een klant telefonisch? Klik op Nieuwe offerte en bouw de offerte zelf. Kies het werk, controleer de regels en verstuur in één klik.',
    bullets: [
      'Kies de klant en het soort werk',
      'Regels en totaal rekenen zichzelf uit',
      'Versturen in één klik via WhatsApp of mail',
    ],
    durSec: 14,
  },
  {
    id: 'agenda',
    kind: 'tour',
    menuLabel: 'Agenda',
    title: 'Je agenda',
    uitleg:
      'Open de Agenda voor je week. Afspraken uit de gesprekken landen er automatisch in, en Frontlix berekent de rijroute van je dag.',
    bullets: [
      'Weekoverzicht met al je afspraken',
      'De rijroute langs je klussen wordt berekend',
      'Klik op een afspraak voor de details',
    ],
    durSec: 11,
  },
  {
    id: 'reviews',
    kind: 'tour',
    menuLabel: 'Reviews',
    title: 'Reviews verzamelen gaat vanzelf',
    uitleg:
      'Na een afgeronde klus vraagt Frontlix de klant automatisch om een review. Tevreden klanten worden zo zichtbaar voor nieuwe klanten.',
    bullets: [
      'Het verzoek gaat vanzelf via WhatsApp',
      'Sterren en reacties komen hier binnen',
      'Jij hoeft er niet aan te denken',
    ],
    durSec: 11,
  },
  {
    id: 'statistieken',
    kind: 'tour',
    menuLabel: 'Statistieken',
    title: 'Analyses en cijfers',
    uitleg:
      'Onder Analyses volg je je cijfers: je omzet, je conversie en hoe zelfstandig Surface het werk doet.',
    bullets: [
      'Omzet en conversie per periode',
      'Van aanvraag naar offerte naar klus',
      'Zie meteen waar je kunt groeien',
    ],
    durSec: 11,
  },
  {
    id: 'instellingen',
    kind: 'tour',
    menuLabel: 'Instellingen',
    title: 'Instellingen',
    uitleg:
      'In Instellingen richt je alles naar jouw hand: de toon van Surface, je diensten en prijzen, en je WhatsApp koppeling.',
    bullets: [
      'Bepaal hoe Surface met klanten praat',
      'Diensten met jouw tarieven per m²',
      'WhatsApp koppeling en bedrijfsgegevens',
    ],
    durSec: 12,
  },
  {
    id: 'klaar',
    kind: 'outro',
    menuLabel: 'Klaar',
    title: 'Je bent klaar om te beginnen',
    uitleg:
      'Alles op één plek: leads, gesprekken, offertes en je agenda, met Surface die het meeste werk uit handen neemt. Stel nu in een paar minuten je gegevens in, dan kan de eerste echte aanvraag binnenkomen.',
    bullets: [],
    durSec: 9,
  },
]
