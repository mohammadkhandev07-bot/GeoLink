'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { MessageCircle, Users, Film, Zap, Download, Check } from 'lucide-react'

export default function LandingPage() {
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault()
      setInstallPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true)
      setInstalling(false)
    })
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
    }
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (isInstalled) {
      window.location.href = '/feed'
      return
    }

    // Android/Desktop - native prompt directly
    if (installPrompt) {
      setInstalling(true)
      try {
        await installPrompt.prompt()
        const { outcome } = await installPrompt.userChoice
        if (outcome === 'accepted') {
          setIsInstalled(true)
        }
      } catch {}
      setInstalling(false)
      setInstallPrompt(null)
      return
    }

    // iOS - directly open in Safari instruction (no popup, just redirect)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    if (isIOS) {
      // Show native iOS share sheet hint via alert (simplest)
      window.open('https://geo-link-one.vercel.app', '_blank')
      return
    }

    // Fallback - just open the app
    window.location.href = '/feed'
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/images/geolink-logo.png" alt="GeoLink" width={32} height={32} className="rounded-lg" />
            <span className="font-bold text-xl bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
              GeoLink
            </span>
          </div>
          <div className="flex gap-2">
            <Link href="/login"><Button variant="outline">Log In</Button></Link>
            <Link href="/signup"><Button variant="gradient">Sign Up</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="mb-6 flex justify-center">
          <Image src="/images/geolink-logo.png" alt="GeoLink" width={90} height={90} className="rounded-2xl shadow-2xl" />
        </div>
        <h1 className="text-4xl sm:text-6xl font-bold mb-6">
          Connect With The{' '}
          <span className="bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
            World
          </span>
        </h1>
        <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
          Share moments, discover stories, and connect with people around you.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
          <Link href="/signup">
            <Button size="lg" variant="gradient" className="px-8 w-full sm:w-auto">
              Get Started Free
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              Log In
            </Button>
          </Link>
        </div>

        {/* Install Button - No popup, direct install */}
        <button
          onClick={handleInstall}
          disabled={installing}
          className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-white font-semibold text-lg transition-all duration-200 hover:scale-105 active:scale-95 shadow-xl disabled:opacity-70"
          style={{
            background: isInstalled
              ? 'linear-gradient(135deg, #10b981, #059669)'
              : 'linear-gradient(135deg, #ec4899, #a855f7, #06b6d4)',
            boxShadow: '0 8px 32px rgba(168,85,247,0.4)'
          }}
        >
          {isInstalled ? (
            <><Check className="h-5 w-5" /> GeoLink Installed ✓</>
          ) : installing ? (
            <><div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Installing...</>
          ) : (
            <><Download className="h-5 w-5" /> Install GeoLink App</>
          )}
        </button>
        <p className="text-xs text-muted-foreground mt-2">
          📱 Android, iPhone & Desktop — Free
        </p>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold text-center mb-10">Everything you need</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { icon: MessageCircle, title: 'Real-time Chat', desc: 'Instant messaging with typing indicators and online status.' },
            { icon: Users, title: 'Follow System', desc: 'Follow friends or keep your account private.' },
            { icon: Film, title: 'Reels', desc: 'Short videos in a TikTok-style vertical feed.' },
            { icon: Zap, title: 'Instant Feed', desc: 'Posts from people you follow, always fresh.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="p-6 rounded-xl border bg-card text-center hover:border-pink-500/30 transition-colors">
              <div className="inline-flex p-3 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 mb-4">
                <Icon className="h-6 w-6 text-pink-500" />
              </div>
              <h3 className="font-semibold mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        <p>© 2025 GeoLink. Made with ❤️</p>
      </footer>
    </div>
  )
}
