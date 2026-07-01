import type { ErrorEvent, EventHint } from '@sentry/nextjs'

// Frontlix verwerkt klant-PII (WhatsApp-berichtinhoud, namen, adressen,
// telefoonnummers, e-mails). Deze scrubber draait als `beforeSend` in ELKE
// Sentry-init (server/edge/client) en zorgt dat zulke gegevens nooit naar
// Sentry lekken. Bij twijfel: liever wissen dan versturen.

const PHONE = /\+?\d[\d\s().-]{7,}\d/g
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g

function mask(s?: string): string | undefined {
  return s?.replace(PHONE, '[phone]').replace(EMAIL, '[email]')
}

export function scrubEvent(event: ErrorEvent, _hint: EventHint): ErrorEvent | null {
  // Geen PII-velden meesturen.
  delete event.user
  if (event.request) {
    delete event.request.cookies
    delete event.request.data
  }

  // WhatsApp-berichtinhoud / namen / adressen nooit als context lekken.
  if (event.extra) delete event.extra.message
  if (event.contexts) delete event.contexts.whatsapp

  // Maskeer telefoonnummers/e-mails die alsnog in vrije tekst zitten.
  if (event.message) event.message = mask(event.message) ?? event.message
  event.exception?.values?.forEach((v) => {
    if (v.value) v.value = mask(v.value) ?? v.value
  })
  event.breadcrumbs?.forEach((b) => {
    if (b.message) b.message = mask(b.message) ?? b.message
  })

  return event
}
