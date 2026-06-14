/**
 * Verstuur de offerte als e-mail met PDF-bijlage. Voor nu één modus:
 * mail gaat vanaf MAIL_USER (Frontlix) met reply-to = eigenaar_email
 * uit tenant_settings (fallback MAIL_USER). Tenant-config voor SMTP
 * per bedrijf komt in een latere phase.
 *
 * Server-only, importeert nodemailer + puppeteer (via pdf-renderer).
 */

import { createHash } from 'crypto'
import nodemailer from 'nodemailer'

/**
 * Per-bedrijf SMTP-config voor verzending vanuit het gekoppelde adres.
 * Aanwezig in OfferteMailInput → verstuur via deze transporter en From;
 * afwezig → val terug op de Frontlix-env-transporter.
 */
export type OfferteSmtpConfig = {
  host: string
  port: number
  secure: boolean
  requireTLS: boolean
  user: string
  pass: string
}

export type OfferteMailInput = {
  toEmail: string
  klantNaam: string
  bedrijfsnaam: string
  offertenummer: string
  totaalIncl: number
  notitie: string | null
  pdfBuffer: Buffer
  replyTo: string | null
  // Per-bedrijf koppeling (optioneel). Aanwezig → verstuur vanuit dit adres.
  smtpConfig?: OfferteSmtpConfig
  fromEmail?: string
  senderName?: string
}

export type OfferteMailResult =
  | { ok: true; messageId: string }
  | { ok: false; error: string }

let _transporter: nodemailer.Transporter | null = null
function getTransporter(): nodemailer.Transporter {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST || 'smtp.hostinger.com',
      port: Number(process.env.MAIL_PORT) || 465,
      secure: true,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 30000,
    })
  }
  return _transporter
}

/**
 * Per-config gecachte transporters voor gekoppelde adressen. De cache-sleutel
 * bevat de hash van het (ontsleutelde) wachtwoord, zodat na een wachtwoord-
 * wijziging (zelfde host/port/user) niet de oude transporter met oude creds
 * blijft plakken zolang het proces leeft.
 */
const _tenantTransporters = new Map<string, nodemailer.Transporter>()

function getTenantTransporter(config: OfferteSmtpConfig): nodemailer.Transporter {
  const passHash = createHash('sha256').update(config.pass).digest('hex')
  const key = `${config.host}|${config.port}|${config.secure}|${config.user}|${passHash}`
  let transporter = _tenantTransporters.get(key)
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      requireTLS: config.requireTLS,
      auth: {
        user: config.user,
        pass: config.pass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 30000,
    })
    _tenantTransporters.set(key, transporter)
  }
  return transporter
}

function formatCurrency(amount: number): string {
  return `€ ${amount.toFixed(2).replace('.', ',')}`
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Bouwt de e-mail HTML-body in de toon van de Schoon Straatje-assistent
 * (dezelfde teksten als de bot, zodat de klant overal dezelfde stijl ziet):
 * "Goed nieuws, [voornaam]!" → offerte staat klaar → PDF-bijlage → "Met
 * vriendelijke groet, Team [Bedrijf]" → algemene voorwaarden. Een ingevuld
 * persoonlijk bericht (notitie) komt in de plaats van de standaard-introtekst.
 */
function buildMailHtml(input: OfferteMailInput): string {
  const voornaam = escapeHtml(input.klantNaam.split(' ')[0] || input.klantNaam)
  const introBlock = input.notitie
    ? `<p style="margin:0 0 18px;color:#1a1a1a;line-height:1.55;white-space:pre-wrap;">${escapeHtml(input.notitie)}</p>`
    : `<p style="margin:0 0 18px;color:#1a1a1a;line-height:1.55;">Uw offerte is opgesteld en staat voor u klaar. In de bijlage van deze e-mail vindt u uw persoonlijke offerte.</p>`

  return `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:#f4f6fa;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1a1a1a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fa;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;">
        <tr><td style="padding:32px 36px 8px;">
          <p style="margin:0 0 16px;font-size:15px;font-weight:600;">Goed nieuws, ${voornaam}!</p>
          ${introBlock}
          <table cellpadding="0" cellspacing="0" style="margin:8px 0 20px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;width:100%;">
            <tr><td style="padding:14px 16px;">
              <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#003F8A;">Offerte</p>
              <p style="margin:0;font-size:13px;color:#4b5563;">Nr. <strong>${escapeHtml(input.offertenummer)}</strong></p>
              <p style="margin:6px 0 0;font-size:13px;color:#4b5563;">Totaal incl. BTW: <strong>${formatCurrency(input.totaalIncl)}</strong></p>
            </td></tr>
          </table>
          <p style="margin:0 0 18px;color:#4b5563;font-size:13px;line-height:1.55;">
            De volledige offerte vindt u als PDF-bijlage bij deze e-mail.
          </p>
          <p style="margin:0 0 20px;color:#4b5563;font-size:13px;line-height:1.55;">
            Met vriendelijke groet,<br/><strong style="color:#1a1a1a;">Team ${escapeHtml(input.bedrijfsnaam)}</strong>
          </p>
          <p style="margin:0;color:#9ca3af;font-size:11.5px;line-height:1.5;border-top:1px solid #eef0f4;padding-top:14px;">
            Op deze offerte zijn onze algemene voorwaarden van toepassing:
            <a href="https://schoon-straatje.nl/algemene-voorwaarden/" style="color:#003F8A;">schoon-straatje.nl/algemene-voorwaarden</a>.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

/**
 * Verstuurt de offerte naar de klant. Returns ok:true bij geslaagde
 * verzending; ok:false bij fout (mail-server down, ongeldig e-mailadres
 * etc.), caller bepaalt of dit een blocker is of niet.
 */
export async function sendOfferteMail(input: OfferteMailInput): Promise<OfferteMailResult> {
  if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
    return { ok: false, error: 'Mail niet geconfigureerd (MAIL_USER/MAIL_PASS).' }
  }

  try {
    // Gekoppeld adres aanwezig → eigen transporter en From; anders de
    // Frontlix-env-transporter en het huidige From-gedrag. Timeouts blijven
    // in beide takken behouden (getTenantTransporter / getTransporter).
    const transporter = input.smtpConfig
      ? getTenantTransporter(input.smtpConfig)
      : getTransporter()
    const fromAddress = input.smtpConfig
      ? `${input.senderName || input.bedrijfsnaam} <${input.fromEmail}>`
      : `${input.bedrijfsnaam} <${process.env.MAIL_USER}>`
    const info = await transporter.sendMail({
      from: fromAddress,
      to: input.toEmail,
      replyTo: input.replyTo || process.env.MAIL_USER,
      subject: `Uw offerte — ${input.bedrijfsnaam}`,
      html: buildMailHtml(input),
      attachments: [
        {
          filename: `offerte-${input.offertenummer}.pdf`,
          content: input.pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    })
    return { ok: true, messageId: info.messageId }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'onbekend'
    // Logging-hardening (sectie 10/6.1): log alleen err.code/err.responseCode,
    // nooit het err-object zelf, want nodemailer-fouten kunnen credentials
    // (auth.pass) meedragen op err.response/err.command.
    const e = err as { code?: string; responseCode?: number }
    console.error('[sendOfferteMail] failed:', {
      code: e?.code,
      responseCode: e?.responseCode,
    })
    return { ok: false, error: `Mail versturen mislukt: ${msg}` }
  }
}
