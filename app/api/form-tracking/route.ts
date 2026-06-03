import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

/*
 * Dit endpoint is publiek en ongeauthenticeerd en schrijft via de service-role
 * client (bypasst RLS). De TypeScript-cast hieronder doet niets op runtime, dus
 * valideren we de payload defensief op de server vóór we naar de database
 * schrijven. Doel: misbruik begrenzen zonder legitieme form-abandonment-tracking
 * te breken, bij twijfel liever opslaan-met-begrenzing dan hard weigeren.
 */

/* Maximale payload-grootte (8KB), voorkomt grote/abusieve bodies vóór JSON.parse */
const MAX_BODY_BYTES = 8 * 1024

/* Whitelist: exact de form_name-waarden die de frontend (useFormTracking) stuurt */
const ALLOWED_FORM_NAMES = new Set([
  'contact',
  'demo',
  'project',
  'hero_demo',
  'personalized_demo',
])

/* Field_data-begrenzingen */
const MAX_FIELD_KEYS = 30
const MAX_VALUE_LENGTH = 2000

/* Gevoelige sleutelnamen die we nooit opslaan (defensieve strip, substring-match) */
const SENSITIVE_KEY_PATTERNS = [
  'password',
  'wachtwoord',
  'iban',
  'cvc',
  'creditcard',
  'token',
]

/* RFC 4122 UUID-formaat (crypto.randomUUID levert v4) */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Nette JSON-afwijzing met de gevraagde status-code */
function reject(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status })
}

/** Reduceer pageUrl tot een veilig relatief pad (begint met '/') */
function sanitizePageUrl(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null

  const value = raw.trim()

  /* Al een relatief pad → direct gebruiken */
  if (value.startsWith('/')) return value

  /* Anders proberen we de pathname eruit te halen; lukt dat niet, dan weigeren we de url */
  try {
    return new URL(value).pathname
  } catch {
    return null
  }
}

/** Begrens en saneer field_data: alleen strings, key/length-limieten, gevoelige keys eruit */
function sanitizeFieldData(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}

  const result: Record<string, string> = {}
  let keyCount = 0

  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    /* Max aantal velden begrenzen */
    if (keyCount >= MAX_FIELD_KEYS) break

    /* Alleen string-waarden opslaan */
    if (typeof value !== 'string') continue

    /* Gevoelige sleutelnamen defensief overslaan */
    const lowerKey = key.toLowerCase()
    if (SENSITIVE_KEY_PATTERNS.some((p) => lowerKey.includes(p))) continue

    /* Waarde-lengte begrenzen */
    result[key] = value.length > MAX_VALUE_LENGTH ? value.slice(0, MAX_VALUE_LENGTH) : value
    keyCount++
  }

  return result
}

export async function POST(request: NextRequest) {
  try {
    /*
     * Lees eerst de ruwe tekst zodat we de payload-grootte kunnen begrenzen
     * vóór JSON.parse. Werkt voor zowel normale fetch (application/json) als
     * de Beacon API (kan als text/plain of application/json binnenkomen).
     */
    const text = await request.text()

    /* Payload-grootte begrenzen (byte-lengte, niet karakter-lengte) */
    if (Buffer.byteLength(text, 'utf8') > MAX_BODY_BYTES) {
      return reject('Payload te groot.', 413)
    }

    let body: Record<string, unknown>
    try {
      body = JSON.parse(text)
    } catch {
      return reject('Ongeldige JSON.', 400)
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return reject('Ongeldige payload.', 400)
    }

    const { sessionId, formName, fieldData, status, pageUrl } = body

    /* sessionId: verplicht en moet een geldige UUID zijn */
    if (typeof sessionId !== 'string' || !UUID_REGEX.test(sessionId)) {
      return reject('Ongeldige sessionId.', 400)
    }

    /* formName: verplicht en moet in de whitelist staan */
    if (typeof formName !== 'string' || !ALLOWED_FORM_NAMES.has(formName)) {
      return reject('Ongeldige formName.', 400)
    }

    /* status: alleen 'active' of 'completed', anders defaulten we naar 'active' */
    const safeStatus = status === 'completed' ? 'completed' : 'active'

    /* field_data en page_url defensief saneren */
    const safeFieldData = sanitizeFieldData(fieldData)
    const safePageUrl = sanitizePageUrl(pageUrl)

    const supabase = getSupabase()

    /* Upsert: update bestaande row op session_id, of insert nieuwe */
    const { error: dbError } = await supabase
      .from('form_abandonment')
      .upsert(
        {
          session_id: sessionId,
          form_name: formName,
          field_data: safeFieldData,
          status: safeStatus,
          page_url: safePageUrl,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'session_id' }
      )

    if (dbError) {
      console.error('Form tracking upsert error:', dbError)
      return reject('Opslaan mislukt.', 500)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Form tracking error:', err)
    return reject('Er is een fout opgetreden.', 500)
  }
}
