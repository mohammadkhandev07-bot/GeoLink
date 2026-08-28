'use client'

import Link from 'next/link'
import { ChevronLeft, Lock } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import { useUser } from '@/lib/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { useState } from 'react'

export default function AccountPrivacyPage() {
  const { user, profile, loading } = useUser()
  const supabase = createClient()
  const [privacyLoading, setPrivacyLoading] = useState(false)

  const togglePrivateAccount = async () => {
    if (!user || !profile) return
    setPrivacyLoading(true)
    await supabase.from('profiles').update({ is_private: !profile.is_private }).eq('id', user.id)
    setPrivacyLoading(false)
  }

  if (loading) return <PageLoader />
  if (!profile || !user) return null

  return (
    <div className="max-w-xl mx-auto p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/settings/privacy" className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">Account Privacy</h1>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5" />
              <div>
                <p className="text-sm font-medium">Private Account</p>
                <p className="text-xs text-muted-foreground max-w-[240px]">
                  New followers need your approval before they can follow you.
                </p>
              </div>
            </div>
            <Switch checked={profile.is_private} onCheckedChange={togglePrivateAccount} disabled={privacyLoading} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
