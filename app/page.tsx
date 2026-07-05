'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { MessageCircle, Users, Film, Zap, Download, Check, Share, MoreHorizontal, Plus } from 'lucide-react'

type Device = 'android' | 'ios' | 'desktop' | 'other'
type InstallState = 'idle' | 'installing' | 'installed'

export default function LandingPage() {
  const [device, setDevice] = useState<Device>('other')
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [installState, setInstallState] = useState<InstallState>('idle')
  const [showGuide, setShowGuide] = useState(false)
  const [guideStep, setGuideStep] = useState(0)

  useEffect(() => {
    // Detect device
    const ua = navigator.userAgent
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream
    const isAndroid = /Android/.test(ua)
    const isMobile = isIOS || isAndroid

    if (isIOS) setDevice('ios')
    else if (isAndroid) setDevice('android')
    else setDevice('desktop')

    // Already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstallState('installed')
      return
    }

    // Capture Android/Desktop install prompt
    const handler = (e: any) => {
      e.preventDefault()
      setInstallPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => {
      setInstallState('installed')
      setShowGuide(false)
    })

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstallClick = async () => {
    if (installState === 'installed') return

    // Android with native prompt available
    if (installPrompt) {
      setInstallState('installing')
      try {
        await installPrompt.prompt()
        const { outcome } = await installPrompt.userChoice
        if (outcome === 'accepted') {
          setInstallState('installed')
        } else {
          setInstallState('idle')
        }
      } catch {
        setInstallState('idle')
      }
      setInstallPrompt(null)
      return
    }

    // iOS or Android without prompt (show guide)
    setShowGuide(true)
    setGuideStep(0)
  }

  const getButtonText = () => {
    if (installState === 'installed') return 'GeoLink Installed ✓'
    if (installState === 'installing') return 'Installing...'
    return 'Install GeoLink — Free'
  }

  const getButtonIcon = () => {
    if (installState === 'installed') return <Check className="h-5 w-5" />
    if (installState === 'installing') return <div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
    return <Download className="h-5 w-5" />
  }

  // Guide steps per device
  const iosSteps = [
    {
      icon: '🌐',
      title: 'Open in Safari',
      desc: 'Make sure you are using Safari browser. Chrome will not work for installation on iPhone.',
    },
    {
      icon: '📤',
      title: 'Tap the Share button',
      desc: 'At the bottom of your screen, tap the Share icon (square with an arrow pointing up).',
    },
    {
      icon: '➕',
      title: 'Select "Add to Home Screen"',
      desc: 'Scroll down in the menu and tap "Add to Home Screen".',
    },
    {
      icon: '✅',
      title: 'Tap "Add"',
      desc: 'Tap the "Add" button in the top right corner. GeoLink will appear on your home screen!',
    },
  ]

  const androidSteps = [
    {
      icon: '🌐',
      title: 'Open in Chrome',
      desc: 'Make sure you are using Google Chrome browser.',
    },
    {
      icon: '⋮',
      title: 'Tap the menu (3 dots)',
      desc: 'In the top right corner of Chrome, tap the three-dot menu icon.',
    },
    {
      icon: '📲',
      title: 'Select "Add to Home Screen"',
      desc: 'Tap "Add to Home Screen" or "Install App" from the menu.',
    },
    {
      icon: '✅',
      title: 'Tap "Install"',
      desc: 'Confirm the installation. GeoLink will appear on your home screen!',
    },
  ]

  const desktopSteps = [
    {
      icon: '🌐',
      title: 'Open in Chrome or Edge',
      desc: 'Make sure you are using Google Chrome or Microsoft Edge browser.',
    },
    {
      icon: '⊕',
      title: 'Look for the install icon',
      desc: 'In the address bar on the right side, you will see an install icon (computer with arrow).',
    },
    {
      icon: '✅',
      title: 'Click "Install"',
      desc: 'Click the install icon and then click "Install". GeoLink will open like a desktop app!',
    },
  ]

  const steps = device === 'ios' ? iosSteps : device === 'desktop' ? desktopSteps : androidSteps
  const currentStep = steps[guideStep]
  const isLastStep = guideStep === steps.length - 1

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
            <Link href="/login">
              <Button variant="outline" size="sm">Log In</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="bg-gradient-to-r from-pink-500 to-purple-500 text-white border-0">
                Sign Up
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-3xl mx-auto px-4 pt-16 pb-12 text-center">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="absolute inset-0 rounded-3xl blur-2xl opacity-40"
              style={{ background: 'linear-gradient(135deg, #ec4899, #a855f7, #06b6d4)', transform: 'scale(1.1)' }} />
            <Image
              src="/images/geolink-logo.png"
              alt="GeoLink"
              width={100}
              height={100}
              className="relative rounded-3xl shadow-2xl"
            />
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-4xl sm:text-6xl font-extrabold mb-5 leading-tight tracking-tight">
          Connect With The{' '}
          <span className="bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
            World
          </span>
        </h1>

        <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto leading-relaxed">
          Share moments, discover stories, and build genuine connections with people around you.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
          <Link href="/signup">
            <Button size="lg" className="px-10 w-full sm:w-auto text-base font-semibold bg-gradient-to-r from-pink-500 to-purple-500 text-white border-0 h-12">
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
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={handleInstallClick}
            disabled={installState === 'installing' || installState === 'installed'}
            className="inline-flex items-center gap-3 px-10 py-4 rounded-2xl text-white font-bold text-lg transition-all duration-200 disabled:cursor-default"
            style={{
              background: installState === 'installed'
                ? 'linear-gradient(135deg, #10b981, #059669)'
                : 'linear-gradient(135deg, #ec4899, #a855f7, #06b6d4)',
              boxShadow: installState === 'installed'
                ? '0 8px 32px rgba(16,185,129,0.35)'
                : '0 8px 32px rgba(168,85,247,0.4)',
              transform: installState === 'idle' ? 'translateY(0)' : 'translateY(0)',
            }}
            onMouseEnter={e => { if (installState === 'idle') (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)' }}
          >
            {getButtonIcon()}
            {getButtonText()}
          </button>

          {/* Platform note */}
          {installState === 'idle' && (
            <p className="text-xs text-muted-foreground">
              {device === 'ios' && '🍎 iPhone / iPad — Free install'}
              {device === 'android' && '🤖 Android — Free install'}
              {device === 'desktop' && '💻 Windows / Mac / Linux — Free install'}
              {device === 'other' && '📱 Available on all devices — Free'}
            </p>
          )}

          {installState === 'installed' && (
            <Link href="/feed" className="text-sm text-pink-500 font-medium hover:underline">
              Open GeoLink →
            </Link>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-14 border-t">
        <h2 className="text-3xl font-bold text-center mb-2">Everything you need</h2>
        <p className="text-muted-foreground text-center mb-10">One app for social media, messaging, and more.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { icon: MessageCircle, title: 'Real-time Chat', desc: 'Instant messaging with typing indicators and online status.' },
            { icon: Users, title: 'Follow System', desc: 'Follow friends or keep your account private with approval.' },
            { icon: Film, title: 'Reels', desc: 'Short videos in a TikTok-style vertical scrolling feed.' },
            { icon: Zap, title: 'Live Feed', desc: 'See posts from people you follow, updated instantly.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="p-6 rounded-2xl border bg-card text-center hover:border-pink-500/40 hover:shadow-lg transition-all">
              <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-pink-500/15 to-purple-500/15 mb-4">
                <Icon className="h-6 w-6 text-pink-500" />
              </div>
              <h3 className="font-semibold mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
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

      {/* Install Guide Modal */}
      {showGuide && currentStep && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowGuide(false)}
        >
          <div
            className="bg-card border rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Progress bar */}
            <div className="h-1 bg-muted">
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${((guideStep + 1) / steps.length) * 100}%`,
                  background: 'linear-gradient(90deg, #ec4899, #a855f7)',
                }}
              />
            </div>

            <div className="p-6 space-y-5">
              {/* Header */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">
                  Step {guideStep + 1} of {steps.length}
                </span>
                <button
                  onClick={() => setShowGuide(false)}
                  className="text-muted-foreground hover:text-foreground text-xl leading-none"
                >
                  ×
                </button>
              </div>

              {/* Step content */}
              <div className="text-center space-y-3">
                <div className="text-5xl">{currentStep.icon}</div>
                <h3 className="text-xl font-bold">{currentStep.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{currentStep.desc}</p>
              </div>

              {/* Navigation */}
              <div className="flex gap-3">
                {guideStep > 0 && (
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setGuideStep(g => g - 1)}
                  >
                    Back
                  </Button>
                )}
                {!isLastStep ? (
                  <Button
                    className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 text-white border-0"
                    onClick={() => setGuideStep(g => g + 1)}
                  >
                    Next →
                  </Button>
                ) : (
                  <Button
                    className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 text-white border-0"
                    onClick={() => setShowGuide(false)}
                  >
                    Got it ✓
                  </Button>
                )}
              </div>

              {/* Step dots */}
              <div className="flex justify-center gap-1.5">
                {steps.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setGuideStep(i)}
                    className="rounded-full transition-all"
                    style={{
                      width: i === guideStep ? 20 : 6,
                      height: 6,
                      background: i === guideStep
                        ? 'linear-gradient(90deg, #ec4899, #a855f7)'
                        : 'rgba(128,128,128,0.3)',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
