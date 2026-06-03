import type { NotificationEventType } from './types'

/**
 * Mail-templates voor notification-bezorging.
 *
 * Eén bouwer per event-type, bouwt subject + HTML + plain-text.
 * Hergebruikt de inline-CSS layout van lib/mail.ts (560px wrapper,
 * gradient CTA, footer met Frontlix-contact). Geen externe lib (React
 * Email etc.) zodat de mail-stack thin blijft.
 *
 * Variabelen komen uit de notification-rij (titel/body/payload) + een
 * `dashboardUrl` die naar het juiste lead-detail of dashboard-root wijst.
 */

export interface NotificationMailArgs {
  eventType: NotificationEventType
  /** Titel uit notifications.titel, gebruikt als email subject + H2. */
  titel: string
  /** Body uit notifications.body, eerste paragraaf in de mail. */
  body: string
  /** Optionele URL naar lead-detail of dashboard-root voor de CTA-knop. */
  dashboardUrl: string
  /** Optionele payload uit notifications.payload voor extra context. */
  payload?: Record<string, unknown>
}

export interface NotificationMail {
  subject: string
  html: string
  text: string
}

const BRAND_PRIMARY = '#1A56FF'
const BRAND_ACCENT = '#00CFFF'

/**
 * CTA-knop label per event, net iets specifieker dan generic "Bekijk".
 * Bekend pattern: actie-werkwoord + object.
 */
const CTA_LABEL: Record<NotificationEventType, string> = {
  nieuwe_lead: 'Bekijk lead',
  owner_review_nodig: 'Open review',
  klant_vraagt_korting: 'Open gesprek',
  offerte_goedgekeurd: 'Bekijk offerte',
  offerte_afgewezen: 'Bekijk lead',
  afspraak_ingepland: 'Open agenda',
  nieuwe_review: 'Bekijk review',
  dagelijkse_samenvatting: 'Open dashboard',
  template_goedgekeurd: 'Open instellingen',
  template_afgewezen: 'Open instellingen',
  template_notitie: 'Open instellingen',
}

/**
 * Korte event-label voor in de subject, sommige tools sorteren mails op
 * prefix, dus we beginnen met "[Frontlix]" + event om de inbox scanbaar
 * te houden.
 */
const EVENT_LABEL: Record<NotificationEventType, string> = {
  nieuwe_lead: 'Nieuwe lead',
  owner_review_nodig: 'Review nodig',
  klant_vraagt_korting: 'Onderhandeling',
  offerte_goedgekeurd: 'Akkoord',
  offerte_afgewezen: 'Afgewezen',
  afspraak_ingepland: 'Afspraak',
  nieuwe_review: 'Review ontvangen',
  dagelijkse_samenvatting: 'Dagrapport',
  template_goedgekeurd: 'Template OK',
  template_afgewezen: 'Template afgewezen',
  template_notitie: 'Template notitie',
}

export function buildNotificationMail(args: NotificationMailArgs): NotificationMail {
  const subject = `[Frontlix · ${EVENT_LABEL[args.eventType]}] ${args.titel}`
  const cta = CTA_LABEL[args.eventType]
  const html = renderHtml(args, cta)
  const text = renderText(args, cta)
  return { subject, html, text }
}

function renderHtml(args: NotificationMailArgs, cta: string): string {
  const extraRows = renderPayloadRows(args.eventType, args.payload)

  return `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#F0F2F5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F0F2F5;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <!-- Header -->
        <tr><td style="background-color:#FFFFFF;border-radius:16px 16px 0 0;padding:28px 40px;text-align:center;border-bottom:1px solid #F0F0F0;">
          <img src="https://frontlix.com/logo.png" alt="Frontlix" width="40" style="display:inline-block;max-width:40px;height:auto;vertical-align:middle;" />
          <span style="display:inline-block;vertical-align:middle;margin-left:10px;font-size:18px;font-weight:700;color:#1A1A1A;letter-spacing:-0.3px;">Frontlix Dashboard</span>
        </td></tr>

        <!-- Body -->
        <tr><td style="background-color:#FFFFFF;padding:36px 40px;">
          <div style="display:inline-block;font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:${BRAND_PRIMARY};margin-bottom:10px;">
            ${EVENT_LABEL[args.eventType]}
          </div>
          <h2 style="margin:0 0 12px;color:#1A1A1A;font-size:22px;font-weight:700;line-height:1.3;">
            ${escapeHtml(args.titel)}
          </h2>
          <p style="margin:0 0 24px;color:#555555;font-size:15px;line-height:1.7;">
            ${escapeHtml(args.body)}
          </p>

          ${extraRows}

          <!-- CTA -->
          <table cellpadding="0" cellspacing="0" style="margin:8px 0 0;">
            <tr><td>
              <a href="${escapeAttr(args.dashboardUrl)}" style="display:inline-block;background:linear-gradient(135deg,${BRAND_PRIMARY},${BRAND_ACCENT});color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:600;padding:13px 28px;border-radius:8px;">
                ${cta}
              </a>
            </td></tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background-color:#F5F7FA;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;">
          <p style="margin:0 0 6px;color:#555555;font-size:12px;">
            Je ontvangt deze mail omdat e-mail-notificaties aan staan voor dit event.
          </p>
          <p style="margin:0;color:#555555;font-size:12px;">
            <a href="https://app.frontlix.com/dashboard/instellingen?section=notificaties" style="color:${BRAND_PRIMARY};text-decoration:none;">Notificatie-voorkeuren wijzigen</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

/**
 * Extra context-rijen tussen body en CTA. Per event-type kiezen we welke
 * payload-velden zichtbaar zijn, voorkomt dat de mail vol met JSON-keys
 * komt te staan.
 */
function renderPayloadRows(
  eventType: NotificationEventType,
  payload?: Record<string, unknown>,
): string {
  if (!payload) return ''
  const rows: Array<{ label: string; value: string }> = []

  const prijs = payload.totaal_prijs
  if (typeof prijs === 'number' && prijs > 0) {
    rows.push({
      label: 'Offerte-bedrag',
      value: `€ ${Math.round(prijs).toLocaleString('nl-NL')}`,
    })
  }

  if (eventType === 'afspraak_ingepland') {
    const datum = payload.afspraak_datum
    const tijd = payload.afspraak_starttijd
    if (typeof datum === 'string') {
      const fmt = new Date(datum).toLocaleDateString('nl-NL', {
        weekday: 'long', day: 'numeric', month: 'long',
      })
      rows.push({ label: 'Datum', value: fmt })
    }
    if (typeof tijd === 'string') {
      rows.push({ label: 'Tijd', value: tijd })
    }
  }

  if (eventType === 'nieuwe_lead') {
    const cat = payload.hoofdcategorie
    if (typeof cat === 'string') {
      rows.push({ label: 'Categorie', value: cat })
    }
    const kanaal = payload.kanaal
    if (typeof kanaal === 'string') {
      rows.push({ label: 'Via', value: kanaal })
    }
  }

  if (rows.length === 0) return ''

  return `<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F7FA;border-radius:12px;margin:0 0 24px;">
    <tr><td style="padding:16px 20px;">
      ${rows.map((r) => `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:2px 0;">
          <tr>
            <td style="width:130px;color:#555555;font-size:13px;padding:3px 0;">${escapeHtml(r.label)}</td>
            <td style="color:#1A1A1A;font-size:13px;font-weight:600;padding:3px 0;">${escapeHtml(r.value)}</td>
          </tr>
        </table>
      `).join('')}
    </td></tr>
  </table>`
}

function renderText(args: NotificationMailArgs, cta: string): string {
  return `${args.titel}

${args.body}

${cta}: ${args.dashboardUrl}

—
Notificatie-voorkeuren: https://app.frontlix.com/dashboard/instellingen?section=notificaties
`
}

// Basic HTML escaping, voorkomt XSS via lead-namen of dynamic content.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeAttr(s: string): string {
  return s.replace(/"/g, '&quot;')
}
