import nodemailer from 'nodemailer'
import { getDashboardAdmin } from './dashboard/supabase-admin'
import { decryptToken } from './crypto/calendar-token'

// Lazy initialisatie zodat build niet faalt zonder env vars
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
      socketTimeout: 10000,
    })
  }
  return _transporter
}

/**
 * Bouwt een nodemailer-transporter uit de per-tenant e-mailkoppeling
 * (email_connections). null als de tenant geen koppeling heeft -> caller valt
 * terug op de Frontlix-env-transporter (getTransporter) of slaat over.
 * Niet cachen: SMTP-creds verschillen per tenant.
 *
 * NB: sendNotification/sendConfirmation/sendLeadCheckAnalysis hieronder zijn
 * Frontlix' EIGEN marketing-intake en blijven bewust op de globale env. Het
 * dashboard-offertepad (manual-offerte-actions.ts) gebruikt al
 * getActiveEmailConnectionForSend + sendOfferteMail; createTenantTransporter is
 * voor toekomstige per-tenant systeemmails.
 */
export async function createTenantTransporter(
  tenantId: string
): Promise<nodemailer.Transporter | null> {
  try {
    const { data } = await getDashboardAdmin()
      .from('email_connections')
      .select('smtp_host, smtp_port, security, email_adres, smtp_password_encrypted')
      .eq('tenant_id', tenantId)
      .maybeSingle()
    if (!data) return null
    return nodemailer.createTransport({
      host: data.smtp_host as string,
      port: data.smtp_port as number,
      secure: data.security === 'ssl',
      requireTLS: data.security === 'starttls',
      auth: {
        user: data.email_adres as string,
        pass: decryptToken(data.smtp_password_encrypted as string),
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    })
  } catch (e) {
    console.error('[mail] tenant-transporter faalde:', e)
    return null
  }
}

export async function sendNotification(subject: string, html: string) {
  const transporter = getTransporter()
  await transporter.sendMail({
    from: `Frontlix <${process.env.MAIL_USER}>`,
    to: process.env.MAIL_USER,
    subject,
    html,
  })
}

/** Stuurt een bevestigingsmail naar de klant na het invullen van een formulier */
export async function sendConfirmation(to: string, naam: string) {
  const transporter = getTransporter()
  await transporter.sendMail({
    from: `Frontlix <${process.env.MAIL_USER}>`,
    to,
    subject: 'Bedankt voor je bericht | Frontlix',
    html: `
<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"></head>
<body style="margin: 0; padding: 0; background-color: #F0F2F5; font-family: 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F0F2F5; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width: 560px; width: 100%;">
          <tr>
            <td style="background-color: #FFFFFF; border-radius: 16px 16px 0 0; padding: 32px 40px; text-align: center; border-bottom: 1px solid #F0F0F0;">
              <img src="https://frontlix.com/logo.png" alt="Frontlix" width="48" style="display: inline-block; max-width: 48px; height: auto; vertical-align: middle;" />
              <span style="display: inline-block; vertical-align: middle; margin-left: 12px; font-size: 22px; font-weight: 700; color: #1A1A1A; letter-spacing: -0.3px;">Frontlix</span>
            </td>
          </tr>
          <tr>
            <td style="background-color: #FFFFFF; padding: 40px;">
              <h2 style="margin: 0 0 8px; color: #1A1A1A; font-size: 20px; font-weight: 700;">Hoi ${naam},</h2>
              <p style="margin: 0 0 20px; color: #555555; font-size: 15px; line-height: 1.7;">
                Bedankt voor je bericht! We hebben je aanvraag ontvangen en nemen zo snel mogelijk contact met je op.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F5F7FA; border-radius: 12px; padding: 0; margin: 0 0 24px;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <p style="margin: 0 0 12px; color: #1A1A1A; font-size: 14px; font-weight: 600;">Wat kun je verwachten?</p>
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 4px 10px 4px 0; vertical-align: top; color: #1A56FF; font-size: 14px;">&#10003;</td>
                        <td style="padding: 4px 0; color: #555555; font-size: 14px; line-height: 1.5;">We reageren binnen 24 uur op werkdagen</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 10px 4px 0; vertical-align: top; color: #1A56FF; font-size: 14px;">&#10003;</td>
                        <td style="padding: 4px 0; color: #555555; font-size: 14px; line-height: 1.5;">Vrijblijvend adviesgesprek over jouw project</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 10px 4px 0; vertical-align: top; color: #1A56FF; font-size: 14px;">&#10003;</td>
                        <td style="padding: 4px 0; color: #555555; font-size: 14px; line-height: 1.5;">Een helder voorstel op maat</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 24px; color: #555555; font-size: 15px; line-height: 1.7;">
                Heb je in de tussentijd vragen? Neem gerust contact op!
              </p>
              <table cellpadding="0" cellspacing="0" style="margin: 0 0 8px;">
                <tr>
                  <td style="padding-right: 12px;">
                    <a href="https://wa.me/31624965270" style="display: inline-block; background: linear-gradient(135deg, #1A56FF, #00CFFF); color: #FFFFFF; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 8px;">WhatsApp ons</a>
                  </td>
                  <td>
                    <a href="mailto:info@frontlix.com" style="display: inline-block; background-color: #FFFFFF; color: #1A56FF; text-decoration: none; font-size: 14px; font-weight: 600; padding: 11px 24px; border-radius: 8px; border: 1px solid #1A56FF;">Stuur een e-mail</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #F5F7FA; border-radius: 0 0 16px 16px; padding: 24px 40px; text-align: center;">
              <p style="margin: 0 0 4px; color: #1A1A1A; font-size: 14px; font-weight: 600;">Team Frontlix</p>
              <p style="margin: 0 0 16px; color: #555555; font-size: 13px;">Wij bouwen websites en automatisering die werken.</p>
              <p style="margin: 0 0 4px;">
                <a href="https://frontlix.com" style="color: #1A56FF; text-decoration: none; font-size: 12px;">frontlix.com</a>
              </p>
              <p style="margin: 0 0 4px;">
                <a href="mailto:info@frontlix.com" style="color: #1A56FF; text-decoration: none; font-size: 12px;">info@frontlix.com</a>
              </p>
              <p style="margin: 0;">
                <a href="tel:+31624965270" style="color: #1A56FF; text-decoration: none; font-size: 12px; white-space: nowrap;">+31&nbsp;6&nbsp;24965270</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  })
}

/** Stuurt de lead-check-analyse naar de invuller (zelfde visuele stijl als sendConfirmation). */
export async function sendLeadCheckAnalysis(
  to: string,
  data: {
    score: number
    gemisteKlantenMaand: number
    omzetMaandLaag: string
    omzetMaandHoog: string
    omzetJaarLaag: string
    omzetJaarHoog: string
    punten: string[]
  }
) {
  const transporter = getTransporter()
  const puntenHtml = data.punten
    .map(
      (p) => `
      <tr>
        <td style="padding: 4px 10px 4px 0; vertical-align: top; color: #1A56FF; font-size: 14px;">&#10003;</td>
        <td style="padding: 4px 0; color: #555555; font-size: 14px; line-height: 1.5;">${p}</td>
      </tr>`
    )
    .join('')

  await transporter.sendMail({
    from: `Frontlix <${process.env.MAIL_USER}>`,
    to,
    subject: `Je lead-lek-analyse: score ${data.score} van 100 | Frontlix`,
    html: `
<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"></head>
<body style="margin: 0; padding: 0; background-color: #F0F2F5; font-family: 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F0F2F5; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width: 560px; width: 100%;">
          <tr>
            <td style="background-color: #FFFFFF; border-radius: 16px 16px 0 0; padding: 32px 40px; text-align: center; border-bottom: 1px solid #F0F0F0;">
              <img src="https://frontlix.com/logo.png" alt="Frontlix" width="48" style="display: inline-block; max-width: 48px; height: auto; vertical-align: middle;" />
              <span style="display: inline-block; vertical-align: middle; margin-left: 12px; font-size: 22px; font-weight: 700; color: #1A1A1A; letter-spacing: -0.3px;">Frontlix</span>
            </td>
          </tr>
          <tr>
            <td style="background-color: #FFFFFF; padding: 40px;">
              <h2 style="margin: 0 0 8px; color: #1A1A1A; font-size: 20px; font-weight: 700;">Je lead-lek-analyse</h2>
              <p style="margin: 0 0 20px; color: #555555; font-size: 15px; line-height: 1.7;">
                Je lek-score is <strong style="color: #1A56FF;">${data.score} van 100</strong>.
                Op basis van je antwoorden schatten we dat je ongeveer ${data.gemisteKlantenMaand} klanten per maand misloopt.
                Dat komt neer op een indicatie van ${data.omzetMaandLaag} tot ${data.omzetMaandHoog} per maand,
                ofwel ${data.omzetJaarLaag} tot ${data.omzetJaarHoog} per jaar.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F5F7FA; border-radius: 12px; margin: 0 0 24px;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <p style="margin: 0 0 12px; color: #1A1A1A; font-size: 14px; font-weight: 600;">Jouw 3 concrete tips</p>
                    <table cellpadding="0" cellspacing="0">${puntenHtml}</table>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 8px; color: #555555; font-size: 13px; line-height: 1.6;">
                Dit is een eerlijke schatting met conservatieve aannames, geen belofte. We rekenen met het gegeven dat
                78% van de klanten kiest voor het bedrijf dat als eerste reageert.
              </p>
              <p style="margin: 0 0 24px; color: #555555; font-size: 15px; line-height: 1.7;">
                Zo dicht je dit lek: Frontlix reageert binnen 60 seconden op elke aanvraag, dag en nacht, en zet je offerte automatisch klaar.
              </p>
              <a href="https://frontlix.com/contact" style="display: inline-block; background: linear-gradient(135deg, #1A56FF, #00CFFF); color: #FFFFFF; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 8px;">Plan een vrijblijvende demo</a>
            </td>
          </tr>
          <tr>
            <td style="background-color: #F5F7FA; border-radius: 0 0 16px 16px; padding: 24px 40px; text-align: center;">
              <p style="margin: 0 0 4px; color: #1A1A1A; font-size: 14px; font-weight: 600;">Team Frontlix</p>
              <p style="margin: 0;">
                <a href="https://frontlix.com" style="color: #1A56FF; text-decoration: none; font-size: 12px;">frontlix.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  })
}
