'use client'

import { useEffect, useState, useRef } from 'react'
import { Bell } from 'lucide-react'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/hooks/useUser'
import { formatTimeAgo, getAvatarUrl } from '@/lib/utils/helpers'
import { cn } from '@/lib/utils/helpers'

interface Notification {
  id: string
  type: 'like' | 'comment' | 'follow' | 'unfollow' | 'message'
  is_read: boolean
  created_at: string
  message: string | null
  post_id: string | null
  actor: {
    id: string
    username: string
    avatar_url: string | null
  }
}

export function NotificationPanel() {
  const { user } = useUser()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const panelRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const fetchNotifications = async () => {
    if (!user) return
    const { data } = await supabase
      .from('notifications')
      .select('*, actor:profiles!notifications_actor_id_fkey(id, username, avatar_url)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30)

    if (data) {
      setNotifications(data as Notification[])
      setUnreadCount(data.filter(n => !n.is_read).length)
    }
  }

  const markAllRead = async () => {
    if (!user) return
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
    setUnreadCount(0)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  useEffect(() => {
    fetchNotifications()
  }, [user])

  // Realtime notifications
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        fetchNotifications()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const getNotifText = (n: Notification) => {
    switch (n.type) {
      case 'like': return 'liked your post'
      case 'comment': return `commented: "${n.message?.slice(0, 40)}"`
      case 'follow': return 'started following you'
      case 'unfollow': return 'unfollowed you'
      case 'message': return 'sent you a message'
      default: return ''
    }
  }

  const getNotifLink = (n: Notification) => {
    switch (n.type) {
      case 'like':
      case 'comment': return n.post_id ? `/feed` : '/'
      case 'follow':
      case 'unfollow': return `/profile/${n.actor.username}`
      case 'message': return '/chat'
      default: return '/'
    }
  }

  const handleOpen = () => {
    setOpen(!open)
    if (!open) markAllRead()
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute right-0 top-12 w-80 bg-card border rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="font-bold text-base">Notifications</h3>
            {unreadCount === 0 && notifications.length > 0 && (
              <button
                onClick={async () => {
                  if (!user) return
                  await supabase.from('notifications').delete().eq('user_id', user.id)
                  setNotifications([])
                }}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                Clear all
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                <Bell className="h-8 w-8 opacity-30" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => (
                <Link
                  key={n.id}
                  href={getNotifLink(n)}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex items-start gap-3 px-4 py-3 hover:bg-accent transition-colors',
                    !n.is_read && 'bg-primary/5'
                  )}
                >
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={getAvatarUrl(n.actor.avatar_url)} />
                    <AvatarFallback>{n.actor.username?.[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-semibold">{n.actor.username}</span>{' '}
                      <span className="text-muted-foreground">{getNotifText(n)}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatTimeAgo(n.created_at)}</p>
                  </div>
                  {!n.is_read && (
                    <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                  )}
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
