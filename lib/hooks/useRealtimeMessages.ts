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
          const incoming = payload.new as Message
          // Guards against showing the sender's own message twice - once
          // from the optimistic insert below, once from this realtime echo.
          setMessages((prev) => (prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]))
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
          // Whoever clicked "delete for me" - sender or recipient - should
          // only ever lose it from their own view, matching the same rule
          // the SELECT policy enforces server-side.
          const iAmSender = updated.sender_id === currentUserId
          if ((updated.deleted_for_sender && iAmSender) || (updated.deleted_for_recipient && !iAmSender)) {
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
    async (payload: {
      content?: string
      replyToId?: string | null
      mediaUrl?: string
      mediaType?: 'image' | 'video' | 'audio'
      durationSeconds?: number
      sticker?: string
    }) => {
      const { data, error } = await supabase.from('messages').insert({
        chat_id: chatId,
        sender_id: currentUserId,
        content: payload.content?.trim() || '',
        reply_to_id: payload.replyToId || null,
        media_url: payload.mediaUrl || null,
        media_type: payload.mediaType || null,
        media_duration_seconds: payload.durationSeconds ?? null,
        sticker: payload.sticker || null,
      }).select().single()
      if (error) throw error

      // Show it immediately rather than waiting on the realtime echo to
      // come back - the realtime INSERT handler above is guarded against
      // adding it a second time once that echo does arrive.
      if (data) {
        setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data as Message]))
      }

      // Update last message preview in the chat list.
      const preview = payload.sticker
        ? `${payload.sticker} Sticker`
        : payload.mediaType === 'image' ? '📷 Photo'
        : payload.mediaType === 'video' ? '🎥 Video'
        : payload.mediaType === 'audio' ? '🎤 Voice message'
        : payload.content || ''
      await supabase
        .from('chats')
        .update({ last_message: preview, last_message_time: new Date().toISOString(), last_message_type: 'text' })
        .eq('id', chatId)
    },
    [chatId, currentUserId]
  )

  // Optimistic local updates so the person acting (unsend/delete-for-me/
  // edit) sees it happen instantly, instead of waiting on the realtime
  // round-trip - the other participant still gets it live via the
  // subscription above.
  const removeMessageLocally = useCallback((messageId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId))
  }, [])

  const patchMessageLocally = useCallback((messageId: string, patch: Partial<Message>) => {
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, ...patch } : m)))
  }, [])

  return { messages, isTyping, onlineUsers, sendMessage, sendTypingIndicator, removeMessageLocally, patchMessageLocally }
}
