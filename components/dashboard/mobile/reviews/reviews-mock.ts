import type { MobileReview, ReviewTemplate } from './review-helpers'

/**
 * MOCK-DATA, placeholder. Er bestaat (nog) geen reviews-tabel; de bot stuurt
 * nog geen review-vragen. Zodra dat er is, vervang dit door echte queries
 * (zie de desktop /reviews-pagina die om dezelfde reden demo-data toont).
 * Google-merk-kleuren als avatar-tint (data).
 */
const G = { blue: '#4285F4', yellow: '#FBBC04', red: '#EA4335', green: '#34A853', grey: '#5F6368' }

export const REVIEW_AGGREGATE = { score: 4.8, total: 142, deltaMaand: 9 }

export const REVIEWS_MOCK: MobileReview[] = [
  { id: 'g1', naam: 'Anna Smit', initial: 'A', color: G.blue, sterren: 5, datum: '2 dagen geleden', plaats: 'Den Haag', status: 'nieuw',
    text: 'Geweldig werk geleverd! Het terras ziet er weer als nieuw uit. Op tijd, netjes en superfijne communicatie via WhatsApp. Echt een aanrader.' },
  { id: 'g2', naam: 'Erik van der Velde', initial: 'E', color: G.green, sterren: 5, datum: '4 dagen geleden', plaats: 'Rotterdam', status: 'nieuw',
    text: 'Oprit en gevel laten reinigen, prachtig resultaat. Vriendelijke jongens en alles netjes achtergelaten.' },
  { id: 'g3', naam: 'Sandra Janssen', initial: 'S', color: G.red, sterren: 4, datum: '1 week geleden', plaats: 'Pijnacker', status: 'beantwoord',
    text: 'Netjes gewerkt en eerlijk advies gekregen over de beschermlaag. Kwam iets later dan afgesproken, maar verder dik tevreden.',
    reply: 'Bedankt Sandra! Fijn dat je tevreden bent, excuses voor de latere aankomst, we houden de planning scherper in de gaten.' },
  { id: 'g4', naam: 'Familie Kuiper', initial: 'K', color: G.yellow, sterren: 5, datum: '1 week geleden', plaats: 'Delft', status: 'beantwoord',
    text: 'Vakwerk! De antraciet voegen geven het terras een prachtige uitstraling.',
    reply: 'Dank jullie wel! Geniet van het terras deze zomer.' },
  { id: 'g5', naam: 'Bert Koning', initial: 'B', color: G.grey, sterren: 2, datum: '2 weken geleden', plaats: 'Utrecht', status: 'nieuw', flag: true,
    text: 'Werk op zich prima, maar de eindprijs lag hoger dan in de offerte stond. Daar baalde ik wel van.' },
  { id: 'g6', naam: 'Marieke de Wit', initial: 'M', color: G.blue, sterren: 5, datum: '3 weken geleden', plaats: 'Zeist', status: 'beantwoord',
    text: 'Snelle reactie op mijn aanvraag en binnen een week ingepland. Top service van begin tot eind!',
    reply: 'Bedankt Marieke, tot de volgende keer!' },
  { id: 'g7', naam: 'Thomas Wilms', initial: 'T', color: G.green, sterren: 5, datum: '3 weken geleden', plaats: 'Delft', status: 'beantwoord',
    text: 'Heel tevreden over de gevelreiniging. Aanrader voor de buurt.',
    reply: 'Dank je Thomas!' },
]

export const REVIEW_TEMPLATES: ReviewTemplate[] = [
  { k: 'dank',    label: 'Bedankt',   text: 'Bedankt voor je mooie review, {v}! Wat fijn dat je zo tevreden bent. Groet, team Schoon Straatje 🌿' },
  { k: 'terug',   label: 'Tot ziens', text: 'Dank je wel {v}! We zien je graag terug voor het jaarlijkse onderhoud., Schoon Straatje' },
  { k: 'herstel', label: 'Herstel',   text: 'Hoi {v}, vervelend dat het niet helemaal naar wens ging. We nemen vandaag nog contact met je op om dit recht te zetten.' },
]
