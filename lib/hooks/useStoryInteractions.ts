'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { StoryCommentWithProfile, Profile } from '@/lib/types/database.types'

// Quick-pick mood emojis shown directly on the React button, one tap each -
// same idea as Instagram/Facebook's reaction bar. "More" opens the full
// EmojiPicker grid for anything outside this set.
export const STORY_REACTION_EMOJIS = ['😍', '😂', '😮', '😢', '🔥', '👏', '😡', '🙏']

// ------------------------------------------------------------------
// Likes
// ------------------------------------------------------------------
export function useStoryLike(storyId?: string, userId?: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['story-like', storyId, userId],
    queryFn: async () => {
      if (!storyId) return { liked: false, count: 0 }
      const [{ data: mine }, { count }] = await Promise.all([
        userId
          ? supabase.from('story_likes').select('id').eq('story_id', storyId).eq('user_id', userId).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.from('story_likes').select('id', { count: 'exact', head: true }).eq('story_id', storyId),
      ])
      return { liked: !!mine, count: count ?? 0 }
    },
    enabled: !!storyId,
  })
}

export function useToggleStoryLike() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ storyId, userId, liked }: { storyId: string; userId: string; liked: boolean }) => {
      if (liked) {
        const { error } = await supabase.from('story_likes').delete().eq('story_id', storyId).eq('user_id', userId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('story_likes').insert({ story_id: storyId, user_id: userId })
        if (error) throw error
      }
    },
    onSuccess: (_, { storyId, userId }) => {
      queryClient.invalidateQueries({ queryKey: ['story-like', storyId, userId] })
    },
  })
}

// ------------------------------------------------------------------
// Reactions - one mood emoji per person per story
// ------------------------------------------------------------------
export function useStoryReaction(storyId?: string, userId?: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['story-reaction', storyId, userId],
    queryFn: async () => {
      if (!storyId || !userId) return null
      const { data } = await supabase
        .from('story_reactions')
        .select('emoji')
        .eq('story_id', storyId)
        .eq('user_id', userId)
        .maybeSingle()
      return data?.emoji ?? null
    },
    enabled: !!storyId && !!userId,
  })
}

export function useSetStoryReaction() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ storyId, userId, emoji }: { storyId: string; userId: string; emoji: string }) => {
      const { error } = await supabase
        .from('story_reactions')
        .upsert({ story_id: storyId, user_id: userId, emoji }, { onConflict: 'story_id,user_id' })
      if (error) throw error
    },
    onSuccess: (_, { storyId, userId }) => {
      queryClient.invalidateQueries({ queryKey: ['story-reaction', storyId, userId] })
    },
  })
}

export function useRemoveStoryReaction() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ storyId, userId }: { storyId: string; userId: string }) => {
      const { error } = await supabase.from('story_reactions').delete().eq('story_id', storyId).eq('user_id', userId)
      if (error) throw error
    },
    onSuccess: (_, { storyId, userId }) => {
      queryClient.invalidateQueries({ queryKey: ['story-reaction', storyId, userId] })
    },
  })
}

// ------------------------------------------------------------------
// Comments
// ------------------------------------------------------------------
export function useStoryComments(storyId?: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['story-comments', storyId],
    queryFn: async () => {
      if (!storyId) return []
      const { data, error } = await supabase
        .from('story_comments')
        .select('*, profiles(*)')
        .eq('story_id', storyId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as unknown as StoryCommentWithProfile[]
    },
    enabled: !!storyId,
  })
}

export function useAddStoryComment() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ storyId, userId, content }: { storyId: string; userId: string; content: string }) => {
      const { data, error } = await supabase
        .from('story_comments')
        .insert({ story_id: storyId, user_id: userId, content: content.trim() })
        .select('*, profiles(*)')
        .single()
      if (error) throw error
      return data as StoryCommentWithProfile
    },
    onSuccess: (_, { storyId }) => {
      queryClient.invalidateQueries({ queryKey: ['story-comments', storyId] })
    },
  })
}

export function useDeleteStoryComment() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ commentId }: { commentId: string; storyId: string }) => {
      const { error } = await supabase.from('story_comments').delete().eq('id', commentId)
      if (error) throw error
    },
    onSuccess: (_, { storyId }) => {
      queryClient.invalidateQueries({ queryKey: ['story-comments', storyId] })
    },
  })
}

// ------------------------------------------------------------------
// "Reply to your story" - sends a normal chat message that also carries
// which story it replied to (story_id), so the chat bubble can render it
// with the story preview above the text, Instagram-style.
// ------------------------------------------------------------------
export function useReplyToStory() {
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({
      storyId,
      storyOwnerId,
      senderId,
      content,
    }: {
      storyId: string
      storyOwnerId: string
      senderId: string
      content: string
    }) => {
      let chatId: string | null = null
      const { data: existing } = await supabase
        .from('chats')
        .select('id')
        .or(
          `and(participant1_id.eq.${senderId},participant2_id.eq.${storyOwnerId}),` +
          `and(participant1_id.eq.${storyOwnerId},participant2_id.eq.${senderId})`
        )
        .maybeSingle()

      if (existing) {
        chatId = existing.id
      } else {
        const { data: created, error: createError } = await supabase
          .from('chats')
          .insert({ participant1_id: senderId, participant2_id: storyOwnerId })
          .select('id')
          .single()
        // Row Level Security blocks this insert if the story owner's
        // message_privacy setting doesn't allow the sender to message them.
        if (createError || !created) throw new Error('Message is not available.')
        chatId = created.id
      }

      const { error: msgError } = await supabase.from('messages').insert({
        chat_id: chatId,
        sender_id: senderId,
        content: content.trim(),
        story_id: storyId,
      })
      // Same RLS gate applies on every message insert, even into an
      // already-existing chat, so re-check message_privacy failures here too.
      if (msgError) throw new Error('Message is not available.')

      await supabase.from('chats').update({
        last_message: content.trim(),
        last_message_time: new Date().toISOString(),
        last_message_type: 'story',
      }).eq('id', chatId)

      return chatId
    },
  })
}

// ------------------------------------------------------------------
// Views - who has watched this story (owner-only, Instagram-style).
// ------------------------------------------------------------------
export function useRecordStoryView() {
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ storyId, viewerId }: { storyId: string; viewerId: string }) => {
      // onConflict + ignoreDuplicates: re-opening the same story doesn't
      // create a second view record or bump the timestamp.
      const { error } = await supabase
        .from('story_views')
        .upsert({ story_id: storyId, viewer_id: viewerId }, { onConflict: 'story_id,viewer_id', ignoreDuplicates: true })
      if (error) throw error
    },
  })
}

export function useStoryViews(storyId?: string, enabled = true) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['story-views', storyId],
    queryFn: async () => {
      if (!storyId) return []
      const { data, error } = await supabase
        .from('story_views')
        .select('viewer_id, viewed_at, profiles(*)')
        .eq('story_id', storyId)
        .order('viewed_at', { ascending: false })
      if (error) throw error
      return (data || []) as unknown as { viewer_id: string; viewed_at: string; profiles: Profile }[]
    },
    enabled: !!storyId && enabled,
  })
}

// ------------------------------------------------------------------
// Who liked - shown to the owner when they tap the like count.
// ------------------------------------------------------------------
export function useStoryLikers(storyId?: string, enabled = true) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['story-likers', storyId],
    queryFn: async () => {
      if (!storyId) return []
      const { data, error } = await supabase
        .from('story_likes')
        .select('user_id, created_at, profiles(*)')
        .eq('story_id', storyId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data || []) as unknown as { user_id: string; created_at: string; profiles: Profile }[]
    },
    enabled: !!storyId && enabled,
  })
}
