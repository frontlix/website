import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import {
  sendWhatsAppText,
  normalizePhone,
  getWhatsAppMediaUrl,
  downloadWhatsAppMedia,
} from '@/lib/whatsapp'
import { extractLeadData, generateReply, calculateDemoPrice, type LeadData } from '@/lib/openai'
import { sendApprovalEmail, sendBrancheApprovalEmail } from '@/lib/mail'
import { randomUUID } from 'crypto'
import {
  getBranche,
  getMissingFields,
  isPhotoStepDone,
  userSkipsPhotoStep,
  MAX_PHOTOS,
  PHOTO_WAIT_MS,
  type BrancheId,
} from '@/lib/branches'
import { getBrancheLLMs, detectBranche } from '@/lib/openai-branche'
import type { ConversationMessage } from '@/lib/openai-branche/_client'
import { analyzePhoto } from '@/lib/photo-vision'
import { proposeSlots, matchSlot, formatBevestiging } from '@/lib/scheduling-agent'
import { createEvent, type FreeSlot } from '@/lib/google-calendar'

/**
 * GET — Webhook verificatie door Meta.
 * Meta stuurt hub.mode, hub.verify_token en hub.challenge.
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const mode = params.get('hub.mode')
  const token = params.get('hub.verify_token')
  const challenge = params.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

/**
 * POST — Inkomende WhatsApp berichten verwerken.
 */
export async function POST(req: NextRequest) {
  // Altijd 200 returnen zodat Meta niet retried
  try {
    const body = await req.json()
    await processWebhook(body)
  } catch (err) {
    console.error('Webhook processing error:', err)
  }

  return NextResponse.json({ status: 'ok' }, { status: 200 })
}

async function processWebhook(body: Record<string, unknown>) {
  // Navigeer naar het bericht in de Meta webhook structuur
  const entry = (body.entry as Array<Record<string, unknown>>)?.[0]
  const changes = (entry?.changes as Array<Record<string, unknown>>)?.[0]
  const value = changes?.value as Record<string, unknown> | undefined

  if (!value) return

  const messages = value.messages as Array<Record<string, unknown>> | undefined
  if (!messages || messages.length === 0) return

  const message = messages[0]
  const messageType = message.type as string

  // Haal telefoonnummer van de afzender
  const from = message.from as string
  if (!from) return

  const phone = normalizePhone(from)

  // ─────────────────────────────────────────────────────────────────────
  // NIEUWE BRANCHE-FLOW: zoek eerst in `leads` tabel.
  // Als er een actieve branche-lead is voor dit nummer → handleBrancheWebhook.
  // Anders val terug op de bestaande demo_leads / personalized-demo logica.
  // ─────────────────────────────────────────────────────────────────────
  const { data: brancheLead } = await getSupabase()
    .from('leads')
    .select('*')
    .eq('telefoon', phone)
    .neq('status', 'appointment_booked')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (brancheLead) {
    await handleBrancheWebhook(brancheLead, message, messageType, phone)
    return
  }

  // Zoek de lead op
  const { data: lead, error: leadError } = await getSupabase()
    .from('demo_leads')
    .select('*')
    .eq('telefoon', phone)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (leadError || !lead) {
    return
  }

  // Briefing laden als het een gepersonaliseerde demo is
  let briefing: string | null = null
  if (lead.personalized_demo_id) {
    const { data: pDemo } = await getSupabase()
      .from('personalized_demos')
      .select('briefing')
      .eq('id', lead.personalized_demo_id)
      .single()
    briefing = pDemo?.briefing ?? null
  }

  // Skip als offerte al verstuurd
  if (lead.status === 'quote_sent') return

  // Skip als in afwachting van goedkeuring
  if (lead.status === 'pending_approval') {
    await sendWhatsAppText(phone, 'Je offerte wacht op goedkeuring. Check je e-mail voor de goedkeuringslink!')
    return
  }

  // Alleen tekstberichten verwerken
  if (messageType !== 'text') {
    await sendWhatsAppText(phone, 'Op dit moment kan ik alleen tekstberichten verwerken. Stuur aub een tekstbericht.')
    return
  }

  const textBody = ((message.text as Record<string, unknown>)?.body as string) ?? ''
  if (!textBody.trim()) return

  // Sla inkomend bericht op
  await getSupabase().from('demo_conversations').insert({
    lead_id: lead.id,
    role: 'user',
    content: textBody,
  })

  // Haal volledige gespreksgeschiedenis op
  const { data: history } = await getSupabase()
    .from('demo_conversations')
    .select('role, content')
    .eq('lead_id', lead.id)
    .order('created_at', { ascending: true })

  const messagesHistory = (history ?? []).map((m: { role: string; content: string }) => ({
    role: m.role as 'assistant' | 'user',
    content: m.content,
  }))

  // Rate limit: max 20 berichten van de gebruiker
  const userMessages = messagesHistory.filter((m) => m.role === 'user')
  if (userMessages.length > 20) {
    await sendWhatsAppText(phone, 'Het lijkt erop dat ik je niet goed kan helpen. Een collega neemt zo snel mogelijk contact met je op!')
    return
  }

  // Huidige lead data (inclusief naam en email)
  const currentData: LeadData = {
    naam: lead.naam,
    email: lead.email,
    type_pand: lead.type_pand,
    m2: lead.m2,
    steentype: lead.steentype,
    planten: lead.planten,
  }

  // Extraheer nieuwe data uit het gesprek
  const extracted = await extractLeadData(messagesHistory, currentData)

  // Merge nieuwe data met bestaande
  const updatedData: LeadData = {
    naam: extracted.naam ?? currentData.naam,
    email: extracted.email ?? currentData.email,
    type_pand: extracted.type_pand ?? currentData.type_pand,
    m2: extracted.m2 ?? currentData.m2,
    steentype: extracted.steentype ?? currentData.steentype,
    planten: extracted.planten ?? currentData.planten,
  }

  // Update lead in database
  await getSupabase()
    .from('demo_leads')
    .update({
      naam: updatedData.naam,
      email: updatedData.email,
      type_pand: updatedData.type_pand,
      m2: updatedData.m2,
      steentype: updatedData.steentype,
      planten: updatedData.planten,
    })
    .eq('id', lead.id)

  // Check of ALLE velden compleet zijn (inclusief naam en email)
  const allComplete =
    updatedData.naam &&
    updatedData.email &&
    updatedData.type_pand &&
    updatedData.m2 &&
    updatedData.steentype &&
    updatedData.planten

  if (allComplete) {
    // Genereer bevestigingsbericht
    const reply = await generateReply(messagesHistory, updatedData, briefing)
    await sendWhatsAppText(phone, reply)

    // Sla AI-bericht op
    await getSupabase().from('demo_conversations').insert({
      lead_id: lead.id,
      role: 'assistant',
      content: reply,
    })

    // Genereer approval token en bereken prijs
    const approvalToken = randomUUID()
    const m2Num = parseFloat(updatedData.m2!) || 30
    const pricing = calculateDemoPrice(m2Num, updatedData.steentype!, updatedData.planten!)

    // Update status naar pending_approval
    await getSupabase()
      .from('demo_leads')
      .update({
        status: 'pending_approval',
        approval_token: approvalToken,
      })
      .eq('id', lead.id)

    // Stuur goedkeurings-e-mail naar het e-mailadres van de prospect
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://frontlix.com'
    const approveUrl = `${siteUrl}/api/demo-approve?token=${approvalToken}`

    try {
      await sendApprovalEmail(updatedData.email!, {
        naam: updatedData.naam!,
        telefoon: phone,
        email: updatedData.email!,
        type_pand: updatedData.type_pand!,
        m2: updatedData.m2!,
        steentype: updatedData.steentype!,
        planten: updatedData.planten!,
        pricePerM2: pricing.pricePerM2,
        base: pricing.base,
        surcharge: pricing.surcharge,
        total: pricing.total,
        approveUrl,
      })
    } catch (emailErr) {
      console.error('Approval email failed:', emailErr)
    }
  } else {
    // Genereer vervolgvraag
    const reply = await generateReply(messagesHistory, updatedData, briefing)
    await sendWhatsAppText(phone, reply)

    // Sla AI-bericht op
    await getSupabase().from('demo_conversations').insert({
      lead_id: lead.id,
      role: 'assistant',
      content: reply,
    })
  }
}

// ═════════════════════════════════════════════════════════════════════════
// BRANCHE FLOW (nieuwe demo workflow met 3 verticals + photo + scheduling)
// Onafhankelijk van de legacy demo_leads / personalized-demo logica hierboven.
// ═════════════════════════════════════════════════════════════════════════

interface BrancheLead {
  id: string
  telefoon: string
  naam: string | null
  email: string | null
  demo_type: BrancheId | null
  status: string
  collected_data: Record<string, unknown>
  photo_urls: string[] | null
  photo_analyses: string[] | null
  message_count: number
  approval_token: string | null
  pricing: Record<string, unknown> | null
  quote_pdf_url: string | null
}

const RATE_LIMIT_MAX_USER_MESSAGES = 30

async function handleBrancheWebhook(
  lead: BrancheLead,
  message: Record<string, unknown>,
  messageType: string,
  phone: string
): Promise<void> {
  // Eindstatussen — geen verdere verwerking
  if (lead.status === 'appointment_booked') {
    await sendWhatsAppText(phone, 'Je afspraak staat al ingepland. Een collega neemt vóór die tijd contact met je op als dat nodig is!')
    return
  }
  if (lead.status === 'pending_approval') {
    await sendWhatsAppText(phone, 'Je offerte wacht op interne goedkeuring. Je hoort zo van mij via WhatsApp!')
    return
  }

  // Image bericht → photo flow
  if (messageType === 'image') {
    await handleBrancheImageMessage(lead, message, phone)
    return
  }

  // Interactive bericht (button click) → meestal de branche-keuze knop
  if (messageType === 'interactive') {
    await handleBrancheInteractiveMessage(lead, message, phone)
    return
  }

  // Andere niet-tekst types worden niet ondersteund
  if (messageType !== 'text') {
    await sendWhatsAppText(phone, 'Op dit moment kan ik alleen tekstberichten, knoppen en foto\u2019s verwerken. Stuur aub een tekstbericht.')
    return
  }

  const textBody = ((message.text as Record<string, unknown>)?.body as string) ?? ''
  if (!textBody.trim()) return

  // Sla inkomend bericht op + verhoog message_count
  await getSupabase().from('conversations').insert({
    lead_id: lead.id,
    role: 'user',
    content: textBody,
    message_type: 'text',
  })
  await getSupabase()
    .from('leads')
    .update({ message_count: (lead.message_count || 0) + 1, updated_at: new Date().toISOString() })
    .eq('id', lead.id)

  // Refresh count voor rate limit check
  const userMsgCount = (lead.message_count || 0) + 1
  if (userMsgCount > RATE_LIMIT_MAX_USER_MESSAGES) {
    await sendWhatsAppText(phone, 'Het lijkt erop dat ik je niet goed kan helpen. Een collega neemt zo snel mogelijk contact met je op!')
    return
  }

  // Status routing
  switch (lead.status) {
    case 'awaiting_choice':
      await handleBrancheChoiceMessage(lead, textBody, phone)
      return
    case 'collecting':
      await handleBrancheCollectingMessage(lead, textBody, phone)
      return
    case 'quote_sent':
      // Klant antwoordt na ontvangst van PDF — start scheduling
      await handleBrancheStartScheduling(lead, textBody, phone)
      return
    case 'scheduling':
      await handleBrancheSchedulingMessage(lead, phone)
      return
    default:
      console.warn(`Onbekende branche-lead status: ${lead.status}`)
  }
}

// ─── Image bericht handler ───────────────────────────────────────────────

async function handleBrancheImageMessage(
  lead: BrancheLead,
  message: Record<string, unknown>,
  phone: string
): Promise<void> {
  // Foto's mogen alleen tijdens de collecting status, ná de branche-keuze
  if (lead.status !== 'collecting' || !lead.demo_type) {
    await sendWhatsAppText(phone, 'Bedankt voor de foto, maar ik kan deze nu nog niet verwerken. Antwoord eerst op mijn vraag!')
    return
  }

  const imageObj = message.image as Record<string, unknown> | undefined
  const mediaId = imageObj?.id as string | undefined
  if (!mediaId) {
    await sendWhatsAppText(phone, 'Sorry, ik kon je foto niet ophalen. Probeer hem nogmaals te sturen!')
    return
  }

  // Download van Meta + upload naar Supabase storage
  const mediaUrl = await getWhatsAppMediaUrl(mediaId)
  if (!mediaUrl) {
    console.error('Failed to fetch WhatsApp media URL for', mediaId)
    return
  }
  const dl = await downloadWhatsAppMedia(mediaUrl)
  if (!dl) return

  const filename = `${Date.now()}-${mediaId.slice(0, 8)}.jpg`
  const storagePath = `lead-photos/${lead.id}/${filename}`

  const { error: uploadErr } = await getSupabase()
    .storage.from('photos')
    .upload(storagePath, dl.buffer, { contentType: dl.contentType, upsert: false })
  if (uploadErr) {
    console.error('Photo upload failed:', uploadErr)
    return
  }
  const { data: pub } = getSupabase().storage.from('photos').getPublicUrl(storagePath)
  const publicUrl = pub.publicUrl

  // Run vision analyse
  const analysis = await analyzePhoto(publicUrl, lead.demo_type)

  // ─── Photo race protection ───
  // Re-fetch de lead JUST IN TIME — versmalt het race window waarin
  // 2 gelijktijdige foto's allebei een verouderde count zien.
  const { data: freshLead } = await getSupabase()
    .from('leads')
    .select('collected_data, status')
    .eq('id', lead.id)
    .single()

  // Status kan inmiddels gewisseld zijn (bv. door auto-advance)
  if (!freshLead || freshLead.status !== 'collecting') {
    await sendWhatsAppText(phone, 'Bedankt voor de foto, maar ik ben al verder in het proces. Geen zorgen — ik gebruik wat we al hebben.')
    return
  }

  // Append in collected_data.photos en .photo_analyses
  const collected = { ...(freshLead.collected_data || {}) } as Record<string, unknown>
  const photos = Array.isArray(collected.photos) ? [...collected.photos as string[]] : []
  const analyses = Array.isArray(collected.photo_analyses) ? [...collected.photo_analyses as string[]] : []

  // Limiet check ná de re-fetch — als 2 foto's tegelijk binnenkomen kan max
  // theoretisch nog steeds met 1 worden overschreden, maar nooit met meer.
  if (photos.length >= MAX_PHOTOS) {
    await sendWhatsAppText(phone, `Je hebt al ${MAX_PHOTOS} foto's gestuurd — dat is het maximum. Ik ga nu de offerte voor je opstellen.`)
    return
  }

  photos.push(publicUrl)
  analyses.push(analysis)
  collected.photos = photos
  collected.photo_analyses = analyses

  const now = Date.now()
  collected._last_photo_at = now
  // C1: timestamp-based fallback. Als de setTimeout door een PM2-restart verloren gaat,
  // dan triggert de check aan het begin van handleBrancheCollectingMessage alsnog
  // het auto-advance bij de eerstvolgende klant-actie.
  collected._photo_wait_until = now + PHOTO_WAIT_MS

  // Sla foto-bericht op in conversations met media_url
  await getSupabase().from('conversations').insert({
    lead_id: lead.id,
    role: 'user',
    content: '(foto ontvangen)',
    message_type: 'image',
    media_url: publicUrl,
  })

  // Bij MAX foto's → direct doorgaan, geen wachttimer meer
  if (photos.length >= MAX_PHOTOS) {
    collected._photo_step_done = true
    await getSupabase()
      .from('leads')
      .update({ collected_data: collected, updated_at: new Date().toISOString() })
      .eq('id', lead.id)

    await sendWhatsAppText(phone, 'Foto ontvangen, dank je. Dat is het maximum — ik heb genoeg om verder te gaan.')

    // Email zit ná de fotostap. Als 'ie er al is → approval. Anders bot vraagt om mailadres.
    if (lead.email) {
      await triggerBrancheApproval(lead.id)
    } else {
      const refreshed: BrancheLead = { ...lead, collected_data: collected }
      const history = await fetchBrancheConversationHistory(lead.id)
      await sendBrancheNextQuestion(refreshed, history, phone)
    }
    return
  }

  // Anders: opslaan + acknowledgement + 30s wacht-timer
  await getSupabase()
    .from('leads')
    .update({ collected_data: collected, updated_at: new Date().toISOString() })
    .eq('id', lead.id)

  await sendWhatsAppText(phone, 'Foto ontvangen, dank je.')

  // Schedule auto-advance na PHOTO_WAIT_MS milliseconden.
  // Werkt op de VPS met PM2 (long-running Node proces). Zou niet werken in serverless.
  setTimeout(() => {
    void autoAdvanceAfterPhotoWait(lead.id, now)
  }, PHOTO_WAIT_MS)
}

/**
 * Wordt 30 sec na een foto getriggerd. Als er ondertussen geen nieuwe foto
 * is gekomen, markeert hij de foto-stap als afgerond en triggert de
 * approval-flow.
 */
async function autoAdvanceAfterPhotoWait(leadId: string, photoTimestamp: number): Promise<void> {
  try {
    const { data: fresh } = await getSupabase()
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single()
    if (!fresh) return
    const collected = (fresh.collected_data || {}) as Record<string, unknown>

    // Stop als er ondertussen al een nieuwere foto is gekomen
    if (collected._last_photo_at !== photoTimestamp) return

    // Stop als de stap al klaar is (bv. via MAX bereikt)
    if (collected._photo_step_done === true) return

    // Stop als de status niet meer 'collecting' is (bv. al doorgegaan)
    if (fresh.status !== 'collecting') return

    collected._photo_step_done = true
    await getSupabase()
      .from('leads')
      .update({ collected_data: collected, updated_at: new Date().toISOString() })
      .eq('id', leadId)

    // Email zit in de nieuwe flow ná de fotostap. Als email nog niet binnen
    // is wachten we — bot vraagt 'm bij het volgende klant-bericht via de
    // normale reply-flow. Anders direct door naar approval.
    if (fresh.email) {
      await triggerBrancheApproval(leadId)
    } else {
      // Stuur een proactief WhatsApp-bericht zodat de klant niet in stilte
      // hoeft te wachten — vraag direct om het mailadres in de juiste persona.
      const refreshed: BrancheLead = { ...fresh, collected_data: collected }
      const history = await fetchBrancheConversationHistory(leadId)
      await sendBrancheNextQuestion(refreshed, history, fresh.telefoon)
    }
  } catch (err) {
    console.error('autoAdvanceAfterPhotoWait error:', err)
  }
}

// ─── Interactive button handler (branche-keuze via knoppen) ─────────────

/**
 * Mapt een button title/id naar een BrancheId via fuzzy keyword matching.
 * Werkt ongeacht of de knop "Zonnepanelen", "zonne", "btn_zonnepanelen" of
 * iets vergelijkbaars heet.
 */
function mapButtonToBranche(titleOrId: string): BrancheId | null {
  const t = (titleOrId || '').toLowerCase()
  if (!t) return null
  if (/zonnepan|zonne|solar|pv/.test(t)) return 'zonnepanelen'
  if (/dakdek|dak\b|dakwerk|dakreparatie/.test(t)) return 'dakdekker'
  if (/schoonm|schoon|reinig|cleaning/.test(t)) return 'schoonmaak'
  return null
}

async function handleBrancheInteractiveMessage(
  lead: BrancheLead,
  message: Record<string, unknown>,
  phone: string
): Promise<void> {
  // WhatsApp interactive payload structuur:
  // message.interactive.button_reply = { id: '...', title: '...' }
  // message.interactive.list_reply   = { id: '...', title: '...', description: '...' }
  const interactive = message.interactive as Record<string, unknown> | undefined
  if (!interactive) return

  const buttonReply = interactive.button_reply as Record<string, unknown> | undefined
  const listReply = interactive.list_reply as Record<string, unknown> | undefined
  const reply = buttonReply || listReply

  const title = (reply?.title as string) || ''
  const id = (reply?.id as string) || ''
  const choiceText = title || id

  // Sla het bericht op in conversations met message_type='interactive'
  await getSupabase().from('conversations').insert({
    lead_id: lead.id,
    role: 'user',
    content: `Gekozen: ${choiceText}`,
    message_type: 'interactive',
  })
  await getSupabase()
    .from('leads')
    .update({ message_count: (lead.message_count || 0) + 1, updated_at: new Date().toISOString() })
    .eq('id', lead.id)

  // Alleen geldig als de lead nog op awaiting_choice staat
  if (lead.status !== 'awaiting_choice') {
    // Lead is al verder in de flow — negeer de knop maar wees vriendelijk
    await sendWhatsAppText(phone, 'Bedankt! Je zit al midden in een gesprek — antwoord gerust op mijn vorige vraag.')
    return
  }

  // Mapping
  const branche = mapButtonToBranche(title) || mapButtonToBranche(id)
  if (!branche) {
    await sendWhatsAppText(
      phone,
      'Sorry, ik kon je keuze niet plaatsen. Stuur "zonnepanelen", "dakdekker" of "schoonmaak" als tekst dan ga ik door.'
    )
    return
  }

  // Update lead naar collecting + sla branche op
  await getSupabase()
    .from('leads')
    .update({
      demo_type: branche,
      status: 'collecting',
      updated_at: new Date().toISOString(),
    })
    .eq('id', lead.id)

  // A2: eerst een welkomstbericht in de stem van de juiste agent, dan pas de eerste vraag
  await sendBrancheWelcomeMessage(branche, lead.id, phone)

  // Stuur direct de eerste vraag in de stem van de juiste agent
  const updatedLead: BrancheLead = { ...lead, demo_type: branche, status: 'collecting' }
  const history = await fetchBrancheConversationHistory(lead.id)
  await sendBrancheNextQuestion(updatedLead, history, phone)
}

// ─── Branche-keuze handler (status awaiting_choice, tekst-bericht) ───────

async function handleBrancheChoiceMessage(
  lead: BrancheLead,
  textBody: string,
  phone: string
): Promise<void> {
  const history = await fetchBrancheConversationHistory(lead.id)
  const detected = await detectBranche(history)

  if (!detected) {
    // Niet duidelijk — vraag opnieuw
    await sendWhatsAppText(
      phone,
      'Sorry, ik kon je keuze niet helemaal plaatsen. Voor welke dienst wil je een offerte zien — zonnepanelen, dakdekker of schoonmaak?'
    )
    return
  }

  // Update lead met de gekozen branche en switch naar collecting
  await getSupabase()
    .from('leads')
    .update({ demo_type: detected, status: 'collecting', updated_at: new Date().toISOString() })
    .eq('id', lead.id)

  // A2: eerst een welkomstbericht in de stem van de juiste agent, dan pas de eerste vraag
  await sendBrancheWelcomeMessage(detected, lead.id, phone)

  // Stuur direct een eerste vraag in de stem van de juiste agent
  const updatedLead: BrancheLead = { ...lead, demo_type: detected, status: 'collecting' }
  // Refetch history zodat het welkomstbericht in de context voor de reply-LLM zit
  const updatedHistory = await fetchBrancheConversationHistory(lead.id)
  await sendBrancheNextQuestion(updatedLead, updatedHistory, phone)
}

// ─── Collecting handler (status collecting) ──────────────────────────────

async function handleBrancheCollectingMessage(
  lead: BrancheLead,
  textBody: string,
  phone: string
): Promise<void> {
  if (!lead.demo_type) {
    // Edge case: status is collecting maar geen branche — terug naar choice
    await getSupabase()
      .from('leads')
      .update({ status: 'awaiting_choice' })
      .eq('id', lead.id)
    await sendWhatsAppText(phone, 'Even opnieuw — voor welke dienst wil je een offerte zien? Zonnepanelen, dakdekker of schoonmaak?')
    return
  }

  const history = await fetchBrancheConversationHistory(lead.id)
  const branche = getBranche(lead.demo_type)
  if (!branche) return

  const collected = (lead.collected_data || {}) as Record<string, unknown>

  // ─── Photo wait timestamp-based fallback ───
  // Email zit BEWUST niet in deze check — die wordt pas ná de fotostap gevraagd.
  // Photo-stap mag dus al beginnen zodra naam + alle branche-velden klaar zijn.
  const allRegularFieldsFilled =
    !!lead.naam &&
    getMissingFields(branche, collected).length === 0
  const photoWaitUntil = collected._photo_wait_until
  if (
    allRegularFieldsFilled &&
    !isPhotoStepDone(collected) &&
    typeof photoWaitUntil === 'number' &&
    Date.now() >= photoWaitUntil
  ) {
    collected._photo_step_done = true
    await getSupabase()
      .from('leads')
      .update({ collected_data: collected, updated_at: new Date().toISOString() })
      .eq('id', lead.id)
    // Photo-stap is nu afgerond. Als email ook al binnen is → approval, anders
    // valt 'ie door naar de normale reply-flow die om email vraagt.
    if (lead.email) {
      await triggerBrancheApproval(lead.id)
      return
    }
    // Refetch zodat sendBrancheNextQuestion de bijgewerkte _photo_step_done meeneemt
    // en de NEXT-tag correct op 'email' uitkomt.
    const refreshed: BrancheLead = { ...lead, collected_data: collected }
    const refreshedHistory = await fetchBrancheConversationHistory(lead.id)
    await sendBrancheNextQuestion(refreshed, refreshedHistory, phone)
    return
  }

  // Check of we in de foto-stap zitten en de klant zegt "geen foto / klaar"
  const allFieldsFilled = allRegularFieldsFilled
  const inPhotoStep = allFieldsFilled && !isPhotoStepDone(collected)

  if (inPhotoStep && userSkipsPhotoStep(textBody)) {
    collected._photo_step_done = true
    await getSupabase()
      .from('leads')
      .update({ collected_data: collected, updated_at: new Date().toISOString() })
      .eq('id', lead.id)
    // Photo-stap geskipt. Als email er al is → approval, anders bot vraagt nu om email.
    if (lead.email) {
      await triggerBrancheApproval(lead.id)
      return
    }
    const refreshed: BrancheLead = { ...lead, collected_data: collected }
    const refreshedHistory = await fetchBrancheConversationHistory(lead.id)
    await sendBrancheNextQuestion(refreshed, refreshedHistory, phone)
    return
  }

  // Run de branche-extractor
  const llms = getBrancheLLMs(lead.demo_type)
  const identity = { naam: lead.naam, email: lead.email }
  const currentData: Record<string, string | undefined> = {}
  for (const f of branche.fields) {
    const v = collected[f.key]
    if (typeof v === 'string') currentData[f.key] = v
  }

  const extracted = await llms.extract(history, identity, currentData)

  // Apply nieuwe data
  let newNaam = lead.naam
  let newEmail = lead.email
  if (extracted.naam) newNaam = extracted.naam
  if (extracted.email) newEmail = extracted.email
  if (extracted.data) {
    for (const [k, v] of Object.entries(extracted.data)) {
      if (v !== undefined && v !== null) collected[k] = v
    }
  }

  // Update lead
  await getSupabase()
    .from('leads')
    .update({
      naam: newNaam,
      email: newEmail,
      collected_data: collected,
      updated_at: new Date().toISOString(),
    })
    .eq('id', lead.id)

  // Bepaal volgende stap
  const updated: BrancheLead = { ...lead, naam: newNaam, email: newEmail, collected_data: collected }
  const stillMissing = getMissingFields(branche, collected)
  const allDone =
    !!newNaam && !!newEmail && stillMissing.length === 0 && isPhotoStepDone(collected)

  if (allDone) {
    await triggerBrancheApproval(lead.id)
    return
  }

  // Anders: stuur volgende vraag
  await sendBrancheNextQuestion(updated, history, phone)
}

/** Helper: vraag de branche reply-LLM om de volgende vraag en stuur 'm */
async function sendBrancheNextQuestion(
  lead: BrancheLead,
  history: ConversationMessage[],
  phone: string
): Promise<void> {
  if (!lead.demo_type) return
  const branche = getBranche(lead.demo_type)
  if (!branche) return

  const llms = getBrancheLLMs(lead.demo_type)
  const identity = { naam: lead.naam, email: lead.email }
  const collected = (lead.collected_data || {}) as Record<string, unknown>
  const currentData: Record<string, string | undefined> = {}
  for (const f of branche.fields) {
    const v = collected[f.key]
    if (typeof v === 'string') currentData[f.key] = v
  }

  const reply = await llms.reply(history, identity, currentData, collected)

  // [WAIT] guard: als de reply-LLM detecteert dat de klant nog bezig is (bv.
  // "moment, laat me kijken"), returnt hij het token `[WAIT]`. In dat geval
  // sturen we helemaal niks — geen WhatsApp-bericht, geen conversations-row.
  // De bot wacht gewoon op het volgende bericht van de klant. Dit voorkomt
  // de "bot herhaalt dezelfde vraag 4 keer terwijl klant 'rustig' typt"-lus.
  if (reply.trim().toUpperCase().startsWith('[WAIT]')) {
    console.log(`[branche-reply] [WAIT] token — holding off voor lead ${lead.id}`)
    return
  }

  await sendWhatsAppText(phone, reply)

  await getSupabase().from('conversations').insert({
    lead_id: lead.id,
    role: 'assistant',
    content: reply,
    message_type: 'text',
  })
}

// ─── Welkomstbericht na branche-keuze (A2) ──────────────────────────────

/**
 * Stuurt een korte, branche-specifieke welkomst in de stem van de juiste agent
 * (Sanne / Bram / Lotte) direct ná de branche-keuze, vóór de eerste inhoudelijke
 * vraag. Wordt ook opgeslagen in `conversations` zodat de reply-LLM het in de
 * context meeneemt.
 */
async function sendBrancheWelcomeMessage(
  branche: BrancheId,
  leadId: string,
  phone: string
): Promise<void> {
  const messages: Record<BrancheId, string> = {
    zonnepanelen:
      'Top, je gaat voor zonnepanelen — leuk! Ik ben Sanne. Ik stel je zo een paar korte vragen en daarna heb je een voorbeeld-offerte op zak. Let\'s go!',
    dakdekker:
      'Helder, dakwerk dus. Ik ben Bram. Ik stel je een paar korte vragen en dan heb ik genoeg om een offerte voor je op te stellen.',
    schoonmaak:
      'Fijn, schoonmaak! Ik ben Lotte. Ik stel je zo een paar korte vragen, dan kan ik snel een passende offerte voor je maken.',
  }
  const text = messages[branche]
  if (!text) return

  await sendWhatsAppText(phone, text)
  await getSupabase().from('conversations').insert({
    lead_id: leadId,
    role: 'assistant',
    content: text,
    message_type: 'text',
  })
}

// ─── Approval trigger ────────────────────────────────────────────────────

async function triggerBrancheApproval(leadId: string): Promise<void> {
  // Re-fetch lead om de laatste collected_data te krijgen
  const { data: lead } = await getSupabase()
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single()
  if (!lead || !lead.demo_type) return

  const branche = getBranche(lead.demo_type)
  if (!branche) return

  const collected = (lead.collected_data || {}) as Record<string, unknown>

  // Bereken pricing
  const stringData: Record<string, string> = {}
  for (const [k, v] of Object.entries(collected)) {
    if (typeof v === 'string' || typeof v === 'number') stringData[k] = String(v)
  }
  const pricing = branche.pricing(stringData)

  // Genereer approval token
  const approvalToken = randomUUID()

  // Sla pricing + token op
  await getSupabase()
    .from('leads')
    .update({
      status: 'pending_approval',
      approval_token: approvalToken,
      pricing: {
        lines: pricing.lines,
        subtotaalExclBtw: pricing.subtotaalExclBtw,
        btwBedrag: pricing.btwBedrag,
        totaalInclBtw: pricing.totaalInclBtw,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', lead.id)

  // Stuur bevestigings-bericht via WhatsApp
  await sendWhatsAppText(
    lead.telefoon,
    'Top, ik heb alles wat ik nodig heb! Je krijgt zo een mailtje met de offerte ter goedkeuring. Zodra die is goedgekeurd stuur ik je hier de PDF.'
  )

  // Bouw e-mail content
  const fields = branche.fields
    .map((f) => {
      const v = collected[f.key]
      if (v === undefined || v === null || v === '') return null
      const value = f.unit ? `${v} ${f.unit}` : String(v)
      return { label: f.label, value }
    })
    .filter((x): x is { label: string; value: string } => x !== null)

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://frontlix.com'
  const approveUrl = `${siteUrl}/api/demo-approve?token=${approvalToken}`
  const editUrl = `${siteUrl}/api/demo-edit?token=${approvalToken}`

  // B2: verzamel publieke photo URLs uit collected_data voor de thumbnail grid
  const photoUrls = Array.isArray(collected.photos)
    ? (collected.photos as unknown[]).filter((u): u is string => typeof u === 'string')
    : []

  try {
    await sendBrancheApprovalEmail(lead.email!, {
      naam: lead.naam!,
      telefoon: lead.telefoon,
      email: lead.email!,
      brancheLabel: branche.label,
      fields,
      priceLines: pricing.lines.map((l) => ({ omschrijving: l.omschrijving, totaal: l.totaal })),
      subtotaal: pricing.subtotaalExclBtw,
      btw: pricing.btwBedrag,
      totaal: pricing.totaalInclBtw,
      approveUrl,
      editUrl,
      photoUrls,
    })
  } catch (err) {
    console.error('[branche-approval] ❌ email failed:', err)
  }
}

// ─── Scheduling handlers ─────────────────────────────────────────────────

async function handleBrancheStartScheduling(
  lead: BrancheLead,
  textBody: string,
  phone: string
): Promise<void> {
  // Klant moet "ja" / positief antwoorden om scheduling te starten
  const positive = /\b(ja|jazeker|graag|prima|ok|oké|okee|akkoord|klinkt goed|doe maar|yes)\b/i.test(textBody)
  if (!positive) {
    await sendWhatsAppText(
      phone,
      'Geen probleem! Wil je later toch nog een gesprek inplannen? Stuur dan "ja" en dan stel ik wat tijden voor.'
    )
    return
  }

  const klantNaam = lead.naam || 'daar'
  const { message, slots } = await proposeSlots(klantNaam)

  // Sla voorgestelde slots op in collected_data
  const collected = (lead.collected_data || {}) as Record<string, unknown>
  collected._proposed_slots = slots
  await getSupabase()
    .from('leads')
    .update({
      status: 'scheduling',
      collected_data: collected,
      updated_at: new Date().toISOString(),
    })
    .eq('id', lead.id)

  await sendWhatsAppText(phone, message)
  await getSupabase().from('conversations').insert({
    lead_id: lead.id,
    role: 'assistant',
    content: message,
    message_type: 'text',
  })
}

async function handleBrancheSchedulingMessage(
  lead: BrancheLead,
  phone: string
): Promise<void> {
  const collected = (lead.collected_data || {}) as Record<string, unknown>
  const proposedRaw = collected._proposed_slots
  if (!Array.isArray(proposedRaw) || proposedRaw.length === 0) {
    // Geen slots opgeslagen — herstart scheduling
    const klantNaam = lead.naam || 'daar'
    const { message, slots } = await proposeSlots(klantNaam)
    collected._proposed_slots = slots
    await getSupabase()
      .from('leads')
      .update({ collected_data: collected })
      .eq('id', lead.id)
    await sendWhatsAppText(phone, message)
    return
  }

  // Reconstrueer FreeSlot objects (Date velden zijn JSON gestripped naar string)
  const proposed: FreeSlot[] = (proposedRaw as Array<Record<string, unknown>>).map((s) => ({
    startUtc: new Date(s.startUtc as string),
    endUtc: new Date(s.endUtc as string),
    label: s.label as string,
    iso: s.iso as string,
  }))

  const history = await fetchBrancheConversationHistory(lead.id)
  const matched = await matchSlot(history, proposed)

  if (!matched) {
    await sendWhatsAppText(
      phone,
      'Sorry, ik kon je keuze niet helemaal plaatsen. Kun je het nummer (1, 2 of 3) sturen van het moment dat je het beste uitkomt?'
    )
    return
  }

  // Maak event in Google Calendar
  let eventId = ''
  try {
    const branche = lead.demo_type ? getBranche(lead.demo_type) : null
    const summary = `Frontlix demo gesprek met ${lead.naam || 'klant'}${branche ? ` (${branche.label})` : ''}`
    const description = `Demo afspraak via WhatsApp.\n\nKlant: ${lead.naam}\nEmail: ${lead.email}\nTelefoon: +${lead.telefoon}\nBranche: ${branche?.label || lead.demo_type || 'onbekend'}`
    const result = await createEvent({
      startUtc: matched.startUtc,
      endUtc: matched.endUtc,
      summary,
      description,
      attendeeEmail: lead.email || undefined,
    })
    eventId = result.eventId
  } catch (err) {
    console.error('Google Calendar createEvent failed:', err)
    await sendWhatsAppText(phone, 'Hmm, er ging iets mis bij het inplannen. Een collega neemt persoonlijk contact met je op.')
    return
  }

  // Update lead
  collected._appointment_at = matched.iso
  collected._google_event_id = eventId
  await getSupabase()
    .from('leads')
    .update({
      status: 'appointment_booked',
      collected_data: collected,
      updated_at: new Date().toISOString(),
    })
    .eq('id', lead.id)

  // Bevestig
  const bevestiging = formatBevestiging(matched, lead.naam || 'daar')
  await sendWhatsAppText(phone, bevestiging)
  await getSupabase().from('conversations').insert({
    lead_id: lead.id,
    role: 'assistant',
    content: bevestiging,
    message_type: 'text',
  })
}

// ─── Helpers ─────────────────────────────────────────────────────────────

async function fetchBrancheConversationHistory(leadId: string): Promise<ConversationMessage[]> {
  const { data: history } = await getSupabase()
    .from('conversations')
    .select('role, content')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: true })

  return (history ?? []).map((m: { role: string; content: string }) => ({
    role: m.role as 'assistant' | 'user',
    content: m.content,
  }))
}
