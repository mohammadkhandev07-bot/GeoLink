'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { MessageCircle, Users, Film, Zap, Download, Check } from 'lucide-react'

export default function LandingPage() {
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [installed, setInstalled] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true)
      return
    }

    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOS(ios)

    const handler = (e: any) => {
      e.preventDefault()
      setInstallPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => {
      setInstalled(true)
      setInstalling(false)
    })
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (installed) { window.location.href = '/feed'; return }

    // Android/Desktop — native prompt
    if (installPrompt) {
      setInstalling(true)
      await installPrompt.prompt()
      const { outcome } = await installPrompt.userChoice
      if (outcome !== 'accepted') setInstalling(false)
      setInstallPrompt(null)
      return
    }

    // iOS — only way is Safari Add to Home Screen
    // Show ONE simple toast, no modal
    if (isIOS) {
      alert('To install GeoLink on iPhone:\n\n1. Open this page in Safari\n2. Tap Share button (bottom center)\n3. Tap "Add to Home Screen"\n4. Tap "Add"')
      return
    }

    // Fallback — open as web app
    window.location.href = '/feed'
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="border-b sticky top-0 z-40 bg-background/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/images/geolink-logo.png" alt="GeoLink" width={32} height={32} className="rounded-lg" />
            <span className="font-bold text-lg bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
              GeoLink
            </span>
          </div>
          <div className="flex gap-2">
            <Link href="/login"><Button variant="outline" size="sm">Log In</Button></Link>
            <Link href="/signup">
              <Button size="sm" className="bg-gradient-to-r from-pink-500 to-purple-500 text-white border-0">Sign Up</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-4 pt-16 pb-12 text-center">
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="absolute inset-0 rounded-3xl blur-2xl opacity-40 scale-110"
              style={{ background: 'linear-gradient(135deg, #ec4899, #a855f7, #06b6d4)' }} />
            <Image src="/images/geolink-logo.png" alt="GeoLink" width={100} height={100}
              className="relative rounded-3xl shadow-2xl" />
          </div>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold mb-5 tracking-tight">
          Connect With The{' '}
          <span className="bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
            World
          </span>
        </h1>

        <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
          Share moments, discover stories, and connect with people around you.
        </p>

        {/* Main CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
          <Link href="/signup">
            <Button size="lg" className="px-10 w-full sm:w-auto text-base font-semibold h-12 bg-gradient-to-r from-pink-500 to-purple-500 text-white border-0">
              Get Started Free
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="w-full sm:w-auto text-base h-12">
              Log In
            </Button>
          </Link>
        </div>

        {/* Install Button */}
        <button
          onClick={handleInstall}
          disabled={installing}
          className="inline-flex items-center gap-3 px-10 py-4 rounded-2xl text-white font-bold text-lg transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-80"
          style={{
            background: installed
              ? 'linear-gradient(135deg, #10b981, #059669)'
              : 'linear-gradient(135deg, #ec4899, #a855f7, #06b6d4)',
            boxShadow: installed
              ? '0 8px 32px rgba(16,185,129,0.4)'
              : '0 8px 32px rgba(168,85,247,0.45)',
          }}
        >
          {installed ? (
            <><Check className="h-5 w-5" /> Installed ✓</>
          ) : installing ? (
            <><div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Installing...</>
          ) : (
            <><Download className="h-5 w-5" /> Install GeoLink — Free</>
          )}
        </button>

        <p className="text-xs text-muted-foreground mt-3">
          {installed ? (
            <Link href="/feed" className="text-pink-500 font-medium hover:underline">Open GeoLink →</Link>
          ) : (
            'Works on Android, iPhone & Desktop'
          )}
        </p>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-14 border-t">
        <h2 className="text-3xl font-bold text-center mb-2">Everything you need</h2>
        <p className="text-muted-foreground text-center mb-10">One app for social media, messaging, and more.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { icon: MessageCircle, title: 'Real-time Chat', desc: 'Instant messaging with typing indicators and online status.' },
            { icon: Users, title: 'Follow System', desc: 'Follow friends or keep your account private.' },
            { icon: Film, title: 'Reels', desc: 'Short videos in TikTok-style vertical feed.' },
            { icon: Zap, title: 'Live Feed', desc: 'Posts from people you follow, updated instantly.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="p-6 rounded-2xl border bg-card text-center hover:border-pink-500/40 transition-all">
              <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-pink-500/15 to-purple-500/15 mb-4">
                <Icon className="h-6 w-6 text-pink-500" />
              </div>
              <h3 className="font-semibold mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t py-8 text-center">
        <p className="text-sm text-muted-foreground">© 2025 GeoLink. All rights reserved.</p>
        <div className="flex justify-center gap-4 mt-3 text-xs text-muted-foreground">
          <Link href="/login" className="hover:text-foreground">Log In</Link>
          <span>·</span>
          <Link href="/signup" className="hover:text-foreground">Sign Up</Link>
          <span>·</span>
          <Link href="/delete-account" className="hover:text-foreground">Delete Account</Link>
        </div>
      </footer>
    </div>
  )
}
