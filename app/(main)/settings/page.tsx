'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { LogOut, Moon, Sun, Lock, Bell, User, ChevronRight, Smartphone, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import { useUser } from '@/lib/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import Link from 'next/link'

export default function SettingsPage() {
  const { user, profile, loading } = useUser()
  const { theme, setTheme } = useTheme()
  const [privacyLoading, setPrivacyLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const togglePrivacy = async () => {
    if (!user || !profile) return
    setPrivacyLoading(true)
    await supabase.from('profiles').update({ is_private: !profile.is_private }).eq('id', user.id)
    setPrivacyLoading(false)
    router.refresh()
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
          <Link href="/profile/edit" className="flex items-center justify-between py-3 hover:text-pink-500 transition-colors">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5" />
              <span className="text-sm font-medium">Edit Profile</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <div className="flex items-center justify-between py-3">
            <span className="text-sm font-medium">Email</span>
            <span className="text-sm text-muted-foreground">{user?.email}</span>
          </div>
        </CardContent>
      </Card>

      {/* Privacy */}
      <Card>
        <CardContent className="pt-4 divide-y">
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide pb-2">Privacy</p>
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5" />
              <div>
                <p className="text-sm font-medium">Private Account</p>
                <p className="text-xs text-muted-foreground">Only approved followers can see your posts</p>
              </div>
            </div>
            <Switch checked={profile.is_private} onCheckedChange={togglePrivacy} disabled={privacyLoading} />
          </div>
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

      {/* Delete Account - subtle, only visible in settings */}
      <div className="pt-4 border-t">
        <Link href="/delete-account">
          <button className="w-full flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground hover:text-red-500 transition-colors">
            <Trash2 className="h-4 w-4" />
            Delete Account
          </button>
        </Link>
      </div>

      <p className="text-center text-xs text-muted-foreground pb-4">GeoLink v1.0.0</p>
    </div>
  )
}
