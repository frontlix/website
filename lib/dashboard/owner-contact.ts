// lib/dashboard/owner-contact.ts
//
// Pure helpers voor de e-mailrollen-instelling. Geen Supabase/IO hier; de
// resolutie-regel (override ?? basis) staat op één plek zodat dashboard en bot
// dezelfde semantiek hanteren.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Lichtgewicht e-mailvalidatie, gelijk aan de rest van het dashboard. */
export function isValidEmail(v: string): boolean {
  return EMAIL_RE.test((v ?? '').trim())
}

/**
 * Lost een ontvangstrol op: een ingevuld override-adres wint, anders het
 * basis-adres. Lege/whitespace strings tellen als "niet ingevuld". Null als er
 * niets bruikbaars overblijft.
 */
export function resolveReceiveEmail(
  override: string | null | undefined,
  basis: string | null | undefined,
): string | null {
  const o = (override ?? '').trim()
  if (o) return o
  const b = (basis ?? '').trim()
  return b || null
}

/**
 * Normaliseert een WhatsApp-nummer naar het bot-formaat: landcode zonder plus,
 * geen spaties of leestekens. '06...' (NL) -> '316...'; '+31 6 ...' -> '316...';
 * '0031...' -> '31...'. Null bij leeg of een onplausibel resultaat.
 */
export function normalizeWhatsapp(raw: string | null | undefined): string | null {
  const trimmed = (raw ?? '').trim()
  if (!trimmed) return null
  let digits = trimmed.replace(/[^\d+]/g, '')
  if (digits.startsWith('+')) digits = digits.slice(1)
  else if (digits.startsWith('00')) digits = digits.slice(2)
  else if (digits.startsWith('06')) digits = '31' + digits.slice(1)
  digits = digits.replace(/\D/g, '')
  if (digits.length < 10 || digits.length > 15) return null
  return digits
}
