import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { sendWhatsAppText, normalizePhone } from '@/lib/whatsapp'
import { extractLeadData, generateReply, calculateDemoPrice, type LeadData } from '@/lib/openai'
import { sendApprovalEmail } from '@/lib/mail'
import { randomUUID } from 'crypto'

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

  // Zoek de lead op
  const { data: lead, error: leadError } = await getSupabase()
    .from('demo_leads')
    .select('*')
    .eq('telefoon', phone)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (leadError || !lead) {
    console.log('Geen lead gevonden voor telefoon:', phone)
    return
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
    const reply = await generateReply(messagesHistory, updatedData)
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
    const reply = await generateReply(messagesHistory, updatedData)
    await sendWhatsAppText(phone, reply)

    // Sla AI-bericht op
    await getSupabase().from('demo_conversations').insert({
      lead_id: lead.id,
      role: 'assistant',
      content: reply,
    })
  }
}
