import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { QueryProvider } from '@/components/shared/QueryProvider'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'GeoLink - Connect With The World',
  description: 'Share moments, discover stories, and connect with people around you.',
  icons: {
    icon: [
      { url: '/images/geolink-logo.png', sizes: '512x512', type: 'image/png' },
      { url: '/images/geolink-logo.png', sizes: '192x192', type: 'image/png' },
      { url: '/images/geolink-logo.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: { url: '/images/geolink-logo.png', sizes: '512x512', type: 'image/png' },
    shortcut: '/images/geolink-logo.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/images/geolink-logo.png" sizes="512x512" type="image/png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/images/geolink-logo.png" />
        <meta name="theme-color" content="#ec4899" />
      </head>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <QueryProvider>{children}</QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
