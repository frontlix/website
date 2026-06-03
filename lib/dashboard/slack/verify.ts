import crypto from 'crypto'

/**
 * Slack signs every incoming request met X-Slack-Signature en
 * X-Slack-Request-Timestamp. We verifiëren beide om te voorkomen dat
 * iemand anders POSTs naar onze endpoint kan doen.
 *
 * Algoritme (per Slack docs):
 *   sig_basestring = "v0:" + timestamp + ":" + raw_body
 *   expected = "v0=" + HMAC_SHA256(SLACK_SIGNING_SECRET, sig_basestring)
 *   compare met X-Slack-Signature in constant-time
 *
 * Replay-protectie: weiger requests ouder dan 5 minuten, anders kan
 * een eerder onderschept request later nog gebruikt worden.
 */
export function verifySlackRequest(args: {
  signingSecret: string
  rawBody: string
  signature: string | null
  timestamp: string | null
}): { ok: true } | { ok: false; reason: string } {
  const { signingSecret, rawBody, signature, timestamp } = args
  if (!signature || !timestamp) {
    return { ok: false, reason: 'missing-signature-headers' }
  }

  const tsNum = Number(timestamp)
  if (!Number.isFinite(tsNum)) {
    return { ok: false, reason: 'invalid-timestamp' }
  }
  const ageSec = Math.abs(Date.now() / 1000 - tsNum)
  if (ageSec > 60 * 5) {
    return { ok: false, reason: 'timestamp-too-old' }
  }

  const baseString = `v0:${timestamp}:${rawBody}`
  const hmac = crypto.createHmac('sha256', signingSecret)
  hmac.update(baseString)
  const expected = `v0=${hmac.digest('hex')}`

  // timingSafeEqual eist gelijke buffer-lengte; bij mismatch dus eerst
  // length checken anders crasht 'ie.
  const sigBuf = Buffer.from(signature)
  const expBuf = Buffer.from(expected)
  if (sigBuf.length !== expBuf.length) {
    return { ok: false, reason: 'signature-length-mismatch' }
  }
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) {
    return { ok: false, reason: 'signature-mismatch' }
  }

  return { ok: true }
}
