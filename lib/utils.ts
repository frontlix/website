/**
 * Combines class names, filtering out falsy values.
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

/**
 * Valideert en normaliseert een Nederlands telefoonnummer.
 * Accepteert mobiel (06) en vast (0x0/0xxx) in formaten:
 *   06..., +316..., 00316...  (mobiel)
 *   0xx..., +31xx..., 0031xx... (vast)
 * Retourneert genormaliseerd +31-nummer, of null als het ongeldig is.
 */
export function validatePhone(input: string): string | null {
  const stripped = input.replace(/[\s\-()]/g, '')

  /* Nederlands mobiel: 06 + 8 cijfers */
  if (/^06\d{8}$/.test(stripped)) return '+31' + stripped.slice(1)
  if (/^\+316\d{8}$/.test(stripped)) return stripped
  if (/^00316\d{8}$/.test(stripped)) return '+' + stripped.slice(2)

  /* Nederlands vast nummer: 0 + 9 cijfers (bijv. 020, 030, 0412) */
  if (/^0[1-9]\d{8}$/.test(stripped)) return '+31' + stripped.slice(1)
  if (/^\+31[1-9]\d{8}$/.test(stripped)) return stripped
  if (/^0031[1-9]\d{8}$/.test(stripped)) return '+' + stripped.slice(2)

  return null
}
