import type { DriverApi } from './driver'

/**
 * De hoofdstukken van de rondleiding (script conform het goedgekeurde
 * onboarding-document): welkom, 10 tour-stappen door de echte app, slot.
 * Elke `run` bestuurt de ingesloten demo-app via de driver-API en klikt
 * alleen op échte, zichtbare elementen. Teksten: instructieve toon,
 * bot heet Surface, nergens streepjes (huisstijl).
 */

export type ChapterKind = 'welcome' | 'tour' | 'outro'

export type Chapter = {
  id: string
  kind: ChapterKind
  /** korte naam bij het hoofdstukpunt op de tijdbalk */
  menuLabel: string
  title: string
  body: string
  bullets: readonly string[]
  /** hoofdstukduur in seconden (voortgangsbalk en autoplay) */
  durSec: number
  run?: (a: DriverApi) => Promise<void>
}

export const CHAPTERS: readonly Chapter[] = [
  {
    id: 'welkom',
    kind: 'welcome',
    menuLabel: 'Welkom',
    title: 'Welkom! Zo werkt je dashboard',
    body: 'In een paar minuten lopen we elke functie langs: van je leads tot offertes, de bot en je agenda. Pauzeer of spoel terug wanneer je wilt.',
    bullets: [],
    durSec: 7,
    run: async (a) => {
      await a.goto('overzicht')
    },
  },
  {
    id: 'dashboard',
    kind: 'tour',
    menuLabel: 'Overzicht',
    title: 'Je dashboard',
    body: 'Zodra je inlogt opent het Overzicht. Bovenaan je omzet en je doel, daaronder de leads die nú je aandacht vragen, plus je agenda en je grafiek.',
    bullets: [
      'Je omzet deze maand, met je doel in beeld',
      '"Wat nu?" verzamelt leads die actie vragen',
      'Je live activiteit en de agenda van vandaag',
    ],
    durSec: 13,
    run: async (a) => {
      await a.closeOverlays()
      await a.goto('overzicht')
      await a.sleep(1200)
      await a.scrollTo(420)
      await a.sleep(1800)
      await a.scrollTo(0)
    },
  },
  {
    id: 'leads',
    kind: 'tour',
    menuLabel: 'Leads',
    title: 'Al je leads',
    body: 'Klik in de zijbalk op Leads. Al je aanvragen staan hier in een pipeline, van het eerste gesprek tot de afgeronde klus.',
    bullets: [
      'Vijf fasen overzichtelijk naast elkaar',
      'Filter en zoek bovenaan de pagina',
      'Klik een kaart om het dossier te openen',
    ],
    durSec: 13,
    run: async (a) => {
      await a.closeOverlays()
      await a.clickNav('Leads')
      await a.sleep(1000)
      await a.clickSeg(/Pipeline/i)
      await a.sleep(1200)
      await a.scrollTo(160)
      await a.sleep(1200)
      await a.scrollTo(0)
    },
  },
  {
    id: 'weergaven',
    kind: 'tour',
    menuLabel: 'Weergaven',
    title: 'Drie weergaven',
    body: 'Rechtsboven wissel je de weergave. Pipeline voor overzicht, Tabel om te sorteren, en Kaarten voor visuele triage.',
    bullets: [
      'Pipeline: een kolom per fase',
      'Tabel: sorteerbaar en compact',
      'Kaarten: een rijke kaart per lead',
    ],
    durSec: 13,
    run: async (a) => {
      await a.closeOverlays()
      await a.clickSeg(/Tabel/i)
      await a.sleep(2200)
      await a.clickSeg(/Kaarten/i)
      await a.sleep(2200)
      await a.clickSeg(/Pipeline/i)
    },
  },
  {
    id: 'dossier',
    kind: 'tour',
    menuLabel: 'Dossier',
    title: 'Het dossier',
    body: 'Open een lead. Links zie je alles over de klant in tabs, rechts loopt het volledige WhatsApp gesprek mee.',
    bullets: [
      'Info · Offerte · Foto’s · Tijdlijn',
      'Elk veld is direct te bewerken',
      'Rechts: het hele gesprek met de klant',
    ],
    durSec: 15,
    run: async (a) => {
      await a.closeOverlays()
      await a.goto('leads/L-2087')
      await a.sleep(1400)
      await a.clickTab(/Offerte/i)
      await a.sleep(1700)
      await a.clickTab(/Foto/i)
      await a.sleep(1700)
      await a.clickTab(/Tijdlijn/i)
      await a.sleep(1700)
      await a.clickTab(/Info/i)
    },
  },
  {
    id: 'bot',
    kind: 'tour',
    menuLabel: 'Bot',
    title: 'De bot pauzeren',
    body: 'Surface beantwoordt de klant automatisch. Klik op "Bot pauzeren" om het gesprek zelf over te nemen, en op "Bot activeren" om Surface weer aan te zetten.',
    bullets: [
      'Bot pauzeren: jij typt zelf',
      'Bot activeren: Surface neemt het weer over',
      'Je stelt dit per lead in',
    ],
    durSec: 12,
    run: async (a) => {
      await a.closeOverlays()
      await a.clickText('.btn.btn-ghost.btn-sm', /Bot pauzeren/i)
      await a.sleep(2400)
      await a.clickText('.btn.btn-ghost.btn-sm', /Bot activeren/i)
    },
  },
  {
    id: 'inbox',
    kind: 'tour',
    menuLabel: 'Inbox',
    title: 'De Inbox',
    body: 'In de Inbox staan al je WhatsApp gesprekken bij elkaar: links de lijst, in het midden het gesprek, rechts de context van de lead.',
    bullets: [
      'Filter op Ongelezen, Bot of Actie nodig',
      'Surface antwoordt live mee in het gesprek',
      'Rechts: snel een offerte sturen of inplannen',
    ],
    durSec: 13,
    run: async (a) => {
      await a.closeOverlays()
      await a.clickNav('Inbox')
      await a.sleep(1400)
      await a.clickText('.tab', /Ongelezen/i)
      await a.sleep(1800)
      await a.clickText('.tab', /Alles/i)
    },
  },
  {
    id: 'offerte',
    kind: 'tour',
    menuLabel: 'Offerte',
    title: 'Zelf een offerte maken',
    body: 'Sprak je een klant telefonisch? Klik op "Nieuwe offerte". Surface helpt je in vier stappen aan een volledig doorgerekende offerte die je via WhatsApp of mail verstuurt.',
    bullets: [
      'Klant: zoek een bestaande klant of plak een WhatsApp bericht, dan vult Surface de gegevens automatisch in',
      'Werk: kies de dienst, schat de m² en voeg opties toe',
      'Offerte: alle regels en prijzen worden automatisch berekend',
      'Versturen: bekijk het voorbeeld en stuur in één klik',
    ],
    durSec: 19,
    run: async (a) => {
      await a.closeOverlays()
      await a.openQuote()
      await a.sleep(900)
      await a.type('input[placeholder="Bv. Jan de Jong"]', 'Jan de Jong')
      await a.type('input[placeholder="06 - 12 34 56 78"]', '06 12 34 56 78')
      await a.sleep(600)
      await a.clickText('.btn.btn-primary', /Volgende/i)
      await a.sleep(1700)
      await a.clickText('.btn.btn-primary', /Volgende/i)
      await a.sleep(1700)
      await a.clickText('.btn.btn-primary', /Volgende/i)
      await a.sleep(1900)
      await a.closeOverlays()
    },
  },
  {
    id: 'agenda',
    kind: 'tour',
    menuLabel: 'Agenda',
    title: 'De agenda',
    body: 'In de Agenda plan je plaatsbezoeken en klussen. Schakel naar de Routekaart om de complete rijroute van je dag op de kaart te zien.',
    bullets: [
      'Weekoverzicht met al je afspraken, kleurgecodeerd per type',
      'Routekaart: al je stops én de route ertussen',
      'Klik een afspraak voor de details',
    ],
    durSec: 13,
    run: async (a) => {
      await a.closeOverlays()
      await a.clickNav('Agenda')
      await a.sleep(1200)
      await a.clickSeg(/Routekaart/i)
      await a.sleep(2600)
      await a.clickSeg(/Week/i)
    },
  },
  {
    id: 'analyses',
    kind: 'tour',
    menuLabel: 'Analyses',
    title: 'Analyses en cijfers',
    body: 'Onder Analyses zie je je cijfers in detail: omzet, gemiddelde offertewaarde en hoe zelfstandig de bot het werk doet.',
    bullets: [
      'Omzet en conversie per periode',
      'Gemiddelde offertewaarde',
      'Hoe vaak de bot het zelf afhandelt',
    ],
    durSec: 12,
    run: async (a) => {
      await a.closeOverlays()
      await a.clickNav('Analyses')
      await a.sleep(1400)
      await a.scrollTo(460)
      await a.sleep(1800)
      await a.scrollTo(0)
    },
  },
  {
    id: 'instellingen',
    kind: 'tour',
    menuLabel: 'Instellingen',
    title: 'Instellingen',
    body: 'In Instellingen richt je alles in: je bedrijf, je diensten en prijzen, de bot Surface, je team en je integraties.',
    bullets: [
      'Bot: welkomstbericht, openingstijden, prijzen',
      'Diensten met je tarieven per m²',
      'Team, Mollie en Google Calendar',
    ],
    durSec: 12,
    run: async (a) => {
      await a.closeOverlays()
      await a.clickNav('Instellingen')
      await a.sleep(1400)
      await a.scrollTo(460)
      await a.sleep(1800)
      await a.scrollTo(0)
    },
  },
  {
    id: 'klaar',
    kind: 'outro',
    menuLabel: 'Klaar',
    title: 'Je bent klaar om te beginnen',
    body: 'Alles op één plek: leads, gesprekken, offertes en je agenda, met Surface die het meeste werk uit handen neemt.',
    bullets: [],
    durSec: 8,
    run: async (a) => {
      await a.closeOverlays()
      await a.goto('overzicht')
    },
  },
]
