/**
 * Afspraak-agent — de 8e LLM in de demo workflow.
 *
 * Twee functies:
 *   1. proposeSlots()  — bedenkt een vriendelijk WhatsApp-bericht met 3 voorgestelde
 *                        slots uit Google Calendar (op basis van vrije tijd + beschikbaarheidsregels)
 *   2. matchSlot()     — analyseert het antwoord van de klant ("morgen om 14:00" / "het tweede" /
 *                        "donderdag werkt") en koppelt het aan één van de voorgestelde slots
 *
 * Wordt aangeroepen door de webhook nadat de offerte via WhatsApp is verstuurd
 * en de klant met "ja" heeft gereageerd.
 */

import { getOpenAI, type ConversationMessage } from './openai-branche/_client'
import { getFreeSlots, type FreeSlot, TIMEZONE } from './google-calendar'
import { addDays } from 'date-fns'
import { format as formatTz } from 'date-fns-tz'

/**
 * Genereer een lijst voorgestelde slots voor de komende 14 dagen, en laat
 * de LLM ze in een vriendelijk WhatsApp-bericht presenteren.
 *
 * Returnt zowel het bericht als de raw slots — de webhook slaat de slots
 * op in collected_data zodat matchSlot() ze later kan oppakken.
 */
export async function proposeSlots(klantNaam: string): Promise<{
  message: string
  slots: FreeSlot[]
}> {
  const now = new Date()
  const rangeEnd = addDays(now, 14)
  const allSlots = await getFreeSlots(now, rangeEnd, 30)

  // Selecteer 3 verspreide slots: eerstvolgende, midden, laatste
  let proposed: FreeSlot[]
  if (allSlots.length === 0) {
    proposed = []
  } else if (allSlots.length <= 3) {
    proposed = allSlots
  } else {
    const first = allSlots[0]
    const mid = allSlots[Math.floor(allSlots.length / 2)]
    const last = allSlots[allSlots.length - 1]
    // Soms zit "first" en "mid" op dezelfde dag — verspreid wat meer
    const seen = new Set<string>()
    const picks = [first, mid, last].filter((s) => {
      const day = s.label.split(' ').slice(0, 3).join(' ')
      if (seen.has(day)) return false
      seen.add(day)
      return true
    })
    proposed = picks.length >= 2 ? picks : [first, allSlots[1] || first, allSlots[2] || first]
  }

  if (proposed.length === 0) {
    return {
      message: `Hoi ${klantNaam}, er zijn op dit moment helaas geen vrije slots in mijn agenda voor de komende twee weken. Een collega neemt persoonlijk contact met je op om een afspraak in te plannen.`,
      slots: [],
    }
  }

  // Vraag de LLM om de slots in een natuurlijk bericht te verpakken
  const slotsText = proposed
    .map((s, i) => `${i + 1}. ${s.label}`)
    .join('\n')

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.6,
    messages: [
      {
        role: 'system',
        content: `Je bent een vriendelijke planner-assistent die via WhatsApp 3 momenten voorstelt voor een gratis kennismakingsgesprek (30 minuten). De klant heeft net de offerte ontvangen en gezegd dat hij/zij wil plannen.

Regels:
- Gebruik informeel Nederlands (je/jij)
- Open warm maar kort
- Presenteer de 3 momenten als genummerde lijst (1., 2., 3.)
- Vraag de klant om het gewenste moment te kiezen door het nummer te sturen of de tijd te typen
- Maximaal 5-6 zinnen totaal
- Geen jargon, geen verkooppraat
- Begin niet met de naam van de klant

Geef ALLEEN het WhatsApp-bericht terug.`,
      },
      {
        role: 'user',
        content: `Klantnaam: ${klantNaam}\n\nVoorgestelde slots:\n${slotsText}`,
      },
    ],
  })

  const message =
    response.choices[0]?.message?.content?.trim() ||
    `Top! Ik heb 3 momenten voor je vrij voor een korte kennismaking van 30 minuten:\n\n${slotsText}\n\nWelke werkt het beste voor je? Stuur het nummer of de tijd terug.`

  return { message, slots: proposed }
}

/**
 * Match het antwoord van de klant tegen de voorgestelde slots.
 * Returnt de gekozen slot, of `null` als het onduidelijk is.
 *
 * Strategie: laat de LLM de klantkeuze parsen tegen de aangeboden slots.
 * Dit pakt zowel "het tweede" / "2" / "donderdag 14 uur" / "morgen om 13:30" af.
 */
export async function matchSlot(
  history: ConversationMessage[],
  proposedSlots: FreeSlot[]
): Promise<FreeSlot | null> {
  if (proposedSlots.length === 0) return null

  const slotsText = proposedSlots
    .map((s, i) => `${i + 1}. ${s.label} (iso: ${s.iso})`)
    .join('\n')

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `Je matched de keuze van een klant tegen 3 voorgestelde afspraakmomenten.

Voorgestelde slots:
${slotsText}

Geef ALLEEN JSON terug:
- Bij een duidelijke match: { "slot_index": <1|2|3>, "iso": "<iso van de gekozen slot>" }
- Bij twijfel of onduidelijkheid: { "slot_index": null }

Wees ruim met herkenning:
- "1" / "eerste" / "de bovenste" / "morgen" → eerste optie
- "2" / "tweede" → tweede optie
- "3" / "laatste" → derde optie
- Tijdstip dat exact matcht met een voorgestelde tijd → die slot
- Tijdstip dat NIET matcht → null
- Vraag of opmerking → null`,
      },
      {
        role: 'user',
        content: `Laatste klantbericht (te parsen):\n${history.filter((m) => m.role === 'user').slice(-1)[0]?.content || '(geen)'}`,
      },
    ],
  })

  const text = response.choices[0]?.message?.content ?? '{}'
  try {
    const parsed = JSON.parse(text) as { slot_index?: number | null; iso?: string }
    if (parsed.slot_index && parsed.slot_index >= 1 && parsed.slot_index <= proposedSlots.length) {
      return proposedSlots[parsed.slot_index - 1]
    }
    if (parsed.iso) {
      const match = proposedSlots.find((s) => s.iso === parsed.iso)
      if (match) return match
    }
    return null
  } catch {
    console.error('matchSlot: parse error:', text)
    return null
  }
}

/**
 * Format een gekozen slot als bevestigingsbericht voor de klant.
 * Geen LLM call — gewone string format zodat de bevestiging consistent is.
 */
export function formatBevestiging(slot: FreeSlot, klantNaam: string): string {
  const datum = formatTz(slot.startUtc, "EEEE d MMMM 'om' HH:mm", { timeZone: TIMEZONE })
  return (
    `Top, ${klantNaam}! De afspraak is ingepland voor ${datum}. ` +
    `Je krijgt zo een uitnodiging in je mail. Tot dan!`
  )
}
