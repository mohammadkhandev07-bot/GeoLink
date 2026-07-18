'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Bell, MessageCircle, Image as ImageIcon } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import { useUser } from '@/lib/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { PrivacyOptionSelector, PrivacyLevel } from '@/components/shared/PrivacyOptionSelector'

export default function NotificationsSettingsPage() {
  const { user, loading } = useUser()
  const supabase = createClient()
  const [pushEnabled, setPushEnabled] = useState(true)
  const [notifyMessages, setNotifyMessages] = useState<PrivacyLevel>('everyone')
  const [notifyPosts, setNotifyPosts] = useState<PrivacyLevel>('everyone')

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('notify_messages, notify_posts')
        .eq('id', user.id)
        .single()
      if (data) {
        setNotifyMessages((data as any).notify_messages || 'everyone')
        setNotifyPosts((data as any).notify_posts || 'everyone')
      }
      const stored = localStorage.getItem('geolink-push-enabled')
      setPushEnabled(stored !== 'false')
    }
    load()
  }, [user])

  const togglePush = (checked: boolean) => {
    setPushEnabled(checked)
    localStorage.setItem('geolink-push-enabled', String(checked))
  }

  const updateField = async (field: 'notify_messages' | 'notify_posts', value: PrivacyLevel) => {
    if (!user) return
    if (field === 'notify_messages') setNotifyMessages(value)
    if (field === 'notify_posts') setNotifyPosts(value)
    await supabase.from('profiles').update({ [field]: value }).eq('id', user.id)
  }

  if (loading) return <PageLoader />
  if (!user) return null

  return (
    <div className="max-w-xl mx-auto p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/settings/privacy" className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">Notifications</h1>
      </div>

      <Card>
        <CardContent className="pt-4 divide-y">
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide pb-2">Push Notifications</p>
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5" />
              <div>
                <p className="text-sm font-medium">Push Notifications</p>
                <p className="text-xs text-muted-foreground max-w-[220px]">
                  Turn this off to stop all push notifications on this device
                </p>
              </div>
            </div>
            <Switch checked={pushEnabled} onCheckedChange={togglePush} />
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground px-1">
        By default you're notified about everything. Change these anytime - if you never touch them, nothing changes.
      </p>

      <div>
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-2 px-1">Message Notifications</p>
        <PrivacyOptionSelector
          icon={<MessageCircle className="h-5 w-5" />}
          title="Who's messages notify you"
          description="Choose whose messages should trigger a notification"
          value={notifyMessages}
          onChange={v => updateField('notify_messages', v)}
          category="notify_message"
          userId={user.id}
        />
      </div>

      <div>
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-2 px-1">Post Notifications</p>
        <PrivacyOptionSelector
          icon={<ImageIcon className="h-5 w-5" />}
          title="Whose new posts notify you"
          description="Choose whose new posts should trigger a notification"
          value={notifyPosts}
          onChange={v => updateField('notify_posts', v)}
          category="notify_post"
          userId={user.id}
        />
      </div>
    </div>
  )
}
