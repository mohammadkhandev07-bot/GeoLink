'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Circle, MoreVertical, Trash2, PencilLine, Ban } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { RealtimeMessages } from '@/components/chat/RealtimeMessages'
import { MessageInput } from '@/components/chat/MessageInput'
import { NicknameModal } from '@/components/chat/NicknameModal'
import { useUser } from '@/lib/hooks/useUser'
import { useRealtimeMessages } from '@/lib/hooks/useRealtimeMessages'
import { useActiveStories } from '@/lib/hooks/useStories'
import { useNickname, useSetNickname, useDeleteNickname, useBlockStatus, useToggleBlock, useDeleteChatForMe } from '@/lib/hooks/useChatSettings'
import { StoryViewer } from '@/components/stories/StoryViewer'
import { createClient } from '@/lib/supabase/client'
import { ChatWithProfiles, Message } from '@/lib/types/database.types'
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
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [showStory, setShowStory] = useState(false)
  const [showNicknameModal, setShowNicknameModal] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const { messages, isTyping, onlineUsers, sendMessage, sendTypingIndicator, removeMessageLocally, patchMessageLocally } =
    useRealtimeMessages(chatId, user?.id ?? '')
  const { data: storyGroups = [] } = useActiveStories(user?.id)

  const other = chat && user ? (chat.participant1_id === user.id ? chat.participant2 : chat.participant1) : null

  const { data: myNicknameForThem } = useNickname(chatId, user?.id)
  const setNickname = useSetNickname()
  const deleteNickname = useDeleteNickname()
  const { data: blockStatus } = useBlockStatus(user?.id, other?.id)
  const toggleBlock = useToggleBlock()
  const deleteChatForMe = useDeleteChatForMe()

  const theyBlockedMe = !!blockStatus?.theyBlockedMe
  const iBlockedThem = !!blockStatus?.iBlockedThem

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
    const otherP = chat.participant1_id === user.id ? chat.participant2 : chat.participant1
    const privacy = (otherP as any).message_privacy || 'everyone'

    const check = async () => {
      if (privacy === 'everyone') { setCanSend(true); return }
      if (privacy === 'none') { setCanSend(false); setRestrictionMessage('Message is not available.'); return }

      if (privacy === 'followers') {
        const { data } = await supabase.from('follows').select('id')
          .eq('follower_id', user.id).eq('following_id', otherP.id).eq('status', 'accepted').maybeSingle()
        setCanSend(!!data)
        if (!data) setRestrictionMessage('Message is unavailable. Please follow and start conversation.')
        return
      }
      if (privacy === 'following') {
        const { data } = await supabase.from('follows').select('id')
          .eq('follower_id', otherP.id).eq('following_id', user.id).eq('status', 'accepted').maybeSingle()
        setCanSend(!!data)
        if (!data) setRestrictionMessage('Message is only available to people this user follows.')
        return
      }
      if (privacy === 'selected') {
        const { data } = await supabase.from('privacy_selected_users').select('id')
          .eq('owner_id', otherP.id).eq('category', 'message').eq('selected_user_id', user.id).maybeSingle()
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
    if (!user) return
    if (!confirm('Delete this conversation? It will be removed from your inbox.')) return
    setDeleting(true)
    try {
      await deleteChatForMe.mutateAsync({ chatId, userId: user.id })
      router.replace('/chat')
    } catch (err) {
      console.error(err)
      setDeleting(false)
    }
  }

  const handleSaveNickname = async (nickname: string) => {
    if (!user || !other) return
    await setNickname.mutateAsync({ chatId, setById: user.id, targetId: other.id, nickname })
    setShowNicknameModal(false)
  }

  const handleDeleteNickname = async () => {
    if (!user) return
    await deleteNickname.mutateAsync({ chatId, setById: user.id })
    setShowNicknameModal(false)
  }

  const handleToggleBlock = () => {
    if (!user || !other) return
    const willBlock = !iBlockedThem
    if (willBlock && !confirm(`Block ${other.username}? They won't be able to message you, and your profile will be hidden from them here.`)) return
    toggleBlock.mutate({ blockerId: user.id, blockedId: other.id, block: willBlock })
  }

  if (loading || !chat || !other) return <PageLoader />
  if (!user) return null

  const isOnline = onlineUsers.includes(other.id)
  const otherStoryGroupIndex = storyGroups.findIndex(g => g.userId === other.id)
  const hasStory = otherStoryGroupIndex !== -1 && !theyBlockedMe

  // If they blocked me, their profile shows anonymized in my view of this
  // chat - and messages I already exchanged with them from their side
  // still render, but as an unavailable placeholder (see isMessageUnavailable).
  const displayName = theyBlockedMe ? 'GeoLink User' : (myNicknameForThem || other.username)
  const displayAvatar = theyBlockedMe ? null : getAvatarUrl(other.avatar_url)
  const canSendFinal = canSend && !theyBlockedMe && !iBlockedThem

  const isMessageUnavailable = (senderId: string) => {
    if ((chat as any).deleted_by?.includes(senderId)) return true
    if (theyBlockedMe && senderId === other.id) return true
    return false
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-background sticky top-14 z-10">
        <button onClick={() => router.back()} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <button
          onClick={() => theyBlockedMe ? undefined : (hasStory ? setShowStory(true) : router.push(`/profile/${other.username}`))}
          className="shrink-0"
          disabled={theyBlockedMe}
        >
          <div className={hasStory ? 'p-[2px] rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600' : ''}>
            <div className={hasStory ? 'p-[2px] rounded-full bg-background' : ''}>
              <Avatar className="h-9 w-9">
                <AvatarImage src={displayAvatar || undefined} />
                <AvatarFallback>{displayName?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </button>
        <div className="flex-1 min-w-0">
          <button
            onClick={() => theyBlockedMe ? undefined : (hasStory ? setShowStory(true) : router.push(`/profile/${other.username}`))}
            disabled={theyBlockedMe}
            className="font-semibold text-sm hover:underline text-left truncate block"
          >
            {displayName}
          </button>
          {!theyBlockedMe && (
            <div className="flex items-center gap-1">
              <Circle className={`h-2 w-2 fill-current ${isOnline ? 'text-green-500' : 'text-muted-foreground'}`} />
              <span className="text-xs text-muted-foreground">{isOnline ? 'Online' : 'Offline'}</span>
            </div>
          )}
        </div>

        {/* 3 dot menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-accent transition-colors">
              <MoreVertical className="h-5 w-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!theyBlockedMe && (
              <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => setShowNicknameModal(true)}>
                <PencilLine className="h-4 w-4" />
                {myNicknameForThem ? 'Edit Nickname' : 'Set Nickname'}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem className="gap-2 cursor-pointer" onClick={handleToggleBlock}>
              <Ban className="h-4 w-4" />
              {iBlockedThem ? 'Unblock' : 'Block'}
            </DropdownMenuItem>
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
      <RealtimeMessages
        messages={messages}
        currentUserId={user.id}
        isTyping={isTyping}
        otherUsername={other.username}
        onReply={setReplyingTo}
        onRemoveMessage={removeMessageLocally}
        onPatchMessage={patchMessageLocally}
        isMessageUnavailable={isMessageUnavailable}
      />

      {/* Input */}
      {canSendFinal ? (
        <MessageInput
          onSend={sendMessage}
          onTyping={sendTypingIndicator}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
        />
      ) : (
        <div className="px-4 py-4 border-t text-center">
          <p className="text-sm text-muted-foreground">
            {theyBlockedMe ? 'Message is not available.' : iBlockedThem ? "You've blocked this user." : restrictionMessage}
          </p>
        </div>
      )}
      {showStory && hasStory && (
        <StoryViewer
          groups={storyGroups}
          startGroupIndex={otherStoryGroupIndex}
          currentUserId={user.id}
          onClose={() => setShowStory(false)}
        />
      )}
      {showNicknameModal && (
        <NicknameModal
          currentNickname={myNicknameForThem || null}
          targetUsername={other.username}
          onSave={handleSaveNickname}
          onDelete={handleDeleteNickname}
          onClose={() => setShowNicknameModal(false)}
          saving={setNickname.isPending}
          deleting={deleteNickname.isPending}
        />
      )}
    </div>
  )
}
