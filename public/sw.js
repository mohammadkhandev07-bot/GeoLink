const APP_VERSION = 'geolink-v2'
const STATIC_CACHE = `${APP_VERSION}-static`
const DYNAMIC_CACHE = `${APP_VERSION}-dynamic`

const STATIC_ASSETS = [
  '/',
  '/offline',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/manifest.json',
]

// Install - cache static assets
self.addEventListener('install', event => {
  console.log('[SW] Installing GeoLink SW v2')
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      return cache.addAll(STATIC_ASSETS)
    }).then(() => self.skipWaiting())
  )
})

// Activate - clean old caches + take control
self.addEventListener('activate', event => {
  console.log('[SW] Activating GeoLink SW v2')
  event.waitUntil(
    Promise.all([
      // Delete old caches
      caches.keys().then(keys =>
        Promise.all(keys
          .filter(key => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map(key => caches.delete(key))
        )
      ),
      // Take control immediately
      clients.claim(),
    ])
  )
})

// Fetch - Network first for API, Cache first for static
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET, chrome-extension, supabase API calls
  if (request.method !== 'GET') return
  if (url.origin !== location.origin) return
  if (url.pathname.startsWith('/api/')) return

  // HTML pages - Network first (so updates show immediately)
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone()
          caches.open(DYNAMIC_CACHE).then(cache => cache.put(request, clone))
          return response
        })
        .catch(() => caches.match(request).then(r => r || caches.match('/offline')))
    )
    return
  }

  // Static assets - Cache first
  if (url.pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|ico|woff|woff2|css|js)$/)) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached
        return fetch(request).then(response => {
          const clone = response.clone()
          caches.open(DYNAMIC_CACHE).then(cache => cache.put(request, clone))
          return response
        })
      })
    )
    return
  }

  // Default - Network first with cache fallback
  event.respondWith(
    fetch(request)
      .then(response => {
        const clone = response.clone()
        caches.open(DYNAMIC_CACHE).then(cache => cache.put(request, clone))
        return response
      })
      .catch(() => caches.match(request))
  )
})

// Push Notifications
self.addEventListener('push', event => {
  if (!event.data) return
  let data = { title: 'GeoLink', body: 'New notification', url: '/feed', type: 'general' }
  try { data = { ...data, ...event.data.json() } } catch {}

  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    image: data.image || undefined,
    vibrate: [200, 100, 200],
    tag: data.type || 'geolink',
    renotify: true,
    requireInteraction: false,
    silent: false,
    timestamp: Date.now(),
    data: { url: data.url || '/feed', type: data.type },
    actions: [
      { action: 'open', title: '👁 Open', icon: '/icons/icon-72x72.png' },
      { action: 'close', title: '✕ Dismiss' }
    ]
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

// Notification Click
self.addEventListener('notificationclick', event => {
  event.notification.close()
  if (event.action === 'close') return

  const url = event.notification.data?.url || '/feed'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      // Focus existing window if open
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      return clients.openWindow(url)
    })
  )
})

// App Badge
self.addEventListener('message', event => {
  if (event.data?.type === 'SET_BADGE') {
    if ('setAppBadge' in navigator) navigator.setAppBadge(event.data.count || 0).catch(() => {})
  }
  if (event.data?.type === 'CLEAR_BADGE') {
    if ('clearAppBadge' in navigator) navigator.clearAppBadge().catch(() => {})
  }
  // Skip waiting for instant update
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// Background Sync
self.addEventListener('sync', event => {
  if (event.tag === 'sync-notifications') {
    event.waitUntil(syncNotifications())
  }
})

async function syncNotifications() {
  // Will be called when connection restored
  const allClients = await clients.matchAll()
  allClients.forEach(client => client.postMessage({ type: 'SYNC_NOTIFICATIONS' }))
}
