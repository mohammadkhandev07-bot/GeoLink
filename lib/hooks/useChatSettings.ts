'use client'

import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

// ------------------------------------------------------------------
// Nicknames - what I privately call this person in this chat. Only I can
// see/set my own; the other person has their own separate nickname for me.
// ------------------------------------------------------------------
export function useNickname(chatId?: string, setById?: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['nickname', chatId, setById],
    queryFn: async () => {
      if (!chatId || !setById) return null
      const { data } = await supabase
        .from('nicknames')
        .select('nickname')
        .eq('chat_id', chatId)
        .eq('set_by_id', setById)
        .maybeSingle()
      return data?.nickname ?? null
    },
    enabled: !!chatId && !!setById,
  })
}

export function useSetNickname() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      chatId, setById, targetId, nickname,
    }: { chatId: string; setById: string; targetId: string; nickname: string }) => {
      const { error } = await supabase
        .from('nicknames')
        .upsert({ chat_id: chatId, set_by_id: setById, target_id: targetId, nickname }, { onConflict: 'chat_id,set_by_id' })
      if (error) throw error

      // A system message lets the other person know a nickname now exists
      // for them (and what it is) - not a secret, just a heads-up.
      await supabase.from('messages').insert({
        chat_id: chatId,
        sender_id: setById,
        content: `set a nickname for you: "${nickname}"`,
        is_system: true,
      })
    },
    onSuccess: (_, { chatId, setById }) => {
      queryClient.invalidateQueries({ queryKey: ['nickname', chatId, setById] })
    },
  })
}

export function useDeleteNickname() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ chatId, setById }: { chatId: string; setById: string }) => {
      const { error } = await supabase.from('nicknames').delete().eq('chat_id', chatId).eq('set_by_id', setById)
      if (error) throw error
    },
    onSuccess: (_, { chatId, setById }) => {
      queryClient.invalidateQueries({ queryKey: ['nickname', chatId, setById] })
    },
  })
}

// ------------------------------------------------------------------
// Blocking - scoped to chat/messaging. Blocking someone stops either side
// from sending further messages, and anonymizes the blocker's profile (and
// their past messages) from the blocked person's point of view.
// ------------------------------------------------------------------
export function useBlockStatus(userId?: string, otherUserId?: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  // Blocking/unblocking happens in one person's browser, but both people's
  // screens need to reflect it right away - a realtime row change on
  // either side of this relationship triggers a refetch here.
  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel(`blocks:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'blocks', filter: `blocker_id=eq.${userId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['block-status'] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'blocks', filter: `blocked_id=eq.${userId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['block-status'] })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId])

  return useQuery({
    queryKey: ['block-status', userId, otherUserId],
    queryFn: async () => {
      if (!userId || !otherUserId) return { iBlockedThem: false, theyBlockedMe: false }
      const { data } = await supabase
        .from('blocks')
        .select('blocker_id, blocked_id')
        .or(`and(blocker_id.eq.${userId},blocked_id.eq.${otherUserId}),and(blocker_id.eq.${otherUserId},blocked_id.eq.${userId})`)
      const iBlockedThem = !!data?.some(b => b.blocker_id === userId)
      const theyBlockedMe = !!data?.some(b => b.blocker_id === otherUserId)
      return { iBlockedThem, theyBlockedMe }
    },
    enabled: !!userId && !!otherUserId,
  })
}

export function useToggleBlock() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ blockerId, blockedId, block }: { blockerId: string; blockedId: string; block: boolean }) => {
      if (block) {
        const { error } = await supabase.from('blocks').insert({ blocker_id: blockerId, blocked_id: blockedId })
        if (error) throw error
        // Lets the blocked person know plainly what happened, instead of
        // just silently losing access to the blocker's profile/messages.
        await supabase.from('notifications').insert({
          user_id: blockedId,
          actor_id: blockerId,
          type: 'blocked',
        })
      } else {
        const { error } = await supabase.from('blocks').delete().eq('blocker_id', blockerId).eq('blocked_id', blockedId)
        if (error) throw error
      }
    },
    onSuccess: (_, { blockerId, blockedId }) => {
      queryClient.invalidateQueries({ queryKey: ['block-status', blockerId, blockedId] })
      queryClient.invalidateQueries({ queryKey: ['block-status', blockedId, blockerId] })
    },
  })
}

// The set of user ids who have blocked me, or whom I've blocked - used for
// hiding people from search regardless of direction.
export function useBlockedRelations(userId?: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['blocked-relations', userId],
    queryFn: async () => {
      if (!userId) return new Set<string>()
      const { data } = await supabase.from('blocks').select('blocker_id, blocked_id').or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`)
      return new Set((data || []).flatMap(b => [b.blocker_id, b.blocked_id]).filter(id => id !== userId))
    },
    enabled: !!userId,
  })
}

// Just the people who have blocked ME (not people I've blocked) - their
// chat should vanish from my inbox, but a chat with someone I blocked
// stays visible to me since I'm the one who chose to block them.
export function useBlockedByOthers(userId?: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['blocked-by-others', userId],
    queryFn: async () => {
      if (!userId) return new Set<string>()
      const { data } = await supabase.from('blocks').select('blocker_id').eq('blocked_id', userId)
      return new Set((data || []).map(b => b.blocker_id))
    },
    enabled: !!userId,
  })
}

// ------------------------------------------------------------------
// Soft chat delete - hides it from my inbox only. If either side sends a
// new message afterward, it reappears for both, same as most chat apps.
// ------------------------------------------------------------------
export function useDeleteChatForMe() {
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ chatId, userId }: { chatId: string; userId: string }) => {
      const { data: chat } = await supabase.from('chats').select('deleted_by').eq('id', chatId).maybeSingle()
      const current: string[] = chat?.deleted_by || []
      if (current.includes(userId)) return
      const { error } = await supabase.from('chats').update({ deleted_by: [...current, userId] }).eq('id', chatId)
      if (error) throw error
    },
  })
}
