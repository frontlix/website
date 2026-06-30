// app/api/integrations/whatsapp/connect/route.ts
//
// POST: koppelt het eigen WhatsApp Business-nummer van het bedrijf via Meta
// Embedded Signup. De pop-up levert een code, waba_id en phone_number_id; deze
// route wisselt de code server-side in voor een business-token, abonneert de
// WABA op de app (anders komen er geen webhooks binnen), registreert het nummer
// met een PIN en slaat pas bij succes het versleutelde token op (sectie 7.1).
//
// Beveiliging (sectie 7, 10): auth-guard (approved + is_owner), token NOOIT in
// de response, logging uitsluitend foutcode (nooit het token of de error-payload),
// bij elke fout niets opslaan zodat een mislukte koppeling niets achterlaat.
import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { getCurrentUserProfile } from '@/lib/dashboard/auth'
import { encryptToken } from '@/lib/crypto/calendar-token'
import {
  saveWhatsAppConnection,
} from '@/lib/dashboard/whatsapp-connection-queries'

const GRAPH = 'https://graph.facebook.com/v21.0'
const FETCH_TIMEOUT_MS = 15000

// fetch met expliciete timeout zodat een trage Graph-call de route niet laat
// hangen. AbortController wordt na afloop opgeruimd.
async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

// Leest uitsluitend de niet-gevoelige Graph-foutcode uit een respons-body.
// Nooit de volledige payload teruggeven of loggen (kan tokens/PII bevatten).
function extractGraphErrorCode(body: unknown): string | number | undefined {
  const err = (body as { error?: { code?: number; error_subcode?: number } })?.error
  if (!err) return undefined
  return typeof err.code === 'number' ? err.code : err.error_subcode
}

// Logt uitsluitend de foutcode. NOOIT het token, de body of het err-object
// (sectie 7.1, 10).
function logWhatsAppFailure(stap: string, code: string | number | undefined): void {
  console.error('[whatsapp/connect] stap faalde', { stap, code: code ?? 'onbekend' })
}

// Genereert een willekeurige 6-cijferige two-step-PIN voor de nummerregistratie.
function generatePin(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')
}

// "Al geregistreerd" is geen blocker bij /register: een nummer dat al op de
// Cloud API staat geeft een specifieke Graph-fout (code 133005 of een melding
// dat het nummer al geregistreerd is). Die slikken we in.
function isAlreadyRegistered(body: unknown): boolean {
  const err = (body as { error?: { code?: number; error_subcode?: number; message?: string } })?.error
  if (!err) return false
  if (err.code === 133005 || err.error_subcode === 133005) return true
  const msg = typeof err.message === 'string' ? err.message.toLowerCase() : ''
  return msg.includes('already') && msg.includes('regist')
}

export async function POST(req: Request) {
  // Auth-guard, gepind op het bewezen disconnect-precedent van de agenda.
  // NIET requireApprovedUser() gebruiken: die redirect en breekt JSON.
  const profile = await getCurrentUserProfile()
  if (!profile || profile.tenant_status !== 'approved' || !profile.is_owner) {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 })
  }
  if (!profile.tenant_id) {
    return NextResponse.json({ error: 'Geen bedrijf gekoppeld' }, { status: 403 })
  }
  const tenantId = profile.tenant_id

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Ongeldige aanvraag.' }, { status: 400 })
  }

  const code = typeof body.code === 'string' ? body.code.trim() : ''
  const wabaId = typeof body.waba_id === 'string' ? body.waba_id.trim() : ''
  const phoneNumberId =
    typeof body.phone_number_id === 'string' ? body.phone_number_id.trim() : ''

  if (!code || !wabaId || !phoneNumberId) {
    return NextResponse.json(
      { error: 'De koppeling is onvolledig. Sluit het venster en probeer het opnieuw.' },
      { status: 400 },
    )
  }

  const appId = process.env.NEXT_PUBLIC_META_APP_ID
  const appSecret = process.env.META_APP_SECRET
  if (!appId || !appSecret) {
    console.error('[whatsapp/connect] Meta-app-configuratie ontbreekt')
    return NextResponse.json(
      { error: 'WhatsApp-koppeling is nog niet geconfigureerd. Neem contact op met Frontlix.' },
      { status: 500 },
    )
  }

  // Stap 1: wissel de code in voor een business-token. Het token blijft volledig
  // server-side en wordt nooit gelogd of teruggestuurd.
  let accessToken: string
  try {
    const tokenUrl =
      `${GRAPH}/oauth/access_token` +
      `?client_id=${encodeURIComponent(appId)}` +
      `&client_secret=${encodeURIComponent(appSecret)}` +
      `&code=${encodeURIComponent(code)}`
    const res = await fetchWithTimeout(tokenUrl)
    const data = (await res.json().catch(() => ({}))) as { access_token?: string }
    if (!res.ok || !data.access_token) {
      logWhatsAppFailure('token-uitwisseling', res.status || extractGraphErrorCode(data))
      return NextResponse.json(
        { error: 'Inloggen bij Meta mislukte. Sluit het venster en probeer het opnieuw.' },
        { status: 400 },
      )
    }
    accessToken = data.access_token
  } catch {
    logWhatsAppFailure('token-uitwisseling', 'netwerk/timeout')
    return NextResponse.json(
      { error: 'Geen verbinding met Meta. Controleer je internet en probeer het opnieuw.' },
      { status: 502 },
    )
  }

  const authHeader = { Authorization: `Bearer ${accessToken}` }

  // Stap 2: abonneer de WABA op de app, anders komen er geen webhooks binnen.
  try {
    const res = await fetchWithTimeout(`${GRAPH}/${encodeURIComponent(wabaId)}/subscribed_apps`, {
      method: 'POST',
      headers: authHeader,
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      logWhatsAppFailure('subscribe-waba', res.status || extractGraphErrorCode(data))
      return NextResponse.json(
        { error: 'WhatsApp-account koppelen mislukte bij Meta. Probeer het opnieuw.' },
        { status: 400 },
      )
    }
  } catch {
    logWhatsAppFailure('subscribe-waba', 'netwerk/timeout')
    return NextResponse.json(
      { error: 'Geen verbinding met Meta. Controleer je internet en probeer het opnieuw.' },
      { status: 502 },
    )
  }

  // Stap 3: registreer het nummer met een two-step-PIN. Een vers nummer moet
  // geregistreerd worden; een al geregistreerd nummer is geen blocker. De PIN
  // bewaren we (versleuteld) zodat hij terug te halen is bij her-registratie.
  const registrationPin = generatePin()
  try {
    const res = await fetchWithTimeout(`${GRAPH}/${encodeURIComponent(phoneNumberId)}/register`, {
      method: 'POST',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', pin: registrationPin }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      if (!isAlreadyRegistered(data)) {
        logWhatsAppFailure('nummer-registratie', res.status || extractGraphErrorCode(data))
        return NextResponse.json(
          { error: 'Het nummer kon niet worden geregistreerd bij Meta. Probeer het opnieuw.' },
          { status: 400 },
        )
      }
    }
  } catch {
    logWhatsAppFailure('nummer-registratie', 'netwerk/timeout')
    return NextResponse.json(
      { error: 'Geen verbinding met Meta. Controleer je internet en probeer het opnieuw.' },
      { status: 502 },
    )
  }

  // Stap 4: haal het weergave-nummer op (optioneel, puur informatief voor de UI).
  // Een fout hier is geen blocker: displayPhoneNumber mag null blijven.
  let displayPhoneNumber: string | null = null
  try {
    const res = await fetchWithTimeout(
      `${GRAPH}/${encodeURIComponent(phoneNumberId)}?fields=display_phone_number`,
      { headers: authHeader },
    )
    if (res.ok) {
      const data = (await res.json().catch(() => ({}))) as { display_phone_number?: string }
      if (typeof data.display_phone_number === 'string') {
        displayPhoneNumber = data.display_phone_number
      }
    }
  } catch {
    // Stil: het nummer is niet kritiek voor de koppeling.
  }

  // Stap 5: versleutel het token en sla pas nu de koppeling op. Bij een fout
  // hierboven is er niets opgeslagen.
  try {
    const accessTokenEncrypted = encryptToken(accessToken)
    const registrationPinEncrypted = encryptToken(registrationPin)
    await saveWhatsAppConnection({
      tenantId,
      wabaId,
      phoneNumberId,
      displayPhoneNumber,
      accessTokenEncrypted,
      registrationPinEncrypted,
    })
  } catch {
    // Geen err-object loggen (kan velden meedragen). Korte melding terug.
    console.error('[whatsapp/connect] opslaan WhatsApp-koppeling faalde')
    return NextResponse.json(
      { error: 'De koppeling lukte, maar opslaan mislukte. Probeer het opnieuw.' },
      { status: 500 },
    )
  }

  // Token wordt NOOIT teruggestuurd.
  return NextResponse.json({ connected: true, displayPhoneNumber })
}
