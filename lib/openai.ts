import OpenAI from 'openai'

// Lazy initialisatie zodat build niet faalt zonder env var
let _openai: OpenAI | null = null

function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return _openai
}

export interface LeadData {
  naam: string | null
  email: string | null
  type_pand: string | null
  m2: string | null
  steentype: string | null
  planten: string | null
}

export interface ConversationMessage {
  role: 'assistant' | 'user'
  content: string
}

/**
 * Extraheert gestructureerde lead-data uit het gesprek.
 * Verzamelt eerst naam en email, daarna offerte-velden.
 */
export async function extractLeadData(
  history: ConversationMessage[],
  currentData: LeadData
): Promise<Partial<LeadData>> {
  const chatHistory = history
    .map((m) => `${m.role === 'user' ? 'Klant' : 'Assistent'}: ${m.content}`)
    .join('\n')

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `Je bent een data-extractor. Analyseer het WhatsApp-gesprek en extraheer de volgende velden als JSON:

- naam: de voornaam of volledige naam van de klant. Alleen echte namen, geen onzin.
- email: een geldig e-mailadres. Moet @ bevatten.
- type_pand: herkenbaar type oppervlak of pand (bijv. "oprit", "terras", "tuinpad", "bedrijfspand", "woning"). Typo's toegestaan. Onzin = null.
- m2: een getal of iets leesbaar als getal ("6 bij 4" = 24, "ongeveer 30" = 30). Vage woorden zoals "groot" = null.
- steentype: herkenbaar bestratingsmateriaal (klinkers, betontegels, betonklinkers, natuursteen, grind, asfalt, keien, tegels). Typo's toegestaan. Onzin = null.
- planten: moet duidelijk ja of nee betekenen. "bloembakken langs de rand" = "ja". "niets" = "nee". Onduidelijk = null.

Huidige bekende waarden:
- naam: ${currentData.naam ?? 'onbekend'}
- email: ${currentData.email ?? 'onbekend'}
- type_pand: ${currentData.type_pand ?? 'onbekend'}
- m2: ${currentData.m2 ?? 'onbekend'}
- steentype: ${currentData.steentype ?? 'onbekend'}
- planten: ${currentData.planten ?? 'onbekend'}

Geef ALLEEN een JSON object terug met de velden die je NIEUW of GECORRIGEERD hebt gevonden.
Als een klant een eerder antwoord corrigeert, geef de nieuwe waarde.
Als je niets nieuws vindt, geef een leeg object: {}`,
      },
      {
        role: 'user',
        content: chatHistory,
      },
    ],
  })

  const text = response.choices[0]?.message?.content ?? '{}'

  try {
    const parsed = JSON.parse(text)
    const result: Partial<LeadData> = {}
    if (parsed.naam && parsed.naam !== 'null') result.naam = parsed.naam
    if (parsed.email && parsed.email !== 'null') result.email = parsed.email
    if (parsed.type_pand && parsed.type_pand !== 'null') result.type_pand = parsed.type_pand
    if (parsed.m2 && parsed.m2 !== 'null') result.m2 = String(parsed.m2)
    if (parsed.steentype && parsed.steentype !== 'null') result.steentype = parsed.steentype
    if (parsed.planten && parsed.planten !== 'null') result.planten = parsed.planten
    return result
  } catch {
    console.error('Failed to parse extractor output:', text)
    return {}
  }
}

/**
 * Genereert een natuurlijk WhatsApp-antwoord voor de chatbot.
 * Vraagt eerst naam en email, daarna offerte-velden.
 */
export async function generateReply(
  history: ConversationMessage[],
  currentData: LeadData
): Promise<string> {
  const chatHistory = history
    .map((m) => `${m.role === 'user' ? 'Klant' : 'Assistent'}: ${m.content}`)
    .join('\n')

  // Bepaal welke velden nog missen — volgorde is belangrijk
  const missingFields: string[] = []
  if (!currentData.naam) missingFields.push('naam')
  if (!currentData.email) missingFields.push('e-mailadres')
  if (!currentData.type_pand) missingFields.push('type oppervlak/pand (bijv. oprit, terras, woning)')
  if (!currentData.m2) missingFields.push('oppervlakte in m2')
  if (!currentData.steentype) missingFields.push('type steen/bestrating')
  if (!currentData.planten) missingFields.push('of er planten/groen aanwezig zijn (ja/nee)')

  const allComplete = missingFields.length === 0
  const leadName = currentData.naam ?? 'daar'

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.7,
    messages: [
      {
        role: 'system',
        content: `Je bent Thomas, een vriendelijke medewerker die via WhatsApp informatie verzamelt om een offerte op te stellen. Je werkt voor een reinigingsbedrijf. Je spreekt informeel Nederlands (je/jij).

Klantnaam: ${leadName}

Al verzamelde informatie:
- Naam: ${currentData.naam ?? 'nog niet bekend'}
- Email: ${currentData.email ?? 'nog niet bekend'}
- Type pand: ${currentData.type_pand ?? 'nog niet bekend'}
- Oppervlakte: ${currentData.m2 ? currentData.m2 + ' m2' : 'nog niet bekend'}
- Steentype: ${currentData.steentype ?? 'nog niet bekend'}
- Planten: ${currentData.planten ?? 'nog niet bekend'}

${allComplete ? 'ALLE informatie is compleet. Bevestig dat je alle info hebt ontvangen en zeg dat de prospect zo een e-mail ontvangt met de offerte ter goedkeuring.' : `Nog te verzamelen (vraag het VOLGENDE ontbrekende veld): ${missingFields.join(', ')}`}

Regels:
- Stel per bericht maar 1 vraag (het volgende ontbrekende veld in de lijst)
- Max 3-4 zinnen per bericht
- Varieer je openers, niet altijd hetzelfde
- Begin NIET met de naam van de klant
- Geen opsommingen of bullets — gewone WhatsApp-tekst
- Klinkt als een echte persoon, niet als een bot
- Geen afsluitende zinnen zoals "laat me weten als je vragen hebt"

Geef ALLEEN de WhatsApp-tekst terug, geen JSON, geen uitleg.`,
      },
      {
        role: 'user',
        content: `Gespreksgeschiedenis:\n${chatHistory}\n\nSchrijf het volgende bericht van Thomas.`,
      },
    ],
  })

  return response.choices[0]?.message?.content?.trim() ?? 'Sorry, er ging iets mis. Probeer het opnieuw.'
}

/**
 * Berekent een demo-prijs op basis van de verzamelde gegevens.
 */
export function calculateDemoPrice(m2: number, steentype: string, planten: string): { pricePerM2: number; base: number; surcharge: number; total: number } {
  const basePrices: Record<string, number> = {
    klinkers: 12, betontegels: 10, natuursteen: 18,
    betonklinkers: 14, grind: 8, asfalt: 11, keien: 16, tegels: 10,
  }
  const pricePerM2 = basePrices[steentype.toLowerCase()] || 12
  const base = m2 * pricePerM2
  const surcharge = planten.toLowerCase() === 'ja' ? 35 : 0
  const total = base + surcharge
  return { pricePerM2, base, surcharge, total }
}
