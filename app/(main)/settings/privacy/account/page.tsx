'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Lock, Image as ImageIcon, MessageCircle, Search } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import { useUser } from '@/lib/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { PrivacyOptionSelector, PrivacyLevel } from '@/components/shared/PrivacyOptionSelector'

export default function AccountPrivacyPage() {
  const { user, profile, loading } = useUser()
  const supabase = createClient()
  const [privacyLoading, setPrivacyLoading] = useState(false)
  const [postPrivacy, setPostPrivacy] = useState<PrivacyLevel>('everyone')
  const [messagePrivacy, setMessagePrivacy] = useState<PrivacyLevel>('everyone')
  const [searchPrivacy, setSearchPrivacy] = useState<PrivacyLevel>('everyone')

  useEffect(() => {
    if (!profile) return
    setPostPrivacy((profile as any).post_privacy || 'everyone')
    setMessagePrivacy((profile as any).message_privacy || 'everyone')
    setSearchPrivacy((profile as any).search_privacy || 'everyone')
  }, [profile])

  const togglePrivateAccount = async () => {
    if (!user || !profile) return
    setPrivacyLoading(true)
    await supabase.from('profiles').update({ is_private: !profile.is_private }).eq('id', user.id)
    setPrivacyLoading(false)
  }

  const updateField = async (field: 'post_privacy' | 'message_privacy' | 'search_privacy', value: PrivacyLevel) => {
    if (!user) return
    if (field === 'post_privacy') setPostPrivacy(value)
    if (field === 'message_privacy') setMessagePrivacy(value)
    if (field === 'search_privacy') setSearchPrivacy(value)
    await supabase.from('profiles').update({ [field]: value }).eq('id', user.id)
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
        <CardContent className="pt-4 divide-y">
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide pb-2">Private Account</p>
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5" />
              <div>
                <p className="text-sm font-medium">Private Account</p>
                <p className="text-xs text-muted-foreground max-w-[220px]">
                  New followers need your approval before they can follow you.
                </p>
              </div>
            </div>
            <Switch checked={profile.is_private} onCheckedChange={togglePrivateAccount} disabled={privacyLoading} />
          </div>
        </CardContent>
      </Card>

      <div>
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-2 px-1">Post Privacy</p>
        <PrivacyOptionSelector
          icon={<ImageIcon className="h-5 w-5" />}
          title="Who can see your posts"
          description="Choose who gets to see the photos, reels, and text posts you share"
          value={postPrivacy}
          onChange={v => updateField('post_privacy', v)}
          category="post"
          userId={user.id}
        />
      </div>

      <div>
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-2 px-1">Message Privacy</p>
        <PrivacyOptionSelector
          icon={<MessageCircle className="h-5 w-5" />}
          title="Who can message you"
          description="Choose who's allowed to start or continue a conversation with you"
          value={messagePrivacy}
          onChange={v => updateField('message_privacy', v)}
          category="message"
          userId={user.id}
        />
      </div>

      <div>
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-2 px-1">Search Result Privacy</p>
        <PrivacyOptionSelector
          icon={<Search className="h-5 w-5" />}
          title="Who can find you in search"
          description="Choose who can find your account through Explore and Search"
          value={searchPrivacy}
          onChange={v => updateField('search_privacy', v)}
          category="search"
          userId={user.id}
        />
      </div>
    </div>
  )
}
