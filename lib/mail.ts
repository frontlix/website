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
                    <a href="https://wa.me/31624965270" style="display: inline-block; background: linear-gradient(135deg, #1A56FF, #00CFFF); color: #FFFFFF; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 8px;">WhatsApp ons</a>
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

/**
 * Stuurt een goedkeurings-e-mail voor de NIEUWE branche-flow.
 * Een mail per branche met de juiste klant- + offerte-info.
 */
export async function sendBrancheApprovalEmail(
  to: string,
  data: {
    naam: string
    telefoon: string
    email: string
    brancheLabel: string
    /** Lijst van label/value paren uit collected_data, in volgorde */
    fields: { label: string; value: string }[]
    /** Prijslijnen voor in de e-mail tabel */
    priceLines: { omschrijving: string; totaal: number }[]
    subtotaal: number
    btw: number
    totaal: number
    approveUrl: string
    /** URL naar de edit-pagina (token-based, zelfde token als approve) */
    editUrl: string
  }
) {
  const transporter = getTransporter()
  const fieldsHtml = data.fields
    .map(
      (f) =>
        `<tr><td style="padding: 4px 16px 4px 0; font-weight: 600; color: #1A1A1A;">${f.label}:</td><td style="padding: 4px 0;">${f.value}</td></tr>`
    )
    .join('')

  const priceLinesHtml = data.priceLines
    .map(
      (l) =>
        `<tr><td style="padding: 4px 16px 4px 0;">${l.omschrijving}</td><td style="padding: 4px 0; text-align: right;">&euro;${l.totaal.toFixed(2).replace('.', ',')}</td></tr>`
    )
    .join('')

  await transporter.sendMail({
    from: `Frontlix Demo <${process.env.MAIL_USER}>`,
    to,
    subject: `Offerte ter goedkeuring — ${data.brancheLabel} — ${data.naam}`,
    html: `
<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"></head>
<body style="margin: 0; padding: 0; background-color: #F0F2F5; font-family: 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F0F2F5; padding: 40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
        <tr><td style="background: linear-gradient(135deg, #1A56FF, #00CFFF); border-radius: 16px 16px 0 0; padding: 32px 40px; text-align: center;">
          <span style="font-size: 22px; font-weight: 700; color: #FFFFFF;">Nieuwe ${data.brancheLabel}-offerte ter goedkeuring</span>
        </td></tr>
        <tr><td style="background-color: #FFFFFF; padding: 40px;">
          <p style="margin: 0 0 8px; color: #555555; font-size: 15px; line-height: 1.7;">
            Er is een nieuwe offerte opgesteld via de WhatsApp-demo. Controleer de gegevens en klik onderaan op "Offerte goedkeuren" om de PDF naar de klant te sturen.
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F5F7FA; border-radius: 12px; margin: 24px 0;">
            <tr><td style="padding: 20px 24px;">
              <p style="margin: 0 0 12px; color: #1A1A1A; font-size: 14px; font-weight: 600;">Klantgegevens</p>
              <table cellpadding="0" cellspacing="0" style="font-size: 14px; color: #555555;">
                <tr><td style="padding: 4px 16px 4px 0; font-weight: 600; color: #1A1A1A;">Naam:</td><td style="padding: 4px 0;">${data.naam}</td></tr>
                <tr><td style="padding: 4px 16px 4px 0; font-weight: 600; color: #1A1A1A;">Telefoon:</td><td style="padding: 4px 0;">+${data.telefoon}</td></tr>
                <tr><td style="padding: 4px 16px 4px 0; font-weight: 600; color: #1A1A1A;">Email:</td><td style="padding: 4px 0;">${data.email}</td></tr>
              </table>
            </td></tr>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F5F7FA; border-radius: 12px; margin: 0 0 24px;">
            <tr><td style="padding: 20px 24px;">
              <p style="margin: 0 0 12px; color: #1A1A1A; font-size: 14px; font-weight: 600;">Aanvraag details</p>
              <table cellpadding="0" cellspacing="0" style="font-size: 14px; color: #555555;">
                ${fieldsHtml}
              </table>
            </td></tr>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F5F7FA; border-radius: 12px; margin: 0 0 32px;">
            <tr><td style="padding: 20px 24px;">
              <p style="margin: 0 0 12px; color: #1A1A1A; font-size: 14px; font-weight: 600;">Prijsopbouw</p>
              <table cellpadding="0" cellspacing="0" style="font-size: 14px; color: #555555; width: 100%;">
                ${priceLinesHtml}
                <tr><td style="padding: 8px 16px 4px 0; border-top: 1px solid #E5E7EB;">Subtotaal excl. BTW</td><td style="padding: 8px 0 4px; text-align: right; border-top: 1px solid #E5E7EB;">&euro;${data.subtotaal.toFixed(2).replace('.', ',')}</td></tr>
                <tr><td style="padding: 4px 16px 4px 0;">BTW (21%)</td><td style="padding: 4px 0; text-align: right;">&euro;${data.btw.toFixed(2).replace('.', ',')}</td></tr>
                <tr><td style="padding: 8px 16px 4px 0; font-weight: 700; font-size: 16px; color: #1A1A1A;">Totaal incl. BTW</td><td style="padding: 8px 0; font-weight: 700; font-size: 16px; color: #1A1A1A; text-align: right;">&euro;${data.totaal.toFixed(2).replace('.', ',')}</td></tr>
              </table>
            </td></tr>
          </table>

          <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
            <tr>
              <td align="center" style="border-radius: 10px; background-color: #FFFFFF; border: 2px solid #1A56FF; padding: 0;">
                <a href="${data.editUrl}" style="display: inline-block; padding: 14px 32px; font-size: 15px; font-weight: 700; color: #1A56FF; text-decoration: none; border-radius: 8px;">Wijzigen</a>
              </td>
              <td style="width: 12px;">&nbsp;</td>
              <td align="center" style="border-radius: 10px; background-color: #16a34a;">
                <a href="${data.approveUrl}" style="display: inline-block; padding: 16px 32px; font-size: 15px; font-weight: 700; color: #FFFFFF; text-decoration: none; border-radius: 10px;">Offerte goedkeuren</a>
              </td>
            </tr>
          </table>

          <p style="margin: 24px 0 0; color: #888888; font-size: 13px; text-align: center; line-height: 1.6;">
            Klik op <strong>Wijzigen</strong> om de gegevens of prijzen aan te passen voor je goedkeurt.<br>
            Bij goedkeuring wordt de PDF automatisch naar de klant verzonden via WhatsApp en stelt de bot afspraakmomenten voor.
          </p>
        </td></tr>
        <tr><td style="background-color: #F5F7FA; border-radius: 0 0 16px 16px; padding: 20px 40px; text-align: center;">
          <p style="margin: 0; color: #888888; font-size: 12px;">Dit is een demo van het Frontlix automatiseringssysteem.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
    `,
  })
}

/**
 * Stuurt de klant-email NA goedkeuring van de offerte.
 * Bevat:
 *  - Korte tekst dat de offerte is opgesteld
 *  - PDF van de offerte als bijlage
 *  - Grote "Afspraak inplannen" knop die naar /api/demo-schedule?token=... linkt
 */
export async function sendCustomerQuoteEmail(
  to: string,
  data: {
    naam: string
    brancheLabel: string
    bedrijfsNaam: string
    pdfUrl: string
    pdfFilename: string
    scheduleUrl: string
  }
) {
  const transporter = getTransporter()
  const voornaam = data.naam.split(' ')[0]

  await transporter.sendMail({
    from: `${data.bedrijfsNaam} <${process.env.MAIL_USER}>`,
    to,
    subject: `Je offerte van ${data.bedrijfsNaam} staat klaar`,
    html: `
<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"></head>
<body style="margin: 0; padding: 0; background-color: #F0F2F5; font-family: 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F0F2F5; padding: 40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">

        <!-- Header -->
        <tr><td style="background: linear-gradient(135deg, #1A56FF, #00CFFF); border-radius: 16px 16px 0 0; padding: 36px 40px; text-align: center;">
          <span style="font-size: 24px; font-weight: 700; color: #FFFFFF; letter-spacing: -0.3px;">Je offerte staat klaar</span>
        </td></tr>

        <!-- Body -->
        <tr><td style="background-color: #FFFFFF; padding: 40px;">
          <h2 style="margin: 0 0 8px; color: #1A1A1A; font-size: 20px; font-weight: 700;">Hoi ${voornaam},</h2>
          <p style="margin: 0 0 20px; color: #555555; font-size: 15px; line-height: 1.7;">
            Bedankt voor je interesse in ${data.brancheLabel.toLowerCase()}. We hebben je offerte opgesteld op basis van het gesprek dat we via WhatsApp hadden. Je vindt de PDF in de bijlage van deze e-mail.
          </p>
          <p style="margin: 0 0 28px; color: #555555; font-size: 15px; line-height: 1.7;">
            Wil je de offerte persoonlijk doorspreken? Plan dan een gratis kennismakingsgesprek van 30 minuten in op een moment dat jou uitkomt.
          </p>

          <!-- Afspraak knop -->
          <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
            <tr><td align="center" style="border-radius: 12px; background: linear-gradient(135deg, #1A56FF, #00CFFF);">
              <a href="${data.scheduleUrl}" style="display: inline-block; padding: 18px 44px; font-size: 16px; font-weight: 700; color: #FFFFFF; text-decoration: none; border-radius: 12px;">Afspraak inplannen</a>
            </td></tr>
          </table>

          <p style="margin: 28px 0 0; color: #888888; font-size: 13px; text-align: center; line-height: 1.6;">
            Je kiest direct een tijdslot uit onze agenda — geen heen-en-weer mailen.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background-color: #F5F7FA; border-radius: 0 0 16px 16px; padding: 24px 40px; text-align: center;">
          <p style="margin: 0 0 6px; color: #1A1A1A; font-size: 14px; font-weight: 600;">${data.bedrijfsNaam}</p>
          <p style="margin: 0; color: #888888; font-size: 12px;">Heb je een vraag? Reageer gewoon op deze e-mail.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
    `,
    attachments: [
      {
        filename: data.pdfFilename,
        path: data.pdfUrl,
        contentType: 'application/pdf',
      },
    ],
  })
}

/** Stuurt een goedkeurings-e-mail voor de demo-offerte */
export async function sendApprovalEmail(
  to: string,
  data: {
    naam: string
    telefoon: string
    email: string
    type_pand: string
    m2: string
    steentype: string
    planten: string
    pricePerM2: number
    base: number
    surcharge: number
    total: number
    approveUrl: string
  }
) {
  const transporter = getTransporter()
  await transporter.sendMail({
    from: `Frontlix Demo <${process.env.MAIL_USER}>`,
    to,
    subject: `Offerte ter goedkeuring — ${data.naam}`,
    html: `
<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"></head>
<body style="margin: 0; padding: 0; background-color: #F0F2F5; font-family: 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F0F2F5; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1A56FF, #00CFFF); border-radius: 16px 16px 0 0; padding: 32px 40px; text-align: center;">
              <span style="font-size: 22px; font-weight: 700; color: #FFFFFF; letter-spacing: -0.3px;">Nieuwe offerte ter goedkeuring</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color: #FFFFFF; padding: 40px;">
              <p style="margin: 0 0 8px; color: #555555; font-size: 15px; line-height: 1.7;">
                Er is een nieuwe offerte opgesteld en klaar voor interne controle.
              </p>

              <!-- Klantgegevens -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F5F7FA; border-radius: 12px; margin: 24px 0;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <p style="margin: 0 0 12px; color: #1A1A1A; font-size: 14px; font-weight: 600;">Klantgegevens</p>
                    <table cellpadding="0" cellspacing="0" style="font-size: 14px; color: #555555;">
                      <tr><td style="padding: 4px 16px 4px 0; font-weight: 600; color: #1A1A1A;">Naam:</td><td style="padding: 4px 0;">${data.naam}</td></tr>
                      <tr><td style="padding: 4px 16px 4px 0; font-weight: 600; color: #1A1A1A;">Telefoon:</td><td style="padding: 4px 0;">+${data.telefoon}</td></tr>
                      <tr><td style="padding: 4px 16px 4px 0; font-weight: 600; color: #1A1A1A;">Email:</td><td style="padding: 4px 0;">${data.email}</td></tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Offerte details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F5F7FA; border-radius: 12px; margin: 0 0 24px;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <p style="margin: 0 0 12px; color: #1A1A1A; font-size: 14px; font-weight: 600;">Offerte details</p>
                    <table cellpadding="0" cellspacing="0" style="font-size: 14px; color: #555555;">
                      <tr><td style="padding: 4px 16px 4px 0; font-weight: 600; color: #1A1A1A;">Type pand:</td><td style="padding: 4px 0;">${data.type_pand}</td></tr>
                      <tr><td style="padding: 4px 16px 4px 0; font-weight: 600; color: #1A1A1A;">Oppervlakte:</td><td style="padding: 4px 0;">${data.m2} m&sup2;</td></tr>
                      <tr><td style="padding: 4px 16px 4px 0; font-weight: 600; color: #1A1A1A;">Steentype:</td><td style="padding: 4px 0;">${data.steentype}</td></tr>
                      <tr><td style="padding: 4px 16px 4px 0; font-weight: 600; color: #1A1A1A;">Planten:</td><td style="padding: 4px 0;">${data.planten}</td></tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Prijsopbouw -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F5F7FA; border-radius: 12px; margin: 0 0 32px;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <p style="margin: 0 0 12px; color: #1A1A1A; font-size: 14px; font-weight: 600;">Prijsopbouw</p>
                    <table cellpadding="0" cellspacing="0" style="font-size: 14px; color: #555555;">
                      <tr><td style="padding: 4px 16px 4px 0;">Prijs per m&sup2;:</td><td style="padding: 4px 0;">&euro;${data.pricePerM2.toFixed(2)}</td></tr>
                      <tr><td style="padding: 4px 16px 4px 0;">Basisprijs (${data.m2} m&sup2;):</td><td style="padding: 4px 0;">&euro;${data.base.toFixed(2)}</td></tr>
                      ${data.surcharge > 0 ? `<tr><td style="padding: 4px 16px 4px 0;">Toeslag planten:</td><td style="padding: 4px 0;">&euro;${data.surcharge.toFixed(2)}</td></tr>` : ''}
                      <tr><td style="padding: 8px 16px 4px 0; font-weight: 700; font-size: 16px; color: #1A1A1A;">Totaalprijs:</td><td style="padding: 8px 0; font-weight: 700; font-size: 16px; color: #1A1A1A;">&euro;${data.total.toFixed(2)}</td></tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Goedkeuren button -->
              <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td align="center" style="border-radius: 10px; background-color: #16a34a;">
                    <a href="${data.approveUrl}" style="display: inline-block; padding: 16px 40px; font-size: 16px; font-weight: 700; color: #FFFFFF; text-decoration: none; border-radius: 10px;">
                      Offerte goedkeuren
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0; color: #888888; font-size: 13px; text-align: center; line-height: 1.6;">
                Bij goedkeuring wordt de offerte automatisch naar de klant verzonden via WhatsApp.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F5F7FA; border-radius: 0 0 16px 16px; padding: 20px 40px; text-align: center;">
              <p style="margin: 0; color: #888888; font-size: 12px;">Dit is een demo van het Frontlix automatiseringssysteem.</p>
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
