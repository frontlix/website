/**
 * Direct test van de sendBrancheApprovalEmail() functie via een mini Next.js
 * route. We kunnen niet direct lib/mail.ts importeren in een .mjs script omdat
 * het TypeScript is en path-aliases gebruikt — dus we POST naar een test endpoint.
 *
 * Eenvoudigere route: gebruik nodemailer direct met dezelfde env vars, en
 * stuur een minimale test mail. Als deze aankomt, weten we dat SMTP werkt.
 *
 * Run: node scripts/test-approval-mail.mjs
 */

import { readFileSync } from 'node:fs'
import nodemailer from 'nodemailer'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^['"]|['"]$/g, '')]
    })
)

const TO = 'c.c.trompje@gmail.com'

console.log('SMTP config:')
console.log('  host:', env.MAIL_HOST || 'smtp.hostinger.com')
console.log('  port:', env.MAIL_PORT || 465)
console.log('  user:', env.MAIL_USER)
console.log('  to:', TO)
console.log()

const transporter = nodemailer.createTransport({
  host: env.MAIL_HOST || 'smtp.hostinger.com',
  port: Number(env.MAIL_PORT) || 465,
  secure: true,
  auth: {
    user: env.MAIL_USER,
    pass: env.MAIL_PASS,
  },
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 15000,
})

console.log('🔌 Verifying SMTP connection...')
try {
  await transporter.verify()
  console.log('✅ SMTP connection OK\n')
} catch (err) {
  console.error('❌ SMTP verify failed:', err.message)
  process.exit(1)
}

console.log('📤 Sending test email...')
try {
  const info = await transporter.sendMail({
    from: `Frontlix Demo <${env.MAIL_USER}>`,
    to: TO,
    subject: 'TEST: branche approval mail diagnose',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #1A56FF;">Test van Frontlix demo mail</h2>
        <p>Dit is een test om te zien of de Hostinger SMTP correct werkt voor branche approval mails.</p>
        <p>Als je deze mail ziet, dan werkt het mailsysteem prima en zit het probleem ergens anders.</p>
        <p style="margin-top: 24px; color: #888; font-size: 12px;">Tijdstempel: ${new Date().toISOString()}</p>
      </div>
    `,
  })
  console.log('✅ Test mail verzonden!')
  console.log('   messageId:', info.messageId)
  console.log('   accepted:', info.accepted)
  console.log('   rejected:', info.rejected)
  console.log('\nCheck je inbox + spam folder van', TO)
} catch (err) {
  console.error('❌ sendMail failed:', err.message)
  console.error(err)
}
