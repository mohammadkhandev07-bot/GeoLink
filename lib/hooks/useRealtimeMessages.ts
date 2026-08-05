'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Message } from '@/lib/types/database.types'

export function useRealtimeMessages(chatId: string, currentUserId: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const supabase = createClient()

  useEffect(() => {
    if (!chatId) return

    // Load initial messages
    const loadMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })
      if (data) setMessages(data)
    }
    loadMessages()

    // Realtime subscription for new/edited/removed messages - INSERT covers
    // new messages, UPDATE covers edits and read receipts, DELETE covers
    // unsend, all reflected live for both people in the chat.
    const channel = supabase
      .channel(`chat:${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message])
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          const updated = payload.new as Message
          // A sender's own "delete for me" should only ever disappear from
          // their own view - the other person keeps seeing it normally,
          // matching the same rule the SELECT policy enforces server-side.
          if (updated.deleted_for_sender && updated.sender_id === currentUserId) {
            setMessages((prev) => prev.filter((m) => m.id !== updated.id))
            return
          }
          setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          setMessages((prev) => prev.filter((m) => m.id !== (payload.old as Message).id))
        }
      )
      // Broadcast for typing indicator
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.userId !== currentUserId) {
          setIsTyping(true)
          setTimeout(() => setIsTyping(false), 2000)
        }
      })
      // Presence for online status
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ userId: string }>()
        const online = Object.values(state).flat().map((p) => p.userId)
        setOnlineUsers(online)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ userId: currentUserId })
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [chatId, currentUserId])

  const sendTypingIndicator = useCallback(async () => {
    await supabase.channel(`chat:${chatId}`).send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: currentUserId },
    })
  }, [chatId, currentUserId])

  const sendMessage = useCallback(
    async (content: string, replyToId?: string | null) => {
      const { error } = await supabase.from('messages').insert({
        chat_id: chatId,
        sender_id: currentUserId,
        content,
        reply_to_id: replyToId || null,
      })
      if (error) throw error

      // Update last message in chat
      await supabase
        .from('chats')
        .update({ last_message: content, last_message_time: new Date().toISOString(), last_message_type: 'text' })
        .eq('id', chatId)
    },
    [chatId, currentUserId]
  )

  return { messages, isTyping, onlineUsers, sendMessage, sendTypingIndicator }
}
