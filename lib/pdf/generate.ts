/**
 * Genereert een PDF offerte uit een lead, upload naar Supabase storage en
 * returnt de publieke URL.
 *
 * Gebruikt door /api/demo-approve voor de branche-flow:
 *   1. lead binnen → render PDF naar Buffer
 *   2. upload naar `photos` bucket onder `quotes/{leadId}/offerte-{timestamp}.pdf`
 *   3. publieke URL teruggeven, die wordt opgeslagen in `leads.quote_pdf_url`
 *      en als WhatsApp document naar de klant gestuurd
 */

import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { getSupabase } from '@/lib/supabase'
import { getBranche, type BrancheId } from '@/lib/branches'
import { QuoteDocument, type QuoteData } from './QuoteDocument'

export interface GenerateQuoteInput {
  leadId: string
  branche: BrancheId
  klantNaam: string
  klantEmail: string
  collectedData: Record<string, unknown>
}

export interface GenerateQuoteResult {
  url: string
  filename: string
  pricing: ReturnType<NonNullable<ReturnType<typeof getBranche>>['pricing']>
}

/**
 * Maakt een korte natuurlijke-taal samenvatting van de antwoorden voor de
 * intro-paragraaf op de PDF. Geen LLM call — gewoon een format helper.
 */
function buildIntakeSamenvatting(branche: NonNullable<ReturnType<typeof getBranche>>, data: Record<string, unknown>): string {
  const parts: string[] = []
  for (const field of branche.fields) {
    const v = data[field.key]
    if (v !== undefined && v !== null && v !== '') {
      const display = field.unit ? `${v} ${field.unit}` : String(v)
      parts.push(`${field.label}: ${display}`)
    }
  }
  if (parts.length === 0) return ''
  return `Op basis van de informatie die je via WhatsApp hebt gedeeld (${parts.join(', ')}) hebben wij ` +
    `onderstaand voorstel voor je opgesteld.`
}

export async function generateQuotePdf(input: GenerateQuoteInput): Promise<GenerateQuoteResult> {
  const branche = getBranche(input.branche)
  if (!branche) {
    throw new Error(`Onbekende branche: ${input.branche}`)
  }

  // Stringify alle answer-waardes naar string-vorm zoals branche.pricing verwacht
  const answersAsStrings: Record<string, string> = {}
  for (const [k, v] of Object.entries(input.collectedData)) {
    if (v !== null && v !== undefined && typeof v !== 'object') {
      answersAsStrings[k] = String(v)
    }
  }

  const pricing = branche.pricing(answersAsStrings)
  const intakeSamenvatting = buildIntakeSamenvatting(branche, input.collectedData)

  // Adres uit collected_data — branche-specifieke key is 'adres'
  const klantAdres =
    typeof input.collectedData.adres === 'string' ? input.collectedData.adres : undefined

  const quoteData: QuoteData = {
    klantNaam: input.klantNaam,
    klantEmail: input.klantEmail,
    klantAdres,
    branche,
    pricing,
    intakeSamenvatting,
  }

  // Render naar Buffer
  const element = createElement(QuoteDocument, quoteData)
  // @ts-expect-error — react-pdf types accepteren ReactElement maar de overload is wat lastig
  const buffer = (await renderToBuffer(element)) as Buffer

  // Upload naar Supabase storage
  const timestamp = Date.now()
  const filename = `offerte-${timestamp}.pdf`
  const path = `quotes/${input.leadId}/${filename}`

  const supabase = getSupabase()
  const { error: uploadError } = await supabase.storage
    .from('photos')
    .upload(path, buffer, {
      contentType: 'application/pdf',
      upsert: false,
    })

  if (uploadError) {
    throw new Error(`PDF upload failed: ${uploadError.message}`)
  }

  // Publieke URL ophalen
  const { data: publicUrlData } = supabase.storage.from('photos').getPublicUrl(path)
  const url = publicUrlData.publicUrl

  return { url, filename, pricing }
}
