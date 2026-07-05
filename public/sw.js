const CACHE_NAME = 'geolink-v3'
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
  let data = { title: 'GeoLink', body: 'New notification', url: '/feed' }
  try { data = { ...data, ...e.data.json() } } catch {}
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [200, 100, 200],
      data: { url: data.url },
      tag: 'geolink',
      renotify: true,
    })
  )
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  const url = e.notification.data?.url || '/feed'
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then(list => {
      for (const c of list) {
        if ('focus' in c) { c.navigate(url); return c.focus() }
      }
      return clients.openWindow(url)
    })
  )
})

self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting()
  if (e.data?.type === 'SET_BADGE' && 'setAppBadge' in navigator) navigator.setAppBadge(e.data.count).catch(() => {})
  if (e.data?.type === 'CLEAR_BADGE' && 'clearAppBadge' in navigator) navigator.clearAppBadge().catch(() => {})
})
