'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Edit } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/hooks/useUser'
import { getAvatarUrl, formatTimeAgo } from '@/lib/utils/helpers'
import { PageLoader } from '@/components/shared/LoadingSpinner'

interface Chat {
  id: string
  participant1_id: string
  participant2_id: string
  last_message: string | null
  last_message_time: string | null
  last_message_type: string | null
  participant1: { id: string; username: string; avatar_url: string | null }
  participant2: { id: string; username: string; avatar_url: string | null }
  unread_count?: number
}

export default function ChatPage() {
  const { user, loading } = useUser()
  const [chats, setChats] = useState<Chat[]>([])
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({})
  const router = useRouter()
  const supabase = createClient()

  const fetchChats = async () => {
    if (!user) return
    const { data } = await supabase
      .from('chats')
      .select('*, participant1:profiles!chats_participant1_id_fkey(id,username,avatar_url), participant2:profiles!chats_participant2_id_fkey(id,username,avatar_url)')
      .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
      .order('last_message_time', { ascending: false })
    if (data) setChats(data as Chat[])

    // Unread counts
    const { data: unread } = await supabase
      .from('messages')
      .select('chat_id')
      .eq('is_read', false)
      .neq('sender_id', user.id)
    if (unread) {
      const counts: Record<string, number> = {}
      unread.forEach(m => { counts[m.chat_id] = (counts[m.chat_id] || 0) + 1 })
      setUnreadMap(counts)
    }
  }

  useEffect(() => {
    if (!user) return
    fetchChats()
    const channel = supabase
      .channel('chat-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, fetchChats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, fetchChats)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user])

  if (loading) return <PageLoader />

  const getLastMessagePreview = (chat: Chat) => {
    if (!chat.last_message) return ''
    if (chat.last_message_type === 'post') return '📎 Shared a post'
    if (chat.last_message_type === 'reel') return '🎬 Shared a reel'
    return chat.last_message
  }

  const getOther = (chat: Chat) =>
    chat.participant1_id === user?.id ? chat.participant2 : chat.participant1

  return (
    <div className="max-w-xl mx-auto">
      <div className="sticky top-14 z-10 bg-background border-b px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">Messages</h1>
        <button className="text-muted-foreground hover:text-foreground">
          <Edit className="h-5 w-5" />
        </button>
      </div>

      {chats.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="font-medium">No messages yet</p>
          <p className="text-sm mt-1">Start a conversation!</p>
        </div>
      ) : (
        <div>
          {chats.map(chat => {
            const other = getOther(chat)
            const unread = unreadMap[chat.id] || 0
            return (
              <button
                key={chat.id}
                onClick={() => router.push(`/chat/${chat.id}`)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors border-b text-left"
              >
                <div className="relative shrink-0">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={getAvatarUrl(other?.avatar_url)} />
                    <AvatarFallback>{other?.username?.[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  {/* Unread red dot on avatar */}
                  {unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm truncate ${unread > 0 ? 'font-bold' : 'font-semibold'}`}>
                      {other?.username}
                    </p>
                    <p className="text-xs text-muted-foreground shrink-0 ml-2">
                      {chat.last_message_time ? formatTimeAgo(chat.last_message_time) : ''}
                    </p>
                  </div>
                  <p className={`text-xs truncate mt-0.5 ${unread > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                    {getLastMessagePreview(chat)}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
