/**
 * Photo vision analyzer.
 *
 * Wordt aangeroepen door de webhook wanneer een klant een foto stuurt.
 * Stuurt de foto naar GPT-4o vision met een branche-specifieke prompt
 * en returnt een korte natuurlijke-taal analyse die in `leads.photo_analyses`
 * wordt opgeslagen en later in de offerte / e-mail kan worden gebruikt.
 *
 * Per branche een eigen prompt zodat het model gericht kijkt naar wat
 * relevant is voor de offerte (dakstaat, vervuiling, etc.).
 */

import { getOpenAI } from './openai-branche/_client'
import type { BrancheId } from './branches'

const PROMPTS: Record<BrancheId, string> = {
  zonnepanelen:
    'Je bent een zonnepanelen-installateur. Bekijk deze foto van een dak en geef in 2-3 korte zinnen ' +
    'een feitelijke beoordeling: type dak (schuin/plat), schatting dakmateriaal, oriëntatie indien zichtbaar, ' +
    'eventuele obstakels (schoorsteen, dakraam, bomen die schaduw geven), en de algehele staat. ' +
    'Geen verkooppraat, alleen feiten die relevant zijn voor het plaatsen van panelen.',
  dakdekker:
    'Je bent een ervaren dakdekker. Bekijk deze foto van een dak en geef in 2-3 korte zinnen een ' +
    'feitelijke beoordeling: type dak (plat/schuin), dakmateriaal, zichtbare schade of slijtage ' +
    '(scheuren, lekplekken, ontbrekende pannen, verzakkingen), en eventuele bijzonderheden. ' +
    'Geen verkooppraat, alleen wat een dakdekker zou zien bij eerste inspectie.',
  schoonmaak:
    'Je bent een schoonmaakprofessional. Bekijk deze foto van een ruimte of pand en geef in 2-3 korte ' +
    'zinnen een feitelijke beoordeling: type ruimte (kantoor/woning/horeca/winkel), zichtbare ' +
    'oppervlaktes (vloer, ramen, sanitair), staat van vervuiling en eventuele aandachtspunten ' +
    '(bv. hardhardnekkig vuil, hoogwerker nodig, glasoppervlak). Geen verkooppraat.',
}

/**
 * Analyseer een foto met GPT-4o vision.
 * @param imageUrl publiek toegankelijke URL van de foto (Supabase storage)
 * @param branche  branche-id voor de juiste prompt
 * @returns korte tekst-analyse, of een fallback bij fout
 */
export async function analyzePhoto(imageUrl: string, branche: BrancheId): Promise<string> {
  const prompt = PROMPTS[branche]

  try {
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.2,
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: { url: imageUrl, detail: 'low' },
            },
          ],
        },
      ],
    })

    const text = response.choices[0]?.message?.content?.trim()
    return text || '(Foto ontvangen — kon geen analyse maken.)'
  } catch (err) {
    console.error('Photo vision error:', err)
    return '(Foto ontvangen — vision analyse mislukt.)'
  }
}
