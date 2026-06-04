/**
 * Vaste demodata voor de demo-tour. Eén doorlopende verhaallijn:
 * familie Jansen vraagt gevelreiniging aan en doorloopt het hele product.
 */

export const demoLead = {
  naam: 'Familie Jansen',
  adres: 'Hoofdstraat 12, Amersfoort',
  dienst: 'Gevelreiniging + glasbewassing',
  oppervlakte: '180 m²',
  bron: 'Website-formulier',
}

export const demoChat = [
  { from: 'klant', text: 'Hoi! Kunnen jullie onze gevel reinigen? Het gaat om ongeveer 180 m².' },
  { from: 'bot', text: 'Leuk dat u ons benadert! Dat kan zeker. Mag ik uw adres, dan reken ik direct een richtprijs voor u uit?' },
  { from: 'klant', text: 'Hoofdstraat 12 in Amersfoort.' },
  { from: 'bot', text: 'Dank u! Ik heb een offerte voor u klaargezet: gevelreiniging en glasbewassing, 180 m². U ontvangt hem zo per WhatsApp.' },
] as const

export const demoOfferte = {
  nummer: 'OFF-2026-018',
  regels: [
    { omschrijving: 'Gevelreiniging', detail: '180 m² × € 3,50', bedrag: '€ 630,00' },
    { omschrijving: 'Glasbewassing buitenzijde', detail: '24 ramen × € 4,00', bedrag: '€ 96,00' },
  ],
  totaal: '€ 726,00',
}

export const demoAfspraak = {
  titel: 'Inspectie familie Jansen',
  dag: 'Do',
  tijd: '10:00',
}

export const demoReview = {
  naam: 'Familie Jansen',
  tekst: 'Snel geregeld en keurig werk. De offerte stond binnen vijf minuten in mijn WhatsApp!',
}

export const demoKpis = [
  { label: 'Nieuwe aanvragen', waarde: 12 },
  { label: 'Offertes verstuurd', waarde: 9 },
  { label: 'Afspraken geboekt', waarde: 6 },
]

export const demoStats = {
  conversie: [
    { label: 'Aanvraag naar offerte', waarde: 75 },
    { label: 'Offerte naar afspraak', waarde: 67 },
    { label: 'Afspraak naar klus', waarde: 80 },
  ],
  /** y-waardes (SVG, lager = hoger op het scherm) voor de zelf-tekenende lijn */
  lijn: [38, 35, 30, 26, 27, 20, 16, 12] as const,
}
