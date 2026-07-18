'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Circle, MoreVertical, Trash2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { RealtimeMessages } from '@/components/chat/RealtimeMessages'
import { MessageInput } from '@/components/chat/MessageInput'
import { useUser } from '@/lib/hooks/useUser'
import { useRealtimeMessages } from '@/lib/hooks/useRealtimeMessages'
import { createClient } from '@/lib/supabase/client'
import { ChatWithProfiles } from '@/lib/types/database.types'
import { getAvatarUrl } from '@/lib/utils/helpers'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function ChatRoomPage() {
  const params = useParams()
  const chatId = params.chatId as string
  const { user, loading } = useUser()
  const [chat, setChat] = useState<ChatWithProfiles | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [canSend, setCanSend] = useState(true)
  const [restrictionMessage, setRestrictionMessage] = useState('')
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

  // Live-check the other person's Message Privacy setting every time this
  // conversation is opened - it may have changed since the chat was created.
  useEffect(() => {
    if (!chat || !user) return
    const other = chat.participant1_id === user.id ? chat.participant2 : chat.participant1
    const privacy = (other as any).message_privacy || 'everyone'

    const check = async () => {
      if (privacy === 'everyone') { setCanSend(true); return }
      if (privacy === 'none') { setCanSend(false); setRestrictionMessage('Message is not available.'); return }

      if (privacy === 'followers') {
        const { data } = await supabase.from('follows').select('id')
          .eq('follower_id', user.id).eq('following_id', other.id).eq('status', 'accepted').maybeSingle()
        setCanSend(!!data)
        if (!data) setRestrictionMessage('Message is unavailable. Please follow and start conversation.')
        return
      }
      if (privacy === 'following') {
        const { data } = await supabase.from('follows').select('id')
          .eq('follower_id', other.id).eq('following_id', user.id).eq('status', 'accepted').maybeSingle()
        setCanSend(!!data)
        if (!data) setRestrictionMessage('Message is only available to people this user follows.')
        return
      }
      if (privacy === 'selected') {
        const { data } = await supabase.from('privacy_selected_users').select('id')
          .eq('owner_id', other.id).eq('category', 'message').eq('selected_user_id', user.id).maybeSingle()
        setCanSend(!!data)
        if (!data) setRestrictionMessage('Message is a selected person are available.')
        return
      }
      setCanSend(true)
    }
    check()
  }, [chat, user])

  useEffect(() => {
    if (!user || !chatId) return
    supabase
      .from('messages')
      .update({ is_read: true })
      .eq('chat_id', chatId)
      .neq('sender_id', user.id)
      .then(() => {})
  }, [messages, chatId, user])

  const handleDeleteChat = async () => {
    if (!confirm('Delete this conversation? This cannot be undone.')) return
    setDeleting(true)
    try {
      // Pehle messages delete karo
      await supabase.from('messages').delete().eq('chat_id', chatId)
      // Phir chat delete karo
      await supabase.from('chats').delete().eq('id', chatId)
      router.replace('/chat')
    } catch (err) {
      console.error(err)
      setDeleting(false)
    }
  }

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
          <AvatarImage src={getAvatarUrl(other.avatar_url)} />
          <AvatarFallback>{other.username?.[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="font-semibold text-sm">{other.username}</p>
          <div className="flex items-center gap-1">
            <Circle className={`h-2 w-2 fill-current ${isOnline ? 'text-green-500' : 'text-muted-foreground'}`} />
            <span className="text-xs text-muted-foreground">{isOnline ? 'Online' : 'Offline'}</span>
          </div>
        </div>

        {/* 3 dot menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-accent transition-colors">
              <MoreVertical className="h-5 w-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-destructive focus:text-destructive gap-2 cursor-pointer"
              onClick={handleDeleteChat}
              disabled={deleting}
            >
              <Trash2 className="h-4 w-4" />
              {deleting ? 'Deleting...' : 'Delete Conversation'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Messages */}
      <RealtimeMessages messages={messages} currentUserId={user.id} isTyping={isTyping} />

      {/* Input */}
      {canSend ? (
        <MessageInput onSend={sendMessage} onTyping={sendTypingIndicator} />
      ) : (
        <div className="px-4 py-4 border-t text-center">
          <p className="text-sm text-muted-foreground">{restrictionMessage}</p>
        </div>
      )}
    </div>
  )
}
