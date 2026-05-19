// Frontlix Service Worker — handles push notifications.
//
// Geregistreerd door client-side code in `lib/push/client.ts` zodra een user
// push-toggle aanzet. Browser/OS hangt deze worker in z'n background-runtime
// en levert pushes af aan onze `push`-event-handler, ook als de app gesloten
// is.

self.addEventListener('install', (event) => {
  // skipWaiting() zorgt dat een nieuwe SW direct actief wordt, ipv te wachten
  // tot alle bestaande tabs gesloten zijn.
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  // clients.claim() pakt direct controle over open tabs.
  event.waitUntil(self.clients.claim())
})

// ── Push-event ─────────────────────────────────────────────
// Server stuurt een JSON payload mee via web-push lib. We decoderen + tonen
// een native OS-notification. Bij click navigeren we naar de relevante lead.
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { titel: 'Frontlix', body: event.data ? event.data.text() : '' }
  }

  const titel = data.titel || 'Frontlix'
  const opties = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.eventType || 'frontlix-notif', // zelfde tag = vervangt vorige
    data: {
      url: data.url || '/dashboard',
    },
    requireInteraction: false,
  }

  event.waitUntil(self.registration.showNotification(titel, opties))
})

// ── Click-handler ──────────────────────────────────────────
// Bij klik op de notification: open of focus de relevante URL. Als er al
// een tab open is op die URL → focus 'm; anders open een nieuwe.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/dashboard'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        // Als er al een tab open is, focussen we die en navigeren ernaartoe.
        if ('focus' in client) {
          client.focus()
          if ('navigate' in client) {
            client.navigate(url)
          }
          return
        }
      }
      // Geen open tab — open een nieuwe.
      if (self.clients.openWindow) {
        return self.clients.openWindow(url)
      }
    }),
  )
})
