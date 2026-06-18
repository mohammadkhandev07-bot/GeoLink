'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { MessageCircle, Users, Film, Zap, Download, Smartphone, Check } from 'lucide-react'

export default function LandingPage() {
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [installMsg, setInstallMsg] = useState('')
  const [showSteps, setShowSteps] = useState(false)
  const [activeTab, setActiveTab] = useState('android')

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault()
      setInstallPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setIsInstalled(true))

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
    }

    // Auto detect device for tab
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isDesktop = window.innerWidth > 900
    if (isIOS) setActiveTab('ios')
    else if (isDesktop) setActiveTab('desktop')
    else setActiveTab('android')

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (isInstalled) { setShowSteps(true); return }

    if (installPrompt) {
      installPrompt.prompt()
      const { outcome } = await installPrompt.userChoice
      if (outcome === 'accepted') setInstallMsg('Installing GeoLink...')
      setInstallPrompt(null)
      return
    }
    setShowSteps(true)
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
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
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

        {/* INSTALL BUTTON - Big & prominent */}
        <div className="mt-6">
          <button
            onClick={handleInstall}
            disabled={isInstalled}
            className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-white font-semibold text-lg transition-all duration-200 hover:scale-105 active:scale-95 shadow-xl"
            style={{
              background: isInstalled
                ? 'linear-gradient(135deg, #10b981, #059669)'
                : 'linear-gradient(135deg, #ec4899, #a855f7, #06b6d4)',
              boxShadow: '0 8px 32px rgba(168,85,247,0.4)'
            }}
          >
            {isInstalled
              ? <><Check className="h-5 w-5" /> GeoLink Installed ✓</>
              : <><Download className="h-5 w-5" /> Install GeoLink App</>
            }
          </button>
          {installMsg && <p className="text-sm text-muted-foreground mt-2">{installMsg}</p>}
          <p className="text-xs text-muted-foreground mt-2">
            📱 Android, iPhone & Desktop — Free
          </p>
        </div>
      </section>

      {/* Install Steps Modal */}
      {showSteps && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowSteps(false)}
        >
          <div
            className="bg-card border rounded-2xl w-full max-w-sm p-6 space-y-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-pink-500 to-purple-500">
                <Smartphone className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-lg font-bold">Install GeoLink</h2>
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
              {['android', 'ios', 'desktop'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === tab
                      ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {tab === 'android' ? '🤖 Android' : tab === 'ios' ? '🍎 iPhone' : '💻 Desktop'}
                </button>
              ))}
            </div>

            {/* Steps */}
            <div className="space-y-3">
              {activeTab === 'android' && [
                ['Chrome mein kholo', 'geo-link-one.vercel.app'],
                ['3 dot menu ⋮ click karo', 'Browser ke top right corner mein'],
                ['"Add to Home Screen" select karo', 'List mein scroll karke dhundo'],
                ['"Add" tap karo ✅', 'GeoLink home screen pe aa jayega!'],
              ].map(([title, sub], i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">{i+1}</div>
                  <div>
                    <p className="text-sm font-semibold">{title}</p>
                    <p className="text-xs text-muted-foreground">{sub}</p>
                  </div>
                </div>
              ))}

              {activeTab === 'ios' && [
                ['Safari mein kholo', 'geo-link-one.vercel.app'],
                ['Share button tap karo 📤', 'Bottom bar mein square + arrow icon'],
                ['"Add to Home Screen" tap karo', 'Neeche scroll karke dhundo'],
                ['"Add" tap karo ✅', 'GeoLink home screen pe aa jayega!'],
              ].map(([title, sub], i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">{i+1}</div>
                  <div>
                    <p className="text-sm font-semibold">{title}</p>
                    <p className="text-xs text-muted-foreground">{sub}</p>
                  </div>
                </div>
              ))}

              {activeTab === 'desktop' && [
                ['Chrome mein kholo', 'geo-link-one.vercel.app'],
                ['Address bar mein ⊕ icon dhundo', 'Right side mein install icon hoga'],
                ['"Install" click karo ✅', 'GeoLink desktop app ki tarah khulega!'],
              ].map(([title, sub], i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">{i+1}</div>
                  <div>
                    <p className="text-sm font-semibold">{title}</p>
                    <p className="text-xs text-muted-foreground">{sub}</p>
                  </div>
                </div>
              ))}
            </div>

            <Button className="w-full" onClick={() => setShowSteps(false)}>
              Got it ✓
            </Button>
          </div>
        </div>
      )}

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

      {/* Footer */}
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        <p>© 2025 GeoLink. Made with ❤️</p>
      </footer>
    </div>
  )
}
