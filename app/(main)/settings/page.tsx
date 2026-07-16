'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { LogOut, Moon, Sun, Bell, ChevronRight, Smartphone, User, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import { useUser } from '@/lib/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import Link from 'next/link'

export default function SettingsPage() {
  const { profile, loading } = useUser()
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const supabase = createClient()

  // PWA install - lives here (not the landing page) so it only shows up once
  // someone already has an account and has spent a bit of time in the app,
  // which is also when the browser is actually willing to fire the native prompt.
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [installed, setInstalled] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true)
    }
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream)

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
    if (installed) return

    if (installPrompt) {
      setInstalling(true)
      await installPrompt.prompt()
      const { outcome } = await installPrompt.userChoice
      if (outcome !== 'accepted') setInstalling(false)
      setInstallPrompt(null)
      return
    }

    if (isIOS) {
      alert('To install GeoLink on iPhone:\n\n1. Open this page in Safari\n2. Tap the Share button (bottom center)\n3. Tap "Add to Home Screen"\n4. Tap "Add"')
      return
    }

    alert("Your browser doesn't support installing GeoLink yet. Try opening this page in Chrome or Edge.")
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return <PageLoader />
  if (!profile) return null

  return (
    <div className="max-w-xl mx-auto p-4 space-y-4">
      <h1 className="text-xl font-bold">Settings</h1>

      {/* Account */}
      <Card>
        <CardContent className="pt-4 divide-y">
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide pb-2">Account</p>
          <Link href="/settings/general" className="flex items-center justify-between py-3 hover:text-pink-500 transition-colors">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5" />
              <div>
                <span className="text-sm font-medium block">General Settings</span>
                <span className="text-xs text-muted-foreground">Edit profile, accounts, saved posts</span>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </CardContent>
      </Card>

      {/* Privacy */}
      <Card>
        <CardContent className="pt-4 divide-y">
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide pb-2">Privacy</p>
          <Link href="/settings/privacy" className="flex items-center justify-between py-3 hover:text-pink-500 transition-colors">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5" />
              <div>
                <span className="text-sm font-medium block">Privacy Settings</span>
                <span className="text-xs text-muted-foreground">Account privacy, policy & terms</span>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardContent className="pt-4 divide-y">
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide pb-2">Appearance</p>
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              <span className="text-sm font-medium">Dark Mode</span>
            </div>
            <Switch checked={theme === 'dark'} onCheckedChange={checked => setTheme(checked ? 'dark' : 'light')} />
          </div>
        </CardContent>
      </Card>

      {/* App - only show if not already installed */}
      {!installed && (
        <Card>
          <CardContent className="pt-4 divide-y">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide pb-2">App</p>
            <button
              onClick={handleInstall}
              disabled={installing}
              className="w-full flex items-center justify-between py-3 text-left hover:text-pink-500 transition-colors disabled:hover:text-inherit disabled:cursor-default"
            >
              <div className="flex items-center gap-3">
                <Smartphone className="h-5 w-5" />
                <div>
                  <p className="text-sm font-medium">
                    {installing ? 'Installing...' : 'Install GeoLink'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Add GeoLink to your home screen for quick access
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </CardContent>
        </Card>
      )}

      {/* Notifications */}
      <Card>
        <CardContent className="pt-4 divide-y">
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide pb-2">Notifications</p>
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5" />
              <span className="text-sm font-medium">Push Notifications</span>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      {/* Logout */}
      <Button variant="destructive" className="w-full gap-2" onClick={handleLogout}>
        <LogOut className="h-4 w-4" />
        Log Out
      </Button>

      <p className="text-center text-xs text-muted-foreground pb-4">GeoLink v1.0.0</p>
    </div>
  )
}
