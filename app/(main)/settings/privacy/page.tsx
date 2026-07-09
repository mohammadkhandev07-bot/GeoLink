'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Lock } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import { useUser } from '@/lib/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import Link from 'next/link'

export default function PrivacySettingsPage() {
  const { user, profile, loading } = useUser()
  const [privacyLoading, setPrivacyLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

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
      <div className="flex items-center gap-2">
        <Link href="/settings" className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">Privacy Settings</h1>
      </div>

      <Card>
        <CardContent className="pt-4 divide-y">
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide pb-2">Account Privacy</p>
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5" />
              <div>
                <p className="text-sm font-medium">Private Account</p>
                <p className="text-xs text-muted-foreground max-w-[220px]">
                  Only approved followers can see your posts. New followers will need your approval.
                </p>
              </div>
            </div>
            <Switch checked={profile.is_private} onCheckedChange={togglePrivacy} disabled={privacyLoading} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
