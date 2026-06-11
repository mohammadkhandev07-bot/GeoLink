'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Circle } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { RealtimeMessages } from '@/components/chat/RealtimeMessages'
import { MessageInput } from '@/components/chat/MessageInput'
import { useUser } from '@/lib/hooks/useUser'
import { useRealtimeMessages } from '@/lib/hooks/useRealtimeMessages'
import { createClient } from '@/lib/supabase/client'
import { ChatWithProfiles } from '@/lib/types/database.types'
import { getAvatarUrl } from '@/lib/utils/helpers'
import { PageLoader } from '@/components/shared/LoadingSpinner'

export default function ChatRoomPage() {
  const { chatId } = useParams<{ chatId: string }>()
  const { user, loading } = useUser()
  const [chat, setChat] = useState<ChatWithProfiles | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const { messages, isTyping, onlineUsers, sendMessage, sendTypingIndicator } =
    useRealtimeMessages(chatId, user?.id ?? '')

  useEffect(() => {
    if (!chatId) return
    supabase
      .from('chats')
      .select('*, participant1:profiles!chats_participant1_id_fkey(*), participant2:profiles!chats_participant2_id_fkey(*)')
      .eq('id', chatId)
      .single()
      .then(({ data }) => setChat(data as ChatWithProfiles))
  }, [chatId])

  // Mark messages as read
  useEffect(() => {
    if (!user || !chatId) return
    supabase
      .from('messages')
      .update({ is_read: true })
      .eq('chat_id', chatId)
      .neq('sender_id', user.id)
      .then(() => {})
  }, [messages, chatId, user])

  if (loading || !chat) return <PageLoader />
  if (!user) return null

  const other = chat.participant1_id === user.id ? chat.participant2 : chat.participant1
  const isOnline = onlineUsers.includes(other.id)

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-background sticky top-14 z-10">
        <button onClick={() => router.back()} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Avatar className="h-9 w-9">
          <AvatarFallback>{other.username?.[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold text-sm">{other.username}</p>
          <div className="flex items-center gap-1">
            <Circle className={`h-2 w-2 fill-current ${isOnline ? 'text-green-500' : 'text-muted-foreground'}`} />
            <span className="text-xs text-muted-foreground">{isOnline ? 'Online' : 'Offline'}</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <RealtimeMessages messages={messages} currentUserId={user.id} isTyping={isTyping} />

      {/* Input */}
      <MessageInput
        onSend={sendMessage}
        onTyping={sendTypingIndicator}
      />
    </div>
  )
}
