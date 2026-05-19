/**
 * Client-side push helpers — alleen bruikbaar in een 'use client' component.
 *
 * `enablePush()`: vraagt permission, registreert de service worker, maakt
 * een subscription en stuurt 'm naar de server.
 * `disablePush()`: unsubscribet local en verwijdert van de server.
 */

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

/** Base64-URL → Uint8Array (vereist door PushManager.subscribe). */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

export interface PushEnableResult {
  ok: boolean
  /** Reden bij failure — laat client een meaningful melding tonen. */
  reason?: 'unsupported' | 'denied' | 'no-vapid' | 'save-failed' | 'error'
  detail?: string
}

export async function enablePush(): Promise<PushEnableResult> {
  if (typeof window === 'undefined') return { ok: false, reason: 'error' }
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { ok: false, reason: 'unsupported' }
  }
  if (!VAPID_PUBLIC) {
    return { ok: false, reason: 'no-vapid' }
  }

  try {
    // Permission vragen — als al granted blijft 'ie granted, als denied
    // krijgt de gebruiker geen prompt meer (browser-policy).
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      return { ok: false, reason: 'denied' }
    }

    // Service worker registreren (idempotent — returnt bestaande registration
    // als 'ie al is).
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })

    // Subscribe (of pak bestaande sub).
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        // Cast: in nieuwe DOM-types is Uint8Array<ArrayBufferLike> niet
        // direct compatible met BufferSource zonder hint, ook al werkt
        // het runtime prima.
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) as unknown as BufferSource,
      })
    }

    // Stuur naar server.
    const res = await fetch('/api/dashboard/notifications/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: sub.toJSON(),
        userAgent: navigator.userAgent,
      }),
    })
    if (!res.ok) {
      return { ok: false, reason: 'save-failed' }
    }
    return { ok: true }
  } catch (err) {
    console.error('[enablePush] failed:', err)
    return { ok: false, reason: 'error', detail: String(err) }
  }
}

export async function disablePush(): Promise<PushEnableResult> {
  if (typeof window === 'undefined') return { ok: false, reason: 'error' }
  if (!('serviceWorker' in navigator)) return { ok: true } // niets te doen

  try {
    const reg = await navigator.serviceWorker.getRegistration('/')
    const sub = await reg?.pushManager.getSubscription()
    if (!sub) return { ok: true }

    const endpoint = sub.endpoint

    // Eerst lokaal — als dit faalt is server-state nog consistent.
    await sub.unsubscribe()

    // Daarna server.
    await fetch('/api/dashboard/notifications/push/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint }),
    })
    return { ok: true }
  } catch (err) {
    console.error('[disablePush] failed:', err)
    return { ok: false, reason: 'error', detail: String(err) }
  }
}
