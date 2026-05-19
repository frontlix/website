import nodemailer from 'nodemailer'
import type { NotificationMail } from './mail-templates'

/**
 * Notification-specifieke nodemailer wrapper. Gebruikt dezelfde SMTP-config
 * als lib/mail.ts maar met aparte transporter zodat we onafhankelijk
 * kunnen tunen (timeouts, throttling, etc.).
 *
 * From-adres: env DASHBOARD_MAIL_FROM (fallback naar MAIL_USER). Voor
 * later wanneer dashboard-mails moeten lijken te komen van de tenant
 * zelf i.p.v. Frontlix.
 */

let _transporter: nodemailer.Transporter | null = null

function getMailTransporter(): nodemailer.Transporter {
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

export async function sendNotificationMail(
  to: string,
  mail: NotificationMail,
): Promise<void> {
  const transporter = getMailTransporter()
  const fromUser = process.env.DASHBOARD_MAIL_FROM || process.env.MAIL_USER
  if (!fromUser) {
    throw new Error('MAIL_USER (of DASHBOARD_MAIL_FROM) is niet gezet.')
  }

  await transporter.sendMail({
    from: `Frontlix Dashboard <${fromUser}>`,
    to,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
  })
}
