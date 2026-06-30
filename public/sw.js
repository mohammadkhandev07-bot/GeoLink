const CACHE = 'geolink-v1'

self.addEventListener('install', e => { self.skipWaiting() })
self.addEventListener('activate', e => { e.waitUntil(clients.claim()) })

// Push notification receive karo
self.addEventListener('push', e => {
  if (!e.data) return
  const data = e.data.json()
  const options = {
    body: data.body || 'New notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/feed' },
    tag: data.tag || 'geolink',
    renotify: true,
    actions: [
      { action: 'open', title: 'Open GeoLink' },
      { action: 'close', title: 'Dismiss' }
    ]
  }
  e.waitUntil(self.registration.showNotification(data.title || 'GeoLink', options))
})

// Notification click
self.addEventListener('notificationclick', e => {
  e.notification.close()
  if (e.action === 'close') return
  const url = e.notification.data?.url || '/feed'
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes('geo-link') && 'focus' in c) return c.focus()
      }
      return clients.openWindow(url)
    })
  )
})

// Background sync - unread badge
self.addEventListener('message', e => {
  if (e.data?.type === 'SET_BADGE') {
    if ('setAppBadge' in navigator) {
      navigator.setAppBadge(e.data.count || 0)
    }
  }
  if (e.data?.type === 'CLEAR_BADGE') {
    if ('clearAppBadge' in navigator) {
      navigator.clearAppBadge()
    }
  }
})
