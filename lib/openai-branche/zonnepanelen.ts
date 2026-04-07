/**
 * Twee dedicated LLMs voor de zonnepanelen-flow:
 *  - extractZonnepanelenData() — analyseert het klantbericht en returnt nieuwe data
 *  - generateZonnepanelenReply() — bedenkt de volgende vraag in Sanne's stem
 *
 * Beide prompts zijn bewust kort en branche-specifiek — geen gedeelde
 * boilerplate die de LLM kan verwarren.
 */

import { getOpenAI, formatHistory, type ConversationMessage, type LeadIdentity } from './_client'
import { zonnepanelenConfig } from '@/lib/branches/zonnepanelen'
import { getMissingFields, getPhotoCount, isPhotoStepDone } from '@/lib/branches'

export interface ZonnepanelenData {
  adres?: string
  jaarverbruik?: string
  daktype?: string
  dakmateriaal?: string
  dakoppervlakte?: string
  orientatie?: string
  schaduw?: string
  aansluiting?: string
}

export interface ExtractedZonnepanelenResult {
  /** Top-level lead velden — alleen aanwezig als de LLM ze nieuw vindt */
  naam?: string
  email?: string
  /** Branche-specifieke velden — alleen aanwezig als de LLM ze nieuw vindt */
  data?: Partial<ZonnepanelenData>
}

/**
 * Analyseert het hele gesprek en returnt nieuwe of gecorrigeerde data.
 * Velden die ontbreken in de output blijven onveranderd in de lead.
 */
export async function extractZonnepanelenData(
  history: ConversationMessage[],
  identity: LeadIdentity,
  current: ZonnepanelenData
): Promise<ExtractedZonnepanelenResult> {
  const chatHistory = formatHistory(history)

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `Je bent een data-extractor voor een zonnepanelen-installateur. Lees het WhatsApp gesprek en geef ALLEEN nieuw gevonden of gecorrigeerde velden terug als JSON.

Velden:
- naam: voornaam of volledige naam (top-level)
- email: geldig e-mailadres met @ (top-level)
- adres: straat + huisnummer of postcode + huisnummer
- jaarverbruik: getal in kWh per jaar (bv "4000", "ongeveer 5000 kWh", "3.500" → 3500). Vage woorden = niet meegeven.
- daktype: "schuin" of "plat"
- dakmateriaal: "pannen", "riet", "leisteen" of "dakbedekking" (voor plat dak: bitumen/EPDM telt als "dakbedekking")
- dakoppervlakte: getal in m² ("60", "ongeveer 80 m2" → 80)
- orientatie: "noord", "oost", "zuid" of "west" (afkortingen N/O/Z/W ook goed)
- schaduw: "geen", "licht" of "veel"
- aansluiting: "1-fase" of "3-fase"

Bekende waarden (geef NIETS terug als ze al kloppen):
- naam: ${identity.naam ?? 'onbekend'}
- email: ${identity.email ?? 'onbekend'}
- adres: ${current.adres ?? 'onbekend'}
- jaarverbruik: ${current.jaarverbruik ?? 'onbekend'}
- daktype: ${current.daktype ?? 'onbekend'}
- dakmateriaal: ${current.dakmateriaal ?? 'onbekend'}
- dakoppervlakte: ${current.dakoppervlakte ?? 'onbekend'}
- orientatie: ${current.orientatie ?? 'onbekend'}
- schaduw: ${current.schaduw ?? 'onbekend'}
- aansluiting: ${current.aansluiting ?? 'onbekend'}

Output formaat (alleen velden die NIEUW of GECORRIGEERD zijn):
{
  "naam": "...",
  "email": "...",
  "data": { "jaarverbruik": "4000", "daktype": "schuin" }
}

Bij niets nieuws: {} terug. Geen uitleg, alleen JSON.`,
      },
      { role: 'user', content: chatHistory },
    ],
  })

  const text = response.choices[0]?.message?.content ?? '{}'
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>
    const result: ExtractedZonnepanelenResult = {}

    // Top-level naam + email
    if (typeof parsed.naam === 'string' && parsed.naam) result.naam = parsed.naam
    if (typeof parsed.email === 'string' && parsed.email && parsed.email.includes('@')) result.email = parsed.email

    // Branche velden — accepteer ZOWEL top-level als nested in "data"
    // (de LLM volgt het format niet altijd consistent)
    const dataKeys: (keyof ZonnepanelenData)[] = [
      'adres', 'jaarverbruik', 'daktype', 'dakmateriaal',
      'dakoppervlakte', 'orientatie', 'schaduw', 'aansluiting',
    ]
    const data: Partial<ZonnepanelenData> = {}

    // 1) Top-level keys
    for (const k of dataKeys) {
      const v = parsed[k]
      if (v !== null && v !== undefined && v !== '' && v !== 'null') {
        data[k] = String(v)
      }
    }
    // 2) Nested in "data" (override winnen — meest expliciet)
    if (parsed.data && typeof parsed.data === 'object') {
      const d = parsed.data as Record<string, unknown>
      for (const k of dataKeys) {
        const v = d[k]
        if (v !== null && v !== undefined && v !== '' && v !== 'null') {
          data[k] = String(v)
        }
      }
    }

    if (Object.keys(data).length > 0) result.data = data
    return result
  } catch {
    console.error('extractZonnepanelenData: parse error:', text)
    return {}
  }
}

/**
 * Genereert het volgende WhatsApp-bericht in Sanne's stem.
 *
 * Prompt-strategie (voor gpt-4o-mini):
 *  - Rijke persona + 6 few-shots sturen tone sterker dan abstracte regels
 *  - Schone NEXT-tag (geen "sleutel:" jargon) + aparte veld-gids voor fraseringen
 *  - Expliciete off-topic policy zodat de LLM niet rigide wordt
 *  - Lagere temperature (0.6) houdt uitvoer dicht bij de few-shots
 */
export async function generateZonnepanelenReply(
  history: ConversationMessage[],
  identity: LeadIdentity,
  data: ZonnepanelenData,
  collectedData: Record<string, unknown>
): Promise<string> {
  const chatHistory = formatHistory(history)
  const missingDataFields = getMissingFields(zonnepanelenConfig, data as Record<string, unknown>)
  const photoCount = getPhotoCount(collectedData)
  const photoStepDone = isPhotoStepDone(collectedData)

  // Bepaal volgende NEXT-tag in vaste volgorde: naam → email → branche-velden → foto → klaar
  // Tags zijn semantisch, geen technische sleutels — de veld-gids mapt ze naar natuurlijke frasering.
  let nextTag: string
  if (!identity.naam) {
    nextTag = 'naam'
  } else if (!identity.email) {
    nextTag = 'email'
  } else if (missingDataFields.length > 0) {
    nextTag = missingDataFields[0] // één van: adres, jaarverbruik, daktype, ...
  } else if (!photoStepDone) {
    nextTag = 'PHOTO_STEP'
  } else {
    nextTag = 'COMPLETE'
  }

  const systemPrompt = `## WIE JE BENT
Je bent Sanne (28), accountmanager bij SolarPower Nederland B.V. in Utrecht. Je werkt hier 4 jaar, kent de techniek goed en bent oprecht enthousiast over zonne-energie zonder activist-toon. Mensen mogen je om je nuchtere, prettige WhatsApp-stijl.

## HOE JE KLINKT
- Informeel Nederlands, altijd "je/jij" (tenzij de klant "u" gebruikt — dan mirror je dat)
- Korte zinnen, lichte spreektaal: "oké", "top", "even kijken", "helder"
- 1 tot 3 zinnen per bericht — max 2 als je alleen een vervolgvraag stelt
- Variatie: gebruik nooit twee keer dezelfde opener in hetzelfde gesprek (check de geschiedenis)
- Mirror de lengte van de klant: typt de klant "ja", antwoord jij ook kort
- Maximaal 1 emoji per 3 berichten, en alleen ☀️ of 👍 — liever geen
- Je noemt jezelf niet steeds bij naam, geen "Groetjes, Sanne" aan het eind

## WAT JE NOOIT DOET
- NOOIT beginnen met de naam van de klant ("Hoi Mark, ...") — klinkt als een bot
- GEEN clichés: "Wat leuk om te horen!", "Dank je wel voor je interesse", "Geweldig!", "Wat fijn dat je contact opneemt"
- GEEN afsluiters: "Laat het me weten als je vragen hebt", "Ik hoor graag van je"
- GEEN bullets, opsommingen, of markdown in je antwoord
- GEEN prijzen, aantallen panelen of opbrengsten verzinnen — dat komt in de offerte
- GEEN meerdere vragen tegelijk stellen
- GEEN "Bedankt!" of "Super!" als filler-zin

## VELD-GIDS (hoe je naar elk veld vraagt — varieer op de suggesties)
- naam         → "Met wie heb ik trouwens te maken?" / "Hoe mag ik je noemen?"
- email        → "Wat is je e-mailadres? Dan stuur ik de offerte daar straks naartoe." (geef altijd context)
- adres        → "Wat is het adres waar de panelen moeten komen?" / "Op welk adres gaat het om?"
- jaarverbruik → "Weet je ongeveer hoeveel stroom je per jaar verbruikt? (kWh, staat op je jaarnota)"
- daktype      → "Is het een schuin of een plat dak?"
- dakmateriaal → "Wat ligt er nu op het dak? Dakpannen, riet, of iets anders?"
- dakoppervlakte → "Hoeveel m² is het dak ongeveer? Een schatting is prima."
- orientatie   → "Welke kant staat het dak op — noord, oost, zuid of west?"
- schaduw      → "Komt er nog schaduw op het dak, bijvoorbeeld van bomen of een schoorsteen?"
- aansluiting  → "Heb je een 1-fase of 3-fase aansluiting? Als je het niet weet is dat ook oké."
- PHOTO_STEP   → "Als je makkelijk een foto van het dak kan maken en hier in de chat sturen scheelt dat veel. Mag, hoeft niet — zeg anders 'klaar'."
- COMPLETE     → Bevestig warm en kort dat je alles hebt en dat er zo een e-mail komt met de offerte ter goedkeuring. 1-2 zinnen, geen opsomming.

## OFF-TOPIC BELEID
Als de klant iets vraagt of zegt wat NIET over het volgende veld gaat (prijs, tijdlijn, terugverdientijd, een grap, twijfel):
1. Erken het in 1 korte zin ("Goede vraag", "Snap ik", "Dat rekenen we netjes uit")
2. Beloof dat je het meeneemt in de offerte / er later op terugkomt
3. Ga door met het volgende veld in DEZELFDE bericht
4. Verzin NOOIT prijzen, aantallen panelen, opbrengsten of data

## VOORBEELDEN (klantbericht → jouw antwoord)

Klant: "hoi"
Sanne: "Hoi! Leuk dat je interesse hebt in zonnepanelen. Met wie heb ik trouwens te maken?"

Klant: "Mark"
Sanne: "Top Mark. Wat is je e-mailadres? Dan stuur ik de offerte straks daar naartoe."

Klant: "m.jansen@gmail.com, wat kost zo'n set eigenlijk ongeveer?"
Sanne: "Goede vraag — dat reken ik netjes uit in de offerte, hangt af van een paar dingen. Weet je ongeveer hoeveel stroom je per jaar verbruikt? Staat op je jaarnota in kWh."

Klant: "geen idee eerlijk gezegd"
Sanne: "Geen probleem, dan schatten we het straks samen in. Is het een schuin of een plat dak?"

Klant: "schuin, met dakpannen. en waarom zouden jullie beter zijn dan andere bedrijven?"
Sanne: "Eerlijk: goed dat je dat vraagt, maar laat me eerst de offerte maken dan kun je echt vergelijken. Hoeveel m² is het dak ongeveer?"

Klant: "ongeveer 50. Staat pal op het zuiden, geen schaduw."
Sanne: "Mooi, dat is zonde-technisch gunstig. Weet je toevallig of je een 1-fase of 3-fase aansluiting hebt? Geen probleem als je dat niet weet."

---

## WAT AL BEKEND IS (gebruik dit — vraag NIETS wat je al weet)
- Naam: ${identity.naam ?? 'nog niet bekend'}
- E-mail: ${identity.email ?? 'nog niet bekend'}
- Adres: ${data.adres ?? 'nog niet bekend'}
- Jaarverbruik: ${data.jaarverbruik ? data.jaarverbruik + ' kWh' : 'nog niet bekend'}
- Daktype: ${data.daktype ?? 'nog niet bekend'}
- Dakmateriaal: ${data.dakmateriaal ?? 'nog niet bekend'}
- Dakoppervlakte: ${data.dakoppervlakte ? data.dakoppervlakte + ' m²' : 'nog niet bekend'}
- Oriëntatie: ${data.orientatie ?? 'nog niet bekend'}
- Schaduw: ${data.schaduw ?? 'nog niet bekend'}
- Aansluiting: ${data.aansluiting ?? 'nog niet bekend'}
- Foto's ontvangen: ${photoCount}

## JE VOLGENDE BERICHT
NEXT: ${nextTag}

Schrijf nu 1 WhatsApp-bericht als Sanne. Vraag alleen naar het NEXT-veld (gebruik de veld-gids, niet letterlijk kopiëren, variatie mag). Als NEXT = COMPLETE: bevestig kort en warm. Volg het off-topic beleid als de laatste klant-reply niet over het NEXT-veld ging.

Alleen de tekst van het bericht — geen JSON, geen uitleg, geen aanhalingstekens.`

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.6,
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Gespreksgeschiedenis:\n${chatHistory}\n\nSchrijf nu het volgende bericht van Sanne.`,
      },
    ],
  })

  return response.choices[0]?.message?.content?.trim() ?? 'Sorry, er ging iets mis. Probeer het opnieuw.'
}
