// app/api/integrations/email/connect/route.ts
//
// POST: koppelt het eigen verzendadres van het bedrijf via SMTP. Doet een
// ECHTE login-test (verify) plus een proefmail naar het eigen adres en slaat
// pas bij succes op. Bij elke fout wordt niets opgeslagen, zodat een mislukte
// test nooit een halve koppeling achterlaat (sectie 6.1, 11).
//
// Beveiliging (sectie 10): auth-guard (approved + is_owner), Microsoft 365
// server-side geweigerd, poort beperkt tot {465,587}, per-tenant rate-limit,
// wachtwoord nooit in de response, logging uitsluitend err.code/err.responseCode.
import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { getCurrentUserProfile } from '@/lib/dashboard/auth'
import { encryptToken, decryptToken } from '@/lib/crypto/calendar-token'
import {
  getRawEmailConnection,
  saveEmailConnection,
} from '@/lib/dashboard/email-connection-queries'

type Security = 'ssl' | 'starttls'

const ALLOWED_PORTS = [465, 587] as const

// Eenvoudige in-memory rate-limit per tenant: max 10 connect-pogingen per uur.
// Voldoende voor single-tenant nu; bij multi-tenant later vervangen door iets
// gedeelds. Het venster is rollend per tenant-id.
const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000
const rateLimitHits = new Map<string, number[]>()

function isRateLimited(tenantId: string): boolean {
  const now = Date.now()
  const recent = (rateLimitHits.get(tenantId) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
  if (recent.length >= RATE_LIMIT_MAX) {
    rateLimitHits.set(tenantId, recent)
    return true
  }
  recent.push(now)
  rateLimitHits.set(tenantId, recent)
  return false
}

// Eenvoudige e-mailvalidatie (zelfde lichtgewicht aanpak als de rest van het
// dashboard; de echte test is verify() + proefmail).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
function isValidEmail(v: string): boolean {
  return EMAIL_RE.test(v)
}

// Microsoft 365 / Outlook: wachtwoord-SMTP is uitgezet, server-side weigeren
// zodat de UI-ontsnapping "Anders (handmatig)" de blokkade niet ondermijnt.
function isMicrosoftHost(host: string): boolean {
  const h = host.toLowerCase()
  return h.includes('office365') || h.includes('outlook')
}

const MICROSOFT_MSG =
  'Microsoft 365 ondersteunt geen wachtwoord-SMTP meer (sinds april 2026). Gebruik een mailbox bij een NL-hoster, bijvoorbeeld Hostinger of TransIP.'

// Vertaalt een nodemailer/SMTP-fout naar een begrijpelijke NL-boodschap
// (sectie 6.1-tabel, sectie 11). Leest uitsluitend de niet-gevoelige velden
// code/responseCode/message van het error-object.
function mapSmtpError(err: unknown): string {
  const e = (err ?? {}) as { code?: string; responseCode?: number; message?: string }
  const code = typeof e.code === 'string' ? e.code : ''
  const responseCode = typeof e.responseCode === 'number' ? e.responseCode : 0
  const message = typeof e.message === 'string' ? e.message : ''

  // Verkeerd wachtwoord / login geweigerd.
  if (code === 'EAUTH' || responseCode === 535) {
    return 'Inloggen mislukt. Controleer je wachtwoord. Bij Gmail heb je een app-wachtwoord nodig (2FA aan).'
  }
  // Host onbekend.
  if (code === 'ENOTFOUND' || code === 'EDNS' || code === 'EAI_AGAIN') {
    return 'De servernaam klopt niet. Controleer de SMTP-server bij je hoster.'
  }
  // Verbinding geweigerd / timeout.
  if (code === 'ECONNREFUSED' || code === 'ETIMEDOUT' || code === 'ESOCKET' || code === 'ECONNECTION') {
    return 'Geen verbinding op deze poort. Probeer poort 465 (SSL) of 587 (STARTTLS). Als dit blijft falen, kan een firewall op de server uitgaand SMTP blokkeren.'
  }
  // TLS-fout.
  if (
    code === 'ETLS' ||
    code.startsWith('ERR_TLS') ||
    code.startsWith('ERR_SSL') ||
    /certificate|tls|ssl/i.test(message)
  ) {
    return 'Beveiligingsfout bij het opzetten van de verbinding. Controleer poort en SSL/STARTTLS.'
  }
  // Proefmail geweigerd op de afzender (From).
  if (responseCode === 553 || responseCode === 550) {
    return 'Deze server staat alleen verzenden vanaf het ingelogde adres toe. Gebruik exact je eigen adres (geen alias).'
  }
  // Onbekend: korte technische code meegeven, geen gevoelige inhoud.
  const shortCode = code || (responseCode ? String(responseCode) : 'onbekend')
  return `Koppelen mislukt. Technische melding: ${shortCode}.`
}

// Logt uitsluitend de whitelist err.code/err.responseCode. NOOIT het err-object,
// de transport-config, het wachtwoord of de ontsleutelde waarde (sectie 10, 6.1).
function logSmtpFailure(err: unknown): void {
  const e = (err ?? {}) as { code?: string; responseCode?: number }
  console.error('[email/connect] verify/sendMail faalde', {
    code: typeof e.code === 'string' ? e.code : undefined,
    responseCode: typeof e.responseCode === 'number' ? e.responseCode : undefined,
  })
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

  const provider = typeof body.provider === 'string' ? body.provider.trim() : null
  const smtpHostRaw = typeof body.smtp_host === 'string' ? body.smtp_host.trim() : ''
  const portRaw = body.smtp_port
  const securityRaw = typeof body.security === 'string' ? body.security : ''
  const emailRaw = typeof body.email === 'string' ? body.email.trim() : ''
  const passwordRaw = typeof body.password === 'string' ? body.password : ''
  const senderNameRaw = typeof body.sender_name === 'string' ? body.sender_name.trim() : ''
  const replyToRaw = typeof body.reply_to === 'string' ? body.reply_to.trim() : ''

  // E-mail (afzender- en login-adres).
  if (!isValidEmail(emailRaw)) {
    return NextResponse.json({ error: 'Vul een geldig e-mailadres in.' }, { status: 400 })
  }

  // SMTP-host: niet-leeg, geen spaties.
  if (!smtpHostRaw || /\s/.test(smtpHostRaw)) {
    return NextResponse.json(
      { error: 'Vul een geldige SMTP-server in (geen spaties).' },
      { status: 400 },
    )
  }

  // Microsoft 365 / Outlook server-side weigeren.
  if (isMicrosoftHost(smtpHostRaw)) {
    return NextResponse.json({ error: MICROSOFT_MSG }, { status: 400 })
  }

  // Poort beperkt tot {465, 587}.
  const smtpPort = typeof portRaw === 'number' ? portRaw : Number(portRaw)
  if (!Number.isInteger(smtpPort) || !ALLOWED_PORTS.includes(smtpPort as 465 | 587)) {
    return NextResponse.json(
      { error: 'Kies poort 465 (SSL) of 587 (STARTTLS).' },
      { status: 400 },
    )
  }

  // Beveiliging.
  if (securityRaw !== 'ssl' && securityRaw !== 'starttls') {
    return NextResponse.json(
      { error: 'Kies SSL of STARTTLS als beveiliging.' },
      { status: 400 },
    )
  }

  // Reply-to indien aanwezig: geldig e-mailadres.
  if (replyToRaw && !isValidEmail(replyToRaw)) {
    return NextResponse.json(
      { error: 'Het reply-to-adres is geen geldig e-mailadres.' },
      { status: 400 },
    )
  }

  // Deterministische poort/security-afdwinging (sectie 6.1):
  // 465 => ssl/secure, 587 => starttls/requireTLS. Een inconsistente
  // combinatie wordt stil naar de poort-conforme waarde gecorrigeerd zodat
  // de bot later geen verkeerde security leest.
  const security: Security = smtpPort === 465 ? 'ssl' : 'starttls'
  const secure = security === 'ssl'
  const requireTLS = security === 'starttls'

  const senderName = senderNameRaw || emailRaw
  const replyTo = replyToRaw || emailRaw // reply-to-default (6.6): nooit eigenaar_email.

  // Bewerken zonder wachtwoord (sectie 6.5): leeg wachtwoord -> hergebruik het
  // bestaande versleutelde wachtwoord (decrypt), verifieer alsnog en werk de
  // metadata bij. Anders: het meegegeven wachtwoord, dat na succes versleuteld
  // wordt opgeslagen.
  let plainPassword = passwordRaw
  let reuseEncrypted: string | null = null
  if (!plainPassword) {
    const existing = await getRawEmailConnection(tenantId)
    if (!existing) {
      return NextResponse.json(
        { error: 'Vul een wachtwoord in om de koppeling te maken.' },
        { status: 400 },
      )
    }
    reuseEncrypted = existing.smtp_password_encrypted
    try {
      plainPassword = decryptToken(existing.smtp_password_encrypted)
    } catch {
      // Ontsleutelen van het bewaarde wachtwoord faalt (sleutel gewijzigd o.i.d.).
      // Geen err-object loggen, dit kan gevoelige inhoud bevatten.
      console.error('[email/connect] decrypt van bewaard wachtwoord faalde')
      return NextResponse.json(
        { error: 'Het bewaarde wachtwoord kon niet worden gelezen. Vul het wachtwoord opnieuw in.' },
        { status: 400 },
      )
    }
  }

  // Rate-limit per tenant (na validatie zodat een foute body geen quota slurpt).
  if (isRateLimited(tenantId)) {
    return NextResponse.json(
      { error: 'Te veel pogingen. Wacht even en probeer het later opnieuw.' },
      { status: 429 },
    )
  }

  // Echte SMTP-verificatie + proefmail naar het eigen adres, met expliciete
  // timeouts zodat verify() tegen een verkeerde host snel faalt (ETIMEDOUT)
  // in plaats van de route te laten hangen.
  const transporter = nodemailer.createTransport({
    host: smtpHostRaw,
    port: smtpPort,
    secure,
    requireTLS,
    auth: { user: emailRaw, pass: plainPassword },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  })

  try {
    await transporter.verify()
    await transporter.sendMail({
      from: `${senderName} <${emailRaw}>`,
      to: emailRaw,
      replyTo,
      subject: 'Frontlix e-mailkoppeling getest',
      text: 'Dit is een testmail. Je e-mailkoppeling in Frontlix werkt. Je offertes worden voortaan vanuit dit adres verstuurd.',
    })
  } catch (err) {
    logSmtpFailure(err)
    return NextResponse.json({ error: mapSmtpError(err) }, { status: 400 })
  } finally {
    transporter.close()
  }

  // Pas bij succes opslaan. Bij de bewerk-flow hergebruiken we het bestaande
  // versleutelde wachtwoord, anders versleutelen we het meegegeven wachtwoord.
  const smtpPasswordEncrypted = reuseEncrypted ?? encryptToken(plainPassword)

  try {
    await saveEmailConnection({
      tenantId,
      provider,
      smtpHost: smtpHostRaw,
      smtpPort,
      security,
      email: emailRaw,
      smtpPasswordEncrypted,
      senderName,
      replyTo: replyToRaw || null,
    })
  } catch {
    // Geen err-object loggen (kan velden meedragen). Korte melding terug.
    console.error('[email/connect] opslaan e-mailkoppeling faalde')
    return NextResponse.json(
      { error: 'De test slaagde, maar opslaan mislukte. Probeer het opnieuw.' },
      { status: 500 },
    )
  }

  // Wachtwoord wordt NOOIT teruggestuurd.
  return NextResponse.json({
    connected: true,
    email: emailRaw,
    sender_name: senderName,
    test_passed_at: new Date().toISOString(),
  })
}
