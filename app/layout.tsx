import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { QueryProvider } from '@/components/shared/QueryProvider'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ec4899' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const metadata: Metadata = {
  title: { default: 'GeoLink', template: '%s | GeoLink' },
  description: 'Share moments, discover stories, and connect with people around you.',
  keywords: ['social media', 'reels', 'photos', 'connect', 'geolink'],
  authors: [{ name: 'GeoLink' }],
  creator: 'GeoLink',
  publisher: 'GeoLink',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'GeoLink',
    startupImage: [
      { url: '/icons/icon-512x512.png', media: '(device-width: 320px)' },
    ],
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: 'website',
    siteName: 'GeoLink',
    title: 'GeoLink - Connect With The World',
    description: 'Share moments, discover stories, and connect with people around you.',
    images: [{ url: '/icons/icon-512x512.png', width: 512, height: 512 }],
  },
  twitter: {
    card: 'summary',
    title: 'GeoLink',
    description: 'Share moments, discover stories, and connect with people around you.',
    images: ['/icons/icon-512x512.png'],
  },
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    other: [
      { rel: 'mask-icon', url: '/icons/maskable-512x512.png', color: '#ec4899' },
    ],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="GeoLink" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="GeoLink" />
        <meta name="msapplication-TileColor" content="#ec4899" />
        <meta name="msapplication-TileImage" content="/icons/icon-144x144.png" />

        {/* Monetag Push Notifications */}
        <script src="https://5gvci.com/act/files/tag.min.js?z=11221568" data-cfasync="false" async />
      </head>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <QueryProvider>{children}</QueryProvider>
        </ThemeProvider>

        {/* Monetag In-Page Push */}
        <script dangerouslySetInnerHTML={{
          __html: `(function(s){s.dataset.zone='11221526',s.src='https://nap5k.com/tag.min.js'})([document.documentElement,document.body].filter(Boolean).pop().appendChild(document.createElement('script')))`
        }} />

        {/* Service Worker Registration with Auto-Update */}
        <script dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', async () => {
                try {
                  const reg = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
                  
                  // Check for updates every 60 seconds
                  setInterval(() => reg.update(), 60000)
                  
                  // Auto update when new SW detected
                  reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing
                    if (!newWorker) return
                    newWorker.addEventListener('statechange', () => {
                      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // New version available - activate immediately
                        newWorker.postMessage({ type: 'SKIP_WAITING' })
                        window.location.reload()
                      }
                    })
                  })
                  
                  // Request notification permission
                  if ('Notification' in window && Notification.permission === 'default') {
                    setTimeout(() => Notification.requestPermission(), 3000)
                  }
                } catch(e) {
                  console.log('SW registration failed:', e)
                }
              })
            }
          `
        }} />
      </body>
    </html>
  )
}
