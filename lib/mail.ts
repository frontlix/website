import nodemailer from 'nodemailer'

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
    subject: 'Bedankt voor je bericht — Frontlix',
    html: `
<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"></head>
<body style="margin: 0; padding: 0; background-color: #F0F2F5; font-family: 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F0F2F5; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width: 560px; width: 100%;">

          <!-- Header met logo + tekst -->
          <tr>
            <td style="background-color: #FFFFFF; border-radius: 16px 16px 0 0; padding: 32px 40px; text-align: center; border-bottom: 1px solid #F0F0F0;">
              <img src="https://frontlix.com/logo.png" alt="Frontlix" width="48" style="display: inline-block; max-width: 48px; height: auto; vertical-align: middle;" />
              <span style="display: inline-block; vertical-align: middle; margin-left: 12px; font-size: 22px; font-weight: 700; color: #1A1A1A; letter-spacing: -0.3px;">Frontlix</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color: #FFFFFF; padding: 40px;">
              <h2 style="margin: 0 0 8px; color: #1A1A1A; font-size: 20px; font-weight: 700;">Hoi ${naam},</h2>
              <p style="margin: 0 0 20px; color: #555555; font-size: 15px; line-height: 1.7;">
                Bedankt voor je bericht! We hebben je aanvraag ontvangen en nemen zo snel mogelijk contact met je op.
              </p>

              <!-- Wat kun je verwachten -->
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

              <!-- CTA knoppen -->
              <table cellpadding="0" cellspacing="0" style="margin: 0 0 8px;">
                <tr>
                  <td style="padding-right: 12px;">
                    <a href="https://wa.me/31624752476" style="display: inline-block; background: linear-gradient(135deg, #1A56FF, #00CFFF); color: #FFFFFF; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 8px;">WhatsApp ons</a>
                  </td>
                  <td>
                    <a href="mailto:info@frontlix.com" style="display: inline-block; background-color: #FFFFFF; color: #1A56FF; text-decoration: none; font-size: 14px; font-weight: 600; padding: 11px 24px; border-radius: 8px; border: 1px solid #1A56FF;">Stuur een e-mail</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
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
                <a href="tel:+31624752476" style="color: #1A56FF; text-decoration: none; font-size: 12px; white-space: nowrap;">+31&nbsp;6&nbsp;24752476</a>
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
