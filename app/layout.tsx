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
}

export const metadata: Metadata = {
  title: {
    default: 'GeoLink - Connect With The World',
    template: '%s | GeoLink',
  },
  description: 'Share moments, discover stories, and connect with people around you. GeoLink is a social media platform for everyone.',
  keywords: ['GeoLink', 'social media', 'reels', 'connect', 'share', 'photos', 'videos'],
  authors: [{ name: 'GeoLink' }],
  creator: 'GeoLink',
  publisher: 'GeoLink',
  applicationName: 'GeoLink',
  generator: 'GeoLink',
  referrer: 'origin-when-cross-origin',
  manifest: '/manifest.json',
  metadataBase: new URL('https://geo-link-one.vercel.app'),
  alternates: {
    canonical: 'https://geo-link-one.vercel.app',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'GeoLink',
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: 'website',
    url: 'https://geo-link-one.vercel.app',
    siteName: 'GeoLink',
    title: 'GeoLink - Connect With The World',
    description: 'Share moments, discover stories, and connect with people around you.',
    images: [
      {
        url: '/icons/icon-512x512.png',
        width: 512,
        height: 512,
        alt: 'GeoLink Logo',
      },
    ],
    locale: 'en_US',
  },
  twitter: {
    card: 'summary',
    site: '@GeoLink',
    creator: '@GeoLink',
    title: 'GeoLink - Connect With The World',
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
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: '',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="GeoLink" />
        <meta name="application-name" content="GeoLink" />
        <meta name="msapplication-TileColor" content="#ec4899" />

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

        {/* Service Worker */}
        <script dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', async () => {
                try {
                  const reg = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
                  setInterval(() => reg.update(), 60000)
                  reg.addEventListener('updatefound', () => {
                    const nw = reg.installing
                    if (!nw) return
                    nw.addEventListener('statechange', () => {
                      if (nw.state === 'installed' && navigator.serviceWorker.controller) {
                        nw.postMessage({ type: 'SKIP_WAITING' })
                        window.location.reload()
                      }
                    })
                  })
                } catch(e) {}
              })
            }
          `
        }} />
      </body>
    </html>
  )
}
