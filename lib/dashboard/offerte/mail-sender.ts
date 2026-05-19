/**
 * Verstuur de offerte als e-mail met PDF-bijlage. Voor nu één modus:
 * mail gaat vanaf MAIL_USER (Frontlix) met reply-to = eigenaar_email
 * uit tenant_settings (fallback MAIL_USER). Tenant-config voor SMTP
 * per bedrijf komt in een latere phase.
 *
 * Server-only — importeert nodemailer + puppeteer (via pdf-renderer).
 */

import nodemailer from 'nodemailer'

export type OfferteMailInput = {
  toEmail: string
  klantNaam: string
  bedrijfsnaam: string
  offertenummer: string
  totaalIncl: number
  notitie: string | null
  pdfBuffer: Buffer
  replyTo: string | null
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
 * Bouwt de e-mail HTML-body. Strak en kort: groet + de notitie (als
 * gevuld) + verwijzing naar de bijlage. Geen sales-fluff — dit is een
 * professionele offerte-mail.
 */
function buildMailHtml(input: OfferteMailInput): string {
  const groet = `Beste ${escapeHtml(input.klantNaam.split(' ')[0] || input.klantNaam)},`
  const notitieBlock = input.notitie
    ? `<p style="margin:0 0 18px;color:#1a1a1a;line-height:1.55;white-space:pre-wrap;">${escapeHtml(input.notitie)}</p>`
    : `<p style="margin:0 0 18px;color:#1a1a1a;line-height:1.55;">Hierbij de offerte zoals besproken. Laat het me weten als je vragen hebt of als je akkoord wilt geven — je hoort het wel.</p>`

  return `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:#f4f6fa;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1a1a1a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fa;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;">
        <tr><td style="padding:32px 36px 8px;">
          <p style="margin:0 0 16px;font-size:15px;font-weight:600;">${groet}</p>
          ${notitieBlock}
          <table cellpadding="0" cellspacing="0" style="margin:8px 0 20px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;width:100%;">
            <tr><td style="padding:14px 16px;">
              <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#003F8A;">Offerte</p>
              <p style="margin:0;font-size:13px;color:#4b5563;">Nr. <strong>${escapeHtml(input.offertenummer)}</strong></p>
              <p style="margin:6px 0 0;font-size:13px;color:#4b5563;">Totaal incl. BTW: <strong>${formatCurrency(input.totaalIncl)}</strong></p>
            </td></tr>
          </table>
          <p style="margin:0 0 18px;color:#4b5563;font-size:13px;line-height:1.55;">
            De volledige offerte vind je als PDF-bijlage bij deze mail.
          </p>
          <p style="margin:0;color:#4b5563;font-size:13px;line-height:1.55;">
            Met vriendelijke groet,<br/><strong style="color:#1a1a1a;">${escapeHtml(input.bedrijfsnaam)}</strong>
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
 * etc.) — caller bepaalt of dit een blocker is of niet.
 */
export async function sendOfferteMail(input: OfferteMailInput): Promise<OfferteMailResult> {
  if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
    return { ok: false, error: 'Mail niet geconfigureerd (MAIL_USER/MAIL_PASS).' }
  }

  try {
    const transporter = getTransporter()
    const info = await transporter.sendMail({
      from: `${input.bedrijfsnaam} <${process.env.MAIL_USER}>`,
      to: input.toEmail,
      replyTo: input.replyTo || process.env.MAIL_USER,
      subject: `Offerte ${input.offertenummer} — ${input.bedrijfsnaam}`,
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
    console.error('[sendOfferteMail] failed:', err)
    return { ok: false, error: `Mail versturen mislukt: ${msg}` }
  }
}
