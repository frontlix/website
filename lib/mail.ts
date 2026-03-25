import nodemailer from 'nodemailer'

// Lazy initialisatie zodat build niet faalt zonder env vars
let _transporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
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
    from: `Frontlix Website <${process.env.GMAIL_USER}>`,
    to: process.env.GMAIL_USER,
    subject,
    html,
  })
}
