const CACHE_NAME = 'geolink-v4'
const OFFLINE_URL = '/offline'

const PRECACHE = [
  '/',
  '/feed',
  '/offline',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
]

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => clients.claim())
  )
})

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return
  const url = new URL(e.request.url)
  if (url.origin !== location.origin) return

  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone()
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone))
        return res
      })
      .catch(() => caches.match(e.request)
        .then(cached => cached || caches.match(OFFLINE_URL))
      )
  )
})

self.addEventListener('push', e => {
  if (!e.data) return
  let data = { title: 'GeoLink', body: 'New notification', url: '/feed', kind: 'generic' }
  try { data = { ...data, ...e.data.json() } } catch {}

  const isCall = data.kind === 'call'
  const isMessage = data.kind === 'message'

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      // Longer, more insistent buzz for a call (like a real ringing phone);
      // a shorter, single buzz for an ordinary message.
      vibrate: isCall ? [400, 200, 400, 200, 400, 200, 400] : [200, 100, 200],
      data: { url: data.url, kind: data.kind, callId: data.callId, chatId: data.chatId },
      tag: data.tag || 'geolink',
      renotify: true,
      // Calls stay on screen until the person acts on them instead of
      // auto-dismissing, same as a real incoming-call notification.
      requireInteraction: isCall,
      actions: isCall
        ? [{ action: 'accept', title: 'Accept' }, { action: 'decline', title: 'Decline' }]
        : isMessage
        ? [{ action: 'reply', title: 'Open chat' }]
        : [],
    })
  )
})

self.addEventListener('notificationclick', e => {
  const { url, kind, callId, chatId } = e.notification.data || {}
  e.notification.close()

  if (kind === 'call' && e.action === 'decline') {
    // Decline right from the notification, without opening the app -
    // best effort; if it fails, the call still auto-cancels once the
    // caller's ring timeout runs out.
    e.waitUntil(
      fetch('/api/calls/decline', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callId }),
      }).catch(() => {})
    )
    return
  }

  const targetUrl = url || (chatId ? `/chat/${chatId}` : '/feed')
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then(list => {
      for (const c of list) {
        if ('focus' in c) {
          c.navigate(targetUrl)
          c.focus()
          // Let the already-open app know a call notification was tapped,
          // so it can also start ringing in-app with the chosen ringtone -
          // the OS notification sound plays regardless, this is on top of it.
          if (kind === 'call') c.postMessage({ type: 'CALL_NOTIFICATION_OPENED', callId })
          return
        }
      }
      return clients.openWindow(targetUrl)
    })
  )
})

self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting()
  if (e.data?.type === 'SET_BADGE' && 'setAppBadge' in navigator) navigator.setAppBadge(e.data.count).catch(() => {})
  if (e.data?.type === 'CLEAR_BADGE' && 'clearAppBadge' in navigator) navigator.clearAppBadge().catch(() => {})
})
